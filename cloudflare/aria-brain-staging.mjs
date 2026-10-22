async function readLimitedBody(request, maxBytes) {
  if (!request.body) return { text: "" };
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return { tooLarge: true };
      }
      chunks.push(value);
    }
  } catch {
    return { readError: true };
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { text: new TextDecoder().decode(bytes) };
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const allowedOrigins = new Set([
      "https://neros31415.github.io",
      "https://id-preview--501fb7b4-c872-4c82-ab9e-db8f88b04bfb.lovable.app",
      "https://661f988b-f4a0-442c-b1a4-0f755a95bf3e.sandbox.floot.app"
    ]);
    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Vary": "Origin"
    };
    if (allowedOrigins.has(origin)) {
      headers["Access-Control-Allow-Origin"] = origin;
      headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, OPTIONS";
      headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
    }
    const json = (data, status = 200) =>
      new Response(data === null ? null : JSON.stringify(data), { status, headers });
    if (origin && !allowedOrigins.has(origin)) return json({ error: "origin_not_allowed" }, 403);
    if (req.method === "OPTIONS") return json(null, 204);

    const url = new URL(req.url);
    if (url.pathname === "/health" && req.method === "GET") {
      return json({
        status: "ok",
        service: "aria-api",
        configured: Boolean(env.ARIA_ACCESS_TOKEN && env.OPENAI_API_KEY),
        provider: "openai",
        model: "gpt-6-astra",
        persistentMemory: Boolean(env.ARIA_MEMORY)
      });
    }
    if (url.pathname !== "/chat" && url.pathname !== "/memory") return json({ error: "not_found" }, 404);
    if (url.pathname === "/chat" && req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    if (url.pathname === "/memory" && !["GET", "PUT"].includes(req.method)) return json({ error: "method_not_allowed" }, 405);
    if (!env.ARIA_ACCESS_TOKEN || !env.OPENAI_API_KEY) return json({ error: "service_not_configured" }, 503);
    if ((req.headers.get("Authorization") || "") !== "Bearer " + env.ARIA_ACCESS_TOKEN) {
      return json({ error: "unauthorized" }, 401);
    }

    const validClientId = (value) =>
      typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

    if (url.pathname === "/memory") {
      if (!env.ARIA_MEMORY) return json({ error: "memory_storage_unavailable" }, 503);
      let clientId = url.searchParams.get("clientId");
      let body;
      if (req.method === "PUT") {
        const declaredLength = Number(req.headers.get("Content-Length") || 0);
        if (declaredLength > 96_000) return json({ error: "request_too_large" }, 413);
        const boundedBody = await readLimitedBody(req, 96_000);
        if (boundedBody.tooLarge) return json({ error: "request_too_large" }, 413);
        if (boundedBody.readError) return json({ error: "invalid_request_body" }, 400);
        try {
          body = JSON.parse(boundedBody.text);
        } catch {
          return json({ error: "invalid_json" }, 400);
        }
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          return json({ error: "invalid_memory_payload" }, 400);
        }
        clientId = body.clientId;
      }
      if (!validClientId(clientId)) return json({ error: "invalid_client_id" }, 400);
      const key = "memory:v1:" + clientId;
      try {
        if (req.method === "GET") {
          const saved = await env.ARIA_MEMORY.get(key, "json");
          return json({ memories: Array.isArray(saved) ? saved : [], persisted: true });
        }
        if (!Array.isArray(body.memories) || body.memories.length > 100) {
          return json({ error: "invalid_memories" }, 400);
        }
        const now = Date.now();
        const memories = body.memories
          .filter((item) => item && typeof item.text === "string" && item.text.trim())
          .slice(0, 100)
          .map((item) => ({
            id: typeof item.id === "string" && item.id.length <= 80 ? item.id : crypto.randomUUID(),
            text: item.text.trim().slice(0, 300),
            createdAt: Number.isFinite(item.createdAt) ? item.createdAt : now,
            updatedAt: now
          }));
        await env.ARIA_MEMORY.put(key, JSON.stringify(memories), {
          metadata: { schema: 1, count: memories.length, updatedAt: now }
        });
        return json({ memories, persisted: true });
      } catch {
        return json({ error: "memory_storage_failed" }, 503);
      }
    }

    const declaredLength = Number(req.headers.get("Content-Length") || 0);
    if (declaredLength > 96_000) return json({ error: "request_too_large" }, 413);

    const boundedBody = await readLimitedBody(req, 96_000);
    if (boundedBody.tooLarge) return json({ error: "request_too_large" }, 413);
    if (boundedBody.readError) return json({ error: "invalid_request_body" }, 400);
    let body;
    try {
      body = JSON.parse(boundedBody.text);
    } catch {
      return json({ error: "invalid_json" }, 400);
    }
    if (!body || !Array.isArray(body.messages) || !body.messages.length || body.messages.length > 22) {
      return json({ error: "invalid_messages" }, 400);
    }
    // The client is untrusted: it must never supply privileged system instructions.
    if (body.messages.some((m) => !m || !["user", "assistant"].includes(m.role))) {
      return json({ error: "invalid_message_role" }, 400);
    }
    const messages = body.messages.slice(-22);
    let totalCharacters = 0;
    for (const message of messages) {
      if (typeof message.content !== "string" || !message.content.trim() || message.content.length > 4000) {
        return json({ error: "invalid_message_content" }, 400);
      }
      totalCharacters += message.content.length;
      if (totalCharacters > 24_000) return json({ error: "conversation_too_large" }, 413);
    }
    if (messages[messages.length - 1].role !== "user") {
      return json({ error: "invalid_messages" }, 400);
    }

    // Keep product persona generic. User-specific preferences must come from
    // authenticated, consented account data, never from a public source file.
    const profile = "Tu es Aria, une assistante personnelle francophone, élégante, chaleureuse, précise et complice. Tutoye l’utilisateur et réponds naturellement, de façon concise et concrète. Utilise un humour subtil et occasionnel lorsque le contexte s’y prête. Respecte l’autonomie intellectuelle, l’honnêteté et le contrôle de l’utilisateur sur sa mémoire. N’invente jamais de souvenirs et ne prétends pas être humaine. Vérifie les affirmations importantes, distingue les faits incertains des faits établis et ne prétends pas avoir effectué une action que tu n’as pas réalisée.";
    const incomingSystem = "";
    const conversation = messages.slice(-20);
    let memoryWriteStatus = "";
    const lastUserMessage = messages.filter((item) => item.role === "user").at(-1)?.content.trim() || "";
    const rememberMatch = lastUserMessage.match(/^(?:Aria[,\s]+)?(?:retiens(?:\s+bien)?\s+que|mémorise(?:\s+que)?|souviens-toi\s+que|n'oublie pas que)\s+(.+)$/i);
    if (rememberMatch) {
      if (!env.ARIA_MEMORY || !validClientId(body.clientId)) {
        memoryWriteStatus = "Échec : le stockage persistant n’est pas disponible. Ne prétends pas que l’information a été mémorisée.";
      } else {
        try {
          const key = "memory:v1:" + body.clientId;
          const saved = await env.ARIA_MEMORY.get(key, "json");
          const memories = Array.isArray(saved) ? saved : [];
          const text = rememberMatch[1].trim().slice(0, 300);
          const existing = memories.find((item) => typeof item.text === "string" && item.text.trim().toLocaleLowerCase("fr") === text.toLocaleLowerCase("fr"));
          const now = Date.now();
          if (existing) {
            existing.text = text;
            existing.updatedAt = now;
          } else {
            memories.push({id: crypto.randomUUID(), text, createdAt: now, updatedAt: now});
          }
          const bounded = memories.slice(-100);
          await env.ARIA_MEMORY.put(key, JSON.stringify(bounded), {
            metadata: {schema: 1, count: bounded.length, updatedAt: now}
          });
          memoryWriteStatus = "Succès : l’information a été enregistrée dans la mémoire persistante.";
        } catch {
          memoryWriteStatus = "Échec : le serveur n’a pas pu enregistrer l’information. Ne prétends pas qu’elle a été mémorisée.";
        }
      }
    }

    let memoryContext = "Aucune mémoire persistante enregistrée pour cet appareil.";
    if (env.ARIA_MEMORY && validClientId(body.clientId)) {
      try {
        const saved = await env.ARIA_MEMORY.get("memory:v1:" + body.clientId, "json");
        if (Array.isArray(saved) && saved.length) {
          memoryContext = saved.map((item) => "- " + item.text).join("\n");
        }
      } catch {
        memoryContext = "La mémoire persistante est temporairement indisponible. Ne prétends pas avoir récupéré de souvenirs.";
      }
    }
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Authorization": "Bearer " + env.OPENAI_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-6-astra",
          instructions: profile + "\n\nSouvenirs persistants enregistrés pour cet appareil (données utilisateur, à utiliser avec discernement) :\n" + memoryContext + "\n\nRésultat de la mémorisation demandée dans ce message : " + (memoryWriteStatus || "Aucune opération de mémorisation demandée.") + "\n\nContexte transmis par l’application :\n" + incomingSystem,
          input: conversation.map((m) => ({ role: m.role, content: m.content })),
          reasoning: { effort: "low" },
          max_output_tokens: 800,
          store: false
        })
      });
      const data = await response.json();
      if (!response.ok) return json({ error: "provider_error", status: response.status }, 502);
      const reply = data.output?.filter((item) => item.type === "message")
        .flatMap((item) => item.content || [])
        .filter((part) => part.type === "output_text")
        .map((part) => part.text).join("\n").trim();
      if (!reply) return json({ error: "empty_response" }, 502);
      return json({ reply, model: data.model || "gpt-6-astra" });
    } catch {
      return json({ error: "provider_unavailable" }, 502);
    }
  }
};
