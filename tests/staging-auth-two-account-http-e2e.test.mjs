import test from "node:test";
import assert from "node:assert/strict";
import { parseConfig } from "../scripts/staging-auth-two-account-http-e2e.mjs";

const validEnv = {
  ARIA_RUN_STAGING_E2E: "true",
  ARIA_STAGING_BASE_URL: "https://aria-brain-staging.quentineros-sevesi.workers.dev",
  SUPABASE_URL: "https://mvcunzhhioeplrvanhgn.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_key",
  ARIA_TEST_USER_A_EMAIL: "aria-e2e-a@example.test",
  ARIA_TEST_USER_A_PASSWORD: "password-a-123",
  ARIA_TEST_USER_B_EMAIL: "aria-e2e-b@example.test",
  ARIA_TEST_USER_B_PASSWORD: "password-b-123"
};

test("staging HTTP E2E is disabled unless explicitly opted in", () => {
  assert.deepEqual(parseConfig({}), { enabled: false });
  assert.deepEqual(parseConfig({ ARIA_RUN_STAGING_E2E: "false" }), { enabled: false });
});

test("staging HTTP E2E accepts only the dedicated ARIA staging Worker and Supabase project", () => {
  const config = parseConfig(validEnv);
  assert.equal(config.enabled, true);
  assert.equal(config.workerOrigin, validEnv.ARIA_STAGING_BASE_URL);
  assert.equal(config.supabaseOrigin, validEnv.SUPABASE_URL);
  assert.equal(config.users.length, 2);
  assert.equal(config.publishableKey, validEnv.SUPABASE_PUBLISHABLE_KEY);
});

test("staging HTTP E2E rejects a production or unrelated Worker origin", () => {
  assert.throws(
    () => parseConfig({ ...validEnv, ARIA_STAGING_BASE_URL: "https://example.com" }),
    /dedicated ARIA staging Worker/
  );
});

test("staging HTTP E2E rejects a non-staging Supabase project", () => {
  assert.throws(
    () => parseConfig({ ...validEnv, SUPABASE_URL: "https://production.supabase.co" }),
    /dedicated ARIA staging project/
  );
});

test("staging HTTP E2E requires a publishable key and two distinct test accounts", () => {
  assert.throws(
    () => parseConfig({ ...validEnv, SUPABASE_PUBLISHABLE_KEY: "service_role_secret" }),
    /publishable key/
  );
  assert.throws(
    () => parseConfig({ ...validEnv, ARIA_TEST_USER_B_EMAIL: validEnv.ARIA_TEST_USER_A_EMAIL }),
    /must be different/
  );
  assert.throws(
    () => parseConfig({ ...validEnv, ARIA_TEST_USER_B_PASSWORD: "short" }),
    /passwords of at least 8 characters/
  );
});
