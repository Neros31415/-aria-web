# ARIA — audit technique confronté au cahier des charges V1.1
Date : 20 octobre 2026  
Dépôt : https://github.com/Neros31415/-aria-web  
Branche de travail : feat/aria-voice-first-onboarding  
Cahier des charges de référence : docs/CAHIER_DES_CHARGES_ARIA_V1.1.md

## 1. Résumé exécutif
Le socle vocal est nettement plus proche de la direction produit : l’accueil n’est plus un chat permanent, l’orbe est déclarée comme élément visuel, la première rencontre orale existe, la transcription est facultative, les tours vocaux sont annulables et le frontend appelle le Worker de staging avec un jeton de session. Le HUD dispose désormais de widgets contextuels, d’une transition logo↔espace visuel et d’un globe filaire 3D WebGL manipulable localement. Cette branche reste une alpha technique, pas une version publiable.

Le contrôle contre V1.1 révèle deux catégories :
- **Présent dans le code :** coque HUD vocale, états visuels, commandes de pause, tours vocaux sérialisés et annulables, préférences, consentement mémoire appliqué au Worker, widgets latéraux, transition logo↔scène et globe filaire WebGL interactif.
- **Partiel ou absent :** authentification individuelle, tests sur iPhone réel, données géographiques et scènes métier 3D (moteur, relief, modèles scientifiques), sources de données fiables et intégrations système.

## 2. État du dépôt et du backend
- La branche de travail est feat/aria-voice-first-onboarding; la PR #15 est un brouillon vers main.
- main n’a pas été modifiée par cette branche.
- Le Worker Cloudflare aria-brain-staging a été déployé en staging le 20 octobre 2026; les bindings AI, KV et secrets étaient présents lors de l’audit précédent.
- Le namespace mémoire de staging était vide au moment de la vérification antérieure. Cet état est une observation datée, pas une garantie permanente.
- L’authentification utilise encore un jeton Bearer alpha partagé. Il ne convient qu’à un groupe fermé; ne pas ouvrir le service au public avec ce mécanisme.
- Le frontend de cette branche n’est pas déployé sur l’URL publique. Les tests unitaires ne prouvent ni l’accessibilité du fournisseur IA ni le fonctionnement complet sur iPhone.

## 3. Matrice de conformité V1.1

| Exigence | État observé | Écart / action |
|---|---|---|
| Voix prioritaire, pas de chat permanent | Partiellement conforme | Le HUD est vocal et le composeur permanent est absent. La reconnaissance dépend du navigateur et n’a pas été validée sur appareil réel. |
| Orbe expressive non cliquable | Conforme au niveau HTML/CSS | L’orbe a le rôle d’image; valider les états en situation réelle et l’accessibilité. |
| Première rencontre vocale unique | Partiel | Le flux existe et peut être relancé manuellement. Le parcours « passer » existe; vérifier les cas de reprise et d’interruption sur mobile. |
| Préférences de proactivité, longueur, humour | Partiellement conforme | Les préférences sont sauvegardées et transmises au Worker, qui les valide et les inclut dans les instructions du modèle. La qualité comportementale doit encore être évaluée par scénarios. |
| Consentement mémoire explicite | Partiellement conforme | Le réglage est accessible dans les paramètres et le client envoie le consentement au Worker. Si le consentement est désactivé, le Worker ne lit ni n’écrit de souvenirs pendant le chat. Test automatisé de non-lecture/non-écriture réussi; parcours complet sur appareil réel restant. |
| Mémoire vierge et purge honnête | Partiel | Purge locale et route DELETE distante existent; la confirmation de purge doit couvrir tous les identifiants connus et les erreurs serveur. |
| Conversation avec un modèle réel | Partiel | Le frontend appelle /chat sur le Worker avec un jeton alpha de session. La gestion des tours empêche les doublons, permet l’annulation d’une requête en cours et empêche une réponse retardée de parler après la pause. Un parcours réel avec jeton valide et fournisseur disponible reste nécessaire. |
| Secrets hors frontend | Conforme pour les secrets fournisseur | Le jeton alpha est saisi par le testeur et gardé dans sessionStorage; le modèle d’accès partagé reste temporaire et insuffisant pour une bêta publique. |
| Widgets contextuels latéraux | Prototype implémenté | Deux widgets discrets flanquent la scène centrale sur grand écran et se réorganisent sur mobile. Ils s’ouvrent sur commande vocale et déclarent explicitement quand une donnée ou une scène réelle manque. Validation visuelle sur iPhone restante. |
| Visualisation 3D au centre | Première scène interactive implémentée | Un globe filaire WebGL est rendu localement et peut être tourné par glissement. Il ne contient pas de données géographiques. Les cartes réelles, reliefs, moteurs et modèles scientifiques restent à construire. |
| Transition caméra à travers le logo | Prototype implémenté | Une transition cinématique agrandit le symbole A pour entrer dans l’espace visuel, puis le mouvement inverse ramène à l’accueil. La réduction des animations est prise en compte; test de perception et fluidité sur iPhone restant. |
| Curiosité et autonomie intellectuelle | Non vérifiable par l’interface seule | Formaliser la consigne système générique et la tester avec un jeu de scénarios; aucune personnalité personnelle ne doit être codée en dur dans le Worker. |
| Adaptation iPhone et accessibilité | Partiel | CSS responsive et réduction des animations présents; tests Safari iPhone, rotation, safe areas, autorisations et arrière-plan restent à faire. |
| Authentification individuelle | Absente | Bloqueur avant bêta publique : identité, isolation des données, expiration/révocation des sessions et récupération de compte. |

## 4. Correctif de comportement ajouté après comparaison au cahier des charges
L’audit a relevé que la question mémoire de l’onboarding pouvait auparavant interpréter toute réponse qui ne contenait pas un refus explicite comme un consentement. Cela ne respectait pas le principe de contrôle utilisateur.

Le correctif de la branche :
- exige une réponse affirmative claire ou négative claire à la question mémoire;
- redemande une clarification si la réponse est ambiguë;
- permet de passer une question sans transformer le silence ou l’ambiguïté en autorisation;
- conserve la mémoire désactivée lorsqu’on passe la question de consentement;
- demande aussi une réponse reconnaissable pour les préférences de proactivité, de longueur et d’humour plutôt que de sauvegarder silencieusement une valeur par défaut.

Le test statique de ce comportement a été ajouté. La suite automatisée a ensuite été étendue à la boucle vocale interrompable et au consentement mémoire. Le dernier run associé au commit b62ccaed43905789b029b2285a8cecbb1cd4e7a2 a réussi, y compris les vérifications de syntaxe pour app.js, visualization-engine.js et le Worker, puis les tests automatisés.

## 5. Risques et limites
1. **Accès alpha :** jeton partagé, aucune authentification individuelle; limiter aux testeurs contrôlés et révoquer le jeton en cas de fuite.
2. **Voix mobile :** les API Web Speech varient selon le navigateur; iOS peut suspendre la reconnaissance en arrière-plan.
3. **Conversation :** les erreurs HTTP et le fournisseur peuvent empêcher la réponse même si les tests de code passent.
4. **Mémoire :** l’effacement local ne prouve pas l’effacement distant; les deux résultats doivent être affichés séparément.
5. **Visualisation :** le globe présent est un dessin SVG et non un globe géographique ou un modèle 3D temps réel.
6. **Transition immersive :** le zoom traversant le logo demandé n’est pas implémenté.
7. **Déploiement :** la branche n’est pas publiée; aucune disponibilité publique ne doit être annoncée.
8. **Onboarding :** la séquence de présentation de l’orbe est sérielle; tester les interruptions et la reprise pour éviter que l’écoute et la synthèse se bloquent l’une l’autre.

## 6. Prochaines étapes ordonnées par valeur
### P0 — Maintenir la validation CI
- La suite automatisée a réussi après le correctif de consentement et après la mise à jour documentaire.
- Recontrôler la CI après toute modification de code supplémentaire et revoir le diff complet.
- Garder la PR #15 en brouillon; ne pas fusionner ni déployer.

### P1 — Valider la boucle vocale
- Correctif de tours vocaux appliqué : déduplication pendant le traitement, annulation de la requête via AbortController et invalidation des réponses après pause.
- Les vérifications de syntaxe et les tests automatisés réussissent sur le commit b62ccaed43905789b029b2285a8cecbb1cd4e7a2.
- Test physique iPhone Safari toujours requis : permissions, première rencontre, aller-retour vocal, interruption, pause/reprise et erreurs réseau. Consigner le résultat dans docs/TEST_PLAN_IPHONE_ALPHA.md, qui couvre maintenant aussi les widgets contextuels, la transition immersive et le globe WebGL.

### P2 — Sécuriser mémoire et accès
- Réglage mémoire ajouté aux paramètres; le consentement est transmis explicitement au Worker.
- Avec consentement désactivé, le Worker n’effectue ni lecture ni écriture de souvenirs lors d’une requête de chat, même si l’utilisateur formule une demande de mémorisation; ce cas est couvert par un test automatisé.
- Tester encore la purge locale + distante avec jeton valide, jeton invalide et indisponibilité réseau.
- Bloqueur avant toute ouverture plus large : le jeton Bearer reste partagé. L’authentification individuelle, l’isolation par compte, la révocation et la récupération de compte ne sont pas implémentées.

### P3 — HUD contextuel
- Widgets latéraux et disposition responsive implémentés dans le code. Valider la lisibilité, la fermeture et les zones tactiles sur iPhone.

### P4 — Transition immersive
- Transition logo → espace visuel → retour implémentée. Valider le ressenti, l’annulation et la fluidité sur iPhone.

### P5 — Étendre les visualisations 3D
- Le premier globe filaire WebGL est interactif mais ne contient pas de données géographiques.
- Ajouter ensuite une scène géographique avec sources explicites, puis des objets/mécanismes 3D et des modèles scientifiques. Conserver les mentions claires lorsque la scène est illustrative.

### P6 — Validation alpha et ouverture sécurisée
- Tester /health, /chat et /memory dans l’environnement de staging, sans exposer le jeton.
- Exécuter docs/TEST_PLAN_IPHONE_ALPHA.md sur un appareil réel.
- Ne pas ouvrir au public avant l’authentification individuelle et la revue de sécurité.

## 7. Règle de statut
Un test automatisé vert confirme uniquement les assertions couvertes par ce test. Il ne prouve pas le comportement sur un appareil réel, la disponibilité d’un fournisseur IA, la qualité d’une visualisation 3D, ni la suppression de données distantes sans confirmation serveur.
