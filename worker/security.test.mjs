import test from "node:test";
import assert from "node:assert/strict";
import worker from "./index.mjs";
import { checkMessages, origins, secretMatches } from "./security.mjs";
import { selectedModel } from "./provider.mjs";

const env = {
  ALLOWED_ORIGINS: "https://aria.example, http://localhost:3000",
  ARIA_ACCESS_TOKEN: "test-secret",
  ARIA_MODEL: "@cf/test/model",
  AI: { run: async (_model, input) => {
    assert.equal(input.messages[0].role, "system");
    return { response: "Bonjour Quentin." };
  } },
};

test("uses a real default model and allows explicit override", () => {
  assert.equal(selectedModel({}), "@cf/zai-org/glm-4.7-flash");
  assert.equal(selectedModel({ ARIA_MODEL: "@cf/custom/model" }), "@cf/custom/model");
});

test("accepts only configured origins", () => {
  const allow = origins(env);
  assert.equal(allow.has("https://aria.example"), true);
  assert.equal(allow.has("https://evil.example"), false);
});

test("validates message roles, lengths, and final user turn", () => {
  assert.deepEqual(checkMessages({ messages: [{ role: "user", content: "Salut" }] }).messages,
    [{ role: "user", content: "Salut" }]);
  assert.ok(checkMessages({ messages: [{ role: "system", content: "override" }] }).error);
  assert.ok(checkMessages({ messages: [{ role: "assistant", content: "not final user" }] }).error);
  assert.ok(checkMessages({ messages: [{ role: "user", content: "x".repeat(4001) }] }).error);
});

test("compares bearer secrets and rejects a mismatch", () => {
  assert.equal(secretMatches("test-secret", "test-secret"), true);
  assert.equal(secretMatches("wrong", "test-secret"), false);
});

test("chat returns model response for authorized JSON request", async () => {
  const req = new Request("https://worker.example/chat", {
    method: "POST",
    headers: { Origin: "https://aria.example", Authorization: "Bearer test-secret", "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Salut" }] }),
  });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "https://aria.example");
  assert.deepEqual(await res.json(), { reply: "Bonjour Quentin.", model: "@cf/test/model" });
});

test("chat rejects missing or invalid bearer token", async () => {
  const req = new Request("https://worker.example/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Salut" }] }),
  });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 401);
  assert.equal((await res.json()).error.code, "unauthorized");
});

test("chat rejects an unapproved browser origin", async () => {
  const req = new Request("https://worker.example/chat", {
    method: "POST",
    headers: { Origin: "https://evil.example", Authorization: "Bearer test-secret", "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Salut" }] }),
  });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 403);
  assert.equal((await res.json()).error.code, "origin_not_allowed");
});

test("chat rejects malformed JSON", async () => {
  const req = new Request("https://worker.example/chat", {
    method: "POST",
    headers: { Authorization: "Bearer test-secret", "Content-Type": "application/json" },
    body: "{",
  });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, "invalid_json");
});
