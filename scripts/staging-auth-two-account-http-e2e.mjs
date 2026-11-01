import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const WORKER_ORIGIN = "https://aria-brain-staging.quentineros-sevesi.workers.dev";
const SUPABASE_ORIGIN = "https://mvcunzhhioeplrvanhgn.supabase.co";

export function parseConfig(env = process.env) {
  if (env.ARIA_RUN_STAGING_E2E !== "true") return { enabled: false };

  let workerUrl;
  let supabaseUrl;
  try {
    workerUrl = new URL(env.ARIA_STAGING_BASE_URL || "");
    supabaseUrl = new URL(env.SUPABASE_URL || "");
  } catch {
    throw new Error("Staging E2E requires valid ARIA_STAGING_BASE_URL and SUPABASE_URL values.");
  }

  if (workerUrl.origin !== WORKER_ORIGIN || workerUrl.pathname !== "/" ||
      workerUrl.search || workerUrl.hash) {
    throw new Error("Refusing to run: ARIA_STAGING_BASE_URL must be the dedicated ARIA staging Worker origin.");
  }
  if (supabaseUrl.origin !== SUPABASE_ORIGIN || supabaseUrl.pathname !== "/" ||
      supabaseUrl.search || supabaseUrl.hash) {
    throw new Error("Refusing to run: SUPABASE_URL must be the dedicated ARIA staging project.");
  }

  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY || "";
  if (!publishableKey.startsWith("sb_publishable_")) {
    throw new Error("SUPABASE_PUBLISHABLE_KEY must contain the staging project's publishable key.");
  }

  const users = [
    { email: (env.ARIA_TEST_USER_A_EMAIL || "").trim(), password: env.ARIA_TEST_USER_A_PASSWORD || "" },
    { email: (env.ARIA_TEST_USER_B_EMAIL || "").trim(), password: env.ARIA_TEST_USER_B_PASSWORD || "" }
  ];
  if (users.some(user => !user.email || user.password.length < 8)) {
    throw new Error("Two dedicated staging test accounts with passwords of at least 8 characters are required.");
  }
  if (users[0].email.toLowerCase() === users[1].email.toLowerCase()) {
    throw new Error("The two staging test accounts must be different.");
  }

  return {
    enabled: true,
    workerOrigin: workerUrl.origin,
    supabaseOrigin: supabaseUrl.origin,
    publishableKey,
    users
  };
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function signIn(config, user) {
  const response = await fetch(config.supabaseOrigin + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: {
      "apikey": config.publishableKey,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({ email: user.email, password: user.password })
  });
  const payload = await readJson(response);
  if (!response.ok || typeof payload?.access_token !== "string" || !payload.access_token) {
    throw new Error("Supabase staging sign-in failed (" + response.status + "). Check the dedicated test account and Auth configuration.");
  }
  if (typeof payload.user?.id !== "string") {
    throw new Error("Supabase staging sign-in did not return a canonical account identity.");
  }
  return { accessToken: payload.access_token, userId: payload.user.id };
}

async function workerRequest(config, path, accessToken, method = "GET", body) {
  const headers = { "Accept": "application/json" };
  if (accessToken) headers.Authorization = "Bearer " + accessToken;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(new URL(path, config.workerOrigin), {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  return { status: response.status, ok: response.ok, payload: await readJson(response) };
}

function requireStatus(result, expected, label) {
  if (result.status !== expected) {
    const code = typeof result.payload?.error === "string" ? "; " + result.payload.error : "";
    throw new Error(label + " returned HTTP " + result.status + " (expected " + expected + ")" + code + ".");
  }
}

async function getConsent(config, token) {
  const result = await workerRequest(config, "/memory/consent", token);
  requireStatus(result, 200, "GET /memory/consent");
  if (result.payload?.persisted !== true || typeof result.payload.enabled !== "boolean") {
    throw new Error("GET /memory/consent returned an invalid consent record.");
  }
  return result.payload.enabled;
}

async function setConsent(config, token, enabled) {
  const result = await workerRequest(config, "/memory/consent", token, "POST", { enabled });
  requireStatus(result, 200, "POST /memory/consent");
  if (result.payload?.persisted !== true || result.payload.enabled !== enabled) {
    throw new Error("POST /memory/consent did not confirm the requested state.");
  }
}

async function getMemories(config, token) {
  const result = await workerRequest(config, "/memory", token);
  requireStatus(result, 200, "GET /memory");
  if (result.payload?.persisted !== true || !Array.isArray(result.payload.memories)) {
    throw new Error("GET /memory returned an invalid memory document.");
  }
  return result.payload.memories;
}

async function deleteMemories(config, token) {
  const result = await workerRequest(config, "/memory", token, "DELETE");
  requireStatus(result, 200, "DELETE /memory");
  if (result.payload?.deleted !== true || result.payload.persisted !== true) {
    throw new Error("DELETE /memory did not confirm deletion.");
  }
}

async function runStagingE2E(config) {
  const healthResult = await workerRequest(config, "/health");
  requireStatus(healthResult, 200, "GET /health");
  const health = healthResult.payload || {};
  if (health.authenticationMode !== "individual" ||
      health.authorizationStore !== true ||
      health.memoryConsentStoreConfigured !== true ||
      health.persistentMemory !== true ||
      health.configured !== true) {
    throw new Error("Staging is not ready for individual-account memory E2E. Expected individual auth, D1 authorization, consent tables and persistent memory.");
  }

  const accounts = await Promise.all(config.users.map(user => signIn(config, user)));
  const originalConsents = [null, null];
  const memoryWriteAttempted = new Set();
  let primaryError = null;

  try {
    for (let i = 0; i < accounts.length; i += 1) {
      originalConsents[i] = await getConsent(config, accounts[i].accessToken);
    }

    // Enable memory only for these dedicated test accounts. The original
    // consent state is restored in finally, including after a failed test.
    for (const account of accounts) await setConsent(config, account.accessToken, true);

    const initialMemories = await Promise.all(accounts.map(account => getMemories(config, account.accessToken)));
    if (initialMemories.some(memories => memories.length !== 0)) {
      throw new Error("Refusing to overwrite existing memory: both dedicated staging test accounts must start with empty memory.");
    }

    const markers = [
      "ARIA_STAGING_E2E_A_" + randomUUID(),
      "ARIA_STAGING_E2E_B_" + randomUUID()
    ];
    for (let i = 0; i < accounts.length; i += 1) {
      memoryWriteAttempted.add(i);
      const result = await workerRequest(config, "/memory", accounts[i].accessToken, "PUT", {
        memories: [{ id: markers[i], text: markers[i], createdAt: Date.now() }]
      });
      requireStatus(result, 200, "PUT /memory");
      if (result.payload?.persisted !== true) throw new Error("PUT /memory did not confirm persistence.");
    }

    const accountAMemories = await getMemories(config, accounts[0].accessToken);
    const accountBMemories = await getMemories(config, accounts[1].accessToken);
    const hasMarker = (memories, marker) => memories.some(item => item?.text === marker);
    if (!hasMarker(accountAMemories, markers[0]) || hasMarker(accountAMemories, markers[1])) {
      throw new Error("Account A memory isolation check failed.");
    }
    if (!hasMarker(accountBMemories, markers[1]) || hasMarker(accountBMemories, markers[0])) {
      throw new Error("Account B memory isolation check failed.");
    }

    // Supplying another account's UUID as a clientId must not change the
    // authenticated owner selected by the Worker.
    const forgedOwnerRead = await workerRequest(
      config,
      "/memory?clientId=" + encodeURIComponent(accounts[0].userId),
      accounts[1].accessToken
    );
    requireStatus(forgedOwnerRead, 200, "cross-account owner override check");
    if (!hasMarker(forgedOwnerRead.payload?.memories || [], markers[1]) ||
        hasMarker(forgedOwnerRead.payload?.memories || [], markers[0])) {
      throw new Error("A client-supplied owner identifier changed the authenticated memory scope.");
    }

    await setConsent(config, accounts[0].accessToken, false);
    const revokedRead = await workerRequest(config, "/memory", accounts[0].accessToken);
    requireStatus(revokedRead, 403, "GET /memory after consent revocation");
    if (revokedRead.payload?.error !== "memory_consent_required") {
      throw new Error("Revoked memory read did not fail with memory_consent_required.");
    }
    const revokedWrite = await workerRequest(config, "/memory", accounts[0].accessToken, "PUT", {
      memories: [{ id: "revoked-write-check", text: "revoked-write-check", createdAt: Date.now() }]
    });
    requireStatus(revokedWrite, 403, "PUT /memory after consent revocation");
    if (revokedWrite.payload?.error !== "memory_consent_required") {
      throw new Error("Revoked memory write did not fail with memory_consent_required.");
    }

    const accountBAfterRevocation = await getMemories(config, accounts[1].accessToken);
    if (!hasMarker(accountBAfterRevocation, markers[1]) || hasMarker(accountBAfterRevocation, markers[0])) {
      throw new Error("Revoking account A changed account B memory.");
    }
  } catch (error) {
    primaryError = error;
  } finally {
    const cleanupErrors = [];
    for (let i = 0; i < accounts.length; i += 1) {
      if (memoryWriteAttempted.has(i)) {
        try {
          await deleteMemories(config, accounts[i].accessToken);
        } catch {
          cleanupErrors.push("memory cleanup failed for test account " + (i === 0 ? "A" : "B"));
        }
      }
      if (originalConsents[i] !== null) {
        try {
          await setConsent(config, accounts[i].accessToken, originalConsents[i]);
        } catch {
          cleanupErrors.push("consent restoration failed for test account " + (i === 0 ? "A" : "B"));
        }
      }
    }
    if (cleanupErrors.length) {
      const cleanupMessage = "Cleanup incomplete: " + cleanupErrors.join("; ") + ". Do not reuse these test accounts until their staging memory and consent states are checked.";
      if (primaryError) throw new Error(primaryError.message + " " + cleanupMessage);
      throw new Error(cleanupMessage);
    }
  }

  if (primaryError) throw primaryError;
  console.log("PASS: staging individual auth, two-account memory isolation, owner-ID override resistance, consent revocation and cleanup.");
}

async function main() {
  const config = parseConfig();
  if (!config.enabled) {
    console.log("SKIP: set ARIA_RUN_STAGING_E2E=true to run the explicit two-account staging HTTP test.");
    return;
  }
  await runStagingE2E(config);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error("ARIA staging E2E failed: " + error.message);
    process.exitCode = 1;
  });
}
