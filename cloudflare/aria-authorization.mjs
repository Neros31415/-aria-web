/**
 * Server-side authorization policy primitives for ARIA.
 *
 * IMPORTANT: callers must pass identity and records obtained from trusted
 * server-side authentication/storage. Never construct these inputs from
 * request-body fields such as role, isAdmin, plan, or userId.
 *
 * This module is not yet wired to production routes or a persistent role
 * registry. Until that integration exists, privileged routes must remain closed.
 */

export const ROLE_PERMISSIONS = Object.freeze({
  user: Object.freeze(["memory:own:read", "memory:own:write", "memory:own:delete"]),
  premium: Object.freeze([
    "memory:own:read",
    "memory:own:write",
    "memory:own:delete",
    "feature:premium:use"
  ]),
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

function isValidIdentity(identity) {
  return typeof identity === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identity);
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
  if (!isValidIdentity(identity) || typeof permission !== "string" || !permission) {
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
  }

  const roleAllows = ROLE_PERMISSIONS[role].includes(permission);
  if (!roleAllows) return { allowed: false, reason: "permission_denied" };

  return { allowed: true, reason: "allowed", identity, role, permission };
}
