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
    if (url.pathname === "/memory" && !["GET", "PUT", "DELETE"].includes(req.method)) return json({ error: "method_not_allowed" }, 405);
    const requireIndividualAuth = env.ARIA_REQUIRE_INDIVIDUAL_AUTH === "true";
    if (!env.OPENAI_API_KEY || (!env.ARIA_USERS && (requireIndividualAuth || !env.ARIA_ACCESS_TOKEN))) {
      return json({ error: "service_not_configured" }, 503);
    }

    const authorization = req.headers.get("Authorization") || "";
    const bearerToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    let principal = null;
    if (bearerToken && env.ARIA_USERS) {
      try {
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(bearerToken));
        const tokenHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
        const userId = await env.ARIA_USERS.get("session:v1:" + tokenHash);
        if (typeof userId === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(userId)) {
          principal = { type: "user", id: userId };
        }
      } catch {
        return json({ error: "auth_storage_unavailable" }, 503);
      }
    }
    // Shared-token access remains a temporary closed-alpha fallback only.
    if (!principal && !requireIndividualAuth && bearerToken && env.ARIA_ACCESS_TOKEN && bearerToken === env.ARIA_ACCESS_TOKEN) {
      principal = { type: "shared", id: null };
    }
    if (!principal) return json({ error: "unauthorized" }, 401);

    const validClientId = (value) =>
      typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    const memoryKeyFor = (clientId) => {
      if (principal.type === "user") return "memory:v2:user:" + principal.id;
      return validClientId(clientId) ? "memory:v1:" + clientId : null;
    };

    if (url.pathname === "/memory") {
      if (!env.ARIA_MEMORY) return json({ error: "memory_storage_unavailable" }, 503);
      let clientId = url.searchParams.get("clientId");
      let body;
      if (req.method === "PUT") {
        try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
        clientId = body.clientId;
      }
      const key = memoryKeyFor(clientId);
      if (!key) return json({ error: "invalid_client_id" }, 400);
      try {
        if (req.method === "GET") {
          const saved = await env.ARIA_MEMORY.get(key, "json");
          return json({ memories: Array.isArray(saved) ? saved : [], persisted: true });
        }
        if (req.method === "DELETE") {
          await env.ARIA_MEMORY.delete(key);
          return json({ deleted: true, persisted: true });
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

    const profile = "Tu es Aria, une assistante personnelle intelligente, naturelle, élégante et honnête. Adapte le tutoiement ou le vouvoiement à la manière dont l’utilisateur s’adresse à toi ou à ses préférences explicitement définies. Privilégie la curiosité, la liberté de pensée et l’autonomie de jugement. Distingue les faits des hypothèses, ne prétends jamais avoir exécuté une action non réalisée et n’invente pas de souvenirs. La personnalité et les préférences personnalisées doivent venir des réglages explicitement fournis par l’utilisateur, pas d’un profil personnel codé en dur. Ne prétends pas être humaine."
    const incomingSystem = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const conversation = messages.filter((m) => m.role !== "system").slice(-20);
    const preferences = body.preferences && typeof body.preferences === "object" ? body.preferences : {};
    const allowedPreference = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
    const chosenPreferences = {
      proactivity: allowedPreference(preferences.proactivity, ["discrete", "balanced", "proactive"], "balanced"),
      verbosity: allowedPreference(preferences.verbosity, ["short", "balanced", "detailed"], "balanced"),
      humor: allowedPreference(preferences.humor, ["low", "balanced", "high"], "balanced")
    };
    const memoryConsent = body.memoryConsent === true;
    let memoryWriteStatus = "";
    const lastUserMessage = messages.filter((item) => item.role === "user").at(-1)?.content.trim() || "";
    const rememberMatch = lastUserMessage.match(/^(?:Aria[,\s]+)?(?:retiens(?:\s+bien)?\s+que|mémorise(?:\s+que)?|souviens-toi\s+que|n'oublie pas que)\s+(.+)$/i);
    if (rememberMatch) {
      if (!memoryConsent) {
        memoryWriteStatus = "Mémoire désactivée par l’utilisateur : aucune information n’a été enregistrée. Explique comment activer la mémoire dans les préférences si nécessaire.";
      } else if (!env.ARIA_MEMORY || !memoryKeyFor(body.clientId)) {
        memoryWriteStatus = "Échec : le stockage persistant ou l’identifiant de mémoire n’est pas disponible. Ne prétends pas que l’information a été mémorisée.";
      } else {
        try {
          const key = memoryKeyFor(body.clientId);
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

    let memoryContext = memoryConsent
      ? "Aucune mémoire persistante enregistrée pour cet appareil."
      : "Mémoire personnelle désactivée par l’utilisateur. N’utilise aucun souvenir persistant et n’enregistre rien.";
    if (memoryConsent && env.ARIA_MEMORY && memoryKeyFor(body.clientId)) {
      try {
        const saved = await env.ARIA_MEMORY.get(memoryKeyFor(body.clientId), "json");
        if (Array.isArray(saved) && saved.length) {
          memoryContext = saved.map((item) => "- " + item.text).join("\n");
        }
      } catch {
        memoryContext = "La mémoire persistante est temporairement indisponible. Ne prétends pas avoir récupéré de souvenirs.";
      }
    }
    try {
      const preferenceInstructions = "Préférences utilisateur : niveau d’initiative=" + chosenPreferences.proactivity + "; longueur des réponses=" + chosenPreferences.verbosity + "; humour=" + chosenPreferences.humor + ". Respecte ces réglages sauf demande explicite contraire dans la conversation.";
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Authorization": "Bearer " + env.OPENAI_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-6-astra",
          instructions: profile + "\n\n" + preferenceInstructions + "\n\nSouvenirs persistants (uniquement si la mémoire est activée) :\n" + memoryContext + "\n\nRésultat de la mémorisation demandée dans ce message : " + (memoryWriteStatus || "Aucune opération de mémorisation demandée.") + "\n\nContexte transmis par l’application :\n" + incomingSystem + "\n\nAnalyse l’intention réelle de l’utilisateur, pas seulement des mots-clés. Les actions d’interface sont des intentions structurées et limitées. Choisis action=none par défaut. Ouvre une visualisation uniquement si l’utilisateur demande clairement de voir, ouvrir ou explorer visuellement quelque chose; une question qui mentionne un objet ne suffit pas. Si la scène demandée n’est pas implémentée, annonce cette limite dans reply. Ne prétends jamais avoir ouvert une scène, utilisé un outil ou enregistré une donnée si ce n’est pas confirmé. Pour une demande de mémorisation, ne confirme que si le résultat de mémorisation ci-dessus indique un succès. Réponds avec l’objet JSON imposé par le schéma.",
          input: conversation.map((m) => ({ role: m.role, content: m.content })),
          text: {
            format: {
              type: "json_schema",
              name: "aria_turn",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  reply: { type: "string" },
                  action: { type: "string", enum: ["none", "open_visualization", "close_visualization", "open_memory", "close_widgets"] },
                  scene: { type: "string", enum: ["none", "globe", "map", "engine", "scientific_model", "other"] }
                },
                required: ["reply", "action", "scene"]
              }
            }
          },
          reasoning: { effort: "low" },
          max_output_tokens: 900,
          store: false
        })
      });
      const data = await response.json();
      if (!response.ok) return json({ error: "provider_error", status: response.status }, 502);
      const outputText = data.output?.filter((item) => item.type === "message")
        .flatMap((item) => item.content || [])
        .filter((part) => part.type === "output_text")
        .map((part) => part.text).join("\n").trim();
      if (!outputText) return json({ error: "empty_response" }, 502);
      let turn;
      try { turn = JSON.parse(outputText); } catch { return json({ error: "invalid_provider_output" }, 502); }
      const allowedActions = new Set(["none", "open_visualization", "close_visualization", "open_memory", "close_widgets"]);
      const allowedScenes = new Set(["none", "globe", "map", "engine", "scientific_model", "other"]);
      if (!turn || typeof turn.reply !== "string" || !turn.reply.trim() ||
          !allowedActions.has(turn.action) || !allowedScenes.has(turn.scene)) {
        return json({ error: "invalid_provider_output" }, 502);
      }
      const action = turn.action;
      const scene = action === "open_visualization" ? turn.scene : "none";
      return json({ reply: turn.reply.trim(), action, scene, model: data.model || "gpt-6-astra" });
    } catch {
      return json({ error: "provider_unavailable" }, 502);
    }
  }
};
