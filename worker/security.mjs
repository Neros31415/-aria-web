export function origins(env) {
  return new Set(String(env.ALLOWED_ORIGINS || "").split(",").map((s) => {
    try { const u = new URL(s.trim()); return u.protocol === "https:" || ["localhost", "127.0.0.1"].includes(u.hostname) ? u.origin : ""; }
    catch { return ""; }
  }).filter(Boolean));
}
export function response(data, status, origin, allow) {
  const h = new Headers({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", Vary: "Origin" });
  if (origin && allow.has(origin)) {
    h.set("Access-Control-Allow-Origin", origin); h.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    h.set("Access-Control-Allow-Headers", "Authorization, Content-Type"); h.set("Access-Control-Max-Age", "600");
  }
  return new Response(data === null ? null : JSON.stringify(data), { status, headers: h });
}
export const fail = (code, message, status, origin, allow) => response({ error: { code, message } }, status, origin, allow);
export function checkMessages(body) {
  const list = body?.messages;
  if (!Array.isArray(list) || !list.length || list.length > 20) return { error: "Fournissez de 1 à 20 messages." };
  let total = 0; const messages = [];
  for (const m of list) {
    if (!m || !["user", "assistant"].includes(m.role) || typeof m.content !== "string" || !m.content.trim() || m.content.length > 4000) return { error: "Message invalide ou trop long." };
    total += m.content.length; if (total > 12000) return { error: "Contexte trop long." };
    messages.push({ role: m.role, content: m.content.trim() });
  }
  if (messages.at(-1).role !== "user") return { error: "Le dernier message doit provenir de l'utilisateur." };
  return { messages };
}
export function secretMatches(a, b) {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b); let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] || 0) ^ (y[i] || 0);
  return d === 0;
}
