-- Individual-account memory payloads share the same D1 database as consent.
-- This lets SQL condition every read/write on current consent and removes the
-- non-atomic D1-consent/KV-payload boundary for individual accounts.
-- Legacy single-user alpha memory remains in KV under memory:v1:*.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS aria_memory_documents (
  owner_id TEXT PRIMARY KEY NOT NULL
    REFERENCES aria_memory_consent(owner_id) ON DELETE CASCADE,
  memories_json TEXT NOT NULL CHECK (json_valid(memories_json) AND json_type(memories_json) = 'array'),
  updated_at_ms INTEGER NOT NULL CHECK (updated_at_ms >= 0)
);

CREATE INDEX IF NOT EXISTS idx_aria_memory_documents_updated
  ON aria_memory_documents (updated_at_ms DESC);
