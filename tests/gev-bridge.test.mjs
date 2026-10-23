import assert from "node:assert/strict";
import test from "node:test";
import { createGevBridge } from "../geo/gev-bridge.js";

const ORIGIN = "https://gev.example";
const validView = {
  camera: { lat: 48.8566, lon: 2.3522, altitude_m: 1200000, pitch_deg: -50 },
  layers: ["earthquakes"],
};

function setup({ timeoutMs = 100 } = {}) {
  const sent = [];
  const listeners = new Set();
  const statuses = [];
  const iframe = {
    contentWindow: {
      postMessage(message, targetOrigin) {
        sent.push({ message, targetOrigin });
      },
    },
  };
  const windowRef = {
    addEventListener(type, listener) {
      if (type === "message") listeners.add(listener);
    },
    removeEventListener(type, listener) {
      if (type === "message") listeners.delete(listener);
    },
  };
  const bridge = createGevBridge({
    iframe,
    origin: ORIGIN,
    windowRef,
    timeoutMs,
    onStatus: (status) => statuses.push(status),
  });
  function message(data, { origin = ORIGIN, source = iframe.contentWindow } = {}) {
    for (const listener of listeners) listener({ data, origin, source });
  }
  return { bridge, iframe, sent, statuses, message, listeners };
}

const tick = () => new Promise((resolve) => setImmediate(resolve));

test("rejects insecure remote origins but permits localhost development", () => {
  const common = {
    iframe: { contentWindow: { postMessage() {} } },
    windowRef: { addEventListener() {}, removeEventListener() {} },
  };
  assert.throws(
    () => createGevBridge({ ...common, origin: "http://gev.example" }),
    /HTTPS/,
  );
  const local = createGevBridge({ ...common, origin: "http://localhost:4173" });
  local.dispose();
});

test("ignores messages from other origins and frames; correlates a successful view", async () => {
  const ctx = setup();
  const applying = ctx.bridge.applyView(validView);

  ctx.message({ type: "gev:ready" }, { origin: "https://attacker.example" });
  ctx.message({ type: "gev:ready" }, { source: {} });
  await tick();
  assert.equal(ctx.sent.length, 0);

  ctx.message({ type: "gev:ready" });
  await tick();
  assert.equal(ctx.sent.length, 1);
  assert.equal(ctx.sent[0].targetOrigin, ORIGIN);
  assert.equal(ctx.sent[0].message.type, "gev:view");

  const id = ctx.sent[0].message.id;
  ctx.message({ type: "gev:view-applied", id, ok: true, steps: [{ step: "camera", ok: true }] },
    { origin: "https://attacker.example" });
  ctx.message({ type: "gev:view-applied", id, ok: true, steps: [{ step: "camera", ok: true }] });
  assert.deepEqual(await applying, { ok: true, steps: [{ step: "camera", ok: true }] });
  assert.ok(ctx.statuses.includes("view-applied"));
  ctx.bridge.dispose();
});

test("returns partial/failure status rather than inventing success", async () => {
  const ctx = setup();
  const applying = ctx.bridge.applyView(validView);
  ctx.message({ type: "gev:ready" });
  await tick();
  const id = ctx.sent[0].message.id;
  ctx.message({ type: "gev:view-applied", id, ok: false, steps: [{ step: "camera", ok: false }] });
  assert.deepEqual(await applying, { ok: false, steps: [{ step: "camera", ok: false }] });
  assert.ok(ctx.statuses.includes("view-failed"));
  ctx.bridge.dispose();
});

test("rejects invalid camera coordinates before sending", async () => {
  const ctx = setup();
  await assert.rejects(
    ctx.bridge.applyView({ camera: { lat: 120, lon: 0 } }),
    /latitude and longitude/,
  );
  assert.equal(ctx.sent.length, 0);
  ctx.bridge.dispose();
});

test("dispose removes the listener and rejects pending requests", async () => {
  const ctx = setup();
  const applying = ctx.bridge.applyView(validView);
  ctx.message({ type: "gev:ready" });
  await tick();
  assert.equal(ctx.sent.length, 1);
  ctx.bridge.dispose();
  await assert.rejects(applying, /disposed/);
  assert.equal(ctx.listeners.size, 0);
});
