/**
 * Server-side authorization policy primitives for ARIA.
 *
 * IMPORTANT: callers must pass identity and records obtained from trusted
 * server-side authentication/storage. Never construct these inputs from
 * request-body fields such as role, isAdmin, plan, or userId.
 *
 * The D1-backed reader lives in aria-authorization-d1.mjs. Neither module is
 * wired to HTTP routes yet; privileged routes must remain closed until the
 * authoritative database is configured and route-level enforcement is tested.
 */

export const ROLE_PERMISSIONS = Object.freeze({
  user: Object.freeze(["memory:own:read", "memory:own:write", "memory:own:delete"]),
  admin: Object.freeze([
    "memory:own:read",
    "memory:own:write",
    "memory:own:delete",
    "admin:gift-keys:manage"
  ]),
  super_admin: Object.freeze([
    "memory:own:read",
    "memory:own:write",
    "memory:own:delete",
    "admin:gift-keys:manage",
    "admin:roles:manage",
    "admin:security:manage"
  ])
});

const PRIVILEGED_PERMISSIONS = new Set([
  "admin:gift-keys:manage",
  "admin:roles:manage",
  "admin:security:manage"
]);

const SENSITIVE_PERMISSIONS = new Set([
  "admin:roles:manage",
  "admin:security:manage"
]);

export function isValidAuthorizationIdentity(identity) {
  // Supabase identities are UUIDs; the existing server-side session registry
  // also issues opaque stable IDs. Both are accepted only after trusted
  // server-side authentication, never from request-supplied identity fields.
  return typeof identity === "string" &&
    (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identity) ||
     /^[a-zA-Z0-9_-]{1,80}$/.test(identity));
}

/**
 * Resolve an authorization decision from trusted server-side records.
 *
 * roleRecord shape: { userId, role, active }
 * entitlementRecord shape: { userId, plan, active, expiresAt? }
 * context shape: { mfaVerified, mfaVerifiedAt, now? }
 *
 * Missing, mismatched, malformed, or inactive records fail closed. An
 * entitlement can grant Premium feature access but never administrative rights.
 */
export function authorize({
  identity,
  roleRecord,
  entitlementRecord = null,
  permission,
  context = {}
} = {}) {
  if (!isValidAuthorizationIdentity(identity) || typeof permission !== "string" || !permission) {
    return { allowed: false, reason: "invalid_principal" };
  }

  if (!roleRecord || roleRecord.userId !== identity || roleRecord.active !== true) {
    return { allowed: false, reason: "role_unavailable" };
  }

  const role = roleRecord.role;
  if (!Object.hasOwn(ROLE_PERMISSIONS, role)) {
    return { allowed: false, reason: "role_unrecognized" };
  }

  if (PRIVILEGED_PERMISSIONS.has(permission) && role !== "admin" && role !== "super_admin") {
    return { allowed: false, reason: "permission_denied" };
  }

  if (permission === "admin:roles:manage" || permission === "admin:security:manage") {
    if (role !== "super_admin") {
      return { allowed: false, reason: "permission_denied" };
    }
  }

  if (SENSITIVE_PERMISSIONS.has(permission)) {
    const now = Number.isFinite(context.now) ? context.now : Date.now();
    const verifiedAt = context.mfaVerifiedAt;
    const mfaFresh = context.mfaVerified === true &&
      Number.isFinite(verifiedAt) &&
      verifiedAt <= now &&
      now - verifiedAt <= 5 * 60 * 1000;
    if (!mfaFresh) return { allowed: false, reason: "mfa_required" };
  }

  if (permission === "feature:premium:use") {
    if (!entitlementRecord || entitlementRecord.userId !== identity ||
        entitlementRecord.active !== true || entitlementRecord.plan !== "premium") {
      return { allowed: false, reason: "entitlement_required" };
    }
    if (entitlementRecord.expiresAt !== undefined) {
      const now = Number.isFinite(context.now) ? context.now : Date.now();
      if (!Number.isFinite(entitlementRecord.expiresAt) || entitlementRecord.expiresAt <= now) {
        return { allowed: false, reason: "entitlement_expired" };
      }
    }
    // Commercial entitlement is deliberately independent of the account role.
    return { allowed: true, reason: "allowed", identity, role, permission };
  }

  const roleAllows = ROLE_PERMISSIONS[role].includes(permission);
  if (!roleAllows) return { allowed: false, reason: "permission_denied" };

  return { allowed: true, reason: "allowed", identity, role, permission };
}


const ROLE_KEY_PREFIX = "authz:role:v1:";
const ENTITLEMENT_KEY_PREFIX = "authz:entitlement:v1:";

function validRoleRecord(record, identity) {
  return Boolean(record &&
    record.userId === identity &&
    typeof record.role === "string" &&
    Object.hasOwn(ROLE_PERMISSIONS, record.role) &&
    typeof record.active === "boolean");
}

function validEntitlementRecord(record, identity) {
  return Boolean(record &&
    record.userId === identity &&
    typeof record.plan === "string" &&
    typeof record.active === "boolean" &&
    (record.expiresAt === undefined || Number.isFinite(record.expiresAt)));
}

/**
 * Resolve authorization from the server-only ARIA_AUTHZ KV binding.
 * This function is read-only: it deliberately exposes no public role mutation.
 * The KV namespace must be bound only to the Worker and never to browser code.
 */
export async function authorizeFromStore({
  identity,
  permission,
  env,
  context = {}
} = {}) {
  if (!isValidAuthorizationIdentity(identity) || typeof permission !== "string" || !permission) {
    return { allowed: false, reason: "invalid_principal" };
  }
  if (!env || !env.ARIA_AUTHZ || typeof env.ARIA_AUTHZ.get !== "function") {
    return { allowed: false, reason: "authorization_store_unavailable" };
  }

  try {
    const rawRole = await env.ARIA_AUTHZ.get(ROLE_KEY_PREFIX + identity, "json");
    if (!validRoleRecord(rawRole, identity) || rawRole.active !== true) {
      return { allowed: false, reason: "role_unavailable" };
    }

    let entitlementRecord = null;
    if (permission === "feature:premium:use") {
      const rawEntitlement = await env.ARIA_AUTHZ.get(ENTITLEMENT_KEY_PREFIX + identity, "json");
      if (!validEntitlementRecord(rawEntitlement, identity)) {
        return { allowed: false, reason: "entitlement_required" };
      }
      entitlementRecord = rawEntitlement;
    }

    return authorize({
      identity,
      roleRecord: rawRole,
      entitlementRecord,
      permission,
      context
    });
  } catch {
    return { allowed: false, reason: "authorization_store_unavailable" };
  }
}

/**
 * Internal key helpers for provisioning/migration scripts and tests only.
 * No HTTP endpoint should expose these prefixes or allow callers to choose a
 * role. Provisioning must be a separate audited, privileged server workflow.
 */
export const AUTHORIZATION_STORAGE_KEYS = Object.freeze({
  role(identity) {
    if (!isValidAuthorizationIdentity(identity)) throw new TypeError("invalid_identity");
    return ROLE_KEY_PREFIX + identity;
  },
  entitlement(identity) {
    if (!isValidAuthorizationIdentity(identity)) throw new TypeError("invalid_identity");
    return ENTITLEMENT_KEY_PREFIX + identity;
  }
});
