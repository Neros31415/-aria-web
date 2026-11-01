# ARIA — audit de parité du backend staging

**Date de vérification :** 1 novembre 2026  
**Portée :** inspection en lecture seule du Worker `aria-brain-staging`, de ses bindings et de la base D1 `aria-authz-staging`.  
**Aucune migration, écriture SQL, modification de binding, lecture de secret ou opération de déploiement n'a été effectuée.**

## Résultats D1

Une requête `SELECT` sur `sqlite_master` confirme les tables applicatives suivantes :

- `aria_user_roles`
- `aria_entitlements`
- `aria_authorization_audit`
- `aria_memory_consent`
- `aria_memory_documents`

Les tables et index observés correspondent aux définitions des migrations versionnées `0001`, `0002` et `0003` présentes dans le dépôt. La requête `pragma_foreign_key_check` n'a retourné aucune ligne.

**Anomalie de métadonnées :** l'API de listing D1 rapporte `num_tables: 0`, alors que la requête SQL retourne les tables ci-dessus. Le résultat SQL est la preuve directe de la structure actuellement interrogeable ; le compteur de métadonnées ne doit pas être utilisé seul comme contrôle de disponibilité.

**Historique des migrations :** aucune table `d1_migrations` ou `schema_migrations` n'a été trouvée. La parité structurelle actuelle est vérifiée, mais l'historique exact d'application des migrations n'est pas traçable dans cette base. Ne pas inventer ni rétro-enregistrer des versions sans procédure de réconciliation validée.

## Résultats Worker staging

L'inspection des paramètres non secrets du Worker montre :

- `ARIA_AUTH_MODE=session_kv`
- `ARIA_REQUIRE_INDIVIDUAL_AUTH=true`
- binding D1 `ARIA_AUTHZ_DB` présent
- bindings KV historiques présents
- aucun binding de configuration Supabase individuel (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` ou `SUPABASE_ANON_KEY`) présent
- dernier déploiement observé : 22 octobre 2026

Le code source accepte encore explicitement le mode de compatibilité `session_kv` dans `authenticateRequest()`. Ce mode fournit des identifiants opaques, non équivalents à l'UUID canonique d'un compte Supabase. Les endpoints de mémoire le bloquent déjà avec `identity_migration_required`, mais le garde-fou de déploiement `ARIA_REQUIRE_INDIVIDUAL_AUTH` n'était pas appliqué à l'authentification générale.

## Correction apportée dans cette branche

La branche `fix/enforce-required-individual-auth` :

1. refuse `session_kv` et `legacy` lorsque `ARIA_REQUIRE_INDIVIDUAL_AUTH=true`, avant tout accès au registre de sessions ;
2. expose dans `/health` les indicateurs `individualAuthRequired` et `identityMigrationRequired` ;
3. marque le service comme non configuré lorsque le mode actif contredit l'exigence d'authentification individuelle ;
4. ajoute des tests de non-régression couvrant les deux modes de compatibilité et le rapport de santé ;
5. rattache le workflow de tests staging à cette branche et à sa branche de base.

## Blocage restant

Le staging ne peut pas encore réussir le test HTTP individuel à deux comptes. Il faut d'abord une configuration de service explicitement autorisée qui fournisse l'authentification individuelle et les bindings nécessaires, puis un déploiement staging contrôlé. Ces opérations restent hors de cette PR et nécessitent une autorisation distincte.

Le harnais de test de la PR #53 reste volontairement désactivé par défaut. Son test HTTP réel n'a pas été exécuté.
