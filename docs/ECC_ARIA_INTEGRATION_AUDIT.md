# ARIA × ECC — audit d'intégration (2026-10-18)

## Décision

Ne pas installer ou copier tout ECC dans le produit ARIA. Réutiliser ses pratiques de développement (planifier, tester, implémenter, revoir, vérifier, documenter) et garder une seule base produit canonique. Cette note est une proposition d'audit, pas une déclaration que l'intégration est terminée.

## État vérifié sur GitHub

- La branche `main` du dépôt `Neros31415/-aria-web` contient la PWA locale (HTML/CSS/JS), l'historique et les notes en `localStorage`.
- Le README de `main` indique explicitement que le modèle distant, la recherche Web, la synchronisation iPhone-PC, le contrôle Windows, l'authentification et les paiements ne sont pas connectés dans cette base.
- Le dépôt contient plusieurs branches de travail dédiées à des sujets distincts : worker/backend, intégration backend, HUD, principes proactifs, fondation Windows et tests HUD. Elles ne doivent pas être considérées comme livrées sur `main` sans comparaison de leurs commits et tests.
- La branche `feat/aria-live-holographic-hud` contient `live-hud.html`, un contrat backend et un test de fumée `tests/check-hud.mjs`.
- La branche `feat/aria-proactive-principles-2026-10-17` contient `cloudflare/aria-brain-staging.mjs`. Le code inspecté expose `/health`, `/chat` et `/memory`, avec un jeton Bearer, un allowlist CORS et une mémoire KV optionnelle.
- Le contrat HUD précise que l'intégration avec le Worker Cloudflare existant n'a pas encore été validée. C'est un blocage réel : le HUD attend une réponse `reply`/compatibilité, alors que le Worker doit être testé avec les payloads réellement envoyés par le client.

## Risques et contrôles avant fusion

1. Comparer chaque branche utile à `main` et identifier ses commits et fichiers uniques.
2. Vérifier le contrat HTTP de bout en bout : URL, CORS, méthode, authentification, schéma JSON, erreurs et réponse.
3. Vérifier les protections serveur : taille maximale des requêtes, limitation de débit, gestion des abus, validation stricte des messages et absence de secrets dans le client.
4. Vérifier le cloisonnement de la mémoire. Un identifiant client au format UUID n'est pas, à lui seul, une authentification d'utilisateur.
5. Exécuter les tests HUD et ajouter des tests contractuels pour le Worker avant d'activer l'intégration par défaut.
6. Fusionner par petites PR après validation, jamais en important aveuglément toutes les branches.

## Usage ciblé d'ECC

ECC est un outil de processus de développement, pas une dépendance runtime requise par l'application. Les pratiques à reprendre en priorité :
- plan court avant chaque changement ;
- tests ciblés avant et après ;
- revue indépendante du diff ;
- vérification de sécurité pour les changements backend ;
- note de décision et état vérifié à la fin.

Le dépôt ECC indique des voies natives pour Codex et des intégrations de capacités différentes selon les environnements. Ne pas supposer que toutes les fonctionnalités sont disponibles dans l'environnement courant, et ne pas empiler plusieurs méthodes d'installation.

## Prochaine étape recommandée

Faire une comparaison des branches backend/HUD, choisir un seul contrat canonique, puis écrire des tests d'intégration automatisables. Tant que ce test n'est pas vert, le backend ne doit pas être annoncé comme connecté au produit.
