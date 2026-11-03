-- Optimistic concurrency for individual-account memory documents.
-- Existing documents start at revision 1; an absent document is revision 0.
ALTER TABLE aria_memory_documents
  ADD COLUMN revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0);

-- Consent state remains in aria_memory_consent; this append-only event stream
-- records each authenticated user-requested transition. Account erasure cascades.
CREATE TABLE IF NOT EXISTS aria_memory_consent_audit (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL
    REFERENCES aria_memory_consent(owner_id) ON DELETE CASCADE,
  enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
  consent_version TEXT NOT NULL CHECK (length(consent_version) BETWEEN 1 AND 40),
  occurred_at_ms INTEGER NOT NULL CHECK (occurred_at_ms >= 0),
  source TEXT NOT NULL CHECK (source IN ('user_request'))
);

CREATE INDEX IF NOT EXISTS idx_aria_memory_consent_audit_owner_time
  ON aria_memory_consent_audit (owner_id, occurred_at_ms DESC);
