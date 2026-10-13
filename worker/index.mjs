import { origins, response, fail, checkMessages, secretMatches } from "./security.mjs";
import { ask, selectedModel } from "./provider.mjs";
export default { async fetch(req, env) {
  const u = new URL(req.url), o = req.headers.get("Origin"), a = origins(env);
  if (o && !a.has(o)) return fail("origin_not_allowed", "Origine refusée.", 403, null, a);
  if (req.method === "OPTIONS") return o && a.has(o) ? response(null, 204, o, a) : fail("origin_not_allowed", "Origine refusée.", 403, null, a);
  if (u.pathname === "/health" && req.method === "GET") return response({ status: "ok", service: "aria-api", configured: !!(env.ARIA_ACCESS_TOKEN && env.AI), model: selectedModel(env) }, 200, o, a);
  if (u.pathname !== "/chat") return fail("not_found", "Route inconnue.", 404, o, a);
  if (req.method !== "POST") return fail("method_not_allowed", "POST requis.", 405, o, a);
  if (!env.ARIA_ACCESS_TOKEN || !env.AI) return fail("service_not_configured", "Service non configuré.", 503, o, a);
  const t = (req.headers.get("Authorization") || "").match(/^Bearer\\s+(.+)$/i)?.[1] || "";
  if (!secretMatches(t, env.ARIA_ACCESS_TOKEN)) return fail("unauthorized", "Authentification requise.", 401, o, a);
  if (!(req.headers.get("Content-Type") || "").toLowerCase().includes("application/json")) return fail("unsupported_media_type", "JSON requis.", 415, o, a);
  let b;
  try { const s = await req.text(); if (new TextEncoder().encode(s).length > 16384) return fail("payload_too_large", "Requête trop grande.", 413, o, a); b = JSON.parse(s); }
  catch { return fail("invalid_json", "JSON invalide.", 400, o, a); }
  const v = checkMessages(b); if (v.error) return fail("invalid_messages", v.error, 400, o, a);
  try { return response({ reply: await ask(v.messages, env), model: selectedModel(env) }, 200, o, a); }
  catch (e) { const empty = e?.message === "provider_empty_response"; return fail(empty ? "provider_empty_response" : "provider_unavailable", empty ? "Réponse vide." : "Modèle indisponible.", 502, o, a); }
} };
