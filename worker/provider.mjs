const DEFAULT_MODEL = "@cf/zai-org/glm-4.7-flash";
const PROMPT = "Vous êtes ARIA, assistant personnel de Quentin : élégant, chaleureux, complice et précis. Répondez en français sauf demande contraire. Soyez honnête : aucun outil Web, mémoire persistante ou contrôle PC n'est disponible pour le moment. Ne prétendez jamais avoir effectué une action sans preuve.";
export function selectedModel(env) { return String(env.ARIA_MODEL || DEFAULT_MODEL).trim(); }
export async function ask(messages, env) {
  if (!env.AI || typeof env.AI.run !== "function") throw new Error("provider_not_configured");
  const result = await env.AI.run(selectedModel(env), { messages: [{ role: "system", content: PROMPT }, ...messages], max_tokens: 800 });
  const text = typeof result?.response === "string" ? result.response.trim() : typeof result?.result?.response === "string" ? result.result.response.trim() : "";
  if (!text) throw new Error("provider_empty_response");
  return text;
}
