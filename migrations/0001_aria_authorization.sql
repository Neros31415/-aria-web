-- ARIA 1.0 authorization registry (Cloudflare D1 / SQLite)
-- This schema is not active until explicitly applied to the intended D1 database.
-- No public endpoint may write roles, entitlements, or audit events.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS aria_user_roles (
  user_id TEXT PRIMARY KEY NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'admin', 'super_admin')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  updated_by_user_id TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE TABLE IF NOT EXISTS aria_entitlements (
  user_id TEXT PRIMARY KEY NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'premium')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  starts_at_ms INTEGER NOT NULL,
  expires_at_ms INTEGER,
  source TEXT NOT NULL CHECK (source IN ('manual', 'gift_key', 'subscription', 'promotion')),
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  CHECK (expires_at_ms IS NULL OR expires_at_ms > starts_at_ms)
);

CREATE TABLE IF NOT EXISTS aria_authorization_audit (
  id TEXT PRIMARY KEY NOT NULL,
  actor_user_id TEXT NOT NULL,
  target_user_id TEXT,
  action TEXT NOT NULL CHECK (action IN (
    'role.created', 'role.updated', 'role.revoked',
    'entitlement.created', 'entitlement.updated', 'entitlement.revoked',
    'gift_key.created', 'gift_key.redeemed', 'gift_key.revoked'
  )),
  occurred_at_ms INTEGER NOT NULL,
  request_id TEXT,
  details_json TEXT CHECK (details_json IS NULL OR json_valid(details_json))
);

CREATE INDEX IF NOT EXISTS idx_aria_authorization_audit_target_time
  ON aria_authorization_audit (target_user_id, occurred_at_ms DESC);

CREATE INDEX IF NOT EXISTS idx_aria_authorization_audit_actor_time
  ON aria_authorization_audit (actor_user_id, occurred_at_ms DESC);
