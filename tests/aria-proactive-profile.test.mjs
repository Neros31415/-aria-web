import test from "node:test";
import assert from "node:assert/strict";
import worker from "../cloudflare/aria-brain-staging.mjs";

test("transmet au modèle le contrat de proactivité, de liberté et d'autonomie graduée", async () => {
  const originalFetch = globalThis.fetch;
  let providerPayload;
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "https://api.openai.com/v1/responses");
    providerPayload = JSON.parse(options.body);
    return new Response(JSON.stringify({
      output: [{ type: "message", content: [{ type: "output_text", text: "Bonjour." }] }],
      model: "test-model"
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const request = new Request("https://aria.test/chat", {
      method: "POST",
      headers: {
        "Authorization": "Bearer test-token",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ messages: [{ role: "user", content: "Bonjour" }] })
    });
    const response = await worker.fetch(request, {
      ARIA_ACCESS_TOKEN: "test-token",
      OPENAI_API_KEY: "test-key"
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).reply, "Bonjour.");
    assert.ok(providerPayload && typeof providerPayload.instructions === "string");
    assert.match(providerPayload.instructions, /PROACTIVITÉ/);
    assert.match(providerPayload.instructions, /LIBERTÉ INTELLECTUELLE/);
    assert.match(providerPayload.instructions, /AUTONOMIE/);
    assert.match(providerPayload.instructions, /sans preuve/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
