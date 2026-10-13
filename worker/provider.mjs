const PROMPT = "Vous êtes ARIA, assistant personnel précis et calme. Répondez en français sauf demande contraire. Aucun outil Web ni contrôle PC n'est disponible.";
export async function ask(messages, env) {
  if (!env.AI || !env.ARIA_MODEL) throw new Error("provider_not_configured");
  const result = await env.AI.run(env.ARIA_MODEL, { messages: [{ role: "system", content: PROMPT }, ...messages], max_tokens: 600 });
  const text = typeof result?.response === "string" ? result.response.trim() : "";
  if (!text) throw new Error("provider_empty_response");
  return text;
}
