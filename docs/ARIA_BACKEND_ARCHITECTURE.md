# ARIA Backend Architecture — V1

## Objective

Give ARIA a real model-backed conversation loop without coupling the iPhone/PWA interface, Windows desktop client, and future mobile companion to a single UI.

## Current verified state

- The public PWA and the Windows desktop scaffold live in this repository.
- A Cloudflare Worker endpoint has been identified in project notes, but its request contract and authentication have not yet been verified.
- No Supabase projects are currently visible to the connected Supabase account. Do not assume a database exists or provision a paid resource without explicit confirmation.
- The desktop scaffold's proposed `POST /chat` contract is a placeholder until the Worker is inspected and tested.

## Recommended responsibility split

1. **Clients (PWA / iPhone / Windows):** render the HUD, collect user input, show conversation state, and persist only non-sensitive local preferences where appropriate.
2. **Backend gateway:** authenticate the user, validate input, apply rate limits, select the model, orchestrate tools, and return a normalized response.
3. **Model adapter:** use the provider's current tool-capable API (prefer the Responses API for OpenAI integrations) behind a small provider interface. Never put provider API keys in client-side code.
4. **Tool registry:** expose narrowly scoped, schema-validated functions such as `search_web`, `save_memory`, and `create_mission`. The model may request a tool; the backend validates and executes it, then returns the result to the model.
5. **Memory store:** keep user-scoped memories and conversation summaries in a database only after authentication and row-level access policies are in place.
6. **Audit and safety:** log tool name, user, time, and outcome without unnecessarily storing secrets or full sensitive payloads. Require explicit confirmation for consequential actions (sending messages, deleting data, purchases, or computer-control actions).

## Suggested API contract

### Request

```json
{
  "message": "Summarize this topic and save the key points",
  "conversation_id": "optional-client-generated-id",
  "context": {
    "client": "pwa",
    "timezone": "Europe/Paris"
  }
}
```

The server must derive the authenticated user from the verified session, not trust a user ID supplied by the client.

### Response

```json
{
  "conversation_id": "server-generated-or-validated-id",
  "reply": "A concise answer...",
  "actions": [],
  "sources": [],
  "memory_updates": []
}
```

Return structured errors with stable codes; never return stack traces, provider credentials, or internal secrets.

## Memory model (initial scope)

Start with a small relational schema rather than adding vector search before it is needed:

- `conversations`: id, owner_id, title, created_at, updated_at
- `messages`: id, conversation_id, owner_id, role, content, created_at
- `memories`: id, owner_id, category, content, source, created_at, updated_at, expires_at (nullable)
- `missions`: id, owner_id, title, status, priority, due_at (nullable), created_at, updated_at

Every user-owned table must have row-level security enabled and policies that bind access to the authenticated owner. Keep service-role credentials server-side only. Add embeddings/semantic retrieval only when ordinary filtered queries and summaries prove insufficient.

## Tool execution loop

1. Authenticate and validate the request.
2. Load only the conversation history and memories authorized for this user.
3. Send the request and approved tool definitions to the model.
4. If the model requests a tool, validate its JSON schema and check permissions.
5. Execute only tools allowed for this user; ask for confirmation for consequential actions.
6. Send tool results back to the model and continue until a final response is produced or a bounded step limit is reached.
7. Persist the resulting messages and explicitly approved memory updates.
8. Return the normalized response to the client.

Set request timeouts, maximum tool-call counts, output limits, and rate limits. Treat retrieved web pages and tool outputs as untrusted data, not as instructions that can override system policy.

## Web research

The web-search adapter should return a compact set of title, URL, extract, and retrieval timestamp fields. ARIA should distinguish sourced facts from inference and attach citations to claims based on retrieved pages. Search results must not be allowed to trigger arbitrary tool execution.

## Implementation order

1. Inspect and test the existing Cloudflare Worker, including authentication, CORS, request/response shape, and error handling.
2. Adapt the PWA and Windows scaffold to one verified contract; remove demo-mode ambiguity in the UI.
3. Add authentication and the smallest useful persistent schema. Supabase is an option, but no Supabase project is currently linked.
4. Implement one read-only web-search tool and citation handling.
5. Add explicit memory write/review flows.
6. Add mission orchestration and scheduled jobs only after basic reliability and observability exist.
7. Add computer control only with scoped permissions, visible execution status, and confirmation for destructive or external actions.

## References

- OpenAI function calling: https://developers.openai.com/api/docs/guides/function-calling
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase personalized assistant / Postgres memory architecture: https://supabase.com/blog/natural-db

## Acceptance criteria for V1

- The client can send a message and receive a real model response through the verified backend.
- No provider secret is shipped to the browser or desktop bundle.
- Invalid requests and unavailable providers return safe, structured errors.
- A user cannot read another user's conversations or memories.
- Web-derived claims can be traced to source URLs.
- Tool calls are schema-validated, bounded, permission-checked, and auditable.
