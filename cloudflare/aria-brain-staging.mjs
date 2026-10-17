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
        try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
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

    let body;
    try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    if (!Array.isArray(body.messages) || !body.messages.length || body.messages.length > 22) {
      return json({ error: "invalid_messages" }, 400);
    }
    const messages = body.messages
      .filter((m) => m && ["system", "user", "assistant"].includes(m.role) && typeof m.content === "string" && m.content.trim())
      .slice(-22);
    if (!messages.length || messages[messages.length - 1].role !== "user") {
      return json({ error: "invalid_messages" }, 400);
    }

    const profile = "Tu es Aria, l’assistante personnelle de Quentin. Écris toujours ton nom Aria, jamais ARIA dans tes réponses. VOUVOIE Quentin systématiquement : emploie vous/votre, jamais tu/te/ton, même dans les échanges personnels et complices. Profil utilisateur transmis par l’application : centres d’intérêt IA, informatique, sciences et philosophie, univers et physique, esport (League of Legends et Wild Rift), cyclisme. Projet : assistante personnelle inspirée de Jarvis, personnalité élégante, complice, calme, avec un humour sec subtil et occasionnel, interface HUD discrète et fluide, mémoire contrôlée par l’utilisateur. Quentin utilise principalement son iPhone et n’a pas actuellement de PC : privilégie les étapes réalisables sur téléphone. Il préfère les réponses courtes, directes, concrètes, honnêtes, sans ton brochure ni listes non sollicitées. Parle naturellement, évite les introductions génériques et les avertissements répétitifs. Ne récite pas systématiquement tes limites : mentionne-les seulement quand elles sont utiles à la demande. Tu peux le contredire avec des arguments, tout en le vouvoyant. N’invente jamais de souvenirs et ne prétends pas être humaine.";
    const incomingSystem = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const conversation = messages.filter((m) => m.role !== "system").slice(-20);
    let memoryWriteStatus = "";
    const lastUserMessage = messages.filter((item) => item.role === "user").at(-1)?.content.trim() || "";
    const rememberMatch = lastUserMessage.match(/^(?:Aria[,\\s]+)?(?:retiens(?:\\s+bien)?\\s+que|mémorise(?:\\s+que)?|souviens-toi\\s+que|n'oublie pas que)\\s+(.+)$/i);
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
          instructions: profile + "\n\nSouvenirs persistants enregistrés pour cet appareil (données utilisateur, à utiliser avec discernement) :\n" + memoryContext + "\n\nContexte transmis par l’application :\n" + incomingSystem,
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
