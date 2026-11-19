# ARIA — journal de continuité

## 2026-10-13 — cerveau IA et client web

### Changements sur la branche `feat/aria-brain-staging-worker`
- Worker de préproduction isolé : endpoint `POST /chat`, validation des messages, CORS et jeton Bearer.
- Modèle par défaut configuré : `@cf/zai-org/glm-4.7-flash` via le binding Cloudflare Workers AI (`env.AI`). Le modèle peut être remplacé par `ARIA_MODEL`.
- Endpoint `/health` expose l'état de configuration et le modèle sélectionné.
- Client web : réglages pour l'URL du Worker et un jeton de session, puis appels au endpoint avec l'historique récent. L'URL est stockée localement; le jeton reste dans `sessionStorage`.
- Tests Node intégrés au workflow GitHub Actions, avec modèle simulé. Le workflow vérifie désormais aussi la syntaxe de `app.js`.
- Documentation de configuration et limites mise à jour.

### État vérifié
- La suite GitHub Actions sur le commit `c4672323dbdf8beb62a513cb46cb255f1cab64df` a réussi.
- Le workflow qui inclut aussi la vérification syntaxique du client web est en cours sur `b6e21ae26f6e3c1a727cab80da3682b3b141a440` au moment de la rédaction.
- Les tests utilisent un binding IA simulé; ils ne prouvent pas l'accès au modèle réel.
- Aucune configuration Cloudflare, aucun secret réel et aucun déploiement n'ont été réalisés par cette session. Le chemin de bout en bout n'est donc pas encore validé en production.
- Aucun changement n'a été fait directement sur `main`.

### Blocages et risques
- Il faut configurer Workers AI, vérifier la disponibilité et le coût du modèle, définir `ALLOWED_ORIGINS` et créer `ARIA_ACCESS_TOKEN` comme secret du Worker de préproduction.
- Le jeton Bearer partagé dans le navigateur est acceptable uniquement pour un prototype personnel contrôlé. Ne pas publier ce jeton ni utiliser cette architecture pour un service public multi-utilisateur. Pour un produit public, ajouter une authentification utilisateur côté serveur et des quotas / rate limits.
- La mémoire actuelle reste locale au navigateur et n'est pas encore incluse dans le contexte envoyé au modèle.
- Pas encore d'agent Web, d'outils, de voix, de contrôle Windows, d'exécutable natif ni de synchronisation iPhone-PC.

### Prochaine étape
1. Confirmer le workflow CI du commit `b6e21ae`.
2. Déployer le Worker `aria-brain-staging` dans le compte Cloudflare du propriétaire et configurer les secrets/variables.
3. Vérifier `GET /health`, puis envoyer une requête `POST /chat` réelle sans exposer le jeton.
4. Configurer l'URL et le jeton de session dans les paramètres de l'interface web et tester sur iPhone.
5. Ensuite concevoir l'authentification durable et une mémoire distante privée, avant toute exposition publique.

## Principes de continuité
- Ne pas modifier `main` directement.
- Ne pas prétendre qu'un test, déploiement ou accès au modèle a eu lieu sans preuve.
- Préférer des changements petits, isolés, testables et peu coûteux.
- Tester le packaging Windows, les permissions locales et les périphériques sur un PC Windows physique avant de considérer ces fonctions comme opérationnelles.
