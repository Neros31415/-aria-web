-- Durable, account-scoped memory consent for ARIA 1.0.
-- Apply only to the intended D1 database after review; until then, memory operations fail closed.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS aria_memory_consent (
  owner_id TEXT PRIMARY KEY NOT NULL,
  enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
  consent_version TEXT NOT NULL CHECK (length(consent_version) BETWEEN 1 AND 40),
  updated_at_ms INTEGER NOT NULL CHECK (updated_at_ms >= 0)
);
