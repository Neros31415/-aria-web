import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const html = readFileSync("live-hud.html", "utf8");
const scripts = [...html.matchAll(/<script>([\\s\\S]*?)<\\/script>/gi)].map((m) => m[1]);
assert.ok(scripts.length > 0, "HUD must contain its application script");

for (const [index, script] of scripts.entries()) {
  new vm.Script(script, { filename: `live-hud-inline-${index + 1}.js` });
}

const requiredIds = [
  "state", "clock", "core", "greeting", "prompt", "mic", "speak",
  "clear", "form", "input", "feedback", "memoryCount", "memoryState",
  "memoryBtn", "missionBtn", "helpBtn", "connectBtn"
];
for (const id of requiredIds) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `Missing required HUD element: ${id}`);
}

assert.match(html, /connectBtn['"]\\)\\.addEventListener\\(['"]click['"]/,
  "CONNECTER must have a click handler");
assert.match(html, /aria\\.hud\\.apiBase\\.v1/,
  "Backend endpoint must be stored under the expected local key");
assert.match(html, /url\\.protocol!=='https:'/,
  "Remote backend URLs must require HTTPS");
assert.match(html, /speechSynthesis/,
  "Speech synthesis integration should remain present");

console.log("ARIA HUD smoke checks passed: inline JavaScript parses and core controls/configuration are present.");
