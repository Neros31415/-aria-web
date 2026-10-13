# ARIA Brain — préproduction

Cette version est un Worker séparé nommé `aria-brain-staging`. Elle ne remplace pas le Worker de production.

## Modèle réel

Le modèle par défaut est `@cf/zai-org/glm-4.7-flash`, appelé via le binding natif `env.AI` de Cloudflare Workers AI. Aucun jeton fournisseur n'est nécessaire dans le code. Vous pouvez remplacer le modèle via la variable `ARIA_MODEL` après avoir vérifié qu'il est disponible sur votre compte.

Le modèle est appelé à chaque requête de chat réelle et peut entraîner une consommation/facturation Cloudflare. Vérifiez les limites et tarifs de votre compte avant les essais répétés. Les tests CI utilisent un modèle simulé et ne consomment pas d'inférence.

## Configuration nécessaire avant déploiement

1. Dans le compte Cloudflare voulu, vérifiez l'accès à Workers AI et le modèle ci-dessus.
2. Configurez `ALLOWED_ORIGINS` avec les origines HTTPS exactes, séparées par des virgules.
3. Ajoutez `ARIA_ACCESS_TOKEN` comme secret Worker, avec un jeton aléatoire long.
4. Optionnel : configurez `ARIA_MODEL` si vous souhaitez choisir un autre modèle.
5. Déployez explicitement ce Worker de préproduction depuis ce dossier avec Wrangler, après connexion au bon compte.

Ne placez jamais `ARIA_ACCESS_TOKEN` dans le JavaScript public ou dans le dépôt. Un jeton partagé ne convient pas à un client navigateur public : pour connecter une interface publique, il faudra une authentification utilisateur côté serveur, ou une autre architecture sécurisée. CORS n'est pas une authentification.

## Contrat API

- `GET /health` indique si les composants nécessaires sont configurés et quel modèle est sélectionné.
- `POST /chat` reçoit `{"messages":[{"role":"user","content":"Bonjour"}]}` et renvoie `{"reply":"…","model":"…"}`.
- `OPTIONS /chat` gère le préflight CORS.

Le client doit envoyer `Authorization: Bearer <jeton>` et `Content-Type: application/json`. Les messages acceptés ont les rôles `user` et `assistant`; le dernier doit être un message utilisateur.

## Sécurité et limites actuelles

CORS strict, jeton Bearer, limites de taille de requête et de contexte, validation des rôles, erreurs normalisées. Le jeton partagé n'est pas une authentification multi-utilisateur complète. Pas encore de mémoire persistante, d'agent Web, d'outils, de voix, ni de contrôle Windows.

## Tests

Lancer `node --test security.test.mjs` depuis le dossier `worker`. GitHub Actions exécute les tests de contrat et vérifie la syntaxe. Les tests utilisent un binding IA simulé : ils ne prouvent pas que le compte Cloudflare est configuré, que le modèle est accessible ou que le déploiement fonctionne.
