import test from "node:test";
import vm from "node:vm";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import worker from "../cloudflare/aria-brain-staging.mjs";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const css = await readFile(new URL("../voice.css", import.meta.url), "utf8");
const sw = await readFile(new URL("../sw.js", import.meta.url), "utf8");
const workerSource = await readFile(new URL("../cloudflare/aria-brain-staging.mjs", import.meta.url), "utf8");
const visualEngine = await readFile(new URL("../visualization-engine.js", import.meta.url), "utf8");
const supabaseConfig = await readFile(new URL("../supabase-config.js", import.meta.url), "utf8");

const endpoint = "https://aria-brain-staging.quentineros-sevesi.workers.dev";
const clientId = "123e4567-e89b-42d3-a456-426614174000";
const request = (messages, overrides = {}) => new Request(endpoint + "/chat", {
  method: "POST",
  headers: {
    Origin: "https://neros31415.github.io",
    Authorization: "Bearer test-token",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    clientId,
    memoryConsent: false,
    preferences: { proactivity: "balanced", verbosity: "short", humor: "low" },
    messages,
    ...overrides
  })
});
const legacyEnv = (memory = { async get() { return []; }, async put() {}, async delete() {} }) => ({
  ARIA_AUTH_MODE: "legacy",
  ARIA_ACCESS_TOKEN: "test-token",
  OPENAI_API_KEY: "test-key",
  ARIA_MEMORY: memory
});
const providerResponse = (turn) => new Response(JSON.stringify({
  model: "test-model",
  output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(turn) }] }]
}), { status: 200, headers: { "Content-Type": "application/json" } });

test("secure backend readiness reports auth, D1 authorization and persistent-memory bindings", async () => {
  const env = {
    ARIA_AUTH_MODE: "session_kv",
    ARIA_USERS: { async get() { return null; } },
    ARIA_AUTHZ_DB: {},
    ARIA_MEMORY: { async get() { return []; } },
    OPENAI_API_KEY: "test-key"
  };
  const response = await worker.fetch(new Request(endpoint + "/health"), env);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.configured, true);
  assert.equal(body.authenticationMode, "session_kv");
  assert.equal(body.authorizationStore, true);
  assert.equal(body.persistentMemory, false);
  assert.equal(body.memoryStorageConfigured, true);
  assert.equal(body.memoryStatus, "identity_migration_required");
});

test("voice-first HUD loads the scene engine and responsive styles without a permanent chat composer", () => {
  assert.match(html, /href="voice\.css"/);
  assert.match(html, /src="visualization-engine\.js"/);
  assert.match(html, /id="ariaOrb" role="img"/);
  assert.doesNotMatch(html, /<textarea|id="chatForm"|id="messageInput"/i);
  assert.match(html, /id="memoryConsentSetting"/);
  assert.match(sw, /voice\.css/);
  assert.match(sw, /visualization-engine\.js/);
  assert.match(css, /aria-scene-root/);
});

test("voice frontend sends preferences and explicit memory consent and applies structured actions", () => {
  assert.match(app, /memoryConsent: profile\.memoryConsent === true/);
  assert.match(html, /@supabase\/supabase-js@2/);
  assert.match(html, /id="authSignIn"/);
  assert.match(html, /id="authSignUp"/);
  assert.match(html, /id="authReset"/);
  assert.match(app, /signInWithPassword/);
  assert.match(app, /auth\.signUp/);
  assert.match(app, /resetPasswordForEmail/);
  assert.match(app, /updateUser\(\{ password \}\)/);
  assert.match(app, /refreshRemoteMemoryConsent/);
  assert.match(app, /memoryStorageKey = userId \?/);
  assert.match(html, /id="authUpdatePassword"/);
  assert.match(app, /hashParams\.get\("type"\) === "recovery"/);
  assert.match(app, /memory\/consent/);
  assert.match(app, /method: "DELETE"/);
  assert.match(app, /memoryStorageKey, "\[\]"/);
  assert.match(app, /autoRefreshToken: true/);
  assert.doesNotMatch(html, /apiTokenSetting|Jeton d’accès alpha/);
  assert.match(sw, /supabase-config\.js/);
  assert.match(supabaseConfig, /mvcunzhhioeplrvanhgn\.supabase\.co/);
  assert.match(supabaseConfig, /sb_publishable_/);
  assert.doesNotMatch(supabaseConfig, /sb_secret_/i);
  assert.doesNotMatch(supabaseConfig, /service_role["']?\\s*:/i);
  assert.match(app, /preferences: \{/);
  assert.match(app, /function applyIntentAction/);
  assert.match(app, /"finance"/);
  assert.match(app, /scientific_model/);
});

test("memory consent revocation aborts pending requests and ignores stale remote responses", () => {
  assert.ok(app.includes("const activeMemoryControllers = new Set();"));
  assert.ok(app.includes("memorySyncGeneration += 1;"));
  assert.ok(app.includes("for (const controller of activeMemoryControllers) controller.abort();"));
  assert.ok(app.includes("signal: controller.signal"));
  assert.ok(app.includes("if (!isMemoryRequestCurrent(generation)) return"));
  assert.ok(app.includes("if (previousMemoryConsent && !profile.memoryConsent)"));
  assert.ok(app.includes("Requête mémoire interrompue : l’application ignore sa réponse."));
  assert.ok(app.includes("L’état distant peut être incertain si le serveur avait déjà traité la requête"));
});

test("map, finance and science scenes use real external sources and disclose their limitations", () => {
  assert.match(visualEngine, /tile\.openstreetmap\.org/);
  assert.match(visualEngine, /nominatim\.openstreetmap\.org\/search/);
  assert.match(visualEngine, /routing\.openstreetmap\.de\//);
  assert.match(visualEngine, /s\.tradingview\.com\/widgetembed/);
  assert.match(visualEngine, /images-api\.nasa\.gov\/search/);
  assert.match(visualEngine, /pas un conseil financier/);
  assert.match(visualEngine, /pas un simulateur scientifique/i);
  assert.match(visualEngine, /aucune géolocalisation automatique/i);
});

test("scene responses are structured and only allow known actions and scenes", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => providerResponse({
    reply: "J’ouvre le graphique.",
    action: "open_visualization",
    scene: "finance"
  });
  try {
    const response = await worker.fetch(request([{ role: "user", content: "Ouvre la finance." }]), legacyEnv());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      reply: "J’ouvre le graphique.",
      action: "open_visualization",
      scene: "finance",
      model: "test-model"
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("backend rejects invalid provider action output instead of forwarding it to the UI", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => providerResponse({
    reply: "J’exécute une action inconnue.",
    action: "run_shell",
    scene: "finance"
  });
  try {
    const response = await worker.fetch(request([{ role: "user", content: "Ouvre la finance." }]), legacyEnv());
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: "invalid_provider_output" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("memory consent disabled prevents persistent-memory reads and writes in chat", async () => {
  let reads = 0;
  let writes = 0;
  const memory = {
    async get() { reads++; return [{ id: "private", text: "secret memory" }]; },
    async put() { writes++; },
    async delete() {}
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    const instructions = JSON.parse(options.body).instructions;
    assert.match(instructions, /Mémoire personnelle désactivée/);
    assert.doesNotMatch(instructions, /secret memory/);
    return providerResponse({ reply: "Je ne l’enregistre pas.", action: "none", scene: "none" });
  };
  try {
    const response = await worker.fetch(request([{ role: "user", content: "Mémorise que le ciel est bleu." }], { memoryConsent: false }), legacyEnv(memory));
    assert.equal(response.status, 200);
    assert.equal(reads, 0);
    assert.equal(writes, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("invalid bearer tokens are rejected before contacting the model provider", async () => {
  const originalFetch = globalThis.fetch;
  let providerCalls = 0;
  globalThis.fetch = async () => { providerCalls++; return providerResponse({ reply: "non", action: "none", scene: "none" }); };
  try {
    const req = new Request(endpoint + "/chat", {
      method: "POST",
      headers: { Origin: "https://neros31415.github.io", Authorization: "Bearer wrong-token", "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, messages: [{ role: "user", content: "Bonjour" }] })
    });
    const response = await worker.fetch(req, legacyEnv());
    assert.equal(response.status, 401);
    assert.equal(providerCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("async scene guards prevent stale map, finance or NASA responses from replacing a newer scene", () => {
  assert.match(visualEngine, /let sceneEpoch = 0/);
  assert.match(visualEngine, /sceneId !== sceneEpoch \|\| !activeMap \|\| viewport\.dataset\.scene !== "map"/);
  assert.match(visualEngine, /sceneId !== sceneEpoch \|\| viewport\.dataset\.scene !== "scientific_model"/);
  assert.match(visualEngine, /sceneId === sceneEpoch && viewport\.dataset\.scene === "finance"/);
  assert.match(visualEngine, /function close\(\) \{\s*sceneEpoch\+\+/);
  assert.match(visualEngine, /script\.onerror = \(\) => \{ script\.remove\(\); reject\(/);
});

test("individual auth accepts the publishable API key without requiring a legacy anon key", async () => {
  const originalFetch = globalThis.fetch;
  const identity = "123e4567-e89b-42d3-a456-426614174000";
  let authCalls = 0;
  globalThis.fetch = async (url, options) => {
    if (String(url).endsWith("/auth/v1/user")) {
      authCalls++;
      assert.equal(options.headers.apikey, "sb_publishable_test");
      assert.equal(options.headers.Authorization, "Bearer valid-user-token");
      return new Response(JSON.stringify({ id: identity }), { status: 200 });
    }
    return providerResponse({ reply:"Authentifié.", action:"none", scene:"none" });
  };
  try {
    const db = {
      prepare() {
        return {
          bind() { return this; },
          async first() { return { userId:identity, role:"user", active:1 }; },
          async run() { return { success:true, meta:{changes:1} }; }
        };
      },
      async batch() { return [{success:true},{success:true}]; }
    };
    const env = {
      ARIA_AUTH_MODE: "individual",
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      ARIA_AUTHZ_DB: db,
      OPENAI_API_KEY: "test-key"
    };
    const response = await worker.fetch(new Request(endpoint + "/chat", {
      method:"POST",
      headers:{ Authorization:"Bearer valid-user-token", "Content-Type":"application/json" },
      body:JSON.stringify({messages:[{role:"user",content:"Bonjour"}],memoryConsent:false})
    }), env);
    assert.equal(response.status, 200);
    assert.equal(authCalls, 1);
    assert.equal((await response.json()).reply, "Authentifié.");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("latest secure Worker retains D1 authorization and hashed session-token lookup", () => {
  assert.match(workerSource, /authorizeFromD1/);
  assert.match(workerSource, /ensureDefaultUserRole/);
  assert.match(workerSource, /session:v1:/);
  assert.match(workerSource, /authorization_store_unavailable/);
  assert.match(workerSource, /ARIA_AUTHZ_DB/);
});


test("science scene includes a local interactive orbital simulation alongside the NASA catalogue", () => {
  assert.match(visualEngine, /Système solaire/);
  assert.match(visualEngine, /Simulation orbitale pédagogique exécutée localement/);
  assert.match(visualEngine, /period: 365\.256/);
  assert.match(visualEngine, /period: 60190/);
  assert.match(visualEngine, /Vitesse de simulation/);
  assert.match(visualEngine, /Réinitialiser/);
  assert.match(visualEngine, /aria-label", "Simulation animée des orbites du Soleil et des huit planètes/);
  assert.match(visualEngine, /function drawSolarSystem/);
  assert.match(visualEngine, /tailles et distances ne sont pas à l’échelle/i);
  assert.match(css, /aria-solar-canvas/);
  assert.match(css, /aria-scene-tabs/);
});


test("finance scene provides a local manual portfolio tracker with explicit data and risk disclosures", () => {
  assert.match(visualEngine, /aria\.finance\.portfolio\.v1/);
  assert.match(visualEngine, /Capital investi/);
  assert.match(visualEngine, /Valeur estimée/);
  assert.match(visualEngine, /Gain \/ perte latent/);
  assert.match(visualEngine, /Mettre à jour le prix/);
  assert.match(visualEngine, /aucune connexion à un courtier/i);
  assert.match(visualEngine, /pas envoyées au serveur ARIA/);
  assert.match(visualEngine, /aucune conversion de devise/i);
  assert.match(visualEngine, /Effacer le portefeuille/);
  assert.match(css, /aria-portfolio-summary/);
  assert.match(css, /aria-portfolio-form/);
});


test("map route guidance renders localized steps, distance, duration and a clear-route control", () => {
  assert.match(visualEngine, /steps=true/);
  assert.match(visualEngine, /Étapes du trajet/);
  assert.match(visualEngine, /Effacer l’itinéraire/);
  assert.match(visualEngine, /aria-route-summary/);
  assert.match(visualEngine, /aria-route-steps/);
  assert.match(visualEngine, /const formatDistance =/);
  assert.match(visualEngine, /const formatDuration =/);
  assert.match(visualEngine, /const maneuverText =/);
  assert.match(visualEngine, /ITINÉRAIRE CALCULÉ/);
  assert.match(css, /aria-map-layout/);
  assert.match(css, /aria-route-panel/);
});

test("memory consent revocation ignores a late remote response at runtime", async () => {
  const syncStart = app.indexOf("async function syncRemoteMemory()");
  const syncEnd = app.indexOf("function closePanel(id)", syncStart);
  assert.ok(syncStart >= 0 && syncEnd > syncStart, "memory sync functions must be present");
  const memoryFunctions = app.slice(syncStart, syncEnd);

  let resolveFetch;
  const storageWrites = [];
  const elements = { memoryStatus: { textContent: "" } };
  const context = {
    profile: { memoryConsent: true },
    memories: [{ text: "local memory" }],
    memorySyncGeneration: 0,
    isMemoryRequestCurrent: (generation) => generation === context.memorySyncGeneration && context.profile.memoryConsent === true,
    activeMemoryControllers: new Set(),
    API_BASE: endpoint,
    getApiToken: () => "test-token",
    getClientId: () => clientId,
    $: (id) => elements[id] || (elements[id] = { textContent: "" }),
    localStorage: { setItem: (...args) => storageWrites.push(args) },
    renderMemory: () => {},
    fetch: (_url, options) => {
      context.requestSignal = options.signal;
      return new Promise((resolve) => { resolveFetch = resolve; });
    },
    AbortController,
    encodeURIComponent,
    console
  };
  vm.createContext(context);
  vm.runInContext(memoryFunctions, context);

  const syncPromise = vm.runInContext("syncRemoteMemory()", context);
  assert.equal(context.activeMemoryControllers.size, 1);
  const controllerSignal = context.requestSignal;
  context.profile.memoryConsent = false;
  context.memorySyncGeneration += 1;
  for (const controller of context.activeMemoryControllers) controller.abort();
  context.activeMemoryControllers.clear();
  assert.equal(controllerSignal.aborted, true);

  // Simulate a fetch implementation/network response that completes despite abort.
  resolveFetch({
    ok: true,
    status: 200,
    async json() { return { memories: [{ text: "stale remote memory" }] }; }
  });
  await syncPromise;

  assert.deepEqual(context.memories, [{ text: "local memory" }]);
  assert.equal(storageWrites.length, 0, "stale response must not write localStorage");
  assert.equal(context.activeMemoryControllers.size, 0);
});

test("memory consent revocation ignores a late remote write response at runtime", async () => {
  const syncStart = app.indexOf("async function syncRemoteMemory()");
  const syncEnd = app.indexOf("function closePanel(id)", syncStart);
  assert.ok(syncStart >= 0 && syncEnd > syncStart, "memory sync functions must be present");
  const memoryFunctions = app.slice(syncStart, syncEnd);

  let resolveFetch;
  const storageWrites = [];
  const elements = { memoryStatus: { textContent: "" } };
  const context = {
    profile: { memoryConsent: true },
    memories: [{ text: "local memory after edit" }],
    memorySyncGeneration: 0,
    isMemoryRequestCurrent: (generation) => generation === context.memorySyncGeneration && context.profile.memoryConsent === true,
    activeMemoryControllers: new Set(),
    API_BASE: endpoint,
    getApiToken: () => "test-token",
    getClientId: () => clientId,
    $: (id) => elements[id] || (elements[id] = { textContent: "" }),
    localStorage: { setItem: (...args) => storageWrites.push(args) },
    renderMemory: () => {},
    fetch: (_url, options) => {
      context.requestSignal = options.signal;
      context.requestOptions = options;
      return new Promise((resolve) => { resolveFetch = resolve; });
    },
    AbortController,
    encodeURIComponent,
    console
  };
  vm.createContext(context);
  vm.runInContext(memoryFunctions, context);

  const savePromise = vm.runInContext("saveRemoteMemory()", context);
  assert.equal(context.activeMemoryControllers.size, 1);
  assert.equal(context.requestOptions.method, "PUT");
  const controllerSignal = context.requestSignal;
  context.profile.memoryConsent = false;
  context.memorySyncGeneration += 1;
  for (const controller of context.activeMemoryControllers) controller.abort();
  context.activeMemoryControllers.clear();
  assert.equal(controllerSignal.aborted, true);

  // Simulate a write request that was already received by the server before abort.
  resolveFetch({
    ok: true,
    status: 200,
    async json() { return { persisted: true, memories: [{ text: "stale remote write" }] }; }
  });
  assert.equal(await savePromise, false);

  assert.deepEqual(context.memories, [{ text: "local memory after edit" }]);
  assert.equal(storageWrites.length, 0, "stale write response must not overwrite localStorage");
  assert.equal(context.activeMemoryControllers.size, 0);
});


test("Supabase Auth initialization handles missing config and preserves retry after session restoration failure", () => {
  assert.match(app, /async function initializeSupabaseAuth\(\)[\s\S]*?try \{/);
  assert.match(app, /if \(error\) throw error;/);
  const listenerIndex = app.indexOf("onAuthStateChange((event, session) =>");
  const restoreIndex = app.indexOf("auth.getSession()", app.indexOf("async function initializeSupabaseAuth"));
  assert.ok(listenerIndex >= 0 && restoreIndex > listenerIndex, "auth listener must be registered before session restoration");
  assert.match(app, /catch \(error\) \{[\s\S]*?if \(!supabaseClient\) \{[\s\S]*?updateAuthUi\(null\);[\s\S]*?Vous pouvez réessayer/);
  assert.match(app, /finally \{[\s\S]*?authReady = true;[\s\S]*?setAuthBusy\(false\)/);
  assert.match(app, /Authentification indisponible : configuration publique Supabase absente/);
});

test("Supabase Auth actions guard duplicate submissions and always release loading state", () => {
  assert.match(app, /let authOperationInFlight = false/);
  assert.match(app, /if \(authOperationInFlight\) return/);
  assert.match(app, /setAuthBusy\(true, mode === "signup"/);
  assert.match(app, /catch \(error\) \{\s*setAuthStatus\(authFailureMessage\(error\)\);\s*\}\s*finally \{\s*authOperationInFlight = false;\s*setAuthBusy\(false\);/);
  assert.match(app, /function setAuthBusy\(busy, message = ""\)/);
  assert.match(app, /control\.disabled = busy/);
  assert.match(app, /dialog\.setAttribute\("aria-busy", String\(busy\)\)/);
});

test("Supabase Auth network failures are reported without leaking provider details", () => {
  assert.match(app, /function authFailureMessage\(error\)/);
  assert.match(app, /Connexion impossible\. Vérifiez votre réseau puis réessayez\./);
  assert.match(app, /L’authentification a échoué\. Vérifiez vos informations puis réessayez\./);
  assert.match(app, /async function updateRecoveredPassword\(\)[\s\S]*?catch \(error\)/);
  assert.match(app, /authLogout[\s\S]*?catch \(error\)/);
});


test("Supabase Auth remains usable after transient getSession network failure", async () => {
  const initStart = app.indexOf("async function initializeSupabaseAuth()");
  const initEnd = app.indexOf("function activateUserMemoryScope", initStart);
  const submitStart = app.indexOf("async function submitEmailPasswordAuth(mode)");
  const submitEnd = app.indexOf("async function updateRecoveredPassword()", submitStart);
  assert.ok(initStart >= 0 && initEnd > initStart);
  assert.ok(submitStart >= 0 && submitEnd > submitStart);

  const authSource = app.slice(initStart, initEnd) + "\n" + app.slice(submitStart, submitEnd);
  let authListener = null;
  let signInCalls = 0;
  const session = {
    access_token: "fresh-session-token",
    user: { id: "123e4567-e89b-42d3-a456-426614174000", email: "test@example.com" }
  };
  const client = {
    auth: {
      async getSession() { throw new Error("network request failed"); },
      onAuthStateChange(callback) { authListener = callback; return { data: { subscription: { unsubscribe() {} } } }; },
      async signInWithPassword() {
        signInCalls += 1;
        authListener?.("SIGNED_IN", session);
        return { data: { session }, error: null };
      }
    }
  };
  const elements = {
    authEmail: { value: "test@example.com" },
    authPassword: { value: "CorrectHorseBatteryStaple" },
    authDialog: { close() { this.closed = true; } }
  };
  const context = {
    supabaseClient: null,
    supabaseAccessToken: "",
    authReady: false,
    authStateGeneration: 0,
    authScopeInitialized: false,
    authOperationInFlight: false,
    activeAuthUserId: null,
    passwordRecoveryMode: false,
    conversation: [],
    window: {
      ARIA_SUPABASE_CONFIG: { url: "https://example.supabase.co", publishableKey: "sb_publishable_test" },
      supabase: { createClient() { return client; } }
    },
    $: (id) => elements[id] || (elements[id] = { textContent: "", hidden: false, setAttribute() {} }),
    setAuthBusy() {},
    setAuthStatus(message) { context.lastAuthStatus = message; },
    authFailureMessage(error) { return /network/i.test(error.message) ? "Connexion impossible." : "Échec."; },
    updateAuthUi(sessionValue) { context.authUiSession = sessionValue; },
    activateUserMemoryScope(userId) { context.activeAuthUserId = userId; context.authScopeInitialized = true; },
    refreshRemoteMemoryConsent() { return Promise.resolve(); },
    openAuthDialog() {},
    document: undefined
  };
  vm.createContext(context);
  vm.runInContext(authSource, context);

  await vm.runInContext("initializeSupabaseAuth()", context);
  assert.ok(context.supabaseClient, "the created Supabase client must remain available for retry");
  assert.equal(typeof authListener, "function", "auth state listener must be registered before session restoration");
  assert.match(context.lastAuthStatus, /Vous pouvez réessayer/);
  assert.equal(context.authScopeInitialized, false, "personal account scope must remain locked after failed session restoration");

  await vm.runInContext('submitEmailPasswordAuth("signin")', context);
  assert.equal(signInCalls, 1, "the user must be able to retry sign-in without reloading the page");
  assert.equal(context.supabaseAccessToken, "fresh-session-token", "the auth event must update the bearer token");
  assert.equal(context.activeAuthUserId, session.user.id, "the auth event must activate the correct account scope");
  assert.equal(context.authScopeInitialized, true, "successful sign-in must unlock the authenticated account scope");
  assert.equal(elements.authDialog.closed, true);
});


test("account preferences and onboarding progress are isolated per authenticated user", () => {
  const defaultStart = app.indexOf("function defaultProfile()");
  const defaultEnd = app.indexOf("function setState(", defaultStart);
  const scopeStart = app.indexOf("function activateUserMemoryScope(userId)");
  const scopeEnd = app.indexOf("async function refreshRemoteMemoryConsent()", scopeStart);
  assert.ok(defaultStart >= 0 && defaultEnd > defaultStart);
  assert.ok(scopeStart >= 0 && scopeEnd > scopeStart);

  const storage = new Map();
  const localStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  };
  const context = {
    KEYS: { memory: "aria.memory", profile: "aria.profile", onboarded: "aria.onboarded" },
    profileStorageKey: "aria.profile",
    onboardedStorageKey: "aria.onboarded",
    memoryStorageKey: "aria.memory",
    activeAuthUserId: null,
    profile: null,
    memories: [],
    onboarding: false,
    localStorage,
    cancelRemoteMemoryRequests() {},
    safeRead(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
    },
    renderMemory() {},
    finishSetupIfReturning() {},
    announceVisual() {}
  };
  vm.createContext(context);
  vm.runInContext(app.slice(defaultStart, defaultEnd) + "\n" + app.slice(scopeStart, scopeEnd), context);

  vm.runInContext('activateUserMemoryScope("account-A")', context);
  assert.equal(context.profileStorageKey, "aria.profile.user.account-A");
  assert.equal(context.onboardedStorageKey, "aria.onboarded.user.account-A");
  context.profile.proactivity = "proactive";
  context.profile.memoryConsent = true;
  vm.runInContext("saveProfile()", context);
  localStorage.setItem(context.onboardedStorageKey, "done");

  vm.runInContext('activateUserMemoryScope("account-B")', context);
  assert.equal(context.profile.proactivity, "balanced", "account B must not inherit account A preferences");
  assert.equal(context.profile.memoryConsent, false, "memory consent must fail closed on account switch");
  assert.equal(localStorage.getItem("aria.onboarded.user.account-B"), null, "account B must have its own onboarding state");
  context.profile.humor = "frequent";
  vm.runInContext("saveProfile()", context);
  localStorage.setItem(context.onboardedStorageKey, "skipped");

  vm.runInContext('activateUserMemoryScope("account-A")', context);
  assert.equal(context.profile.proactivity, "proactive");
  assert.equal(localStorage.getItem("aria.onboarded.user.account-A"), "done");
  vm.runInContext('activateUserMemoryScope("account-B")', context);
  assert.equal(context.profile.humor, "frequent");
  assert.equal(localStorage.getItem("aria.onboarded.user.account-B"), "skipped");
});

test("clearing one signed-in account's local ARIA data preserves other accounts", () => {
  const start = app.indexOf("function clearLocalAccountData()");
  const end = app.indexOf("function updateAuthUi", start);
  assert.ok(start >= 0 && end > start);
  const storage = (initial = {}) => {
    const target = { ...initial };
    Object.defineProperties(target, {
      getItem: { value(key) { return Object.prototype.hasOwnProperty.call(this, key) ? this[key] : null; } },
      setItem: { value(key, value) { this[key] = String(value); } },
      removeItem: { value(key) { delete this[key]; } }
    });
    return target;
  };
  const localStorage = storage({
    "aria.memory.user.account-A": "[{\"text\":\"A\"}]",
    "aria.profile.user.account-A": "{\"proactivity\":\"proactive\"}",
    "aria.onboarded.user.account-A": "done",
    "aria.memory.user.account-B": "[{\"text\":\"B\"}]",
    "aria.profile.user.account-B": "{\"proactivity\":\"discrete\"}",
    "aria.onboarded.user.account-B": "done",
    "aria.v07.memoryClientId": "legacy-client"
  });
  const sessionStorage = storage({ "aria.session.accessToken": "legacy-token", "aria.voice.alphaToken": "legacy-alpha" });
  const context = {
    memoryStorageKey: "aria.memory.user.account-A",
    profileStorageKey: "aria.profile.user.account-A",
    onboardedStorageKey: "aria.onboarded.user.account-A",
    activeAuthUserId: "account-A",
    profile: { proactivity: "balanced", verbosity: "balanced", humor: "balanced", memoryConsent: false },
    memory: "unused",
    memories: [],
    KEYS: { reset: "aria.reset" },
    SESSION_TOKEN_KEY: "aria.voice.alphaToken",
    localStorage,
    sessionStorage
  };
  vm.createContext(context);
  vm.runInContext(app.slice(start, end), context);
  vm.runInContext("clearLocalAccountData()", context);

  assert.equal(localStorage.getItem("aria.memory.user.account-A"), "[]");
  assert.equal(JSON.parse(localStorage.getItem("aria.profile.user.account-A")).memoryConsent, false);
  assert.equal(localStorage.getItem("aria.onboarded.user.account-A"), null);
  assert.equal(localStorage.getItem("aria.memory.user.account-B"), "[{\"text\":\"B\"}]");
  assert.equal(localStorage.getItem("aria.profile.user.account-B"), "{\"proactivity\":\"discrete\"}");
  assert.equal(localStorage.getItem("aria.onboarded.user.account-B"), "done");
  assert.equal(localStorage.getItem("aria.v07.memoryClientId"), "legacy-client");
  assert.equal(sessionStorage.getItem("aria.session.accessToken"), "legacy-token");
  assert.equal(sessionStorage.getItem("aria.voice.alphaToken"), "legacy-alpha");
});


test("a newer auth event wins over a stale session restoration snapshot", async () => {
  const initStart = app.indexOf("async function initializeSupabaseAuth()");
  const initEnd = app.indexOf("function activateUserMemoryScope", initStart);
  assert.ok(initStart >= 0 && initEnd > initStart);
  const authSource = app.slice(initStart, initEnd);

  let authListener = null;
  let resolveSession;
  const freshSession = {
    access_token: "fresh-event-token",
    user: { id: "123e4567-e89b-42d3-a456-426614174001", email: "new@example.com" }
  };
  const client = {
    auth: {
      getSession() {
        return new Promise(resolve => { resolveSession = resolve; });
      },
      onAuthStateChange(callback) {
        authListener = callback;
        return { data: { subscription: { unsubscribe() {} } } };
      }
    }
  };
  const elements = {};
  const context = {
    supabaseClient: null,
    supabaseAccessToken: "",
    authReady: false,
    authStateGeneration: 0,
    authScopeInitialized: false,
    activeAuthUserId: null,
    passwordRecoveryMode: false,
    conversation: [],
    window: {
      ARIA_SUPABASE_CONFIG: { url: "https://example.supabase.co", publishableKey: "sb_publishable_test" },
      supabase: { createClient() { return client; } }
    },
    $: id => elements[id] || (elements[id] = { textContent: "", hidden: false, setAttribute() {} }),
    setAuthBusy() {},
    setAuthStatus(message) { context.lastAuthStatus = message; },
    authFailureMessage() { return "Connexion impossible."; },
    updateAuthUi(session) { context.authUiSession = session; },
    activateUserMemoryScope(userId) {
      context.activeAuthUserId = userId;
      context.authScopeInitialized = true;
    },
    refreshRemoteMemoryConsent() { return Promise.resolve(); },
    openAuthDialog() {}
  };
  vm.createContext(context);
  vm.runInContext(authSource, context);

  const initialization = vm.runInContext("initializeSupabaseAuth()", context);
  assert.equal(typeof authListener, "function");
  authListener("SIGNED_IN", freshSession);
  assert.equal(context.supabaseAccessToken, "fresh-event-token");
  assert.equal(context.activeAuthUserId, freshSession.user.id);

  resolveSession({ data: { session: null }, error: null });
  await initialization;
  assert.equal(context.supabaseAccessToken, "fresh-event-token", "stale null snapshot must not erase the newer token");
  assert.equal(context.activeAuthUserId, freshSession.user.id, "stale snapshot must not switch the account scope");
  assert.equal(context.authUiSession, freshSession, "stale snapshot must not overwrite the newer auth UI state");
});

test("personal profile and memory remain hidden until the authenticated scope is restored", () => {
  assert.match(app, /let authScopeInitialized = false/);
  assert.match(app, /let profile = defaultProfile\(\);\s*let memories = \[\];/);
  assert.match(app, /if \(id === "memoryPanel" && !authScopeInitialized\)/);
  assert.match(app, /settingsBtn[\s\S]*?if \(!authScopeInitialized\)/);
  assert.match(app, /voiceStart[\s\S]*?if \(!authScopeInitialized\)/);
  assert.match(app, /authScopeInitialized = true/);
  assert.doesNotMatch(app, /finishSetupIfReturning\(\);\s*$/);
});

test("memory drawer does not open while account scope is unresolved", () => {
  const start = app.indexOf("function openPanel(id)");
  const end = app.indexOf("async function syncRemoteMemory()", start);
  assert.ok(start >= 0 && end > start);
  const source = app.slice(start, end);
  const elements = {
    memoryPanel: { hidden: true },
    memoryStatus: { textContent: "" }
  };
  const context = {
    authScopeInitialized: false,
    $: id => elements[id],
    renderMemory() {},
    syncRemoteMemory() {}
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  vm.runInContext('openPanel("memoryPanel")', context);
  assert.equal(elements.memoryPanel.hidden, true);
  assert.match(elements.memoryStatus.textContent, /session n'est pas encore restaurée/);
});
