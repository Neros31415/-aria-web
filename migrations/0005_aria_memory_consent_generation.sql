-- Monotonic consent generation invalidates every in-flight write from an older consent period.
-- Existing consent rows begin at generation 1; every subsequent consent mutation increments it.
ALTER TABLE aria_memory_consent
  ADD COLUMN consent_generation INTEGER NOT NULL DEFAULT 1 CHECK (consent_generation > 0);
