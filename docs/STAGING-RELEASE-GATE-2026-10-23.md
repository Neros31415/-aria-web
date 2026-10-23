# ARIA — Contrôle de parité staging et gate de release

**Date du contrôle :** 23 octobre 2026  
**Worker observé :** `aria-brain-staging`  
**Branche du code inspectée :** `feat/aria-brain-staging-integration`  
**Nature du contrôle :** lecture seule. Aucun secret n'a été lu ou exposé ; aucun paramètre ni déploiement Cloudflare n'a été modifié.

## Résultat exécutif

**NO-GO pour promouvoir la branche d'intégration en staging ou en production à ce stade.**

La configuration Cloudflare observée et le code de la branche d'intégration ne sont pas encore suffisamment réconciliés pour un déploiement sûr. Les corrections PR #37 et #38 sont dans la branche d'intégration, mais elles ne sont pas incluses dans la version actuellement déployée au Worker au moment du contrôle.

## Configuration du Worker observée en lecture seule

Le Worker `aria-brain-staging` expose les bindings suivants (seules les métadonnées non secrètes sont rapportées) :

| Binding | Type observé | Commentaire |
|---|---|---|
| `AI` | AI | Binding Workers AI présent |
| `ARIA_ACCESS_TOKEN` | Secret | Valeur non lue |
| `ARIA_AUTH_MODE` | Variable texte | Valeur `session_kv` |
| `ARIA_AUTHZ_DB` | D1 | Binding présent |
| `ARIA_MEMORY` | KV | Binding présent |
| `ARIA_REQUIRE_INDIVIDUAL_AUTH` | Variable texte | Valeur `true` |
| `ARIA_USERS` | KV | Registre des sessions alpha |
| `OPENAI_API_KEY` | Secret | Valeur non lue |

Aucun binding `SUPABASE_URL` ou `SUPABASE_ANON_KEY` n'est présent dans la configuration observée.

La dernière version déployée visible lors du contrôle date du **22 octobre 2026 à 14:00:21 UTC**. Son annotation indique « Deploy health readiness reporting to staging ». Cela précède les commits et PR #37/#38 de la branche d'intégration.

## Écarts bloquants

### 1. Fournisseur d'identité
Le code de la branche exige `SUPABASE_URL` et `SUPABASE_ANON_KEY` si `ARIA_AUTH_MODE=individual`. Ils ne sont pas présents dans la configuration observée. Ne pas basculer vers `individual` avant de configurer et valider ces bindings dans un environnement staging approuvé.

### 2. Sessions alpha
La configuration actuelle utilise `session_kv`. Le Worker autorise le chat pour les sessions alpha, mais bloque la mémoire persistante jusqu'à migration d'identité. Cette restriction est intentionnelle et doit rester active.

### 3. Variable de contrôle historique
`ARIA_REQUIRE_INDIVIDUAL_AUTH=true` est présente dans les bindings observés, mais le code versionné inspecté ne lit pas cette variable. Ne pas supposer qu'elle constitue un contrôle effectif ; définir sa sémantique, la supprimer après revue si elle est obsolète, ou l'intégrer explicitement dans un changement testé. Aucune modification n'a été faite dans le Worker actif.

### 4. Version déployée différente du code audité
Les corrections de diagnostic mémoire et d'exigence d'UUID D1 ont été fusionnées dans la branche d'intégration après le déploiement actuellement observé. Les résultats CI de ces PR ne prouvent pas que le Worker déployé les exécute.

## Séquence de sortie du NO-GO

1. Choisir formellement le fournisseur d'identité autoritatif pour staging : sessions alpha temporaires ou Supabase Auth individuel. Pas de bascule implicite.
2. Si Supabase Auth est retenu, configurer les bindings requis via le canal de secrets autorisé, sans les exposer dans Git ou les journaux.
3. Réconcilier la variable historique `ARIA_REQUIRE_INDIVIDUAL_AUTH` avec le code et les contrôles d'authentification réels.
4. Préparer une release staging identifiée par commit, en préservant tous les bindings existants, notamment KV, D1 et AI.
5. Déployer uniquement après revue et CI verte ; exécuter des tests HTTP de `/health`, authentification valide/invalide, mémoire refusée pour `session_kv`, autorisation D1 et chat.
6. Vérifier les résultats réels sur le Worker après déploiement, puis comparer la réponse `/health` à la configuration et au commit attendu.
7. Garder la production hors périmètre jusqu'à une revue de sécurité et une validation fonctionnelle séparées.

## Limites de ce contrôle

- Le contenu des secrets n'a pas été lu.
- Aucune donnée de session ni note mémoire n'a été consultée.
- Aucun test HTTP externe du Worker n'a pu être confirmé par ce contrôle.
- Aucune configuration Cloudflare, migration de données ou publication n'a été modifiée.
- Ce rapport n'affirme pas que les PR #37/#38 sont déployées : elles ne l'étaient pas dans la version de staging observée.

## Décision

**Maintenir le déploiement actuel et les garde-fous. Ne pas promouvoir la branche d'intégration tant que les écarts ci-dessus ne sont pas résolus et testés.**
