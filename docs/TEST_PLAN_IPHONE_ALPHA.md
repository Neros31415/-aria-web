# ARIA — Plan de test alpha sur iPhone
Date de préparation : 20 octobre 2026  
Branche : feat/aria-voice-first-onboarding  
Statut : **à exécuter sur un appareil réel**. La CI ne remplace pas ces tests.

## Préconditions
- Ouvrir une prévisualisation de la branche; ne pas utiliser main comme preuve de validation.
- Disposer d’un jeton alpha valide transmis par l’administrateur. Si le mode individuel est activé en staging, utiliser un jeton provisionné via `ARIA_USERS`; ne jamais l’inclure dans une capture d’écran ou un rapport.
- Utiliser Safari sur iPhone, d’abord dans l’onglet navigateur puis, si le parcours fonctionne, depuis la PWA ajoutée à l’écran d’accueil.
- Garder le test en premier plan : iOS peut suspendre la reconnaissance vocale en arrière-plan.

## A. Accès et isolation alpha
- [ ] Le Worker de staging indique que le mode individuel est configuré avant d’utiliser des données personnelles.
- [ ] Un jeton individuel provisionné autorise `/chat` et `/memory`.
- [ ] Le jeton partagé est refusé lorsque `ARIA_REQUIRE_INDIVIDUAL_AUTH=true`.
- [ ] Un jeton absent, inconnu ou révoqué est refusé sans lecture/écriture mémoire.
- [ ] Deux identités provisionnées différentes utilisent des clés mémoire distinctes, même si le navigateur envoie le même `clientId`.
- [ ] Une expiration KV ou une révocation rend le jeton inutilisable; aucune inscription ou récupération de compte n’est supposée.

## B. Autorisations et premier lancement
- [ ] Le microphone n’est pas utilisé avant l’action de démarrage.
- [ ] La demande d’autorisation est claire.
- [ ] Refuser le microphone produit un état explicite, sans boucle de redémarrage agressive.
- [ ] Si la reconnaissance vocale n’est pas prise en charge, ARIA annonce la limite et ne prétend pas écouter.
- [ ] La première rencontre démarre après action explicite et la mémoire personnelle est désactivée par défaut.
- [ ] Les préférences proactivité, longueur, humour et consentement mémoire sont comprises et enregistrées.
- [ ] Une réponse ambiguë à la question mémoire entraîne une clarification.
- [ ] Dire « passer » ne donne pas le consentement mémoire.
- [ ] Après validation, l’onboarding ne se relance pas à chaque ouverture; la commande de recommencement fonctionne.

## C. Boucle vocale
- [ ] Parler une phrase courte déclenche une seule réponse.
- [ ] La transcription reste facultative et peut être masquée.
- [ ] Les états présence, écoute, réflexion, réponse et indisponibilité correspondent au comportement réel.
- [ ] La synthèse vocale démarre en français.
- [ ] La reconnaissance ne capture pas la voix d’ARIA comme une nouvelle demande pendant sa réponse.
- [ ] Une deuxième phrase prononcée pendant le traitement ne lance pas une seconde requête concurrente.
- [ ] Le bouton pause arrête la synthèse vocale et l’écoute.
- [ ] Si l’utilisateur met en pause pendant une requête réseau, la réponse tardive ne se met pas à parler après la pause.
- [ ] Reprendre l’écoute fonctionne après pause et après plusieurs échanges successifs.
- [ ] Erreur réseau ou erreur fournisseur : message honnête, aucun succès inventé, nouvelle tentative possible.

## D. Intentions et actions d’interface
- [ ] Une demande explicite « montre-moi le globe » ouvre le globe WebGL local.
- [ ] Une question informative sur un moteur ne déclenche pas automatiquement l’ouverture d’une visualisation moteur.
- [ ] Une demande ambiguë déclenche une clarification plutôt qu’une action supposée.
- [ ] « Ouvre ma mémoire » ouvre le panneau sans détourner une demande « Retiens que… » vers le panneau.
- [ ] « Retour à ARIA » ferme la scène et effectue la transition inverse.
- [ ] Une demande de carte, de mécanisme ou de modèle scientifique non disponible affiche honnêtement l’indisponibilité; aucune donnée fictive n’est présentée comme réelle.
- [ ] Une sortie d’intention mal formée du fournisseur est rejetée par le Worker et ne déclenche aucune action.

## E. Préférences et mémoire
- [ ] Changer les préférences dans les paramètres modifie le payload envoyé au moteur.
- [ ] Le réglage mémoire est visible, lisible et conservé après rechargement.
- [ ] Consentement mémoire désactivé : une demande « Retiens que… » n’entraîne aucune lecture ni écriture de souvenirs par le Worker pendant le chat.
- [ ] Consentement activé : une demande explicite de mémorisation enregistre un souvenir et confirme uniquement après écriture réussie.
- [ ] Le panneau mémoire peut être ouvert pour consulter et supprimer les données existantes.
- [ ] Jeton invalide : la synchronisation échoue sans afficher une fausse confirmation.
- [ ] La suppression locale est distinguée de la suppression distante.
- [ ] En cas d’erreur réseau, ARIA n’annonce pas que la mémoire serveur a été supprimée.

## F. HUD, visualisation et accessibilité
- [ ] Les widgets contextuels s’ouvrent sur commande vocale, restent discrets et se ferment indépendamment.
- [ ] Le passage logo → espace visuel est fluide et le bouton « Retour à ARIA » effectue le mouvement inverse.
- [ ] La préférence de réduction des animations réduit ou supprime la transition.
- [ ] La commande « montre le globe » ouvre le globe filaire WebGL généré localement.
- [ ] Le globe tourne par glissement du doigt, sans défilement accidentel de la page.
- [ ] Le globe ne prétend pas afficher des continents ou des données géographiques réelles.
- [ ] Si WebGL est indisponible, ARIA annonce clairement cette limite et propose le retour à l’interface principale.
- [ ] Les scènes non implémentées sont identifiées comme espace en préparation, sans simulation présentée comme réelle.
- [ ] L’orbe reste un élément visuel, pas un bouton.
- [ ] Les commandes restent accessibles avec une seule main et n’empiètent pas sur les zones système de l’iPhone.
- [ ] Les panneaux mémoire, paramètres et transcription peuvent être fermés.
- [ ] Le clavier virtuel ne casse pas la mise en page.
- [ ] La préférence de réduction des animations est respectée.
- [ ] La PWA installée et Safari affichent la même version de l’interface.

## G. Journal de test à compléter
Pour chaque échec, consigner : modèle d’iPhone, version iOS, Safari ou PWA, étape, résultat attendu, résultat observé, heure approximative et capture expurgée de tout jeton ou donnée personnelle.

| Test | Résultat | Détails |
|---|---|---|
| Autorisations microphone | À tester | |
| Première rencontre | À tester | |
| Conversation aller-retour | À tester | |
| Pause pendant requête | À tester | |
| Pause pendant synthèse | À tester | |
| Erreur réseau | À tester | |
| Consentement mémoire désactivé | À tester | |
| Consentement mémoire activé | À tester | |
| Purge locale et distante | À tester | |
| PWA installée | À tester |\n| Transition logo → visualisation → retour | À tester |\n| Globe WebGL manipulable | À tester |\n| Widgets contextuels mobile | À tester | |

## Critère de sortie
La boucle vocale ne passe en alpha testeur qu’après réussite des scénarios A et B, et la mémoire ne passe qu’après réussite des scénarios C. L’authentification individuelle reste un prérequis séparé à toute ouverture publique.


## Prévalidation du backend alpha — 20 octobre 2026

- [ ] Avant de tester un accès individuel, vérifier côté Cloudflare que le Worker possède le binding KV `ARIA_USERS` et que `ARIA_REQUIRE_INDIVIDUAL_AUTH=true` est activé.
- [ ] Vérifier que le jeton partagé est refusé une fois le mode individuel activé.
- [ ] Vérifier qu’un jeton individuel provisionné est accepté, qu’un jeton inconnu est refusé et que deux identités ne partagent pas la mémoire.
- [ ] Vérifier `/health`: le champ `configured` décrit uniquement la présence des bindings/secrets nécessaires; il ne garantit pas la disponibilité du fournisseur IA ni la validité d’un jeton.
- [ ] Aucun changement de configuration ou déploiement staging ne doit être fait sans autorisation explicite; aucune de ces vérifications ne remplace le test Safari/PWA sur iPhone physique.


## État réel du staging — contrôle du 20 octobre 2026
- Le namespace `ARIA_USERS_STAGING` existe mais est vide et non lié au Worker.
- Le Worker déployé utilise encore le jeton partagé; le code d’authentification individuelle dans la branche Git n’est pas encore déployé.
- Aucun jeton individuel n’a été provisionné. Les tests d’authentification individuelle et d’isolation mémoire sont donc **bloqués / non exécutés**, et non considérés comme réussis.
- Une tentative de déploiement via l’API Cloudflare a été bloquée par les contrôles de sécurité des outils. Aucun réglage du Worker, binding ou secret existant n’a été modifié. Ne pas activer le mode individuel tant que le code et le binding ne sont pas déployés puis vérifiés.
- Le test physique Safari/PWA sur iPhone reste **À tester**; aucune validation sur appareil réel n’est revendiquée.


## Mise à jour staging — 20 octobre 2026, 17:45 CEST
- Le Worker déployé contient désormais le code d’authentification individuelle; le binding `ARIA_USERS` est présent et `ARIA_REQUIRE_INDIVIDUAL_AUTH=true` est actif.
- Un mapping de jeton temporaire à durée de vie de 7 jours a été créé et vérifié dans KV. Le jeton brut est communiqué séparément au propriétaire, jamais dans le dépôt ou les captures de test.
- État : prérequis de configuration satisfaits; tests HTTP d’accès individuel, rejet du jeton partagé et isolation mémoire **à exécuter**. Le endpoint `/health` n’a pas encore été vérifié directement via HTTP.
- Les tests Safari/PWA sur iPhone physique restent **À tester**. Aucun résultat d’appareil réel n’est revendiqué.
- Garder le secret partagé jusqu’à réussite des tests et préparation d’un retour arrière; aucun lancement public avant validation complète.
