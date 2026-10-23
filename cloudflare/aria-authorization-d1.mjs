/**
 * D1-backed authorization record reader for ARIA.
 *
 * This adapter is deliberately read-only. Role and entitlement provisioning
 * must be performed by a separate, authenticated, audited administrative path.
 * The D1 binding must remain server-side; never expose it to a client.
 */
import { authorize } from "./aria-authorization.mjs";

// D1 authorization records belong to canonical account identities only.
// Opaque legacy/session_kv identifiers may be authenticated for chat, but must
// never create or address D1 roles or entitlements.
function validIdentity(value) {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeRole(row, identity) {
  if (!row || row.userId !== identity ||
      !["user", "admin", "super_admin"].includes(row.role) ||
      ![0, 1, true, false].includes(row.active)) return null;
  return { userId: row.userId, role: row.role, active: row.active === 1 || row.active === true };
}

function normalizeEntitlement(row, identity, now) {
  if (!row || row.userId !== identity ||
      typeof row.plan !== "string" ||
      ![0, 1, true, false].includes(row.active) ||
      !Number.isSafeInteger(row.startsAt) || row.startsAt < 0 || row.startsAt > now ||
      (row.expiresAt !== null && row.expiresAt !== undefined &&
        (!Number.isSafeInteger(row.expiresAt) || row.expiresAt < 0))) return null;
  return {
    userId: row.userId,
    plan: row.plan,
    active: row.active === 1 || row.active === true,
    startsAt: row.startsAt,
    ...(row.expiresAt === null || row.expiresAt === undefined ? {} : { expiresAt: row.expiresAt })
  };
}

export async function authorizeFromD1({ identity, permission, env, context = {} } = {}) {
  if (!validIdentity(identity) || typeof permission !== "string" || !permission) {
    return { allowed: false, reason: "invalid_principal" };
  }
  const db = env?.ARIA_AUTHZ_DB;
  if (!db || typeof db.prepare !== "function") {
    return { allowed: false, reason: "authorization_store_unavailable" };
  }

  try {
    const roleRow = await db.prepare(
      "SELECT user_id AS userId, role, active FROM aria_user_roles WHERE user_id = ? LIMIT 1"
    ).bind(identity).first();
    const roleRecord = normalizeRole(roleRow, identity);
    if (!roleRecord || !roleRecord.active) {
      return { allowed: false, reason: "role_unavailable" };
    }

    let entitlementRecord = null;
    if (permission === "feature:premium:use") {
      const entitlementRow = await db.prepare(
        "SELECT user_id AS userId, plan, active, starts_at_ms AS startsAt, expires_at_ms AS expiresAt FROM aria_entitlements WHERE user_id = ? LIMIT 1"
      ).bind(identity).first();
      const now = Number.isFinite(context.now) ? context.now : Date.now();
      entitlementRecord = normalizeEntitlement(entitlementRow, identity, now);
      if (!entitlementRecord) {
        return { allowed: false, reason: "entitlement_required" };
      }
    }

    return authorize({ identity, roleRecord, entitlementRecord, permission, context });
  } catch {
    return { allowed: false, reason: "authorization_store_unavailable" };
  }
}


/**
 * Give a newly authenticated principal the least-privileged default role.
 * The caller supplies identity only after server-side authentication. This
 * operation can create only role=user, never an admin role, and writes an audit
 * record atomically with the insert. Existing inactive/elevated roles are not
 * overwritten or reactivated.
 */
export async function ensureDefaultUserRole({ identity, env, now = Date.now() } = {}) {
  if (!validIdentity(identity)) return { ok: false, reason: "invalid_principal" };
  const db = env?.ARIA_AUTHZ_DB;
  if (!db || typeof db.prepare !== "function" || typeof db.batch !== "function") {
    return { ok: false, reason: "authorization_store_unavailable" };
  }
  if (!Number.isSafeInteger(now) || now < 0) {
    return { ok: false, reason: "invalid_time" };
  }
  try {
    const result = await db.batch([
      db.prepare(
        "INSERT OR IGNORE INTO aria_user_roles (user_id, role, active, created_at_ms, updated_at_ms, updated_by_user_id, version) VALUES (?, 'user', 1, ?, ?, ?, 1)"
      ).bind(identity, now, now, identity),
      db.prepare(
        "INSERT INTO aria_authorization_audit (id, actor_user_id, target_user_id, action, occurred_at_ms, details_json) SELECT ?, ?, ?, 'role.created', ?, json_object('source', 'authenticated_first_use') WHERE changes() = 1"
      ).bind(crypto.randomUUID(), identity, identity, now)
    ]);
    if (!Array.isArray(result) || result.some((item) => item?.success === false)) {
      return { ok: false, reason: "authorization_store_unavailable" };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "authorization_store_unavailable" };
  }
}
