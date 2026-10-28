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

**Release limitation (updated 27 October 2026):** migrations 0002 and 0003 have now been applied to the staging D1 `aria-authz-staging` only. The staging schema exists, but the Worker version currently deployed to Cloudflare has not been confirmed against this branch, and the authenticated HTTP end-to-end flow has not yet been validated. Do not treat individual-account memory as release-ready until the staging Worker is reviewed/deployed separately and two real test accounts pass the full HTTP flow. Production has not been modified. The legacy alpha compatibility path remains separate and does not provide account-level durable consent.

**Concurrency semantics:** a D1 read is authorized at the time its SQL statement executes. Writes include the consent predicate in the same D1 statement as the insert/update, so a revocation committed before that statement prevents persistence. An operation already linearized before revocation may finish; the interface should invalidate stale in-flight UI syncs, and the system must not promise cancellation of data already returned to a client. This is stronger than checking D1 and then writing the payload to KV, but it is not a guarantee that a response already in flight can be recalled.

## Vérification réelle du schéma staging — 27 octobre 2026

Contrôle de la base D1 `aria-authz-staging` (UUID `564c348b-aaea-4cba-aab2-a071b5dd9635`, région UE), liée historiquement au Worker `aria-brain-staging` :

- Avant migration, `sqlite_master` contenait les tables d'autorisation historiques mais pas `aria_memory_consent` ni `aria_memory_documents`. La migration `0001` était déjà représentée par les tables d'autorisation existantes ; aucune réapplication de `0001` n'a été tentée.
- Le 27 octobre, les instructions DDL de `0002_aria_memory_consent.sql` puis `0003_aria_memory_documents.sql` ont été appliquées via l'API D1. Les deux tables et la clé étrangère `ON DELETE CASCADE` sont confirmées dans `sqlite_master`, ainsi que la contrainte JSON et l'index `idx_aria_memory_documents_updated`.
- Une exportation D1 complète a répondu `status: complete` avant migration. Son URL de téléchargement signée était temporaire et n'a pas pu être téléchargée dans l'environnement d'exécution ; cette exportation n'est donc **pas considérée comme une sauvegarde locale restaurable vérifiée**. Le changement réalisé est additif : il n'a modifié aucune table ni donnée préexistante. Retour arrière ciblé possible en supprimant d'abord `idx_aria_memory_documents_updated`, puis `aria_memory_documents`, puis `aria_memory_consent`, uniquement si les nouvelles tables ne contiennent aucune donnée utile.
- Tests directs sur le véritable runtime D1, avec deux UUID de test temporaires et sans donnée personnelle : création de deux consentements, écriture conditionnelle de deux documents (1 ligne modifiée par compte), révocation du premier consentement, tentative d'écriture suivante refusée (`changes = 0`), suppression en cascade du document associé (`changes = 2`) et rejet d'un document JSON invalide par la contrainte `CHECK` (`SQLITE_CONSTRAINT_CHECK`). Des requêtes finales confirment qu'aucune ligne des UUID de test ne reste dans les deux tables. Aucun parcours HTTP authentifié n'a été exécuté.
- La requête de métadonnées Cloudflare continue de renvoyer `num_tables: 0` malgré les tables visibles dans `sqlite_master`; cette métrique est incohérente et ne doit pas servir de preuve de schéma. La lecture des lignes de tables d'autorisation via l'API de requête a aussi renvoyé `SQLITE_AUTH`; aucune tentative de contournement n'a été faite.
- Aucun code Worker n'a été déployé, aucune fusion n'a été réalisée et aucune base de production n'a été modifiée.

### Porte de validation restante avant activation

1. Vérifier le code et la configuration réellement déployés sur le Worker de staging, sans exposer de secrets.
2. Préparer et autoriser séparément un déploiement de staging depuis le commit validé de la PR #43.
3. Exécuter les parcours HTTP avec deux comptes de test distincts : consentement, lecture, écriture, révocation, suppression, refus d'accès et isolation.
4. Vérifier les réponses d'état/readiness et la CI après déploiement.
5. Ne pas migrer automatiquement les notes KV historiques : aucune correspondance canonique compte/profil n'est démontrée.


## Écart de parité avec le Worker staging réellement déployé — 28 octobre 2026

Inspection en lecture seule de l'API Cloudflare pour `aria-brain-staging` :

- La version active est la version **26**, identifiant `c1387164-ffdd-48ea-9dbe-7034b98bb781`, déployée à 100 % depuis le 22 octobre 2026. Le message d'annotation indique « Health endpoint reports D1 authorization readiness; CI 57/57 passed » ; cette annotation décrit le déploiement historique, elle ne prouve pas la parité avec la branche actuelle.
- Les paramètres actuellement exposés déclarent `ARIA_AUTH_MODE=session_kv` et `ARIA_REQUIRE_INDIVIDUAL_AUTH=true`, avec le binding D1 `ARIA_AUTHZ_DB` pointant vers `aria-authz-staging`. Les secrets ne sont ni lus ni reproduits dans ce rapport.
- Le code réellement déployé expose `/health`, `/chat` et `/memory`. L'inspection du bundle déployé n'a trouvé ni route `/memory/consent`, ni `readServerMemoryConsent`, ni référence SQL à `aria_memory_consent`. La route mémoire déployée utilise encore le binding KV `ARIA_MEMORY`.
- Le code de la branche de la PR #43 contient au contraire la logique de consentement durable D1 et les routes associées. **Le Worker actif n'est donc pas à parité avec le code de la PR #43.** Le fait que le schéma D1 soit migré ne signifie pas que le Worker l'utilise.
- Conséquence : aucun test HTTP de consentement D1 ne peut être considéré comme réussi sur le Worker actuellement déployé. Un déploiement de staging ne doit être tenté qu'après comparaison complète du bundle de la PR, vérification des bindings et de la compatibilité du mode d'authentification, puis plan de retour arrière. La configuration actuelle `session_kv` ne constitue pas une identité de compte canonique et ne permet pas d'activer la mémoire individuelle en contournant la porte de migration.
- Contrôles réalisés : lecture des paramètres, des bindings (noms/types/IDs uniquement), de l'historique des versions/déploiements et du bundle actif. Aucun secret n'a été affiché, aucune configuration n'a été modifiée, aucun Worker n'a été déployé et aucune donnée de production n'a été touchée.

### Porte de sortie avant déploiement staging

1. Comparer le code complet du Worker de la branche candidate avec le bundle actif et la configuration `session_kv`.
2. Déterminer si le mode d'authentification staging doit rester `session_kv` (mémoire individuelle alors bloquée) ou passer à `individual` avec les paramètres Supabase nécessaires ; ne pas changer ce choix implicitement.
3. Déployer uniquement après vérification de tous les bindings hérités, des secrets requis, de la readiness et du retour arrière.
4. Exécuter les tests HTTP authentifiés à deux comptes canoniques distincts sur le Worker déployé, puis revérifier sa version active et les contrôles CI.
