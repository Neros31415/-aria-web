# ARIA persistent memory — staging v1

## What it does

- Stores up to 100 short notes per browser profile in the Cloudflare Workers KV namespace `ARIA_MEMORY_STAGING`, with EU jurisdiction.
- Uses a random UUID stored locally as the profile key; the access token remains in `sessionStorage` and is not committed or stored with notes.
- Loads saved notes into each model request so ARIA can use them in later chats.
- Supports explicit capture in French: messages beginning with `Retiens que`, `Retiens bien que`, `Mémorise`, `Souviens-toi que`, or `N'oublie pas que` are saved before the model responds.
- Shows whether notes are synchronized to the server or only stored on the device. If saving fails, the model is instructed not to claim success.
- Keeps manual add/delete controls in the memory panel. A successful server sync is needed before calling a note persistent.

## API

All memory routes require `Authorization: Bearer <ARIA_ACCESS_TOKEN>`.

- `GET /memory?clientId=<uuid>` returns `{ memories, persisted: true }`.
- `PUT /memory?clientId=<uuid>` accepts `{ clientId, memories }`, capped at 100 notes and 300 characters per note.
- `POST /chat` accepts `clientId` and injects saved notes into model instructions. Explicit remember requests are written before the model call.

The worker uses `store: false` for Responses API requests. Memory storage is separate from the model provider's conversation storage.

## Staging validation checklist

1. Open the test frontend and configure the ARIA access token in Settings.
2. Confirm the memory panel says it is synchronized with the ARIA server.
3. Send: `Retiens que ma règle de travail est de terminer un petit livrable avant d’ouvrir un nouveau projet.`
4. Confirm ARIA only says it was saved after a successful write.
5. Refresh the page and confirm the note remains visible.
6. Open a new conversation in the same browser profile, send a question that depends on the rule, and confirm ARIA uses it.
7. Delete the note from the memory panel and reload; verify it stays deleted.
8. Repeat with the token removed or an invalid token; the UI must clearly identify local-only memory and ARIA must not claim server persistence.

## Limitations

This is a single-user alpha, not a multi-user account system. The random browser profile ID is an identifier, not an authentication credential; access is protected by the ARIA access token. Do not reuse the same access token with untrusted users. KV is persistent but eventually consistent, so it is not a transactional database. No automatic summarization, conflict resolution, or cross-device account linking is implemented yet.
