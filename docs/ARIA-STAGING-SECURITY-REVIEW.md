# ARIA — Revue de sécurité du backend de staging
**Date :** 22 octobre 2026  
**Périmètre :** source `cloudflare/aria-brain-staging.mjs` sur la branche `feat/aria-brain-staging-integration`, métadonnées de bindings Cloudflare en lecture seule.  
**Statut :** revue statique initiale ; aucun test d'intrusion ni validation de bout en bout n'a été réalisé. Le Worker de production `aria-brain` n'a pas été modifié.

## Résumé

Un Worker de staging existe déjà. Il expose `/health`, `/chat` et `/memory`, appelle un fournisseur IA côté serveur et utilise Cloudflare KV pour conserver jusqu'à 100 notes par identifiant de profil navigateur. C'est une alpha technique utile, mais **elle ne doit pas être considérée comme une architecture multi-utilisateur sécurisée** et ne doit pas être ouverte à des proches ou clients avec un jeton commun.

La priorité est de corriger les frontières de confiance du Worker avant d'élargir l'intégration.

### État d'avancement des corrections

Une branche de correction séparée, `fix/staging-worker-input-security`, a été ouverte en PR #18. Elle contient des modifications proposées, non fusionnées et non déployées :

- rejet des rôles de message client autres que `user` et `assistant` ;
- suppression du profil personnel codé en dur au profit d'une personnalité produit générique ;
- plafonds de taille pour les messages, l'historique et les corps de requête ;
- lecture du corps HTTP en flux, interrompue dès que la limite de 96 000 octets est dépassée ;
- tests Node.js pour les rejets de rôles et les limites de taille, y compris `PUT /memory`.

**Validation actuelle :** 8 scénarios ciblés ont réussi dans un harnais JavaScript isolé utilisant des substituts HTTP : jeton absent, rôle `system`, longueur d'un message, taille cumulée, taille déclarée, corps chat réellement trop grand, corps mémoire réellement trop grand et payload mémoire `null`. Ce harnais n'est ni le runner Node.js du dépôt, ni GitHub Actions, ni le runtime Cloudflare. Le test officiel `node --test tests/aria-brain-staging.test.mjs` et l'intégration staging restent à exécuter ; aucun run GitHub Actions n'est associé au dernier commit. Ne pas présenter ces résultats ciblés comme une validation complète. Les constats ci-dessous décrivent le code de la branche d'intégration examinée ; ils ne signifient pas que les correctifs proposés sont déjà présents dans cette branche.

Le blocage S0 d'authentification reste entier : le jeton partagé et le `clientId` contrôlé par le client ne fournissent ni identité vérifiée ni isolation mémoire entre utilisateurs. Aucun test ni déploiement de production n'a été effectué.

## Constatations priorisées

### S0 — Bloquant avant toute distribution multi-utilisateur : jeton partagé + identité mémoire non authentifiée

**Observation :**
- Les routes privées comparent l'en-tête Authorization à un unique `ARIA_ACCESS_TOKEN`.
- Le client fournit un `clientId` UUID dans la requête et ce champ sert directement à construire la clé KV `memory:v1:<clientId>`.
- Le code ne vérifie pas que ce clientId est lié à une identité utilisateur authentifiée côté serveur.
- La documentation `docs/ARIA_MEMORY_V1.md` qualifie explicitement cette version d'alpha mono-utilisateur et précise que le jeton ne doit pas être réutilisé avec des personnes non fiables.

**Risque :** toute personne possédant le jeton partagé peut construire des requêtes arbitraires et tenter de lire ou remplacer les notes associées à un identifiant de profil connu. L'UUID est un identifiant, pas une autorisation. Le partage du jeton rend impossible l'attribution individuelle fiable des droits, quotas et révocations.

**Correctif :**
1. Ne pas distribuer le jeton partagé à des utilisateurs non fiables.
2. Avant l'alpha multi-utilisateur, mettre en place une authentification individuelle vérifiée côté Worker.
3. Dériver l'identité de stockage du sujet authentifié côté serveur ; ignorer tout identifiant de propriétaire fourni par le client.
4. Ajouter des tests prouvant qu'un compte ne peut ni lire ni modifier la mémoire d'un autre compte.
5. Révoquer/faire tourner le jeton de staging si son périmètre de diffusion n'est plus maîtrisé, après vérification de l'impact.

### S0 — Le client peut envoyer un rôle system dans l'historique

**Observation :**
- Le Worker accepte les rôles `system`, `user` et `assistant` dans `body.messages`.
- Les messages `system` fournis par le client sont concaténés dans les instructions transmises au modèle via `incomingSystem`.

**Risque :** un client qui possède le jeton peut injecter ou modifier du contexte de confiance destiné au modèle. Le contexte fourni par le front-end ne doit pas être considéré comme une politique système fiable.

**Correctif :**
1. Refuser tout rôle autre que `user` et `assistant` dans les messages provenant du client.
2. Construire les instructions système exclusivement côté serveur.
3. Si un contexte utilisateur est nécessaire, lui donner un champ séparé, limité et clairement marqué comme non fiable ; ne jamais l'insérer comme une instruction système privilégiée.
4. Ajouter des tests négatifs qui soumettent un message `system` et vérifient le rejet.

### S1 — Limites de taille de requête et de coût insuffisantes dans le code examiné

**Observation :**
- Le nombre de messages est limité, mais les longueurs de chaque `content` et la taille totale du corps ne sont pas explicitement plafonnées dans le Worker.
- Aucun rate limiting applicatif n'est visible dans ce fichier.

**Risque :** requêtes très volumineuses, consommation excessive du fournisseur IA, coûts imprévus ou dégradation de service.

**Correctif :**
1. Rejeter les corps au-delà d'une limite définie avant le parsing lorsque possible.
2. Limiter la longueur de chaque message, le nombre de messages, la longueur cumulée et la sortie maximale.
3. Mettre en place des quotas/rate limits par utilisateur authentifié et une limite globale de protection.
4. Prévoir des réponses `413`, `400` et `429` cohérentes et tester les cas limites.
5. Éviter d'enregistrer le contenu des messages dans les logs de diagnostic.

### S1 — Données de profil personnelles codées en dur dans une branche publique

**Observation :**
Le texte d'instructions du Worker contient un profil nominatif de l'utilisateur, des préférences, des intérêts et des détails de contexte personnel dans le code source de la branche d'intégration.

**Risque :** divulgation inutile de données personnelles dans l'historique Git public et mélange entre la logique produit et les préférences d'un utilisateur spécifique.

**Correctif :**
1. Remplacer le profil nominatif par une personnalité produit générique d'ARIA.
2. Charger les préférences personnalisées depuis des données de compte protégées, seulement si l'utilisateur les a choisies et si elles sont nécessaires.
3. Examiner l'historique Git et les déploiements précédents pour déterminer si une suppression ou une rotation est nécessaire ; supprimer un fichier du dernier commit ne l'efface pas de l'historique.
4. Ne jamais déplacer ce profil dans le front-end ou dans des journaux publics.

### S1 — Contrat d'authentification non adapté au produit final

**Observation :**
L'alpha repose sur un secret partagé et un UUID de navigateur. Il n'y a pas de preuve, dans ce Worker, d'une authentification de compte individuel ni de l'application des offres Free/Plus/Pro et du rôle Super Admin.

**Risque :** impossible de fournir des permissions et quotas fiables par compte ; une clé d'accès partagée pourrait être confondue avec une identité ou un rôle.

**Correctif :**
- Concevoir une authentification individuelle avant la commercialisation.
- Séparer le plan commercial des rôles d'autorisation.
- Vérifier toutes les permissions côté serveur.
- Réserver la gestion des clés premium au Super Admin authentifié avec MFA.
- Ne jamais conférer un rôle administratif via une clé cadeau ou un paramètre client.

### S2 — Exposition d'informations dans /health

**Observation :**
`/health` renvoie des informations sur le nom du service, le fournisseur, le modèle et la présence de certains bindings.

**Risque :** exposition limitée de métadonnées d'infrastructure.

**Correctif :**
- Garder une route de santé minimale destinée à la supervision.
- Éviter d'exposer des détails de configuration qui ne sont pas nécessaires au diagnostic public.
- Ne jamais y renvoyer de valeurs de secrets.

### S2 — CORS n'est pas une autorisation

**Observation :**
Le Worker maintient une liste d'origines autorisées. CORS limite la lecture des réponses par certains navigateurs, mais ne remplace ni l'authentification ni les contrôles d'accès serveur.

**Correctif :**
- Conserver une liste minimale d'origines exactes.
- Tester les requêtes preflight et les origines inconnues.
- Appliquer systématiquement authentification, autorisation et quotas côté serveur, y compris pour les clients non navigateurs.
- Ne pas considérer l'absence d'en-tête Origin comme une preuve d'identité.

## Points déjà positifs observés

- La clé du fournisseur IA est liée comme secret Cloudflare, non intégrée au front-end dans cette branche.
- Le Worker utilise `store: false` dans la requête du fournisseur ; confirmer néanmoins les conditions contractuelles et le comportement réel du fournisseur.
- Les routes de mémoire limitent le nombre de notes et leur longueur enregistrée.
- Les erreurs fournisseur sont renvoyées sous forme générique plutôt que de transmettre les détails complets.
- La documentation précise qu'il s'agit d'une alpha mono-utilisateur et que l'UUID n'est pas un mécanisme d'authentification.

## Plan de correction recommandé

1. **Geler l'élargissement du test** : ne pas partager le jeton actuel avec des tiers.
2. **Corriger le rôle system** : rejet strict côté Worker ; tests automatisés.
3. **Ajouter limites de corps/messages et quotas** : tests de taille, débit et coûts.
4. **Remplacer le profil personnel codé en dur** par une personnalité générique et des préférences de compte protégées.
5. **Définir l'identité de compte** : choisir et documenter l'authentification individuelle ; ne pas ajouter un deuxième système concurrent sans décision d'architecture.
6. **Lier la mémoire au compte vérifié** et écrire les tests d'isolation inter-comptes.
7. **Tester staging seulement** : santé, requête non authentifiée, token invalide, message invalide, rôle system, dépassement de taille, quota, mémoire et CORS.
8. **Intégrer par pull request** après revue du diff et vérification des tests.
9. **Ne pas toucher à `aria-brain` production** pendant ce cycle.

## Critères de validation

- [ ] Les rôles client `system` et tout contexte de confiance fourni par le client sont rejetés.
- [ ] Les limites de taille et quotas sont testés.
- [ ] Une identité authentifiée est dérivée côté serveur avant toute lecture/écriture de mémoire multi-utilisateur.
- [ ] Les tests d'isolation inter-comptes réussissent.
- [ ] Le profil personnel n'est plus codé en dur dans le dépôt public.
- [ ] Les tests CORS et authentification sont automatisés.
- [ ] Les logs n'incluent ni jetons ni contenu privé inutile.
- [ ] Le staging est validé sans modification de production.
- [ ] Le diff est revu avant fusion et aucun déploiement n'est prétendu sans preuve.

## Limites

Cette revue est statique et fondée sur le code source de la branche d'intégration et les métadonnées de bindings Cloudflare. Les requêtes HTTP directes au Worker ont été bloquées par la passerelle de contrôle dans cet environnement ; le statut et le comportement de l'endpoint n'ont donc pas été confirmés par test de bout en bout. Aucune modification Cloudflare ni aucun déploiement n'a été effectué.
