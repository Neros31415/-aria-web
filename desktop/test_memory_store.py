from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from aria_desktop import MemoryStore


class MemoryStoreTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        self.db_path = Path(self.temp_dir.name) / "aria-test.sqlite3"

    def test_messages_persist_across_store_instances_in_order(self) -> None:
        first_store = MemoryStore(self.db_path)
        first_store.add_message("user", "Bonjour ARIA")
        first_store.add_message("assistant", "Bonjour. Je suis en mode local.")
        reopened_store = MemoryStore(self.db_path)
        self.assertEqual(reopened_store.recent_messages(), [
            {"role": "user", "content": "Bonjour ARIA"},
            {"role": "assistant", "content": "Bonjour. Je suis en mode local."},
        ])

    def test_recent_messages_returns_only_the_newest_requested_items(self) -> None:
        store = MemoryStore(self.db_path)
        store.add_message("user", "un")
        store.add_message("assistant", "deux")
        store.add_message("user", "trois")
        self.assertEqual(store.recent_messages(limit=2), [
            {"role": "assistant", "content": "deux"},
            {"role": "user", "content": "trois"},
        ])

    def test_memories_persist_and_are_returned_newest_first(self) -> None:
        store = MemoryStore(self.db_path)
        store.add_memory("Préférence ancienne")
        store.add_memory("Préférence récente")
        reopened_store = MemoryStore(self.db_path)
        self.assertEqual(reopened_store.memories(), ["Préférence récente", "Préférence ancienne"])


if __name__ == "__main__":
    unittest.main()
