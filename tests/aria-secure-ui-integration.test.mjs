import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import worker from "../cloudflare/aria-brain-staging.mjs";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const css = await readFile(new URL("../voice.css", import.meta.url), "utf8");
const sw = await readFile(new URL("../sw.js", import.meta.url), "utf8");
const workerSource = await readFile(new URL("../cloudflare/aria-brain-staging.mjs", import.meta.url), "utf8");
const visualEngine = await readFile(new URL("../visualization-engine.js", import.meta.url), "utf8");

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
  assert.equal(body.persistentMemory, true);
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
  assert.match(app, /preferences: \{/);
  assert.match(app, /function applyIntentAction/);
  assert.match(app, /"finance"/);
  assert.match(app, /scientific_model/);
});

test("map, finance and science scenes use real external sources and disclose their limitations", () => {
  assert.match(visualEngine, /tile\.openstreetmap\.org/);
  assert.match(visualEngine, /nominatim\.openstreetmap\.org\/search/);
  assert.match(visualEngine, /routing\.openstreetmap\.de\//);
  assert.match(visualEngine, /s\.tradingview\.com\/widgetembed/);
  assert.match(visualEngine, /images-api\.nasa\.gov\/search/);
  assert.match(visualEngine, /pas un conseil financier/);
  assert.match(visualEngine, /ne constitue pas un laboratoire de simulation scientifique/i);
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

test("latest secure Worker retains D1 authorization and hashed session-token lookup", () => {
  assert.match(workerSource, /authorizeFromD1/);
  assert.match(workerSource, /ensureDefaultUserRole/);
  assert.match(workerSource, /session:v1:/);
  assert.match(workerSource, /authorization_store_unavailable/);
  assert.match(workerSource, /ARIA_AUTHZ_DB/);
});
