# ARIA persistent memory — staging v1

## What it does

- In the legacy single-user alpha only, stores up to 100 short notes per browser profile in the Cloudflare Workers KV namespace `ARIA_MEMORY_STAGING`, with EU jurisdiction.
- In individual-account mode, stores the account's memory document in D1 alongside the durable consent ledger; the canonical authenticated account UUID is the only owner key.
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

The legacy KV path remains a single-user alpha, not a multi-user account system. The random browser profile ID is an identifier, not an authentication credential; access is protected by the ARIA access token. Do not reuse the same access token with untrusted users. KV is persistent but eventually consistent, so it is not a transactional database. No automatic summarization, conflict resolution, or cross-device account linking is implemented yet.


## Identity migration gate (23 October 2026)

The secure integration Worker now distinguishes the authentication modes:

- **Supabase individual mode:** persistent memory is scoped to the UUID returned by successful server-side Supabase Auth validation and is protected by D1 authorization.
- **Legacy single-user alpha mode:** the existing memory:v1:<clientId> compatibility path remains for explicitly configured alpha clients; the shared token must never be distributed to untrusted users.
- **session_kv alpha mode:** chat authentication may succeed, but GET/PUT/DELETE /memory returns 409 identity_migration_required. With memory consent enabled, chat does not read or write persistent memory for these sessions and tells the model that persistence is unavailable. The memory store must not be touched.

The opaque owner ID retrieved from ARIA_USERS is not treated as a canonical account UUID. Do not auto-provision a D1 role for it or migrate existing notes based on a browser profile ID, token, or an unverified identifier match. Persistent memory for these sessions can be re-enabled only after a verified server-side mapping to a canonical account identity and migration tests covering ownership, collisions, revocation, and preservation/deletion of existing notes.

The regression tests for this gate passed in PR #35. This change was merged into feat/aria-brain-staging-integration; it has not been deployed to Cloudflare staging or production. The active deployed Worker may therefore still behave differently until a separately validated staging deployment is performed.


Defense in depth added on 23 October 2026: the D1 authorization adapter and default-role provisioning now accept canonical account UUIDs only. Opaque alpha identifiers are rejected before any D1 query or write, even if a future caller bypasses the Worker-level session_kv gate. This is not an identity migration and does not restore persistent memory for existing alpha sessions.

## Account memory and durable consent — PR #43, 24 October 2026

The individual-account path uses the authenticated canonical Supabase UUID and the D1 binding `ARIA_AUTHZ_DB` for both the durable consent ledger and memory documents.

- `migrations/0002_aria_memory_consent.sql` creates the account-scoped consent record.
- `migrations/0003_aria_memory_documents.sql` creates the account-scoped memory document table with JSON-array validation and a foreign key to the consent record.
- `GET /memory/consent` returns the server-stored state.
- `POST /memory/consent` accepts only `{ "enabled": true|false }`; enabling requires the account's memory-write permission. Revocation remains available to the authenticated owner even if the role is inactive.
- Individual-account `GET /memory` and chat reads query D1 with a consent predicate. Individual-account `PUT /memory` and chat writes use a conditional D1 statement that only inserts/updates while the consent row is enabled. This removes the prior cross-store D1-consent/KV-payload race for individual-account writes.
- A client-supplied `X-ARIA-Memory-Consent` header cannot grant or restore individual-account consent. The legacy single-user alpha still uses KV and the header guard.
- `DELETE /memory` remains available after consent revocation, but still requires authenticated ownership and authorization.

**Release limitation:** migrations 0002 and 0003 are versioned in this pull request but have not been applied to the actual D1 database. Individual-account persistent memory must remain unavailable in any environment where the D1 schema is absent; requests fail closed. The legacy alpha compatibility path remains separate and does not provide account-level durable consent.

**Concurrency semantics:** a D1 read is authorized at the time its SQL statement executes. Writes include the consent predicate in the same D1 statement as the insert/update, so a revocation committed before that statement prevents persistence. An operation already linearized before revocation may finish; the interface should invalidate stale in-flight UI syncs, and the system must not promise cancellation of data already returned to a client. This is stronger than checking D1 and then writing the payload to KV, but it is not a guarantee that a response already in flight can be recalled.

## Vérification réelle du schéma staging — 25 octobre 2026

Contrôle en lecture seule du D1 `aria-authz-staging` lié au Worker `aria-brain-staging` :

- La liaison `ARIA_AUTHZ_DB` pointe vers cette base D1 ; le binding historique `ARIA_MEMORY` (KV) est encore présent pour la compatibilité alpha.
- `sqlite_master` contient les tables d'autorisation historiques (`aria_user_roles`, `aria_entitlements`, `aria_authorization_audit`), mais **ne contient pas** `aria_memory_consent` ni `aria_memory_documents`.
- Par conséquent, les migrations `0002_aria_memory_consent.sql` et `0003_aria_memory_documents.sql` ne sont pas appliquées dans cette base au moment du contrôle. Le chemin mémoire individuel basé sur D1 n'est pas prêt à être validé en staging et doit rester en échec fermé.
- Les instructions SQL de lecture jointe et d'écriture conditionnelle ont été exécutées contre SQLite 3.46.1 en base éphémère : écriture avec consentement actif réussie, écriture après révocation refusée sans altérer le document existant, suppression en cascade vérifiée. Ceci valide la syntaxe et la sémantique SQLite de base, **pas** le runtime D1 réel ni l'intégration de bout en bout.
- Aucun schéma réel n'a été modifié ; aucune migration, écriture de données métier, fusion ou déploiement n'a été exécuté pendant ce contrôle.

### Porte de validation avant activation

1. Confirmer explicitement la base D1 cible et obtenir l'autorisation de modifier son schéma.
2. Vérifier une sauvegarde/possibilité de restauration et l'état de la migration `0001`.
3. Appliquer `0002` puis `0003` uniquement après autorisation, puis relire `sqlite_master` et les contraintes.
4. Déployer le Worker de staging séparément après revue/autorisation et exécuter les parcours réels avec deux comptes distincts : consentement, lecture, écriture, révocation, suppression et isolation.
5. Ne pas migrer automatiquement les notes KV historiques : aucune correspondance canonique compte/profil n'est démontrée.
