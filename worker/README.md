# ARIA Brain — préproduction

Cette version est un Worker séparé nommé aria-brain-staging. Elle ne remplace pas le Worker aria-brain actuellement déployé.

Routes : GET /health, POST /chat et OPTIONS /chat. Le chat reçoit un objet JSON contenant une liste messages, chacun avec un rôle user ou assistant et un contenu texte. La réponse réussie contient le champ reply.

Le fichier wrangler.toml active le binding Cloudflare Workers AI nommé AI. Dans les variables du Worker, configurez ALLOWED_ORIGINS avec les origines HTTPS exactes, séparées par des virgules, puis ARIA_MODEL avec un modèle actuellement disponible dans votre compte. Ajoutez ARIA_ACCESS_TOKEN, un jeton aléatoire long, comme secret. Ne placez pas ce jeton dans le code client. Les clients autorisés doivent envoyer Authorization: Bearer suivi du jeton.

Cette option évite de stocker une clé fournisseur externe, mais l'usage de Workers AI dépend des limites et de la facturation Cloudflare. Vérifiez le modèle disponible et les coûts avant tout déploiement.

Déploiement contrôlé : depuis ce dossier, connectez Wrangler au bon compte Cloudflare, puis lancez le déploiement. Le nom aria-brain-staging évite de remplacer le Worker existant. Ne migrez pas le trafic de production avant d'avoir vérifié le contrat, l'authentification et les coûts.

Protections incluses : CORS strict, jeton Bearer, limites de taille de requête et de contexte, rôles d'entrée limités et erreurs normalisées. Le jeton partagé n'est pas une authentification multi-utilisateur complète. Avant exposition publique, ajoutez une identité robuste, une limitation de débit et des quotas. Aucun outil Web, mémoire distante ni contrôle Windows n'est exposé.

Le workflow GitHub Actions vérifie la syntaxe des trois modules. Les tests locaux utilisent un binding AI simulé, mais leur harness n'est pas encore intégré au dépôt. Il reste à valider le modèle réel et le déploiement Cloudflare.