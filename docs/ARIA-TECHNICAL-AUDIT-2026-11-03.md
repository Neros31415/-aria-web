# ARIA — Audit technique ciblé : identité, autorisation et mémoire
**Date :** 3 novembre 2026  
**Statut :** Audit documentaire et revue de code de branches/PR ; aucun audit runtime nouveau  
**Périmètre :** Worker staging, identité individuelle, autorisation D1, mémoire persistante, harnais HTTP E2E et CI  
**Branche documentaire :** `architecture/master-architecture-v2-draft`

> Cet audit examine les sources et patches GitHub accessibles à la date indiquée. Il ne constitue pas une interrogation actuelle de Cloudflare ou Supabase. Aucun secret, jeton ou mot de passe n'a été lu. Aucun service, binding, migration, déploiement, merge ou environnement de production n'a été modifié.

---

## 1. Verdict

**Le code candidat contient des protections utiles et des tests CI réussis, mais la migration vers l'identité individuelle n'est pas démontrée de bout en bout sur le Worker staging.**

Le blocage opérationnel demeure :
- l'audit de configuration staging daté du 1er novembre rapporte `ARIA_AUTH_MODE=session_kv` avec `ARIA_REQUIRE_INDIVIDUAL_AUTH=true` ;
- le Worker actif ne disposait pas des paramètres Supabase individuels à cette date ;
- la PR #54 corrige le code pour refuser les modes de compatibilité lorsque le garde-fou est actif, mais reste ouverte, en brouillon et non déployée ;
- le test HTTP réel à deux comptes de la PR #53 reste non exécuté.

Les tests CI valident le code candidat dans leurs environnements de test ; ils ne démontrent pas que le Worker déployé exécute ce code.

## 2. Périmètre et sources examinées

| Élément | Source examinée | Constat |
|---|---|---|
| Authentification individuelle | `cloudflare/aria-brain-staging.mjs` sur le head de PR #54 | Validation Bearer via Supabase `/auth/v1/user`, identité dérivée de l'UUID retourné |
| Garde-fou de mode | Patch PR #54 | Refus 503 de `session_kv` et `legacy` avant lookup KV si l'auth individuelle est exigée |
| Autorisation | `cloudflare/aria-authorization-d1.mjs` | Lecture des rôles/entitlements D1 ; refus fermé si identité, rôle ou base invalide |
| Provisionnement | `ensureDefaultUserRole` | Création limitée au rôle `user`, avec audit dans un batch D1 |
| Mémoire | Routes `/memory` et `/memory/consent` | Propriétaire dérivé de l'identité serveur ; contrôles de permission et consentement |
| Schéma | `migrations/0001` à `0003` | Rôles, entitlements, audit, consentement et documents mémoire |
| E2E | PR #53, script `scripts/staging-auth-two-account-http-e2e.mjs` | Harnais borné au Worker/Supabase staging ; désactivé par défaut ; non exécuté en HTTP réel |
| Isolation UI | PR #52 et #55 | Préférences/onboarding par compte ; données personnelles verrouillées jusqu'à résolution du scope |
| CI | PR #54 et PR #57 | Résultats GitHub Actions disponibles et examinés |

## 3. Points positifs vérifiés dans le code candidat

### 3.1 Identité serveur
En mode `individual`, le Worker appelle le endpoint Supabase Auth `/auth/v1/user` avec le bearer token, puis dérive `ownerId` du champ `user.id` retourné et vérifie qu'il s'agit d'un UUID. Les routes mémoire ne prennent pas `clientId` comme source d'identité en mode individuel.

### 3.2 Garde-fou de compatibilité
Le patch de la PR #54 refuse `session_kv` et `legacy` lorsque `ARIA_REQUIRE_INDIVIDUAL_AUTH=true`, avant consultation du registre KV. Le endpoint `/health` expose `individualAuthRequired` et `identityMigrationRequired` et marque le service comme non configuré en cas de contradiction.

### 3.3 Autorisation D1
Le module D1 :
- accepte uniquement des UUID canoniques ;
- vérifie que le rôle appartient à l'identité demandée et est actif ;
- ne confond pas entitlement commercial et rôle ;
- refuse si le binding ou les données d'autorisation sont indisponibles ;
- provisionne au plus le rôle de base `user`, sans endpoint public de mutation de rôle.

### 3.4 Mémoire et consentement
Les routes mémoire :
- dérivent le propriétaire de l'identité authentifiée ;
- appliquent `memory:own:read/write/delete` via Governance D1 ;
- refusent lecture et écriture lorsque le consentement est désactivé ;
- autorisent la révocation du consentement par le propriétaire authentifié ;
- conditionnent l'UPSERT mémoire à un consentement encore actif dans l'instruction SQL ;
- utilisent une suppression ciblée sur l'UUID authentifié.

Les migrations 0002/0003 définissent le registre de consentement et le document mémoire avec validation JSON et clé étrangère `ON DELETE CASCADE`.

### 3.5 Isolation côté interface
Les PR #52 et #55 introduisent des clés locales par UUID de compte et empêchent l'exposition du profil/mémoire personnels avant résolution du scope authentifié. Les tests de régression couvrent le changement de compte, le reset ciblé et les réponses de session obsolètes.

## 4. Défaut corrigé dans ce lot — readiness E2E insuffisamment stricte

### Problème
Le script E2E de la PR #53 vérifiait le mode `individual` et les stores D1/mémoire, mais ne vérifiait pas que le Worker confirmait explicitement :
- `individualAuthRequired === true` ;
- `identityMigrationRequired === false`.

Un staging configuré en mode individuel mais sans le garde-fou de déploiement exigé pouvait donc passer ce contrôle de readiness.

### Correction
La PR #57 ajoute une fonction testable `assertStagingReadiness()` qui exige :
- `status=ok` ;
- `authenticationMode=individual` ;
- `individualAuthRequired=true` ;
- `identityMigrationRequired=false` ;
- binding D1 d'autorisation présent ;
- stockage de consentement et de documents disponible ;
- mémoire persistante disponible et `memoryStatus=available`.

Des tests négatifs couvrent le garde-fou désactivé, une migration d'identité en attente, les modes `session_kv`/ `legacy` et les stores manquants.

**PR #57 :** [fix(test): require enforced individual auth in staging E2E](https://github.com/Neros31415/-aria-web/pull/57)  
**Branche :** `fix/staging-e2e-require-individual-auth`  
**Commit contrôlé :** `e8d4f18aff9efc1150fecea3171c83a7799e2587`  
**CI :** workflow `ARIA secure UI integration checks`, run #147 — succès.

Cette correction durcit le harnais ; elle ne rend pas le staging lui-même prêt et ne lance pas le test HTTP réel.

## 5. État des PR et dépendances

| PR | Objet | État observé | Dépendance |
|---|---|---|---|
| #43 | Consentement mémoire et annulation de synchronisations obsolètes | Ouverte, non fusionnée | Base staging / mémoire |
| #46 | Auth Supabase email/mot de passe staging | Ouverte, draft | Empilée sur #43 |
| #48 | Gestion des erreurs réseau Auth | Ouverte, draft | #46 |
| #50 | Restauration de session récupérable | Ouverte, draft | #48 |
| #51 | Course de restauration de session | Ouverte, draft | #50 |
| #52 | Préférences et onboarding par compte | Ouverte, draft | #50 |
| #53 | Harnais HTTP à deux comptes | Ouverte, draft | #52 |
| #54 | Garde-fou d'identité individuelle | Ouverte, draft | #53 |
| #55 | Verrouillage UI avant résolution du scope | Ouverte, draft | #52 |
| #56 | Fallback vocal si TTS indisponible | Ouverte, draft | #55 |
| #57 | Readiness E2E exigeant le garde-fou individuel | Ouverte, draft | #54 |

Ces PR ne doivent pas être fusionnées isolément dans `main`. Les bases et l'ordre de la pile doivent être conservés et réévalués avant toute intégration.

## 6. Preuves CI — limites précises

- **PR #54, commit `6e9cbb675cd250adfa1aa398a8f66516706f5bd2` :** Staging Worker Tests, run #137, succès ; le corps de PR rapporte 71 tests Node et 5 tests SQLite réussis. ARIA secure UI integration checks, run #142, succès.
- **PR #55, commit `bf180702a5a1b4e4a26511d93d7d9c892280af9b` :** ARIA secure UI integration checks, run #143, succès.
- **PR #57, commit `e8d4f18aff9efc1150fecea3171c83a7799e2587` :** ARIA secure UI integration checks, run #147, succès.

Les tests SQLite exécutent les migrations et les instructions SQL du Worker sur SQLite local. Ils ne remplacent pas le runtime Cloudflare D1. Les tests unitaires Worker utilisent aussi des doubles D1 pour les chemins applicatifs.

**Non exécuté :** test HTTP staging à deux comptes ; test sur iPhone physique ; test du Worker actif après déploiement du code candidat.

## 7. Risques restants et priorités

### P0 — Déploiement staging individuel non démontré
Le Worker staging est documenté en `session_kv` avec le garde-fou individuel requis, ce qui le rend volontairement incompatible jusqu'à configuration individuelle. Il faut une autorisation distincte pour configurer les variables/bindings et déployer le Worker staging. Ce travail n'est pas réalisé ici.

**Critère de sortie :** endpoint `/health` confirmant le mode individuel et tous les stores ; ensuite test HTTP avec deux comptes de test dédiés ; aucune donnée personnelle ni compte client.

### P0 — Intégration multi-comptes HTTP
Le harnais #53, durci par #57, doit être exécuté seulement lorsque le staging est réellement prêt et que deux comptes de test dédiés existent. Il vérifie l'isolation, le spoofing de `clientId`, la révocation et le nettoyage.

**Critère de sortie :** run HTTP réel lié à une version Worker, avec résultat et nettoyage vérifiés.

### P1 — Écritures mémoire concurrentes : risque de lost update
Le document mémoire est stocké comme un tableau JSON complet par compte. Le chemin de mémorisation du chat lit le tableau, le modifie en mémoire, puis effectue un UPSERT du document complet. La condition SQL protège le consentement au moment de l'écriture, mais il n'existe pas de contrôle de version/ETag/compare-and-swap pour empêcher deux écritures concurrentes de s'écraser.

**Risque :** deux requêtes simultanées peuvent lire la même version et la dernière écriture peut écraser l'ajout de l'autre. Ce point n'est pas démontré comme une perte déjà observée ; c'est un risque de concurrence déduit du code relu.

**Correction proposée :** ajouter une révision monotone au document et un UPSERT conditionnel sur la révision attendue, ou normaliser les souvenirs en lignes avec opérations idempotentes. Ajouter un test de concurrence qui prouve qu'une écriture concurrente ne disparaît pas silencieusement.

### P1 — Audit du consentement mémoire
La table `aria_memory_consent` conserve l'état courant et son horodatage, mais les changements de consentement ne semblent pas produire d'événements dédiés dans `aria_authorization_audit`. Le domaine d'actions de cette table couvre les rôles, entitlements et gift keys, pas explicitement `memory.consent.updated`.

**Risque :** l'état courant est consultable, mais l'historique de consentement et la provenance de chaque bascule ne sont pas audités de manière explicite.

**Correction proposée :** décider si l'historique de consentement doit être append-only ; si oui, ajouter un événement dédié écrit de façon atomique avec la mise à jour du registre, et tester l'absence d'événement en cas d'échec.

### P1 — Historique de migrations D1
L'audit de parité du 1er novembre rapporte les cinq tables attendues et un `pragma_foreign_key_check` sans anomalie, mais aucune table `d1_migrations` ou `schema_migrations`. La structure est documentée comme présente ; l'historique exact d'application reste non traçable.

**Correction proposée :** choisir une stratégie officielle de suivi des migrations D1 et réconcilier l'état existant sans rétro-enregistrer de version non prouvée.

### P2 — Durcissement de la chaîne d'authentification
Compléter les tests de délais, indisponibilité Supabase, réponse JSON malformée, rotation/révocation de session et charge. Vérifier les limites de débit et la surveillance des erreurs Auth côté Worker.

## 8. Prochaine séquence recommandée

1. Revoir la pile #43 → #46 → #48 → #50 → #52 → #53 → #54 → #57 et la branche parallèle #55 → #56 ; préserver l'ordre.
2. Obtenir l'autorisation explicite et préparer la configuration staging individuelle ; aucune action production.
3. Déployer uniquement en staging après revue du diff final et de la parité bindings.
4. Exécuter `/health`, puis le harnais E2E à deux comptes.
5. Traiter ensuite la concurrence des écritures mémoire et l'audit des changements de consentement.
6. Mettre à jour la matrice de traçabilité avec des preuves runtime datées.

---

## Conclusion

Les protections principales sont bien représentées dans le code candidat et couvertes par des tests automatisés. Le risque majeur immédiat n'est pas un échec de ces tests : c'est l'écart entre le code candidat et le Worker staging actif, qui empêche encore de prouver l'authentification individuelle réelle et l'isolation multi-comptes.

La correction #57 améliore le garde-fou du harnais et sa CI passe. La suite doit rester bloquée avant tout test HTTP tant que le staging ne confirme pas une identité individuelle active.

**Aucun merge, déploiement, changement de configuration, migration ou opération de production n'a été effectué pendant cet audit.**
