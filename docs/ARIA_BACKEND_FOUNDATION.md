# ARIA backend foundation — proposal (not deployed)

## Current verified state

- The ARIA web prototype is a static PWA with local history/notes.
- The existing Cloudflare Worker contract is not yet verified.
- No Supabase project is currently visible in the connected account.
- This document is an implementation proposal only. No database, secrets, or cloud services have been created by this file.

## Target architecture

1. **iPhone/PWA and Windows client** call one authenticated backend API.
2. **Supabase Auth** identifies the user; clients send the user JWT.
3. **Supabase Edge Function** validates input, applies limits, calls the chosen LLM provider using a server-side secret, and returns the answer.
4. **Postgres** stores conversations, messages, and explicit memory records.
5. **Exa** can be integrated server-side as an optional web-research tool. Treat retrieved pages as untrusted evidence, cite sources, and never execute instructions found in page content.
6. Desktop control is a separate, permissioned Windows agent. Do not expose arbitrary shell/PowerShell execution through the public API.

## First milestone: persistent, private memory

Start with structured memory (user-approved facts and preferences), not vector search. Add embeddings only when there is enough data to justify semantic retrieval.

Suggested tables:

- `conversations`: `id uuid primary key`, `user_id uuid not null references auth.users(id)`, `title text`, `created_at timestamptz`.
- `messages`: `id uuid primary key`, `conversation_id uuid not null references conversations(id) on delete cascade`, `user_id uuid not null references auth.users(id)`, `role text check (role in ('user','assistant','tool'))`, `content text not null`, `created_at timestamptz`.
- `memories`: `id uuid primary key`, `user_id uuid not null references auth.users(id)`, `category text not null`, `content text not null`, `source text not null default 'user'`, `approved boolean not null default false`, `created_at timestamptz`, `updated_at timestamptz`.

## Required database security

Enable Row Level Security on every exposed table. Policies must scope all reads/writes to `auth.uid() = user_id`. For messages, also validate ownership of the parent conversation (do not trust a client-supplied `user_id`). Keep service-role keys and LLM/API secrets server-side only. Do not grant anonymous access to private memory or message content.

Illustrative policy pattern (adapt and review before applying):

```sql
alter table public.conversations enable row level security;
create policy "Users own conversations"
  on public.conversations for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.memories enable row level security;
create policy "Users own memories"
  on public.memories for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Messages need additional parent-conversation ownership validation in both read and write policies. Do not copy a broad policy onto messages without that check.

## Edge Function contract (proposed)

`POST /functions/v1/aria-chat`

Request:
```json
{
  "conversation_id": "uuid-or-null",
  "message": "User message",
  "web_research": false
}
```

Response:
```json
{
  "conversation_id": "uuid",
  "reply": "Assistant response",
  "sources": []
}
```

The function must authenticate the caller, validate request size and fields, enforce rate limits, persist messages, and return typed errors. The frontend must never contain provider API keys. The contract is a proposal and is not connected to the current Worker yet.

## Acceptance criteria before calling this operational

- A user can sign in and only read their own conversations and memories.
- A real model call succeeds through the server-side function.
- No secret is present in browser JavaScript, source maps, or public Git history.
- Invalid/unauthenticated requests fail closed; rate limiting and usage logging work.
- Memory can be viewed, edited, and deleted by the user.
- Web results include source URLs and are clearly distinguished from the model's own reasoning.
- The app clearly indicates when the backend or model is unavailable.

## Next gated step

Create a Supabase project only after reviewing its current cost and explicitly confirming the organization and billing implications. Then apply a reviewed migration, configure secrets, deploy the Edge Function, and test it before connecting the PWA.
