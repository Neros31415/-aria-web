import { authorizeFromD1, ensureDefaultUserRole } from "./aria-authorization-d1.mjs";

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


const CANONICAL_ACCOUNT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function readServerMemoryConsent(env, ownerId) {
  if (!CANONICAL_ACCOUNT_ID.test(ownerId || "")) return { ok: false, status: 503, error: "consent_store_unavailable" };
  const db = env?.ARIA_AUTHZ_DB;
  if (!db || typeof db.prepare !== "function") return { ok: false, status: 503, error: "consent_store_unavailable" };
  try {
    const row = await db.prepare(
      "SELECT enabled, consent_version AS consentVersion, updated_at_ms AS updatedAt FROM aria_memory_consent WHERE owner_id = ? LIMIT 1"
    ).bind(ownerId).first();
    if (!row) return { ok: true, enabled: false };
    if (![0, 1, true, false].includes(row.enabled) ||
        typeof row.consentVersion !== "string" ||
        !Number.isSafeInteger(row.updatedAt) || row.updatedAt < 0) {
      return { ok: false, status: 503, error: "consent_store_unavailable" };
    }
    return { ok: true, enabled: row.enabled === 1 || row.enabled === true, consentVersion: row.consentVersion, updatedAt: row.updatedAt };
  } catch {
    return { ok: false, status: 503, error: "consent_store_unavailable" };
  }
}

async function writeServerMemoryConsent(env, ownerId, enabled) {
  if (!CANONICAL_ACCOUNT_ID.test(ownerId || "") || typeof enabled !== "boolean") {
    return { ok: false, status: 400, error: "invalid_memory_consent" };
  }
  const db = env?.ARIA_AUTHZ_DB;
  if (!db || typeof db.prepare !== "function") return { ok: false, status: 503, error: "consent_store_unavailable" };
  try {
    const now = Date.now();
    const result = await db.prepare(
      "INSERT INTO aria_memory_consent (owner_id, enabled, consent_version, updated_at_ms) VALUES (?, ?, 'memory-v1', ?) ON CONFLICT(owner_id) DO UPDATE SET enabled = excluded.enabled, consent_version = excluded.consent_version, updated_at_ms = excluded.updated_at_ms"
    ).bind(ownerId, enabled ? 1 : 0, now).run();
    if (result?.success === false) return { ok: false, status: 503, error: "consent_store_unavailable" };
    return { ok: true, enabled, consentVersion: "memory-v1", updatedAt: now };
  } catch {
    return { ok: false, status: 503, error: "consent_store_unavailable" };
  }
}


// Individual-account memory uses the same D1 database as the consent ledger.
// The SQL predicates are intentional: a write is accepted only if consent is
// still enabled in the statement that commits the memory document.
async function readAccountMemory(env, ownerId) {
  if (!CANONICAL_ACCOUNT_ID.test(ownerId || "")) throw new Error("invalid_memory_owner");
  const db = env?.ARIA_AUTHZ_DB;
  if (!db || typeof db.prepare !== "function") throw new Error("memory_storage_unavailable");
  const row = await db.prepare(
    "SELECT memories_json AS memoriesJson FROM aria_memory_documents WHERE owner_id = ? AND EXISTS (SELECT 1 FROM aria_memory_consent WHERE owner_id = ? AND enabled = 1) LIMIT 1"
  ).bind(ownerId, ownerId).first();
  if (!row) return [];
  if (typeof row.memoriesJson !== "string") throw new Error("invalid_memory_document");
  const memories = JSON.parse(row.memoriesJson);
  if (!Array.isArray(memories)) throw new Error("invalid_memory_document");
  return memories;
}

async function writeAccountMemory(env, ownerId, memories, now = Date.now()) {
  if (!CANONICAL_ACCOUNT_ID.test(ownerId || "") || !Array.isArray(memories) ||
      !Number.isSafeInteger(now) || now < 0) return { ok: false, reason: "invalid_memory_document" };
  const db = env?.ARIA_AUTHZ_DB;
  if (!db || typeof db.prepare !== "function") return { ok: false, reason: "memory_storage_unavailable" };
  const result = await db.prepare(
    "INSERT INTO aria_memory_documents (owner_id, memories_json, updated_at_ms) SELECT ?, ?, ? WHERE EXISTS (SELECT 1 FROM aria_memory_consent WHERE owner_id = ? AND enabled = 1) ON CONFLICT(owner_id) DO UPDATE SET memories_json = excluded.memories_json, updated_at_ms = excluded.updated_at_ms WHERE EXISTS (SELECT 1 FROM aria_memory_consent WHERE owner_id = ? AND enabled = 1)"
  ).bind(ownerId, JSON.stringify(memories), now, ownerId, ownerId).run();
  if (result?.success === false) return { ok: false, reason: "memory_storage_unavailable" };
  if (Number.isFinite(result?.meta?.changes) && result.meta.changes === 0) {
    return { ok: false, reason: "memory_consent_required" };
  }
  return { ok: true };
}

async function deleteAccountMemory(env, ownerId) {
  if (!CANONICAL_ACCOUNT_ID.test(ownerId || "")) throw new Error("invalid_memory_owner");
  const db = env?.ARIA_AUTHZ_DB;
  if (!db || typeof db.prepare !== "function") throw new Error("memory_storage_unavailable");
  const result = await db.prepare(
    "DELETE FROM aria_memory_documents WHERE owner_id = ?"
  ).bind(ownerId).run();
  if (result?.success === false) throw new Error("memory_storage_unavailable");
}

async function authorizeMemoryOperation(env, identity, permission) {
  const provisioned = await ensureDefaultUserRole({ identity, env });
  if (!provisioned.ok) {
    return { ok: false, status: 503, error: "authorization_store_unavailable" };
  }
  const decision = await authorizeFromD1({ identity, permission, env });
  if (decision.allowed) return { ok: true };
  const unavailable = decision.reason === "authorization_store_unavailable";
  return {
    ok: false,
    status: unavailable ? 503 : 403,
    error: unavailable ? "authorization_store_unavailable" : "permission_denied"
  };
}

async function authenticateRequest(req, env) {
  const authorization = req.headers.get("Authorization") || "";
  const authMode = env.ARIA_AUTH_MODE || "individual";

  // Unknown values must never silently fall back to the shared-token alpha mode.
  if (!["individual", "session_kv", "legacy"].includes(authMode)) {
    return { ok: false, status: 503, error: "invalid_auth_mode" };
  }

  if (authMode === "individual") {
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
      return { ok: false, status: 503, error: "auth_not_configured" };
    }

    let authEndpoint;
    try {
      authEndpoint = new URL("/auth/v1/user", env.SUPABASE_URL);
      if (authEndpoint.protocol !== "https:") {
        return { ok: false, status: 503, error: "auth_not_configured" };
      }
    } catch {
      return { ok: false, status: 503, error: "auth_not_configured" };
    }

    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) return { ok: false, status: 401, error: "unauthorized" };

    let response;
    let user;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      response = await fetch(authEndpoint.toString(), {
        method: "GET",
        headers: {
          "apikey": env.SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + match[1],
          "Accept": "application/json"
        },
        signal: controller.signal
      });

      // Keep the deadline active while reading the body too; a stalled body
      // must not leave an authenticated request hanging indefinitely.
      if (response.status === 401 || response.status === 403) {
        return { ok: false, status: 401, error: "unauthorized" };
      }
      if (!response.ok) return { ok: false, status: 503, error: "auth_service_unavailable" };
      user = await response.json();
    } catch {
      return { ok: false, status: 503, error: "auth_service_unavailable" };
    } finally {
      clearTimeout(timeout);
    }

    const isUuid = (value) =>
      typeof value === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    if (!user || !isUuid(user.id)) {
      return { ok: false, status: 401, error: "unauthorized" };
    }

    return { ok: true, mode: "individual", ownerId: user.id };
  }

  // Explicit compatibility mode for the existing staging session registry.
  // The opaque bearer token is never treated as an identity: only its SHA-256
  // digest is used to look up a server-created session record in ARIA_USERS.
  if (authMode === "session_kv") {
    if (!env.ARIA_USERS || typeof env.ARIA_USERS.get !== "function") {
      return { ok: false, status: 503, error: "auth_not_configured" };
    }
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match || match[1].length < 43 || match[1].length > 256) {
      return { ok: false, status: 401, error: "unauthorized" };
    }
    try {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(match[1]));
      const tokenHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
      const ownerId = await env.ARIA_USERS.get("session:v1:" + tokenHash);
      // Existing alpha sessions use server-assigned opaque IDs, not necessarily
      // UUIDs. Accept only the same bounded character set as the active Worker.
      // D1 role authorization remains unavailable for these IDs until a verified
      // account-identity migration maps them to canonical UUIDs.
      if (typeof ownerId !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(ownerId)) {
        return { ok: false, status: 401, error: "unauthorized" };
      }
      return { ok: true, mode: "individual", ownerId, identitySource: "session_kv" };
    } catch {
      return { ok: false, status: 503, error: "auth_storage_unavailable" };
    }
  }

  // Legacy alpha mode is retained only for explicitly configured test/staging clients.
  // Public multi-user distribution must use an individual identity mode.
  if (!env.ARIA_ACCESS_TOKEN) {
    return { ok: false, status: 503, error: "service_not_configured" };
  }
  if (authorization !== "Bearer " + env.ARIA_ACCESS_TOKEN) {
    return { ok: false, status: 401, error: "unauthorized" };
  }
  return { ok: true, mode: "legacy", ownerId: null };
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
      headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
      headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, X-ARIA-Memory-Consent";
    }
    const json = (data, status = 200) =>
      new Response(data === null ? null : JSON.stringify(data), { status, headers });
    if (origin && !allowedOrigins.has(origin)) return json({ error: "origin_not_allowed" }, 403);
    if (req.method === "OPTIONS") return json(null, 204);

    const url = new URL(req.url);
    if (url.pathname === "/health" && req.method === "GET") {
      const authMode = env.ARIA_AUTH_MODE || "individual";
      const authConfigured = authMode === "individual"
        ? Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY)
        : authMode === "session_kv"
          ? Boolean(env.ARIA_USERS)
          : authMode === "legacy" && Boolean(env.ARIA_ACCESS_TOKEN);
      const individualMode = authMode === "individual" || authMode === "session_kv";
      const authorizationConfigured = !individualMode || Boolean(env.ARIA_AUTHZ_DB);
      const memoryStorageConfigured = Boolean(env.ARIA_MEMORY);
      let memoryConsentStoreConfigured = null;
      if (authMode === "individual" && env.ARIA_AUTHZ_DB && typeof env.ARIA_AUTHZ_DB.prepare === "function") {
        try {
          await env.ARIA_AUTHZ_DB.prepare(
            "SELECT owner_id FROM aria_memory_consent WHERE owner_id = ? LIMIT 1"
          ).bind("00000000-0000-4000-8000-000000000000").first();
          memoryConsentStoreConfigured = true;
        } catch {
          memoryConsentStoreConfigured = false;
        }
      }
      const memoryAvailable = memoryStorageConfigured && authMode !== "session_kv" && (authMode !== "individual" || memoryConsentStoreConfigured === true);
      const memoryStatus = !memoryStorageConfigured
        ? "storage_not_configured"
        : authMode === "session_kv"
          ? "identity_migration_required"
           : authMode === "individual" && memoryConsentStoreConfigured !== true
            ? "consent_store_unavailable"
            : "available";
      return json({
        status: "ok",
        service: "aria-api",
        configured: Boolean(env.OPENAI_API_KEY && authConfigured && authorizationConfigured && (!individualMode || memoryStorageConfigured) && (authMode !== "individual" || memoryConsentStoreConfigured === true)),
        authenticationMode: authMode,
        authorizationStore: Boolean(env.ARIA_AUTHZ_DB),
        memoryConsentStoreConfigured,
        provider: "openai",
        model: "gpt-6-astra",
        persistentMemory: memoryAvailable,
        memoryStorageConfigured,
        memoryStatus
      });
    }
    if (url.pathname !== "/chat" && url.pathname !== "/memory" && url.pathname !== "/memory/consent") return json({ error: "not_found" }, 404);
    if (url.pathname === "/chat" && req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    if (url.pathname === "/memory" && !["GET", "PUT", "DELETE"].includes(req.method)) return json({ error: "method_not_allowed" }, 405);
    if (url.pathname === "/memory/consent" && !["GET", "POST"].includes(req.method)) return json({ error: "method_not_allowed" }, 405);
    if (url.pathname === "/chat" && !env.OPENAI_API_KEY) return json({ error: "service_not_configured" }, 503);
    const auth = await authenticateRequest(req, env);
    if (!auth.ok) return json({ error: auth.error }, auth.status);
    const individualAuth = auth.mode === "individual";
    const ownerId = auth.ownerId;
    // Alpha session IDs are opaque server-side identifiers, not verified canonical
    // account IDs. They may authenticate chat, but must not create D1 roles or
    // authorize persistent memory until an audited identity migration maps them.
    const canonicalAccountIdentity = individualAuth && auth.identitySource !== "session_kv";

    const validClientId = (value) =>
      typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

    if (url.pathname === "/memory/consent") {
      if (!individualAuth || !canonicalAccountIdentity || !ownerId) return json({ error: "individual_auth_required" }, 409);
      if (req.method === "GET") {
        const consent = await readServerMemoryConsent(env, ownerId);
        if (!consent.ok) return json({ error: consent.error }, consent.status);
        return json({ enabled: consent.enabled, persisted: true, consentVersion: consent.consentVersion || null, updatedAt: consent.updatedAt || null });
      }
      const boundedBody = await readLimitedBody(req, 2048);
      if (boundedBody.tooLarge) return json({ error: "request_too_large" }, 413);
      if (boundedBody.readError) return json({ error: "invalid_request_body" }, 400);
      let consentBody;
      try { consentBody = JSON.parse(boundedBody.text); }
      catch { return json({ error: "invalid_json" }, 400); }
      if (!consentBody || typeof consentBody.enabled !== "boolean") return json({ error: "invalid_memory_consent" }, 400);
      // Revocation remains available to the authenticated owner even if their role is inactive.
      if (consentBody.enabled) {
        const permission = await authorizeMemoryOperation(env, ownerId, "memory:own:write");
        if (!permission.ok) return json({ error: permission.error }, permission.status);
      }
      const saved = await writeServerMemoryConsent(env, ownerId, consentBody.enabled);
      if (!saved.ok) return json({ error: saved.error }, saved.status);
      return json({ enabled: saved.enabled, persisted: true, consentVersion: saved.consentVersion, updatedAt: saved.updatedAt });
    }

    if (url.pathname === "/memory") {
      if (individualAuth && !canonicalAccountIdentity) {
        return json({ error: "identity_migration_required" }, 409);
      }
      if (individualAuth && (!env.ARIA_AUTHZ_DB || typeof env.ARIA_AUTHZ_DB.prepare !== "function")) {
        return json({ error: "memory_storage_unavailable" }, 503);
      }
      if (!individualAuth && !env.ARIA_MEMORY) return json({ error: "memory_storage_unavailable" }, 503);
      let clientId = url.searchParams.get("clientId");
      let body;
      if (req.method === "PUT") {
        const declaredLength = Number(req.headers.get("Content-Length") || 0);
        if (declaredLength > 96_000) return json({ error: "request_too_large" }, 413);
        const boundedBody = await readLimitedBody(req, 96_000);
        if (boundedBody.tooLarge) return json({ error: "request_too_large" }, 413);
        if (boundedBody.readError) return json({ error: "invalid_request_body" }, 400);
        try { body = JSON.parse(boundedBody.text); }
        catch { return json({ error: "invalid_json" }, 400); }
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          return json({ error: "invalid_memory_payload" }, 400);
        }
        if (!individualAuth) clientId = body.clientId;
      }
      if (!individualAuth && !validClientId(clientId)) return json({ error: "invalid_client_id" }, 400);
      if (individualAuth && !ownerId) return json({ error: "unauthorized" }, 401);
      if (req.method !== "GET" && req.method !== "PUT" && req.method !== "DELETE") {
        return json({ error: "method_not_allowed" }, 405);
      }
      if (req.method !== "DELETE") {
        if (individualAuth) {
          const consent = await readServerMemoryConsent(env, ownerId);
          if (!consent.ok) return json({ error: consent.error }, consent.status);
          if (!consent.enabled) return json({ error: "memory_consent_required" }, 403);
        } else if (req.headers.get("X-ARIA-Memory-Consent") !== "true") {
          return json({ error: "memory_consent_required" }, 403);
        }
      }
      if (individualAuth) {
        const permission = req.method === "GET"
          ? "memory:own:read"
          : req.method === "DELETE"
            ? "memory:own:delete"
            : "memory:own:write";
        const decision = await authorizeMemoryOperation(env, ownerId, permission);
        if (!decision.ok) return json({ error: decision.error }, decision.status);
      }
      try {
        if (req.method === "GET") {
          if (individualAuth) {
            const memories = await readAccountMemory(env, ownerId);
            return json({ memories, persisted: true });
          }
          const saved = await env.ARIA_MEMORY.get("memory:v1:" + clientId, "json");
          return json({ memories: Array.isArray(saved) ? saved : [], persisted: true });
        }
        if (req.method === "DELETE") {
          if (individualAuth) await deleteAccountMemory(env, ownerId);
          else await env.ARIA_MEMORY.delete("memory:v1:" + clientId);
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
        if (individualAuth) {
          const saved = await writeAccountMemory(env, ownerId, memories, now);
          if (!saved.ok) {
            const consentRequired = saved.reason === "memory_consent_required";
            return json({ error: consentRequired ? "memory_consent_required" : "memory_storage_failed" }, consentRequired ? 403 : 503);
          }
        } else {
          await env.ARIA_MEMORY.put("memory:v1:" + clientId, JSON.stringify(memories), {
            metadata: { schema: 1, count: memories.length, updatedAt: now }
          });
        }
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
    const profile = "Tu es Aria, une assistante personnelle intelligente, naturelle, élégante et honnête. Adapte le tutoiement ou le vouvoiement à la manière dont l’utilisateur s’adresse à toi ou à ses préférences explicitement définies. Privilégie la curiosité, la liberté de pensée et l’autonomie de jugement. Distingue les faits des hypothèses, ne prétends jamais avoir exécuté une action non réalisée et n’invente pas de souvenirs. Ne prétends pas être humaine.";
    const incomingSystem = "";
    const preferences = body.preferences && typeof body.preferences === "object" ? body.preferences : {};
    const allowedPreference = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
    const chosenPreferences = {
      proactivity: allowedPreference(preferences.proactivity, ["discrete", "balanced", "proactive"], "balanced"),
      verbosity: allowedPreference(preferences.verbosity, ["short", "balanced", "detailed"], "balanced"),
      humor: allowedPreference(preferences.humor, ["low", "balanced", "high"], "balanced")
    };
    const initiativeInstructions = {
      discrete: "Initiative discrète : réponds d’abord à la demande. N’ajoute une suggestion que si elle évite un risque, débloque réellement la tâche ou apporte un bénéfice évident.",
      balanced: "Initiative équilibrée : quand cela apporte une valeur concrète, propose une seule prochaine étape utile. Évite les suggestions génériques et les questions de relance automatiques.",
      proactive: "Initiative proactive : anticipe le prochain besoin directement lié à l’objectif. Pour une tâche en plusieurs étapes, avance jusqu’au prochain sous-objectif sûr et utile. N’affirme jamais travailler en arrière-plan ni avoir exécuté une action sans preuve."
    }[chosenPreferences.proactivity];
    const agencyInstructions = "Liberté intellectuelle : aucun sujet n’est interdit par principe. Explore avec curiosité et honnêteté; applique des limites proportionnées aux préjudices réels, à l’exploitation et aux atteintes aux droits fondamentaux. Ces principes ne suppriment pas les limites techniques du fournisseur. Autonomie graduée : n’exige pas une confirmation pour chaque étape simple et réversible, mais demande-la avant une dépense, une action irréversible, sensible ou externe à impact important. Ces instructions n’ajoutent aucun outil et n’autorisent aucune action externe.";
    const preferenceInstructions = "Préférences utilisateur : initiative=" + chosenPreferences.proactivity + "; longueur=" + chosenPreferences.verbosity + "; humour=" + chosenPreferences.humor + ". Respecte ces réglages.\n\n" + initiativeInstructions + "\n\n" + agencyInstructions;
    const conversation = messages.slice(-20);
    let memoryWriteStatus = "";
    const memoryOwnerKey = canonicalAccountIdentity
      ? (ownerId ? "memory:v2:" + ownerId : null)
      : (!individualAuth && validClientId(body.clientId) ? "memory:v1:" + body.clientId : null);
    const lastUserMessage = messages.filter((item) => item.role === "user").at(-1)?.content.trim() || "";
    const rememberMatch = lastUserMessage.match(/^(?:Aria[,\s]+)?(?:retiens(?:\s+bien)?\s+que|mémorise(?:\s+que)?|souviens-toi\s+que|n'oublie pas que)\s+(.+)$/i);
    const requestedMemoryConsent = body.memoryConsent === true;
    let memoryConsent = false;
    if (individualAuth && canonicalAccountIdentity && requestedMemoryConsent) {
      const consent = await readServerMemoryConsent(env, ownerId);
      memoryConsent = consent.ok && consent.enabled;
      if (!consent.ok) {
        memoryWriteStatus = "Le consentement mémoire côté serveur ne peut pas être vérifié. Aucune mémoire persistante n’a été lue ni modifiée.";
      } else if (!consent.enabled && rememberMatch) {
        memoryWriteStatus = "Consentement mémoire désactivé côté serveur : aucune information n’a été enregistrée.";
      }
    } else if (!individualAuth) {
      memoryConsent = requestedMemoryConsent && Boolean(memoryOwnerKey);
    }
    if (individualAuth && memoryConsent) {
      const readDecision = await authorizeMemoryOperation(env, ownerId, "memory:own:read");
      if (!readDecision.ok) return json({ error: readDecision.error }, readDecision.status);
      if (rememberMatch) {
        const writeDecision = await authorizeMemoryOperation(env, ownerId, "memory:own:write");
        if (!writeDecision.ok) return json({ error: writeDecision.error }, writeDecision.status);
      }
    }
    if (rememberMatch && requestedMemoryConsent && !canonicalAccountIdentity && individualAuth) {
      memoryWriteStatus = "La mémoire persistante est indisponible pour cette session alpha tant que l’identité de compte canonique n’a pas été migrée. Aucune donnée n’a été lue ni enregistrée.";
    } else if (rememberMatch && !memoryConsent) {
      if (!memoryWriteStatus) memoryWriteStatus = "Mémoire désactivée par l’utilisateur : aucune information n’a été enregistrée.";
    } else if (rememberMatch) {
      if (!env.ARIA_MEMORY || !memoryOwnerKey) {
        memoryWriteStatus = "Échec : le stockage persistant n’est pas disponible. Ne prétends pas que l’information a été mémorisée.";
      } else {
        try {
          if (individualAuth) {
            const latestConsent = await readServerMemoryConsent(env, ownerId);
            if (!latestConsent.ok || !latestConsent.enabled) {
              memoryWriteStatus = latestConsent.ok
                ? "Consentement mémoire révoqué avant l’écriture : aucune information n’a été enregistrée."
                : "Le consentement mémoire ne peut plus être vérifié : aucune information n’a été enregistrée.";
            } else {
              const key = memoryOwnerKey;
              const saved = await readAccountMemory(env, ownerId);
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
              const finalConsent = await readServerMemoryConsent(env, ownerId);
              if (!finalConsent.ok || !finalConsent.enabled) {
                memoryWriteStatus = finalConsent.ok
                  ? "Consentement mémoire révoqué avant la validation de l’écriture : aucune information n’a été enregistrée."
                  : "Le consentement mémoire ne peut plus être vérifié : aucune information n’a été enregistrée.";
              } else {
                const persisted = await writeAccountMemory(env, ownerId, bounded, now);
                if (!persisted.ok) {
                  memoryWriteStatus = persisted.reason === "memory_consent_required"
                    ? "Consentement mémoire révoqué avant la validation de l’écriture : aucune information n’a été enregistrée."
                    : "La mémoire persistante est indisponible. Aucune information n’a été enregistrée.";
                } else {
                  memoryWriteStatus = "Succès : l’information a été enregistrée dans la mémoire persistante.";
                }
              }
            }
          } else {
            const key = memoryOwnerKey;
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
          }
        } catch {
          memoryWriteStatus = "Échec : le serveur n’a pas pu enregistrer l’information. Ne prétends pas qu’elle a été mémorisée.";
        }
      }
    }

    if (individualAuth && memoryConsent) {
      const latestConsent = await readServerMemoryConsent(env, ownerId);
      if (!latestConsent.ok || !latestConsent.enabled) {
        memoryConsent = false;
        if (!latestConsent.ok) memoryWriteStatus = "Le consentement mémoire ne peut pas être vérifié ; aucun souvenir persistant ne sera utilisé.";
      }
    }
    let memoryContext = memoryConsent
      ? "Aucune mémoire persistante enregistrée pour ce compte."
      : "Mémoire personnelle désactivée ou non autorisée côté serveur. N’utilise aucun souvenir persistant et n’enregistre rien.";
    if (memoryConsent && memoryOwnerKey) {
      try {
        const saved = individualAuth
          ? await readAccountMemory(env, ownerId)
          : (env.ARIA_MEMORY ? await env.ARIA_MEMORY.get(memoryOwnerKey, "json") : null);
        if (Array.isArray(saved) && saved.length) {
          memoryContext = saved.map((item) => "- " + item.text).join("\n");
        }
      } catch {
        memoryContext = "La mémoire persistante est temporairement indisponible. Ne prétends pas avoir récupéré de souvenirs.";
      }
    }
    const providerController = new AbortController();
    const providerTimeout = setTimeout(() => providerController.abort(), 30_000);
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Authorization": "Bearer " + env.OPENAI_API_KEY, "Content-Type": "application/json" },
        signal: providerController.signal,
        body: JSON.stringify({
          model: "gpt-6-astra",
          instructions: profile + "\n\n" + preferenceInstructions + "\n\nSouvenirs persistants (uniquement si la mémoire est activée) :\n" + memoryContext + "\n\nRésultat de la mémorisation demandée dans ce message : " + (memoryWriteStatus || "Aucune opération de mémorisation demandée.") + "\n\nContexte transmis par l’application :\n" + incomingSystem + "\n\nAnalyse l’intention réelle de l’utilisateur, pas seulement des mots-clés. Choisis action=none par défaut. Ouvre une visualisation uniquement si l’utilisateur demande clairement de voir, ouvrir ou explorer visuellement quelque chose; une question qui mentionne un objet ne suffit pas. Les scènes disponibles sont : globe filaire local; carte OpenStreetMap avec itinéraires OSRM; graphique TradingView; catalogue de médias NASA. Le modèle moteur 3D, les simulations physiques scientifiques et la cartographie 3D/God’s Eye View restent à développer. Ne prétends jamais avoir ouvert une scène, utilisé un outil ou enregistré une donnée si ce n’est pas confirmé. Réponds avec l’objet JSON imposé par le schéma.",
          input: conversation.map((m) => ({ role: m.role, content: m.content })),
          text: { format: { type: "json_schema", name: "aria_turn", strict: true, schema: {
            type: "object", additionalProperties: false,
            properties: {
              reply: { type: "string" },
              action: { type: "string", enum: ["none", "open_visualization", "close_visualization", "open_memory", "close_widgets"] },
              scene: { type: "string", enum: ["none", "globe", "map", "finance", "engine", "scientific_model", "other"] }
            }, required: ["reply", "action", "scene"]
          } } },
          reasoning: { effort: "low" },
          max_output_tokens: 900,
          store: false
        })
      });
      // Keep the deadline active while consuming the response body, not just until headers arrive.
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
      const allowedScenes = new Set(["none", "globe", "map", "finance", "engine", "scientific_model", "other"]);
      if (!turn || typeof turn.reply !== "string" || !turn.reply.trim() || !allowedActions.has(turn.action) || !allowedScenes.has(turn.scene)) {
        return json({ error: "invalid_provider_output" }, 502);
      }
      const action = turn.action;
      const scene = action === "open_visualization" ? turn.scene : "none";
      return json({ reply: turn.reply.trim(), action, scene, model: data.model || "gpt-6-astra" });
    } catch {
      return json({ error: "provider_unavailable" }, 502);
    } finally {
      clearTimeout(providerTimeout);
    }
  }
};
