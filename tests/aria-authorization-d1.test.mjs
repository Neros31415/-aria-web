import test from "node:test";
import assert from "node:assert/strict";
import { authorizeFromD1 } from "../cloudflare/aria-authorization-d1.mjs";

const alice = "123e4567-e89b-42d3-a456-426614174000";
const bob = "223e4567-e89b-42d3-a456-426614174000";
const now = 1_900_000_000_000;
const freshMfa = { now, mfaVerified: true, mfaVerifiedAt: now - 60_000 };

function d1Mock(rows, { fail = false } = {}) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      return {
        bind(...values) {
          calls.push({ sql, values });
          return {
            async first() {
              if (fail) throw new Error("simulated D1 outage");
              const key = sql.includes("aria_user_roles") ? "role" : "entitlement";
              return rows[key] ?? null;
            }
          };
        }
      };
    }
  };
}

test("D1 adapter grants only permissions in the stored role", async () => {
  const db = d1Mock({ role: { userId: alice, role: "user", active: 1 } });
  assert.deepEqual(await authorizeFromD1({
    identity: alice, permission: "memory:own:read", env: { ARIA_AUTHZ_DB: db }
  }), { allowed: true, reason: "allowed", identity: alice, role: "user", permission: "memory:own:read" });
  assert.equal((await authorizeFromD1({
    identity: alice, permission: "admin:roles:manage", env: { ARIA_AUTHZ_DB: db }, context: freshMfa
  })).allowed, false);
  assert.ok(db.calls.every(call => call.values[0] === alice), "query must be bound to authenticated identity");
});

test("D1 adapter fails closed when role is absent, inactive, malformed, or belongs to another user", async () => {
  for (const role of [
    null,
    { userId: alice, role: "super_admin", active: 0 },
    { userId: bob, role: "super_admin", active: 1 },
    { userId: alice, role: "root", active: 1 }
  ]) {
    const db = d1Mock({ role });
    const result = await authorizeFromD1({
      identity: alice, permission: "admin:roles:manage", env: { ARIA_AUTHZ_DB: db }, context: freshMfa
    });
    assert.equal(result.allowed, false);
  }
});

test("D1 adapter requires a separate active Premium entitlement", async () => {
  const db = d1Mock({
    role: { userId: alice, role: "user", active: 1 },
    entitlement: { userId: alice, plan: "premium", active: 1, startsAt: now - 60_000, expiresAt: now + 60_000 }
  });
  assert.equal((await authorizeFromD1({
    identity: alice, permission: "feature:premium:use", env: { ARIA_AUTHZ_DB: db }, context: { now }
  })).allowed, true);

  const crossAccount = d1Mock({
    role: { userId: alice, role: "user", active: 1 },
    entitlement: { userId: bob, plan: "premium", active: 1, startsAt: now - 60_000, expiresAt: now + 60_000 }
  });
  assert.deepEqual(await authorizeFromD1({
    identity: alice, permission: "feature:premium:use", env: { ARIA_AUTHZ_DB: crossAccount }, context: { now }
  }), { allowed: false, reason: "entitlement_required" });
});

test("D1 adapter denies access when binding is absent or the database fails", async () => {
  assert.deepEqual(await authorizeFromD1({
    identity: alice, permission: "admin:roles:manage", env: {}, context: freshMfa
  }), { allowed: false, reason: "authorization_store_unavailable" });
  assert.deepEqual(await authorizeFromD1({
    identity: alice, permission: "admin:roles:manage", env: { ARIA_AUTHZ_DB: d1Mock({}, { fail: true }) }, context: freshMfa
  }), { allowed: false, reason: "authorization_store_unavailable" });
});

test("invalid identity is rejected before database access", async () => {
  const db = d1Mock({ role: { userId: alice, role: "super_admin", active: 1 } });
  assert.deepEqual(await authorizeFromD1({
    identity: "not-a-uuid", permission: "admin:roles:manage", env: { ARIA_AUTHZ_DB: db }, context: freshMfa
  }), { allowed: false, reason: "invalid_principal" });
  assert.equal(db.calls.length, 0);
});


test("D1 adapter denies a Premium entitlement before its start time", async () => {
  const db = d1Mock({
    role: { userId: alice, role: "user", active: 1 },
    entitlement: { userId: alice, plan: "premium", active: 1, startsAt: now + 60_000, expiresAt: now + 120_000 }
  });
  assert.deepEqual(await authorizeFromD1({
    identity: alice, permission: "feature:premium:use", env: { ARIA_AUTHZ_DB: db }, context: { now }
  }), { allowed: false, reason: "entitlement_required" });
});
