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
  assert.match(app, /const affirmative =/);
  assert.match(app, /const negative =/);
  assert.match(app, /Souhaitez-vous autoriser la mémoire : oui ou non/);
  assert.match(app, /Vous pouvez aussi dire « passer »/);
  assert.match(app, /profile\.memoryConsent = affirmative/);
  assert.match(html, /id="memoryConsentSetting" type="checkbox"/);
  assert.match(app, /profile\.memoryConsent = \$\("memoryConsentSetting"\)\.checked/);
  assert.match(app, /memoryConsent: profile\.memoryConsent === true/);
  assert.match(app, /preferences: \{/);
});

test("legacy local ARIA data is purged on first launch and remote deletion is explicit", () => {
  assert.match(app, /aria\.v07\.messages/);
  assert.match(app, /remoteResetPromise/);
  assert.match(app, /sessionStorage\.removeItem\(SESSION_TOKEN_KEY\)/);
  assert.match(app, /method: "DELETE"/);
  assert.match(app, /Mémoire locale effacée/i);
});

test("the voice-first stylesheet and cache version are included in the PWA", () => {
  assert.match(sw, /aria-voice-v09-shell-1/);
  assert.match(sw, /"\.\/voice\.css"/);
  assert.match(css, /data-state="listening"/);
  assert.match(css, /prefers-reduced-motion/);
});

test("frontend calls the real chat endpoint and keeps alpha credentials in session storage", () => {
  assert.match(app, /const API_BASE = "https:\/\/aria-brain-staging\.quentineros-sevesi\.workers\.dev"/);
  assert.match(app, /async function requestAriaReply/);
  assert.match(app, /fetch\(API_BASE \+ "\/chat"/);
  assert.match(app, /sessionStorage\.setItem\(SESSION_TOKEN_KEY, token\)/);
  assert.doesNotMatch(app, /localStorage\.setItem\(SESSION_TOKEN_KEY/);
  assert.match(html, /id="apiTokenSetting" type="password"/);
  assert.match(app, /clientId: getClientId\(\)/);
  assert.match(app, /async function syncRemoteMemory/);
  assert.match(app, /async function saveRemoteMemory/);
  assert.match(app, /localStorage\.removeItem\(KEYS\.clientId\)/);
  assert.match(app, /clientIdsToDelete = \[\.\.\.new Set\(\[currentClientId, oldClientId\]/);
  assert.match(app, /memories: memories\.map\(item => typeof item === "string" \? \{text:item\} : item\)/);
});

test("voice turns are serialized, abortable, and cannot speak after the user pauses", () => {
  assert.match(app, /let turnInProgress = false/);
  assert.match(app, /let turnGeneration = 0/);
  assert.match(app, /let activeChatController = null/);
  assert.match(app, /if \(speaking \|\| requestInFlight \|\| turnInProgress\) return/);
  assert.match(app, /activeChatController\.abort\(\)/);
  assert.match(app, /signal:activeChatController\.signal/);
  assert.match(app, /thisTurn !== turnGeneration/);
  assert.match(app, /"audio-capture": "Aucun microphone utilisable/);
  assert.match(app, /"language-not-supported": "La reconnaissance vocale française/);
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

test("contextual HUD widgets are responsive, explicit, and do not claim a real 3D scene", () => {
  assert.match(html, /id="contextWidget"/);
  assert.match(html, /id="sceneToolsWidget"/);
  assert.match(html, /id="contextClose"/);
  assert.match(app, /function showContextWidgets/);
  assert.match(app, /function hideContextWidgets/);
  assert.match(app, /La scène 3D réelle n’est pas encore connectée/);
  assert.match(app, /AUCUNE DONNÉE EXTERNE/);
  assert.match(css, /\.context-widget\[hidden\]/);
  assert.match(css, /@media\(max-width:800px\)/);
  assert.match(css, /prefers-reduced-motion/);
});

test("backend never reads or writes persistent memories when consent is disabled", async () => {
  const writes = [];
  const reads = [];
  const env = {
    ARIA_ACCESS_TOKEN: "test-token",
    OPENAI_API_KEY: "test-key",
    ARIA_MEMORY: {
      async delete() {},
      async get(key) { reads.push(key); return [{id:"existing",text:"private memory"}]; },
      async put(key, value) { writes.push({key,value}); }
    }
  };
  const originalFetch = globalThis.fetch;
  let providerRequest;
  globalThis.fetch = async (_url, options) => {
    providerRequest = JSON.parse(options.body);
    return new Response(JSON.stringify({
      model:"test-model",
      output:[{type:"message",content:[{type:"output_text",text:"Je ne l’ai pas mémorisé."}]}]
    }), {status:200,headers:{"Content-Type":"application/json"}});
  };
  try {
    const response = await worker.fetch(new Request(
      "https://aria-brain-staging.quentineros-sevesi.workers.dev/chat",
      {
        method:"POST",
        headers:{Origin:"https://neros31415.github.io",Authorization:"Bearer test-token","Content-Type":"application/json"},
        body:JSON.stringify({
          clientId:"123e4567-e89b-42d3-a456-426614174000",
          memoryConsent:false,
          messages:[{role:"user",content:"Retiens que je préfère le thé."}]
        })
      }
    ), env);
    assert.equal(response.status, 200);
    assert.deepEqual(writes, []);
    assert.deepEqual(reads, []);
    assert.match(providerRequest.instructions, /Mémoire personnelle désactivée par l’utilisateur/);
    assert.match(providerRequest.instructions, /aucune information n’a été enregistrée/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("backend no longer embeds a personal profile", () => {
  assert.doesNotMatch(workerSource, /assistante personnelle de Quentin|centres d’intérêt IA|Quentin utilise principalement/i);
});
