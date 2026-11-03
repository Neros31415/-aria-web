#!/usr/bin/env python3
"""Execute ARIA's real memory DDL and Worker SQL against SQLite, not a mock."""

import re
import sqlite3
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKER = (ROOT / "cloudflare/aria-brain-staging.mjs").read_text(encoding="utf-8")
MIGRATION_CONSENT = (ROOT / "migrations/0002_aria_memory_consent.sql").read_text(encoding="utf-8")
MIGRATION_DOCUMENTS = (ROOT / "migrations/0003_aria_memory_documents.sql").read_text(encoding="utf-8")
MIGRATION_REVISION_AUDIT = (ROOT / "migrations/0004_aria_memory_revision_and_consent_audit.sql").read_text(encoding="utf-8")


def sql_literal_containing(marker: str) -> str:
    """Return the exact one-line, double-quoted SQL literal from the Worker."""
    for line in WORKER.splitlines():
        candidate = line.strip()
        if marker in candidate and candidate.startswith('"') and candidate.endswith('"'):
            return candidate[1:-1]
    raise AssertionError(f"Worker SQL literal not found: {marker}")


READ_MEMORY_SQL = sql_literal_containing("SELECT c.enabled AS consentEnabled")
WRITE_MEMORY_SQL = sql_literal_containing("INSERT INTO aria_memory_documents")
DELETE_MEMORY_SQL = sql_literal_containing("DELETE FROM aria_memory_documents")


class AriaMemoryD1SqliteTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA foreign_keys = ON")
        self.db.executescript(MIGRATION_CONSENT)
        self.db.executescript(MIGRATION_DOCUMENTS)
        self.db.executescript(MIGRATION_REVISION_AUDIT)
        self.owner_a = "11111111-1111-4111-8111-111111111111"
        self.owner_b = "22222222-2222-4222-8222-222222222222"

    def tearDown(self):
        self.db.close()

    def enable_consent(self, owner):
        self.db.execute(
            "INSERT INTO aria_memory_consent (owner_id, enabled, consent_version, updated_at_ms) "
            "VALUES (?, 1, 'memory-v1', 1)",
            (owner,),
        )

    def write(self, owner, memories_json, updated_at, expected_revision=0):
        return self.db.execute(
            WRITE_MEMORY_SQL,
            (owner, memories_json, updated_at, owner, expected_revision, owner, expected_revision, expected_revision, owner),
        )

    def test_migrations_create_constrained_tables(self):
        names = {
            row["name"]
            for row in self.db.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
        }
        self.assertIn("aria_memory_consent", names)
        self.assertIn("aria_memory_documents", names)
        self.assertIn("aria_memory_consent_audit", names)
        self.enable_consent(self.owner_a)
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO aria_memory_documents (owner_id, memories_json, updated_at_ms, revision) VALUES (?, ?, ?, 1)",
                (self.owner_a, "not-json", 1),
            )

    def test_write_and_read_use_current_enabled_consent(self):
        self.enable_consent(self.owner_a)
        payload = '[{"text":"private note A"}]'
        result = self.write(self.owner_a, payload, 2)
        self.assertEqual(result.rowcount, 1)

        row = self.db.execute(READ_MEMORY_SQL, (self.owner_a,)).fetchone()
        self.assertEqual(row["consentEnabled"], 1)
        self.assertEqual(row["memoriesJson"], payload)
        self.assertEqual(row["revision"], 1)

    def test_revocation_blocks_future_write_and_preserves_prior_document(self):
        self.enable_consent(self.owner_a)
        original = '[{"text":"saved before revocation"}]'
        self.write(self.owner_a, original, 2, expected_revision=0)
        self.db.execute(
            "UPDATE aria_memory_consent SET enabled=0 WHERE owner_id=?",
            (self.owner_a,),
        )

        rejected = self.write(
            self.owner_a, '[{"text":"must not be saved"}]', 3, expected_revision=1
        )
        self.assertEqual(rejected.rowcount, 0)
        stored = self.db.execute(
            "SELECT memories_json FROM aria_memory_documents WHERE owner_id=?",
            (self.owner_a,),
        ).fetchone()
        self.assertEqual(stored["memories_json"], original)
        consent = self.db.execute(
            READ_MEMORY_SQL, (self.owner_a,)
        ).fetchone()
        self.assertEqual(consent["consentEnabled"], 0)

    def test_accounts_are_isolated_and_consent_delete_cascades(self):
        self.enable_consent(self.owner_a)
        self.enable_consent(self.owner_b)
        self.write(self.owner_a, '[{"text":"A"}]', 2, expected_revision=0)
        self.write(self.owner_b, '[{"text":"B"}]', 2, expected_revision=0)

        a = self.db.execute(READ_MEMORY_SQL, (self.owner_a,)).fetchone()
        b = self.db.execute(READ_MEMORY_SQL, (self.owner_b,)).fetchone()
        self.assertEqual(a["memoriesJson"], '[{"text":"A"}]')
        self.assertEqual(b["memoriesJson"], '[{"text":"B"}]')

        self.db.execute(
            "DELETE FROM aria_memory_consent WHERE owner_id=?", (self.owner_a,)
        )
        remaining = self.db.execute(
            "SELECT owner_id FROM aria_memory_documents"
        ).fetchall()
        self.assertEqual([row["owner_id"] for row in remaining], [self.owner_b])

    def test_delete_statement_is_scoped_to_requested_owner(self):
        self.enable_consent(self.owner_a)
        self.enable_consent(self.owner_b)
        self.write(self.owner_a, '[{"text":"A"}]', 2)
        self.write(self.owner_b, '[{"text":"B"}]', 2)

        self.db.execute(DELETE_MEMORY_SQL, (self.owner_a,))
        remaining = self.db.execute(
            "SELECT owner_id FROM aria_memory_documents"
        ).fetchall()
        self.assertEqual([row["owner_id"] for row in remaining], [self.owner_b])


if __name__ == "__main__":
    unittest.main(verbosity=2)


    def test_stale_concurrent_write_is_rejected_without_lost_update(self):
        self.enable_consent(self.owner_a)
        first = self.write(
            self.owner_a, '[{"id":"one","text":"first writer"}]', 2,
            expected_revision=0,
        )
        self.assertEqual(first.rowcount, 1)

        # A second request read revision 0 before the first request committed.
        stale = self.write(
            self.owner_a, '[{"id":"two","text":"stale writer"}]', 3,
            expected_revision=0,
        )
        self.assertEqual(stale.rowcount, 0)

        row = self.db.execute(
            "SELECT memories_json, revision FROM aria_memory_documents WHERE owner_id=?",
            (self.owner_a,),
        ).fetchone()
        self.assertEqual(row["memories_json"], '[{"id":"one","text":"first writer"}]')
        self.assertEqual(row["revision"], 1)

    def test_sequential_write_increments_revision(self):
        self.enable_consent(self.owner_a)
        self.assertEqual(self.write(self.owner_a, '[{"text":"v1"}]', 2, 0).rowcount, 1)
        self.assertEqual(self.write(self.owner_a, '[{"text":"v2"}]', 3, 1).rowcount, 1)
        row = self.db.execute(
            "SELECT memories_json, revision FROM aria_memory_documents WHERE owner_id=?",
            (self.owner_a,),
        ).fetchone()
        self.assertEqual(row["memories_json"], '[{"text":"v2"}]')
        self.assertEqual(row["revision"], 2)

    def test_consent_audit_records_owner_scoped_state_transitions(self):
        self.enable_consent(self.owner_a)
        self.db.execute(
            "INSERT INTO aria_memory_consent_audit (id, owner_id, enabled, consent_version, occurred_at_ms, source) "
            "VALUES (?, ?, 1, 'memory-v1', 10, 'user_request')",
            ("event-a", self.owner_a),
        )
        events = self.db.execute(
            "SELECT owner_id, enabled, source FROM aria_memory_consent_audit WHERE owner_id=?",
            (self.owner_a,),
        ).fetchall()
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["owner_id"], self.owner_a)
        self.assertEqual(events[0]["enabled"], 1)
        self.assertEqual(events[0]["source"], "user_request")
