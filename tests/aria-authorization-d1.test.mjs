import test from "node:test";
import assert from "node:assert/strict";
import { authorizeFromD1, ensureDefaultUserRole } from "../cloudflare/aria-authorization-d1.mjs";

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

test("invalid and opaque alpha identities are rejected before D1 access", async () => {
  const db = d1Mock({ role: { userId: alice, role: "super_admin", active: 1 } });
  for (const identity of ["invalid identity!", "account_user_01"]) {
    assert.deepEqual(await authorizeFromD1({
      identity, permission: "admin:roles:manage", env: { ARIA_AUTHZ_DB: db }, context: freshMfa
    }), { allowed: false, reason: "invalid_principal" });
  }
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


test("default role provisioning can create only a basic user and audit it atomically", async () => {
  const calls = [];
  const db = {
    prepare(sql) {
      return { sql, bind(...values) { return { sql, values }; } };
    },
    async batch(statements) {
      calls.push(...statements);
      return [{ success: true }, { success: true }];
    }
  };
  const result = await ensureDefaultUserRole({ identity: alice, env: { ARIA_AUTHZ_DB: db }, now });
  assert.deepEqual(result, { ok: true });
  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /INSERT OR IGNORE INTO aria_user_roles/);
  assert.match(calls[0].sql, /VALUES \(\?, 'user', 1,/);
  assert.deepEqual(calls[0].values, [alice, now, now, alice]);
  assert.match(calls[1].sql, /INSERT INTO aria_authorization_audit/);
  assert.match(calls[1].sql, /WHERE changes\(\) = 1/);
  assert.equal(calls[1].values[1], alice);
  assert.equal(calls[1].values[2], alice);
});

test("default role provisioning accepts only canonical UUID identities", async () => {
  const calls = [];
  const db = {
    prepare(sql) { return { sql, bind(...values) { calls.push({ sql, values }); return { sql, values }; } }; },
    async batch() { return [{ success: true }, { success: true }]; }
  };
  assert.deepEqual(await ensureDefaultUserRole({
    identity: "account_user_01", env: { ARIA_AUTHZ_DB: db }, now
  }), { ok: false, reason: "invalid_principal" });
  assert.equal(calls.length, 0, "opaque alpha identities must not reach D1");
});

test("default role provisioning fails closed without transactional D1 batch", async () => {
  assert.deepEqual(await ensureDefaultUserRole({
    identity: alice, env: { ARIA_AUTHZ_DB: { prepare() {} } }, now
  }), { ok: false, reason: "authorization_store_unavailable" });
});


test("D1 authorization supports trusted opaque IDs from the server-side session registry", async () => {
  const identity = "account_user_01";
  const db = d1Mock({ role: { userId: identity, role: "user", active: 1 } });
  const result = await authorizeFromD1({
    identity,
    permission: "memory:own:read",
    env: { ARIA_AUTHZ_DB: db }
  });
  assert.deepEqual(result, {
    allowed: true,
    reason: "allowed",
    identity,
    role: "user",
    permission: "memory:own:read"
  });
  assert.ok(db.calls.length > 0);
  assert.ok(db.calls.every(call => call.values[0] === identity));
});
