# ARIA — audit initial du dépôt
Date : 20 octobre 2026
Dépôt audité : https://github.com/Neros31415/-aria-web
Branche de référence de l'audit : main (546a51f73c37a823b083e2ed250b5a119c2a7931)
Branche d'interface examinée : feat/aria-cinematic-hud-integration (b3cc4230fac97dca07dbd53c5571ad803974f8b0)

## Résumé exécutif
Le dépôt contient une PWA statique et plusieurs branches de travail. La branche main est une base V0.7 locale : historique et notes en localStorage, sans moteur IA distant, recherche web, synchronisation ou contrôle système. La branche HUD ajoute une scène visuelle plus ambitieuse, mais son orbe est encore un bouton, le chat écrit reste central et les scènes sont des maquettes.

## Constat vérifié
- Dépôt public, branche par défaut : main.
- Fichiers de la base : index.html, app.js, styles.css, sw.js, manifest.webmanifest et README.md.
- Pas de package.json à la racine sur main : les scripts de build/test ne sont pas définis comme dans un projet npm classique.
- main/index.html présente un formulaire de chat écrit, un historique et un panneau de mémoire locale.
- main/app.js persiste l'historique et les notes dans localStorage et répond par des règles locales; il ne contacte pas un modèle.
- La branche HUD possède une orbe SVG animée, des panneaux contextuels et des scènes Présence/Globe/Mont-Blanc/Moteur. Le code déclare explicitement que plusieurs scènes sont des démonstrations.
- Dans cette branche, l'orbe possède encore role=button, tabindex et des gestionnaires click/keyboard qui changent de scène.
- La branche HUD contient encore un composer textuel et un panneau de conversation.
- Les PR #12 et #9 proposent un backend Cloudflare et une mémoire KV, mais restent des changements séparés à valider. Le Worker de la branche alpha injecte un profil personnel codé en dur et n'offre pas de route DELETE pour la mémoire.
- La PR #14 est un brouillon et n'a pas été fusionnée. La CI alpha PR #12 a un run réussi, mais cela ne prouve pas le parcours vocal/mobile ni la connexion réelle du fournisseur.
- Le précédent signalement de panne réseau vers aria-brain-staging doit être revalidé sur le déploiement actuel.
- Cette branche ajoute une interface vocale expérimentale basée sur les API Web Speech natives. La disponibilité de SpeechRecognition, particulièrement sur iOS Safari et en arrière-plan, reste à tester sur appareil réel.
- Le Worker `aria-brain-staging` a été déployé sur Cloudflare le 20 octobre 2026 avec la route DELETE protégée et un profil générique. Les bindings AI, KV et les deux secrets sont toujours présents.
- La liste de clés du namespace KV `ARIA_MEMORY_STAGING` a été vérifiée : aucune clé avec le préfixe `memory:v1:` n'est actuellement présente.
- La réinitialisation locale est déclenchée au premier lancement de cette branche. La suppression distante est seulement tentée si l'ancien clientId et le jeton de session sont présents; elle ne peut être déclarée réussie que si le Worker répond positivement.
- Le frontend voice-first n'est pas encore déployé sur l'URL publique; le nettoyage du stockage local de l'appareil se produira seulement lorsque cette version sera ouverte.

## Risques prioritaires
1. Aucune expérience vocale principale dans la base de référence.
2. L'interface de la branche HUD contredit la spécification : orbe cliquable et chat écrit permanent.
3. Les données locales historiques ne sont pas effacées automatiquement par la base actuelle.
4. La mémoire distante ne possède pas de route de suppression explicite.
5. Le profil de l'utilisateur est codé en dur dans le Worker de la branche alpha.
6. La disponibilité du backend et le fonctionnement réel du modèle ne sont pas prouvés par le code du frontend.
7. La reconnaissance vocale en continu en arrière-plan n'est pas garantie sur iOS/Android; la capacité dépend du navigateur et des politiques système.

## Suite recommandée
- Développer sur une branche dédiée sans toucher à main.
- Faire de l'orbe un élément purement visuel et piloter l'interaction par la voix.
- Ajouter un onboarding oral et des états visuels expliqués.
- Purger l'ancien stockage local au premier lancement de la version révisée, avec une opération séparée pour les données serveur.
- Ajouter une route DELETE protégée au Worker et tester la suppression de la mémoire distante avec l'identifiant de profil correct. La route DELETE est maintenant ajoutée dans cette branche, mais n'est pas encore déployée sur le Worker de staging.
- Connecter le moteur vocal au backend seulement après validation de son contrat et de son authentification.
- Tester la version sur Safari iPhone et les navigateurs Android, puis vérifier le cache PWA.
