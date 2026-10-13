# ARIA — Secure Backend Plan (V1)

## Objective

Turn the current local-first PWA into a real assistant without exposing provider secrets in the browser. This document is an implementation plan, not a claim that the backend already exists.

## Current verified state

- The public `main` branch is a local-first PWA with browser-side history/notes and an offline shell.
- The draft Windows desktop PR proposes a configurable `/chat` backend contract, but that contract has not been verified against the existing Cloudflare Worker.
- The connected Supabase account currently has **no projects visible** to the connector.
- No Supabase schema, authentication, live model, web-search integration, or cross-device sync has been configured as part of this work.

## Recommended V1 architecture

1. **Client (PWA / future iPhone app / Windows app):** UI only; never store provider API keys in client code.
2. **Backend entry point:** a server-side endpoint (Supabase Edge Function or the existing Cloudflare Worker, after inspection) authenticates the caller, validates payload size and shape, enforces rate limits, and calls the model provider.
3. **Persistent memory:** Postgres tables scoped to the authenticated user. Store explicit user-approved memories separately from raw conversation history. Provide read, edit, and delete controls.
4. **Web research:** call a search provider from the server, return a concise synthesis with source URLs, and distinguish sourced facts from model inference.
5. **Tool permissions:** classify tools by risk. Read-only research can run within configured limits; sending messages, purchases, deleting data, or controlling a computer must require explicit confirmation.
6. **Observability:** log request IDs, latency, provider errors and usage metadata; do not log secrets or unnecessarily retain sensitive message content.

## Data model proposal

- `profiles`: one row per authenticated user; minimal preferences and settings.
- `conversations`: owner, title, created/updated timestamps.
- `messages`: conversation, owner, role, content, timestamp; retention policy to be defined.
- `memories`: owner, category, content, source, confidence, created/updated timestamps, optional expiry.
- `missions`: owner, title, status, plan JSON, approval state, timestamps.
- `tool_runs`: owner, tool name, input summary, status, result summary, error code, timestamps.

Enable Row Level Security on exposed tables and write owner-scoped policies. Never ship the Supabase service-role key or model-provider keys to the client.

## API contract proposal

`POST /chat`

Request:
```json
{
  "messages": [
    { "role": "user", "content": "Hello ARIA" }
  ],
  "conversation_id": null
}
```

Response:
```json
{
  "reply": "Hello. What can I help you with?",
  "conversation_id": "server-generated-id",
  "sources": [],
  "tool_calls": []
}
```

This is a proposed contract only. Before implementing it, inspect the current Cloudflare Worker and choose one authoritative backend rather than creating two competing brains.

## Implementation order

1. Inspect and verify the existing Cloudflare Worker endpoint and authentication.
2. Decide whether Cloudflare or Supabase Edge Functions will own `POST /chat`.
3. Create a Supabase project only after selecting the correct organization and confirming the cost.
4. Add migrations, Auth, RLS policies and owner-scoped memory CRUD.
5. Connect one model provider through server-side secrets and add rate limits.
6. Connect web research with source attribution.
7. Test authentication failures, cross-user data isolation, oversized inputs, provider errors and usage limits.
8. Connect the PWA and Windows scaffold only after the API contract is tested.

## Official reference

- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase guide to a personalized assistant using Postgres: https://supabase.com/blog/natural-db

## Explicit non-goals for V1

- No unrestricted autonomous computer control.
- No claim of continuous background operation unless a scheduler and monitoring are actually deployed.
- No production-ready or secure status until the above tests pass.
