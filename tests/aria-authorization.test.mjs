import test from "node:test";
import assert from "node:assert/strict";
import { authorize } from "../cloudflare/aria-authorization.mjs";

const alice = "123e4567-e89b-42d3-a456-426614174000";
const bob = "223e4567-e89b-42d3-a456-426614174000";
const userRole = { userId: alice, role: "user", active: true };
const premium = { userId: alice, plan: "premium", active: true, expiresAt: 2_000_000_000_000 };
const now = 1_900_000_000_000;
const freshMfa = { now, mfaVerified: true, mfaVerifiedAt: now - 60_000 };

test("normal account can access only its own memory permissions", () => {
  assert.equal(authorize({ identity: alice, roleRecord: userRole, permission: "memory:own:read" }).allowed, true);
  assert.equal(authorize({ identity: alice, roleRecord: userRole, permission: "admin:roles:manage" }).allowed, false);
});

test("client-provided admin-shaped fields are not part of the authorization contract", () => {
  const forgedClientData = { role: "super_admin", isAdmin: true, plan: "premium", userId: alice };
  const decision = authorize({
    identity: alice,
    roleRecord: userRole,
    permission: "admin:roles:manage",
    ...forgedClientData
  });
  assert.deepEqual(decision, { allowed: false, reason: "permission_denied" });
});

test("Premium entitlement grants Premium feature access but not administrative access", () => {
  assert.equal(authorize({
    identity: alice, roleRecord: userRole, entitlementRecord: premium,
    permission: "feature:premium:use", context: { now }
  }).allowed, false, "a user role alone does not include Premium permission");
  const premiumRole = { userId: alice, role: "premium", active: true };
  assert.equal(authorize({
    identity: alice, roleRecord: premiumRole, entitlementRecord: premium,
    permission: "feature:premium:use", context: { now }
  }).allowed, true);
  assert.equal(authorize({
    identity: alice, roleRecord: premiumRole, entitlementRecord: premium,
    permission: "admin:roles:manage", context: freshMfa
  }).allowed, false);
});

test("mismatched role record fails closed", () => {
  assert.deepEqual(authorize({
    identity: alice,
    roleRecord: { userId: bob, role: "super_admin", active: true },
    permission: "admin:security:manage",
    context: freshMfa
  }), { allowed: false, reason: "role_unavailable" });
});

test("missing, inactive, or unknown role records fail closed", () => {
  assert.equal(authorize({ identity: alice, permission: "memory:own:read" }).reason, "role_unavailable");
  assert.equal(authorize({
    identity: alice, roleRecord: { userId: alice, role: "super_admin", active: false },
    permission: "admin:security:manage", context: freshMfa
  }).reason, "role_unavailable");
  assert.equal(authorize({
    identity: alice, roleRecord: { userId: alice, role: "owner", active: true },
    permission: "admin:security:manage", context: freshMfa
  }).reason, "role_unrecognized");
});

test("sensitive super-admin operations require recent MFA", () => {
  const superAdmin = { userId: alice, role: "super_admin", active: true };
  assert.equal(authorize({
    identity: alice, roleRecord: superAdmin, permission: "admin:security:manage",
    context: { now, mfaVerified: false, mfaVerifiedAt: now }
  }).reason, "mfa_required");
  assert.equal(authorize({
    identity: alice, roleRecord: superAdmin, permission: "admin:security:manage",
    context: { now, mfaVerified: true, mfaVerifiedAt: now - 6 * 60 * 1000 }
  }).reason, "mfa_required");
  assert.equal(authorize({
    identity: alice, roleRecord: superAdmin, permission: "admin:security:manage",
    context: freshMfa
  }).allowed, true);
});

test("expired Premium entitlement is rejected", () => {
  const premiumRole = { userId: alice, role: "premium", active: true };
  assert.equal(authorize({
    identity: alice, roleRecord: premiumRole,
    entitlementRecord: { userId: alice, plan: "premium", active: true, expiresAt: now },
    permission: "feature:premium:use", context: { now }
  }).reason, "entitlement_expired");
});

test("gift-key permission cannot grant role-management privileges", () => {
  const admin = { userId: alice, role: "admin", active: true };
  assert.equal(authorize({
    identity: alice, roleRecord: admin, permission: "admin:gift-keys:manage"
  }).allowed, true);
  assert.equal(authorize({
    identity: alice, roleRecord: admin, permission: "admin:roles:manage", context: freshMfa
  }).allowed, false);
});

test("invalid identity and permission fail closed", () => {
  assert.equal(authorize({ identity: "alice", roleRecord: userRole, permission: "memory:own:read" }).reason, "invalid_principal");
  assert.equal(authorize({ identity: alice, roleRecord: userRole, permission: "" }).reason, "invalid_principal");
});
