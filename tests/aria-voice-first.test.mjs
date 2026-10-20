import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import worker from "../cloudflare/aria-brain-staging.mjs";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const css = await readFile(new URL("../voice.css", import.meta.url), "utf8");
const sw = await readFile(new URL("../sw.js", import.meta.url), "utf8");
const workerSource = await readFile(new URL("../cloudflare/aria-brain-staging.mjs", import.meta.url), "utf8");

test("voice-first HUD has no permanent chat composer and the orb is not a control", () => {
  assert.match(html, /id="ariaOrb" role="img"/);
  assert.doesNotMatch(html, /id="ariaOrb"[^>]*role="button"/);
  assert.doesNotMatch(html, /<textarea|id="chatForm"|id="messageInput"/i);
  assert.match(html, /id="transcriptWidget"/);
});

test("first-run onboarding explains voice and personal preferences", () => {
  assert.match(app, /function beginOnboarding/);
  assert.match(app, /proactivity/);
  assert.match(app, /verbosity/);
  assert.match(app, /memoryConsent/);
  assert.match(app, /Quand l'orbe s'anime doucement, je vous écoute/);
  assert.match(app, /Quand sa lumière se concentre, je réfléchis/);
});

test("legacy local ARIA data is purged on first launch and remote deletion is explicit", () => {
  assert.match(app, /aria\.v07\.messages/);
  assert.match(app, /remoteResetPromise/);
  assert.match(app, /method: "DELETE"/);
  assert.match(app, /données locales effacées/i);
});

test("the voice-first stylesheet and cache version are included in the PWA", () => {
  assert.match(sw, /aria-voice-v09-shell-1/);
  assert.match(sw, /"\.\/voice\.css"/);
  assert.match(css, /data-state="listening"/);
  assert.match(css, /prefers-reduced-motion/);
});

test("backend memory deletion requires a valid bearer token and deletes only the requested profile key", async () => {
  const deleted = [];
  const env = {
    ARIA_ACCESS_TOKEN: "test-token",
    OPENAI_API_KEY: "test-key",
    ARIA_MEMORY: {
      async delete(key) { deleted.push(key); },
      async get() { return null; },
      async put() {}
    }
  };
  const clientId = "123e4567-e89b-42d3-a456-426614174000";
  const response = await worker.fetch(new Request(
    "https://aria-brain-staging.quentineros-sevesi.workers.dev/memory?clientId=" + clientId,
    { method: "DELETE", headers: { Origin: "https://neros31415.github.io", Authorization: "Bearer test-token" } }
  ), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { deleted: true, persisted: true });
  assert.deepEqual(deleted, ["memory:v1:" + clientId]);
});

test("backend rejects an invalid token without deleting memory", async () => {
  const deleted = [];
  const env = {
    ARIA_ACCESS_TOKEN: "test-token",
    OPENAI_API_KEY: "test-key",
    ARIA_MEMORY: { async delete(key) { deleted.push(key); }, async get() { return null; }, async put() {} }
  };
  const response = await worker.fetch(new Request(
    "https://aria-brain-staging.quentineros-sevesi.workers.dev/memory?clientId=123e4567-e89b-42d3-a456-426614174000",
    { method: "DELETE", headers: { Origin: "https://neros31415.github.io", Authorization: "Bearer invalid" } }
  ), env);
  assert.equal(response.status, 401);
  assert.deepEqual(deleted, []);
});

test("backend no longer embeds a personal profile", () => {
  assert.doesNotMatch(workerSource, /assistante personnelle de Quentin|centres d’intérêt IA|Quentin utilise principalement/i);
});
