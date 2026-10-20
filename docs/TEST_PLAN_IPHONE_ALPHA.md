# ARIA — Plan de test alpha sur iPhone
Date de préparation : 20 octobre 2026  
Branche : feat/aria-voice-first-onboarding  
Statut : **à exécuter sur un appareil réel**. La CI ne remplace pas ces tests.

## Préconditions
- Ouvrir une prévisualisation de la branche; ne pas utiliser main comme preuve de validation.
- Disposer d’un jeton alpha valide transmis par l’administrateur. Ne jamais l’inclure dans une capture d’écran ou un rapport.
- Utiliser Safari sur iPhone, d’abord dans l’onglet navigateur puis, si le parcours fonctionne, depuis la PWA ajoutée à l’écran d’accueil.
- Garder le test en premier plan : iOS peut suspendre la reconnaissance vocale en arrière-plan.

## A. Autorisations et premier lancement
- [ ] Le microphone n’est pas utilisé avant l’action de démarrage.
- [ ] La demande d’autorisation est claire.
- [ ] Refuser le microphone produit un état explicite, sans boucle de redémarrage agressive.
- [ ] Si la reconnaissance vocale n’est pas prise en charge, ARIA annonce la limite et ne prétend pas écouter.
- [ ] La première rencontre démarre après action explicite et la mémoire personnelle est désactivée par défaut.
- [ ] Les préférences proactivité, longueur, humour et consentement mémoire sont comprises et enregistrées.
- [ ] Une réponse ambiguë à la question mémoire entraîne une clarification.
- [ ] Dire « passer » ne donne pas le consentement mémoire.
- [ ] Après validation, l’onboarding ne se relance pas à chaque ouverture; la commande de recommencement fonctionne.

## B. Boucle vocale
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

## C. Préférences et mémoire
- [ ] Changer les préférences dans les paramètres modifie le payload envoyé au moteur.
- [ ] Le réglage mémoire est visible, lisible et conservé après rechargement.
- [ ] Consentement mémoire désactivé : une demande « Retiens que… » n’entraîne aucune lecture ni écriture de souvenirs par le Worker pendant le chat.
- [ ] Consentement activé : une demande explicite de mémorisation enregistre un souvenir et confirme uniquement après écriture réussie.
- [ ] Le panneau mémoire peut être ouvert pour consulter et supprimer les données existantes.
- [ ] Jeton invalide : la synchronisation échoue sans afficher une fausse confirmation.
- [ ] La suppression locale est distinguée de la suppression distante.
- [ ] En cas d’erreur réseau, ARIA n’annonce pas que la mémoire serveur a été supprimée.

## D. Responsive et accessibilité
- [ ] L’orbe reste un élément visuel, pas un bouton.
- [ ] Les commandes restent accessibles avec une seule main et n’empiètent pas sur les zones système de l’iPhone.
- [ ] Les panneaux mémoire, paramètres et transcription peuvent être fermés.
- [ ] Le clavier virtuel ne casse pas la mise en page.
- [ ] La préférence de réduction des animations est respectée.
- [ ] La PWA installée et Safari affichent la même version de l’interface.

## E. Journal de test à compléter
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
| PWA installée | À tester | |

## Critère de sortie
La boucle vocale ne passe en alpha testeur qu’après réussite des scénarios A et B, et la mémoire ne passe qu’après réussite des scénarios C. L’authentification individuelle reste un prérequis séparé à toute ouverture publique.
