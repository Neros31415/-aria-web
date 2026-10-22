# ARIA — Audit de parité entre le Worker staging et le code versionné

**Date :** 22 octobre 2026  
**Portée :** Worker Cloudflare `aria-brain-staging`, code sur `fix/staging-worker-input-security` et base D1 `aria-authz-staging`.  
**Règle :** ne pas remplacer le Worker actif tant que les contrats d’authentification et les bindings n’ont pas été réconciliés et testés.

## Résumé
- PR #21 fusionnée vers la branche staging sécurisée après validation CI : 48 tests, 0 échec.
- D1 `aria-authz-staging` créé avec juridiction UE et réplication désactivée.
- Migration `0001_aria_authorization.sql` appliquée ; tables vérifiées : `aria_user_roles`, `aria_entitlements`, `aria_authorization_audit`.
- Aucun binding D1 ajouté au Worker ; aucun endpoint d’administration actif ; aucun déploiement réalisé.

## Écart entre l’environnement et le code
Les bindings observés sur le Worker Cloudflare `aria-brain-staging` comprennent :
- `ARIA_USERS` (KV)
- `ARIA_MEMORY` (KV)
- `ARIA_REQUIRE_INDIVIDUAL_AUTH` (variable)
- `ARIA_ACCESS_TOKEN` (secret)
- `OPENAI_API_KEY` (secret)
- `AI` (binding AI)

Les bindings `SUPABASE_URL` et `SUPABASE_ANON_KEY` ne sont pas présents. Or le code versionné sur la branche staging exige actuellement la validation via Supabase Auth en mode individuel par défaut.

## Risque
Déployer le code versionné tel quel dans `aria-brain-staging` sans configurer Supabase Auth entraînerait un refus des requêtes authentifiées (`auth_not_configured`). La mise à jour des paramètres ou du code sans préserver les bindings existants pourrait également casser la staging.

## Ordre de résolution
1. Comparer le flux de création de session qui alimente `ARIA_USERS` avec le contrat Auth de la branche.
2. Décider du fournisseur d’identité autoritatif ; aucune bascule implicite ni identité fournie par le navigateur.
3. Écrire des tests de compatibilité et de refus fermé pour le flux choisi.
4. Attacher `ARIA_AUTHZ_DB` à une version staging non-production en conservant les bindings existants.
5. Intégrer `authorizeFromD1` aux seules routes nécessitant un contrôle de rôle/offre, puis tester sur le Worker staging.
6. Déployer la version staging, vérifier health, authentification, mémoire et journaux sans exposer les données privées.
7. Promouvoir plus tard seulement après revue sécurité et validation de toutes les fonctions du périmètre ARIA 1.0.

## Référence D1
- Nom : `aria-authz-staging`
- Juridiction : `eu`
- Réplication : désactivée
- État du schéma : appliqué et vérifié via l’API Cloudflare
- Tables : `aria_user_roles`, `aria_entitlements`, `aria_authorization_audit`

Aucun secret, jeton ou contenu de mémoire utilisateur n’est stocké dans ce document.
