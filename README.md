# ARIA Web V0.7 — base reconstruite

Cette archive est une **nouvelle base reconstruite**, pas une récupération exacte de l'ancien code V0.6. Elle fournit une interface mobile/PWA, un historique local et une mémoire locale.

## État réel
- Interface responsive : implémentée.
- Historique de conversation local : implémenté.
- Notes de mémoire locales : implémentées.
- Cache hors ligne de base : implémenté.
- Vrai modèle IA : NON connecté.
- Recherche Web : NON connectée.
- Synchronisation iPhone-PC : NON implémentée.
- Contrôle de Windows : NON implémenté.
- Authentification / backend / paiements : NON implémentés.

Le chat local ne simule pas une vraie IA : il indique clairement ses limites.

## Tester
Ouvrir `index.html` dans un navigateur permet de vérifier l'interface et le stockage local. Pour installer la PWA et activer le service worker, il faut la servir en HTTPS ou sur localhost.

## Déploiement depuis iPhone
Un hébergeur statique compatible peut publier ces fichiers depuis un dépôt Git. Une fois publié en HTTPS dans Safari sur iPhone : bouton Partager → Sur l'écran d'accueil. Les menus exacts peuvent varier selon iOS.

## Sécurité
Ne mettez jamais une clé API dans `app.js`, `index.html` ou tout autre fichier public. La connexion à un modèle réel doit passer par un backend sécurisé qui garde les secrets côté serveur, applique des limites d'utilisation et valide les entrées.

## Prochaine étape
Créer un dépôt privé/public selon votre préférence, publier cette base, puis développer un backend API distinct. Ne pas présenter ce prototype comme un assistant IA opérationnel tant que le backend n'est pas connecté et testé.
