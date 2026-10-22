# ARIA — Audit de parité et validation du déploiement staging

**Date :** 22 octobre 2026  
**Périmètre :** Worker Cloudflare `aria-brain-staging` uniquement.  
**Production :** inchangée.

## Résultat
La version testée de l’authentification par sessions serveur et du contrôle d’accès D1 a été déployée sur le Worker de staging après réussite de la CI.

- **Version Cloudflare :** `c1387164-ffdd-48ea-9dbe-7034b98bb781` (version 26)
- **Déploiement :** `388f7084-5639-44ae-8a75-2c73de22c514`
- **Répartition du trafic :** 100 % sur cette version du Worker de staging
- **CI :** [run 39790616842](https://github.com/Neros31415/-aria-web/actions/runs/39790616842), 57 tests réussis, 0 échec
- **Source :** branche `feat/aria-brain-staging-integration`, PR #25 fusionnée dans cette branche après validation.

## Configuration vérifiée par l’API Cloudflare
Le déploiement conserve les bindings préexistants via l’héritage strict des bindings et ajoute :
- `ARIA_AUTH_MODE=session_kv`
- `ARIA_AUTHZ_DB` lié à la base D1 `aria-authz-staging`

Les bindings `ARIA_USERS`, `ARIA_MEMORY`, `AI`, `OPENAI_API_KEY` et `ARIA_ACCESS_TOKEN` sont toujours déclarés dans la configuration de la version. Les valeurs des secrets n’ont pas été lues ni copiées dans le dépôt.

Le mode `session_kv` hache le jeton Bearer en SHA-256 et cherche `session:v1:<hash>` dans le registre serveur `ARIA_USERS`. L’identité vient exclusivement de cette entrée serveur, jamais du corps ou de l’URL client. Les identifiants historiques opaques sont conservés pour éviter de casser la mémoire existante.

## Base D1
- **Nom :** `aria-authz-staging`
- **Juridiction :** UE
- **Réplication :** désactivée
- **Binding Worker :** `ARIA_AUTHZ_DB`
- **Tables vérifiées :** `aria_user_roles`, `aria_entitlements`, `aria_authorization_audit`

Le Worker crée uniquement un rôle de base `user` au premier accès authentifié si aucun rôle n’existe. L’insertion et l’événement d’audit sont regroupés dans un batch D1. Les rôles existants/inactifs ne sont pas remplacés ou réactivés. L’interface publique ne peut pas attribuer un rôle administratif.

Les routes `GET/PUT/DELETE /memory` et l’accès mémoire depuis `/chat` consultent désormais l’autorisation D1 et refusent l’accès si le binding ou le registre est indisponible. Le health check expose `authenticationMode` et `authorizationStore`, et marque `configured=false` si le binding D1 requis manque en mode individuel.

## Validation post-déploiement et limite
L’API Cloudflare confirme :
1. le déploiement le plus récent pointe vers la version 25 à 100 % ;
2. les bindings de cette version incluent `ARIA_AUTHZ_DB` et `ARIA_AUTH_MODE=session_kv` ;
3. le code servi contient le mode session KV, le contrôle d’accès D1 et le provisionnement du rôle de base ;
4. les trois tables D1 sont présentes.

Un test SQL réel sur la base staging a confirmé que l’insertion du rôle `user` et l’écriture de l’audit fonctionnent ensemble via le batch D1 ; les lignes temporaires de test ont été nettoyées. Le test HTTP direct de `/health` n’a pas pu être exécuté depuis l’environnement d’outillage : les requêtes sortantes vers le domaine `workers.dev` y sont bloquées. Ce n’est **pas** présenté comme un test de santé réussi. Une vérification fonctionnelle depuis un navigateur autorisé ou un test d’intégration dédié reste nécessaire.

## Bloqueurs avant production
- Vérification HTTP réelle de `/health`, authentification, lecture/écriture/suppression mémoire et journalisation.
- Tests d’intégration avec une session authentifiée réelle et une panne D1.
- Provisionnement sécurisé du Super Admin et procédure de récupération.
- Source fiable pour la MFA récente avant opérations sensibles.
- Routes admin auditées pour rôles, clés cadeaux et offres Premium.
- Validation complète du périmètre ARIA 1.0, revue sécurité et tests iOS avant promotion en production.

Aucun secret, jeton ni contenu de mémoire personnelle n’est enregistré dans ce document.
