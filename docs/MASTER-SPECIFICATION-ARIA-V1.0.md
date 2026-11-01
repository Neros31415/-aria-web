# ARIA — Master Specification produit & technique
**Version :** 1.0 consolidée — 1er novembre 2026  
**Statut :** document de référence consolidé proposé à partir des décisions utilisateur, des cahiers des charges V1.1/V1.2, du complément V1.2.1, de la vision V1.3 et de l'audit du dépôt.  
**Base de publication :** branche dédiée, issue de main.  
**Important :** ce document décrit les décisions et les objectifs. Il ne constitue jamais une preuve d'implémentation, de test réel, de déploiement ou de publication.

---

## 0. Gouvernance et hiérarchie des sources

Ce document rassemble les décisions prises sur ARIA. Il ne remplace pas silencieusement les documents historiques : il les réconcilie et explicite leur statut.

### 0.1 Hiérarchie à appliquer
1. Décision explicite la plus récente de Quentin.
2. Cahier des charges V1.1 consolidé du 20 octobre 2026 pour l'expérience vocale, l'onboarding, le HUD et la mémoire.
3. Cahier des charges consolidé V1.2 du 21 octobre 2026 pour les comptes, rôles, offres, confidentialité, aspects commerciaux et juridiques.
4. Complément fonctionnel V1.2.1 pour l'intention, la mémoire contextuelle, l'exécution vérifiée, la continuité, les compétences, la proactivité et la mémoire des décisions. Ces sept familles ont été acceptées par Quentin comme exigences à intégrer.
5. Vision V1.3 et feuille de route App Store : extension cible du produit, sans prétendre que ces capacités sont déjà disponibles.
6. Code, tests, branches, Pull Requests et état des services : seules sources permettant d'établir l'état technique réel.

En cas de contradiction, ne pas supprimer une exigence par commodité. Consigner la contradiction, proposer une résolution et demander validation lorsque cela change une décision produit.

### 0.2 Statuts obligatoires
- **Décidé** : exigence explicitement acceptée.
- **Cible ARIA 1.0** : capacité demandée pour la livraison publique globale 1.0, pouvant être construite par incréments internes.
- **Vision étendue** : ambition cible V1.3, à développer selon dépendances et faisabilité, sans la présenter comme opérationnelle.
- **À faire / En cours / Implémentée / Testée / Déployée et vérifiée** : statuts d'exécution. Chaque changement de statut exige une preuve.
- Une PR ouverte, un document, une maquette ou une CI verte ne signifient pas « livré ».

### 0.3 Gouvernance du périmètre
- L'ordre de développement ne réduit pas le périmètre public ARIA 1.0.
- Aucune exigence validée ne peut être supprimée, minimisée ou reportée à une version publique ultérieure sans accord explicite.
- Une contrainte de plateforme, de sécurité, de droit, de coût ou de fournisseur doit être documentée avec des options de résolution.
- Aucun changement de production, fusion, publication, dépense ou changement structurel n'est implicite.
- Le périmètre doit rester cohérent entre le site, le client iPhone, le HUD et le compagnon PC.

---

## 1. Identité et vision produit

1. ARIA est une assistante personnelle généraliste et évolutive, pas un simple chatbot.
2. Elle doit devenir une interface intelligente permettant de converser, comprendre des objectifs, réfléchir, planifier, utiliser des outils autorisés, vérifier les résultats et assurer la continuité du travail.
3. Son inspiration de personnalité et de relation est Jarvis dans Iron Man : élégante, vive, chaleureuse, complice, intelligente et parfois sarcastique.
4. L'humour doit être naturel, jamais forcé. ARIA ne doit pas avoir un ton froid, robotique ou excessivement corporatif.
5. ARIA tutoie son utilisateur dans sa propre persona.
6. Elle doit proposer un profil personnel et un profil professionnel, avec des comportements et outils adaptés aux permissions du compte.
7. La voix est l'interface principale. Le texte, la transcription et les panneaux visuels sont des canaux secondaires et complémentaires.
8. L'autonomie doit rester contrôlée, vérifiable et révocable.
9. ARIA doit distinguer ce qu'elle sait, suppose, propose, tente, exécute et vérifie.
10. Elle ne doit jamais prétendre avoir effectué une action qui n'a pas réellement été exécutée et vérifiée.

## 2. Interaction vocale — priorité produit

### 2.1 Parcours vocal
- L'interaction utilisateur-ARIA est essentiellement vocale.
- L'utilisateur doit pouvoir parler naturellement, sans syntaxe de commandes rigide.
- Le système doit gérer reconnaissance vocale, synthèse vocale, interruptions, pause, reprise, annulation, erreurs et indisponibilités.
- Les tours de conversation doivent être sérialisés et protégés contre les doubles envois et les réponses tardives.
- L'utilisateur peut interrompre immédiatement la parole d'ARIA.
- L'utilisateur peut arrêter ou mettre en pause l'écoute à tout moment.
- La transcription est facultative, discrète par défaut et consultable à la demande.
- Un mode texte de secours doit rester disponible, notamment pour l'accessibilité ou l'indisponibilité de la voix.

### 2.2 Microphone et confidentialité
- L'écoute commence après une action ou une autorisation explicite et compréhensible.
- Aucun microphone caché, aucune écoute permanente non indiquée et aucune activation implicite.
- L'état du microphone doit toujours être visible et compréhensible.
- L'écoute continue ne peut être proposée que lorsque la plateforme la prend réellement en charge et après activation explicite.
- Ne jamais promettre une écoute en arrière-plan sur iOS si le navigateur ou le système peut suspendre le processus.
- Refus de permission, perte réseau, reconnaissance non prise en charge et indisponibilité du fournisseur doivent être gérés honnêtement.

### 2.3 États vocaux
Prévoir au minimum : prêt/présence, écoute, transcription, réflexion, réponse/parole, interruption, pause, erreur, hors ligne et indisponibilité. Les états visuels et sonores doivent correspondre à l'état réel du système.

### 2.4 Architecture audio
- Isoler le moteur vocal du moteur de conversation et du HUD.
- Utiliser un transport temps réel adapté (WebRTC ou WebSocket selon le fournisseur et l'architecture retenus).
- Garder les clés permanentes côté serveur.
- Les credentials temporaires éventuellement exposés au client doivent être de courte durée et limités.
- Les décisions de fournisseur doivent rester remplaçables derrière une abstraction interne.

## 3. Première rencontre et onboarding

1. À la première ouverture, ARIA accueille l'utilisateur par une présence visuelle calme et une invitation à commencer.
2. La première rencontre est une séquence conversationnelle, principalement vocale, jouée une seule fois après validation.
3. Elle présente ARIA et ses capacités sans promesse excessive.
4. Elle explique les états de l'orbe, l'interruption, la pause et les commandes essentielles.
5. Elle recueille les préférences de longueur des réponses (court, équilibré, détaillé).
6. Elle recueille la préférence d'humour.
7. Elle recueille le niveau d'initiative (discret, équilibré, proactif).
8. Elle demande séparément le consentement relatif à la mémoire.
9. Une réponse ambiguë ne vaut jamais consentement positif.
10. L'utilisateur peut passer une question, modifier ses choix et recommencer l'onboarding sur demande explicite.
11. Les préférences ne sont sauvegardées qu'après validation.
12. L'onboarding ne doit pas devenir une suite de formulaires longs.

## 4. Interface HUD, orbe et identité visuelle

### 4.1 Direction artistique
- HUD borderless, discret, fluide, chaleureux, intuitif et minimaliste.
- Éviter les grands rectangles, panneaux opaques, boutons massifs et accumulations de menus.
- Direction visuelle sombre, principalement noire et blanche, avec lumière utilisée avec retenue.
- L'interface doit rester légère, responsive et lisible sur iPhone et ordinateur.
- Les widgets latéraux sont contextuels, compacts, translucides et fermables.
- La scène visuelle centrale doit pouvoir occuper l'espace principal lorsqu'une visualisation est demandée.
- Pas de barre de navigation permanente chargée ni d'onglets pour chaque fonction.
- Paramètres, mémoire, historique, permissions et commandes système restent accessibles. Les autres capacités sont invoquées contextuellement.

### 4.2 Orbe
- L'orbe est l'élément visuel central et expressif d'ARIA.
- L'orbe est un élément visuel, pas un bouton de commande.
- Ses animations représentent les états réels : présence, écoute, réflexion, parole, initiative, attention, erreur et indisponibilité.
- Les animations doivent être sobres, performantes et respecter prefers-reduced-motion.
- Les commandes explicites sont accessibles par des contrôles discrets et correctement nommés.

### 4.3 Logo et transition immersive
- Le symbole ARIA est un A triangulaire, avec une identité graphique noire et blanche.
- Le logo n'est pas seulement décoratif : il sert de seuil de navigation immersive.
- Lorsqu'une visualisation est demandée, la caméra peut s'approcher du symbole, traverser son centre et ouvrir sur la scène demandée.
- La transition peut conduire vers un globe, une carte, un lieu, un objet, un mécanisme, un modèle scientifique ou une scène 3D.
- Le retour à l'espace principal suit le mouvement inverse ou une transition cohérente.
- Cette transition ne doit pas se déclencher pour chaque réponse textuelle.
- Elle ne doit jamais bloquer le retour arrière, le zoom manuel, les commandes et les exigences d'accessibilité.

## 5. Personnalité et conversation

- Conversation naturelle, contextuelle et cohérente.
- ARIA peut approfondir, clarifier une ambiguïté importante, signaler une incertitude et proposer une prochaine étape utile.
- Trois niveaux d'initiative : discret, équilibré et proactif.
- Discret : intervenir uniquement si cela apporte une valeur claire, débloque une tâche ou évite un risque.
- Équilibré : proposer une seule prochaine étape concrète lorsqu'elle est utile.
- Proactif : anticiper la prochaine étape liée à l'objectif et progresser sans demander systématiquement l'autorisation de continuer lorsque l'action est déjà autorisée.
- Le niveau d'initiative ne donne jamais de permission supplémentaire.
- Le texte reste disponible pour consultation, correction, accessibilité et secours.

## 6. Mémoire personnelle et continuité

### 6.1 Principes
- La mémoire personnelle démarre vierge dans le parcours de réinitialisation prévu.
- L'historique de conversation et la mémoire persistante sont deux systèmes distincts.
- Une préférence de mémoire ne signifie pas consentement à enregistrer automatiquement chaque échange.
- Le consentement doit être explicite, compréhensible, révocable et vérifié côté serveur.
- L'utilisateur peut consulter, ajouter, corriger, supprimer et exporter les données selon les capacités et obligations applicables.
- L'utilisateur peut demander une purge complète.
- Distinguer clairement mémoire locale et mémoire distante.
- Une suppression locale ne prouve pas la suppression distante.
- Une suppression distante n'est confirmée qu'après réponse positive du serveur ; en cas d'incertitude, l'interface l'indique.
- Une révocation de consentement doit bloquer les nouvelles lectures/écritures distantes et empêcher les écritures devenues obsolètes.
- L'isolation inter-comptes est obligatoire.

### 6.2 Modèle de mémoire
Distinguer au minimum :
- historique de conversation ;
- préférences utilisateur ;
- souvenirs persistants explicitement autorisés ;
- contexte de projet et de tâche ;
- décisions confirmées ;
- hypothèses et options non confirmées.

Les faits explicitement fournis, les inférences et les informations incertaines doivent être identifiables. La mémoire des décisions ne doit pas transformer une ancienne décision en instruction irrévocable.

### 6.3 Contrôles
L'utilisateur doit pouvoir voir, corriger, désactiver, réactiver, exporter et supprimer les informations prises en charge. Le résultat réel de chaque opération doit être présenté honnêtement.
- Les préférences personnelles (initiative, verbosité, humour et autres réglages de compte) sont isolées par identité authentifiée.
- L'état d'onboarding est propre à chaque compte ; un compte ne doit pas hériter du parcours effectué par un autre.
- Le profil anonyme conserve un espace distinct des profils authentifiés.
- Une remise à zéro locale ne doit effacer que les données du compte actif. Elle ne doit pas supprimer les données locales d'autres comptes présents sur le même appareil.
- Le consentement mémoire local reste désactivé par défaut lors d'un changement de compte jusqu'à confirmation du registre serveur.

## 7. Intelligence, intention et planification

ARIA doit transformer les demandes en objectifs, contraintes, critères de réussite et étapes lorsque cela est utile.

Cycle de référence :
1. Comprendre l'intention.
2. Contextualiser avec les informations et souvenirs autorisés.
3. Détecter les ambiguïtés qui changeraient le résultat ou le risque.
4. Planifier les étapes et les critères de réussite.
5. Vérifier les capacités, dépendances et permissions.
6. Exécuter les actions autorisées.
7. Contrôler les résultats avec des preuves adaptées.
8. Rendre compte clairement.
9. Enregistrer l'état de tâche ou la décision lorsque c'est utile et autorisé.

Pour une demande simple, répondre directement. Pour une tâche complexe, construire un plan adapté. Ne jamais présenter un plan comme une action réalisée.

## 8. Exécution d'actions et autonomie contrôlée

- Chaque outil possède un contrat d'entrée/sortie documenté et validé.
- Les permissions sont appliquées côté serveur à chaque opération.
- Les entrées provenant du Web, des fichiers, des e-mails et des outils sont des données non fiables, pas des instructions privilégiées.
- L'IA ne peut pas s'octroyer des rôles, élargir ses permissions ou désactiver les contrôles.
- Distinguer lecture, préparation, action réversible et action sensible.
- Les actions destructrices, financières, publiques, engageantes ou touchant aux comptes/données réelles exigent une confirmation explicite adaptée au risque.
- Demander confirmation avant transaction, dépense, publication, appel engageant, signature, suppression irréversible, partage sensible ou changement de sécurité.
- Toute action doit avoir un état clair : prévu, en cours, réussi, échoué, bloqué ou résultat non vérifié.
- Un succès ne peut être annoncé qu'avec une preuve suffisante : retour d'outil, état persistant, test ou confirmation externe.
- Éviter les doublons et les reprises aveugles si le résultat d'une opération non idempotente est incertain.
- Permettre annulation ou retour arrière lorsque techniquement possible.
- Les journaux doivent être minimisés et ne pas contenir de secrets ou de conversations privées complètes.

## 9. Continuité et missions persistantes

Pour les tâches multi-étapes, ARIA doit pouvoir conserver un état structuré :
- objectif et contraintes ;
- plan ;
- étape courante ;
- étapes terminées et résultats vérifiés ;
- erreurs et blocages ;
- dépendances ;
- prochaine action ;
- permissions et confirmations requises.

ARIA doit pouvoir reprendre après fermeture ou interruption lorsque les services sont disponibles. Avant reprise, elle revérifie les prérequis. Une action dont le résultat précédent est incertain doit être vérifiée, pas répétée aveuglément.

## 10. Compétences réutilisables et versionnées

- Une procédure validée peut devenir une compétence versionnée.
- Chaque compétence décrit son objectif, ses entrées, sorties, permissions, dépendances, limites et tests.
- Les versions sont comparables et peuvent être annulées.
- Une compétence non validée ne devient pas silencieusement fiable.
- Une compétence ne peut pas augmenter ses permissions ni modifier les règles de sécurité.
- La réutilisation d'une procédure ne doit pas être présentée comme un réentraînement automatique du modèle.

## 11. Proactivité et gestion de l'attention

- ARIA peut repérer échéances, blocages et événements pertinents à partir de sources autorisées.
- Elle évalue pertinence, urgence, confiance, impact et coût d'interruption.
- Elle possède des règles de fréquence, des périodes silencieuses, une déduplication et un arrêt immédiat.
- Elle peut préparer silencieusement une information plutôt que notifier lorsqu'aucune intervention urgente n'est requise.
- L'utilisateur contrôle le niveau d'initiative et les notifications.
- Ne jamais simuler une surveillance continue si l'ordonnanceur ou la source ne fonctionne pas réellement.
- Les notifications et appels sont soumis aux permissions du canal et aux règles de la plateforme.

## 12. Mémoire des décisions

Lorsqu'une décision utile est conservée, enregistrer :
- décision ;
- date et contexte ;
- options envisagées ;
- contraintes ;
- hypothèses ;
- raisons retenues ;
- statut : confirmée, provisoire, rejetée ou à réexaminer.

Une décision peut être réexaminée si les contraintes changent. ARIA ne doit pas modifier une décision confirmée sans validation appropriée.

## 13. Visualisation, cartographie, 3D et science

### 13.1 Cartographie
- Cartes interactives et navigation multi-échelle.
- Vue globale de type God’s Eye View.
- Transition du globe vers une région, une ville, un lieu ou un objet.
- Itinéraires généraux, sans priorité exclusive au vélo : marche, voiture, vélo et autres modes lorsque les données et services le permettent.
- Afficher sources, limites, unités, fraîcheur des données et incertitudes.
- Ne pas présenter une carte 2D ou un itinéraire fournisseur comme un modèle 3D ou une donnée temps réel.

### 13.2 Modélisation et simulation
- Visualisation d'objets et mécanismes complexes, notamment moteurs automobiles.
- Modèles 3D interactifs et animations.
- Simulations sous contraintes explicites : accélération, gravité, météo et autres paramètres pertinents.
- Distinguer maquette visuelle, modèle manipulable, simulation physique, données simulées et données réelles.
- Afficher provenance, unités, hypothèses et limites lorsque cela compte.

### 13.3 Sciences
- Visualisations scientifiques et astronomiques interactives.
- Modèles 3D et simulations physiques.
- Le catalogue NASA et les scènes orbitales déjà expérimentés constituent des fondations partielles, pas la preuve d'un laboratoire scientifique complet.

## 14. Capacités de l'assistant et connecteurs

La vision cible comprend, sous réserve de connecteurs réellement disponibles et autorisés :
- recherche et navigation Web ;
- gestion de fichiers ;
- interaction avec applications ;
- tâches administratives ;
- gestion de projets de bout en bout ;
- domotique et matériels compatibles ;
- analyse de finances et de portefeuille via sources autorisées ;
- appels et communications via fournisseurs compatibles ;
- compagnon PC et commandes système explicitement autorisées ;
- visualisations et simulations.

Chaque connecteur doit avoir un contrat, des permissions, des limites, une gestion des erreurs, des preuves de résultat et une procédure de révocation.

Les fonctions financières sont d'abord conçues en lecture/analyse lorsque cela suffit. Toute transaction, dépense ou action engageante nécessite confirmation. Les appels ne sont jamais lancés silencieusement.

## 15. Écosystème iPhone, Web et PC

### 15.1 iPhone
- L'iPhone est la première cible d'expérience utilisateur.
- La PWA sert de prototype et de canal de test.
- La livraison App Store doit être une véritable application iOS utile, stable et conforme, avec une orientation native SwiftUI pour les permissions, l'audio, l'accessibilité et le cycle de vie.
- Les jetons de session sont stockés dans Keychain.
- Les permissions microphone et reconnaissance vocale sont demandées au moment pertinent, avec une justification claire.
- Le cycle de vie doit gérer suspension, reprise, interruption audio, perte réseau et déconnexion.
- La suppression du compte doit être accessible dans l'application si la création de compte est prise en charge.
- Un build signé et des tests sur iPhone physique sont obligatoires avant TestFlight/App Store.
- La compilation et la signature nécessitent un chemin macOS/Xcode et un compte Apple Developer.

### 15.2 Compagnon PC
- ARIA doit disposer d'un compagnon PC cohérent avec le HUD.
- L'appairage est sécurisé, authentifié et révocable.
- Les communications sont chiffrées.
- Les permissions sont granulaires par appareil et par capacité.
- Les commandes PC ne peuvent pas contourner les autorisations du système.
- L'utilisateur peut consulter et révoquer les appareils associés.
- Le PC et l'iPhone doivent communiquer dans les deux sens lorsque les deux clients sont disponibles.

### 15.3 Synchronisation
- iPhone, Web et PC partagent les contrats API et les données autorisées.
- La synchronisation doit être explicite, résiliente et isolée par compte.
- Aucun appareil ne doit être considéré authentifié sur la seule base d'un identifiant client.

## 16. Architecture technique cible

### 16.1 Principes
- Architecture modulaire, testable et remplaçable.
- Séparer interface, audio, conversation, planification, mémoire, autorisation, exécution, vérification, visualisation et connecteurs.
- Abstraction fournisseur IA : les modèles peuvent être remplacés sans réécrire mémoire, permissions, tâches et historique.
- Les capacités propres à un fournisseur doivent être déclarées.
- API commune pour les clients Web, iPhone et PC.
- Contrats versionnés et erreurs explicites.

### 16.2 Technologies et services identifiés
- GitHub : dépôt et revue du code.
- Cloudflare Workers : backend/API et exécution serveur.
- Cloudflare D1 : autorisation et données relationnelles structurées, selon schéma validé.
- Supabase Auth : cible retenue pour l'authentification individuelle par compte dans le chantier de staging.
- Web/PWA : prototype et canal de test.
- SwiftUI/Xcode : cible native iOS.
- Transport vocal temps réel : WebRTC ou WebSocket selon l'architecture fournisseur.
- Visualisations WebGL et bibliothèques cartographiques/scientifiques adaptées.

Les technologies ne sont pas des obligations absolues si une évolution est justifiée par un audit et ne change pas silencieusement le produit.

### 16.3 Identité et autorisation
- Authentification individuelle, vérification des jetons côté serveur et identité dérivée exclusivement du résultat de validation.
- Séparer identité, rôle d'autorisation et offre commerciale.
- Rôles envisagés : utilisateur standard et Super Admin.
- Offres envisagées : Free, Plus et Pro.
- MFA obligatoire pour les opérations Super Admin sensibles.
- Clés privées d'accès offertes aux proches/Beta créées, listées et révoquées par le Super Admin.
- Le client ne peut jamais s'attribuer un rôle, une offre ou une permission.
- L'administration n'accorde pas par défaut l'accès aux conversations ou souvenirs privés d'autres comptes.
- Les opérations privilégiées sont auditées.

### 16.4 Sécurité et données
- Secrets et clés fournisseur exclusivement côté serveur.
- HTTPS/TLS, validation stricte des entrées, limites de taille, quotas, limites de débit et CORS explicite.
- Isolation inter-comptes côté serveur.
- Protection contre les jetons expirés, falsifiés, révoqués et les identités client falsifiées.
- Sauvegarde, rétention, suppression et réponse à incident documentées.
- Minimisation des journaux ; aucune clé, aucun jeton et aucun contenu privé inutile dans les logs.
- Respect du RGPD et des règles Apple applicables.
- Aucune activation de fonction si ses garanties de sécurité, ses droits, ses données, ses coûts ou sa conformité ne sont pas établis.

## 17. Site, offres et commercialisation

### 17.1 Site web
- Identité cohérente avec l'application et le HUD.
- Le site ne doit pas ressembler à une vitrine IA générique.
- HTTPS, API côté serveur, pages de confidentialité, CGU et informations légales.
- Gestion des cookies lorsque requise.
- SEO, métadonnées, Open Graph, sitemap, robots.txt, page 404 et support.
- Formulaires protégés contre le spam.
- Newsletter facultative avec consentement et désinscription.
- Les fonctions présentées doivent correspondre à des capacités réellement déployées.

### 17.2 Offres
- ARIA Free : produit de base réellement utile.
- ARIA Plus : quotas supérieurs et fonctions personnelles avancées selon disponibilité.
- ARIA Pro : fonctions orientées projets et usages professionnels selon disponibilité.
- Accès offert / Family / Beta : accès réservé à des comptes précis via clés privées gérées par le Super Admin.
- Les prix 9,90 €/mois pour Plus et 24,90 €/mois pour Pro sont indicatifs, non définitifs et non contractuels.
- Les quotas doivent être transparents et proportionnés aux coûts réels.
- Ne jamais promettre un usage illimité sans maîtrise des coûts.

### 17.3 Paiements et droits
Si des offres payantes sont proposées, le périmètre inclut paiements, renouvellements, annulations, restauration, états d'échec, gestion des droits, taxes et informations consommateur selon les règles applicables.
Les droits commerciaux et les permissions techniques restent distincts.

## 18. Observabilité, support et incidents

- Suivre disponibilité, erreurs, latence, coût, quotas, réussite des parcours et incidents.
- Journaliser les événements nécessaires au diagnostic sans conserver de données privées inutiles.
- Prévoir sauvegardes, rétention, restauration et gestion d'incident.
- Fournir un canal de support et des procédures de signalement.
- Les états de santé doivent distinguer configuration, disponibilité réelle et dépendances manquantes.
- Une vérification SQL ou une CI verte ne remplace pas un test HTTP de bout en bout.

## 19. Exclusions explicites et idées réservées

Les concepts de système d'exploitation cognitif général, compilateur de réalité numérique, monde miroir universel, moteur causal général, mondes parallèles, laboratoire d'auto-amélioration générale et génération autonome d'environnements complexes restent en réserve pour un éventuel projet distinct. Ils ne doivent pas être ajoutés automatiquement au périmètre immédiat d'ARIA.

Les exclusions permanentes ou interdites par défaut :
- écoute microphone cachée ou permanente sans activation et indication explicites ;
- contrôle arbitraire et non autorisé d'un appareil ;
- élévation automatique de privilèges ;
- action sensible sans confirmation requise ;
- simulation présentée comme donnée réelle ;
- action annoncée comme réussie sans preuve ;
- fonction publique dont sécurité, droits, données, coûts ou conformité ne sont pas établis.

---

## 20. Ordre de développement et dépendances

L'ordre organise la livraison interne, sans retirer les familles fonctionnelles de la cible publique ARIA 1.0.

1. **Audit et cadrage** : sources de vérité, branches, PR, code, services, critères et dépendances.
2. **Identité et sécurité** : authentification individuelle, permissions serveur, isolation des comptes, secrets, consentement mémoire.
3. **Cœur vocal** : parcours vocal réel, interruptions, états, mode texte, HUD et onboarding.
4. **Client iOS** : architecture native, permissions, session sécurisée, tests sur appareil.
5. **Mémoire et continuité** : souvenirs, historique, tâches persistantes, reprise et mémoire des décisions.
6. **Noyau agentique** : intention, planification, outils autorisés, vérification, compétences versionnées.
7. **Proactivité** : ordonnanceur, Attention Manager, règles de silence, notifications et révocation.
8. **Connecteurs et capacités** : Web, fichiers, applications, finances en lecture/analyse, domotique, appels, compagnon PC.
9. **Visualisations avancées** : carte, God’s Eye View, 3D, simulations et transition logo.
10. **Commercialisation et conformité** : offres, paiements, site, support, audit sécurité.
11. **Bêta et publication** : TestFlight, tests d'acceptation, revue Apple et publication.

Les dépendances peuvent conduire à paralléliser des travaux indépendants, mais pas à contourner identité, permissions, sécurité ou vérification.

---

## 21. État technique réconcilié au 1er novembre 2026

### 21.1 Dépôt principal
Dépôt : https://github.com/Neros31415/-aria-web

- La branche main contient le socle ARIA Web V0.7 : PWA statique, conversation locale, notes mémoire locales, cache hors ligne de base.
- Le README de main précise que le modèle IA réel, la recherche Web, l'authentification, le backend intégré, la synchronisation iPhone-PC, le contrôle Windows et les paiements ne sont pas connectés dans cette branche.
- Le dernier commit observé sur main est le 22 octobre 2026 ; la branche main ne reflète pas les développements plus récents sur les branches de travail.
- Le dépôt a été poussé le 1er novembre, mais ce mouvement correspond à des branches de travail, pas à une mise à jour équivalente de main.

### 21.2 Voix et HUD
- PR #15 est ouverte en brouillon, non fusionnée dans main.
- Sa branche contient un HUD vocal, un onboarding, des préférences, une transcription facultative, des tours vocaux annulables/sérialisés, un consentement mémoire, des widgets contextuels, une transition logo A ↔ scène et un globe WebGL filaire manipulable.
- Les tests de la branche couvrent plusieurs invariants vocaux et d'interface ; ils ne prouvent pas le parcours complet sur iPhone physique ni la disponibilité réelle du fournisseur.
- PR #31 a été fusionnée dans la branche d'intégration backend, pas dans main. Elle intègre le HUD voice-first et des scènes carte/finance/science dans cette branche.
- Les validations iPhone réelles restent non attestées.

### 21.3 Backend et identité
- Une branche d'intégration backend Cloudflare existe, avec contrôles d'autorisation D1 et Worker staging.
- **Vérification Cloudflare en lecture seule du 1er novembre 2026 :** le Worker `aria-brain-staging` est toujours sur la version active `c1387164-ffdd-48ea-9dbe-7034b98bb781`, déployée à 100 % le 22 octobre 2026. Les réglages exposent `ARIA_AUTH_MODE=session_kv`, `ARIA_REQUIRE_INDIVIDUAL_AUTH=true`, le binding D1 `ARIA_AUTHZ_DB` et les KV historiques. Aucun binding `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` ou `SUPABASE_ANON_KEY` n'est présent. Les valeurs des secrets n'ont pas été consultées.
- La base D1 staging `aria-authz-staging` contient actuellement `aria_authorization_audit`, `aria_entitlements`, `aria_memory_consent`, `aria_memory_documents` et `aria_user_roles`. Une requête en lecture seule sur `sqlite_master` confirme les tables et les définitions SQL des migrations 0002/0003. Le champ de métadonnées `num_tables` renvoyé par la liste D1 vaut pourtant 0 ; cette valeur est incohérente avec `sqlite_master` et ne doit pas être utilisée comme preuve d'absence du schéma.
- Les migrations D1 0002/0003 ont donc bien été appliquées à la base staging et leur schéma a été vérifié. Cela ne signifie pas que le Worker actif utilise ce schéma : la version déployée reste en `session_kv`, sans les bindings Supabase individuels. Le code D1 de la PR #43 n'est pas encore promu dans le Worker actif.
- Aucun parcours HTTP authentifié de bout en bout avec deux comptes canoniques distincts n'est attesté. La mémoire persistante multi-utilisateur reste bloquée tant que le Worker individuel correspondant n'est pas configuré/déployé en staging et vérifié par tests HTTP.
- Supabase Auth individuel par e-mail/mot de passe est la cible retenue pour le staging. Le projet Supabase staging `aria-staging` est créé et sain ; l'URL et la clé publishable sont présentes dans la branche candidate, sans clé secrète/service_role.
- Les réglages du fournisseur Email, la confirmation d'adresse, les URL de redirection et les bindings Cloudflare Supabase ne sont pas encore configurés/validés. Le Worker actuellement actif ne possède pas ces bindings.
- PR #46 prépare ce parcours ; PR #48 ajoute la gestion des erreurs réseau, états occupés et doubles soumissions.
- PR #50 corrige un cas de panne réseau pendant la restauration de session : le client Auth et son listener sont conservés afin de permettre une reconnexion sans rechargement. Un test comportemental couvre l'échec de restauration puis une connexion réussie.
- PR #51 corrige une course concurrente : un instantané `getSession()` ancien ne peut plus écraser un événement d'authentification plus récent (connexion, déconnexion ou renouvellement de jeton). Un test de régression vérifie la priorité de l'événement récent.
- PR #52 isole les préférences et l'onboarding par compte et corrige la remise à zéro locale afin qu'elle ne supprime pas les données des autres comptes du même appareil.
- PR #43, #46, #48, #50, #51 et #52 sont ouvertes et non fusionnées. Les CI des PR #50, #51 et #52 sont vertes sur les commits vérifiés. Aucun test HTTP réel multi-comptes ni déploiement du Worker individuel n'est attesté.
- Aucune production n'a été modifiée ; aucune configuration Cloudflare ou Supabase n'a été changée pendant cet audit en lecture seule.

### 21.4 Cartographie, finance et science
- Les PR #31 à #34 documentent des scènes carte, finance et science intégrées dans la branche backend.
- Carte : itinéraires 2D avec OSRM et instructions ; pas de relief 3D, trafic temps réel ou God’s Eye View complet.
- Finance : graphique externe/outil local de suivi en branche ; pas une intégration bancaire ou un système de transaction complet.
- Science : catalogue NASA et simulation orbitale locale ; pas encore une suite complète de modèles physiques 3D.
- Ces capacités ne sont pas disponibles sur main et ne doivent pas être présentées comme des fonctions publiques opérationnelles.

### 21.5 iOS, PC et commercialisation
- Le dépôt main n'est pas une application iOS native signée.
- Le client SwiftUI, Keychain, TestFlight et la distribution App Store restent à réaliser.
- Le compagnon PC, l'appairage sécurisé, le chiffrement, la révocation d'appareil et les commandes système restent à réaliser ou à valider.
- Les offres, paiements, clés privées, newsletter, pages juridiques et conditions de publication restent des exigences de produit, pas des fonctionnalités publiques confirmées.

### 21.6 Correctifs d'ingénierie ouverts au 1er novembre 2026
- PR #50 : correction de la récupération de session Supabase après échec réseau temporaire ; CI push et pull_request réussies.
- PR #51 : protection contre l'écrasement d'une session récente par un instantané `getSession()` obsolète ; CI push et pull_request réussies.
- PR #52 : isolation locale des préférences, de l'onboarding et du reset par compte ; CI push et pull_request réussies.
- PR #53 : harnais HTTP manuel à deux comptes, strictement limité aux origines staging, avec garde-fous de readiness, isolation, révocation et nettoyage ; CI push et pull_request réussies. Le harnais n'a pas été exécuté contre les services réels.
- Les PR sont empilées sur la pile d'authentification/mémoire (#43 → #46 → #48 → #50, avec #51 en correctif complémentaire de #50, puis #52 et #53 sur la chaîne UI/auth). Elles ne sont pas fusionnées.
- PR #49 contient le présent registre de spécification, uniquement documentaire et également non fusionné.
- Aucun test de bout en bout sur le vrai projet Supabase, aucun test HTTP multi-comptes, aucun test sur iPhone physique et aucun déploiement du Worker individuel n'ont été réalisés dans ce cycle. Les migrations D1 0002/0003 sont appliquées au schéma staging et ont été vérifiées en lecture seule ; le Worker actif ne les utilise pas encore.

---

## 22. Décisions de réconciliation et corrections du registre précédent

1. **Voix :** priorité absolue, mais aucune écoute cachée/permanente. Activation explicite, indicateur clair, arrêt et pause immédiats.
2. **Orbe :** élément visuel non cliquable comme commande ; commandes discrètes et accessibles.
3. **iPhone :** la PWA est un prototype/canal de test ; la cible App Store est une véritable application native, avec SwiftUI privilégié.
4. **Mémoire :** vierge par défaut, consentement explicite, séparation historique/mémoire, isolation serveur et confirmation réelle des suppressions.
5. **Authentification :** Supabase Auth individuel est le choix cible ; le projet staging existe, mais les réglages Email/redirects et les bindings Worker ne sont pas encore configurés et validés de bout en bout.
6. **D1 :** les cinq tables applicatives sont présentes sur la base staging et leur structure correspond aux migrations versionnées 0001–0003 ; le contrôle des clés étrangères ne retourne aucune anomalie. En revanche, aucune table de suivi des migrations n'a été trouvée : l'état structurel est vérifié, mais l'historique d'application n'est pas traçable. Le compteur API `num_tables` est incohérent avec le résultat SQL. La mémoire individuelle reste indisponible sur le Worker actif tant que l'authentification individuelle n'est pas configurée et déployée.
7. **Vision 3D :** les expériences 2D existantes ne doivent pas être confondues avec le God’s Eye View ou les simulations 3D demandées.
8. **Finance :** suivi et analyse ne signifient pas accès bancaire ou exécution de transactions.
9. **Proactivité :** une préférence de prompt n'est pas un ordonnanceur opérationnel ni une surveillance en arrière-plan.
10. **Autonomie :** l'intelligence de planification n'accorde jamais de nouvelles permissions.
11. **Périmètre 1.0 :** la feuille de route App Store affirme que les familles fonctionnelles validées restent dans la cible publique 1.0, même si elles sont développées par incréments.
12. **Idées réservées :** les concepts de monde miroir, moteur causal général et OS cognitif restent hors du périmètre immédiat d'ARIA.
13. **Données locales multi-comptes :** préférences, onboarding et reset sont isolés par compte ; le reset d'un compte ne doit jamais effacer les autres espaces locaux.
14. **Reprise Auth :** une erreur réseau pendant la restauration de session ne doit pas détruire le client Supabase ni empêcher une reconnexion sans rechargement.

---

## 23. Critères de sortie ARIA 1.0

ARIA 1.0 n'est prête que lorsque :
- les familles fonctionnelles du périmètre sont implémentées et testées ;
- l'identité, les permissions, les rôles et les mémoires sont isolés et validés ;
- le parcours vocal fonctionne réellement sur iPhone physique ;
- le client iOS est signé, stable et conforme ;
- les tâches, outils et actions sont vérifiables et reprenables ;
- les fonctions proactives respectent les préférences et les périodes silencieuses ;
- les visualisations 3D/God’s Eye View prévues sont présentes avec provenance et limites ;
- le compagnon PC est appairé, sécurisé et révocable ;
- les offres, paiements, pages légales, confidentialité, support et suppression sont conformes ;
- les tests d'acceptation, la revue sécurité, les sauvegardes et les procédures d'incident sont validés ;
- la version a été soumise, approuvée et rendue disponible sur l'Apple App Store.

Une fonctionnalité non livrée ou non vérifiée ne doit pas être annoncée comme opérationnelle.

---

## 24. Références techniques et décisions sources

- Cahier des charges V1.1 : https://github.com/Neros31415/-aria-web/blob/feat/aria-voice-first-onboarding/docs/CAHIER_DES_CHARGES_ARIA_V1.1.md
- Cahier des charges commercial/légal V1.2 : https://github.com/Neros31415/-aria-web/blob/docs/aria-vision-autonomy-v1-3-final/docs/CAHIER-DES-CHARGES-V1.2-COMMERCIAL-LEGAL.md
- Complément fonctionnel V1.2.1 : https://github.com/Neros31415/-aria-web/blob/docs/aria-vision-autonomy-v1-3-final/docs/CAHIER-DES-CHARGES-ARIA-COMPLEMENT-FONCTIONNEL-V1.2.1.md
- Prompt maître ingénierie V1.3 : https://github.com/Neros31415/-aria-web/blob/docs/aria-vision-autonomy-v1-3-final/docs/PROMPT-MAITRE-INGENIERIE-ARIA-V1.3.md
- Feuille de route App Store : https://github.com/Neros31415/-aria-web/blob/docs/aria-vision-autonomy-v1-3-final/docs/FEUILLE-DE-ROUTE-APPLE-APP-STORE-V1.md
- PR voice-first #15 : https://github.com/Neros31415/-aria-web/pull/15
- PR intégration HUD/scènes #31 : https://github.com/Neros31415/-aria-web/pull/31
- PR consentement mémoire #43 : https://github.com/Neros31415/-aria-web/pull/43
- PR identité Supabase #46 : https://github.com/Neros31415/-aria-web/pull/46
- PR robustesse Auth #48 : https://github.com/Neros31415/-aria-web/pull/48
- PR reprise de session #50 : https://github.com/Neros31415/-aria-web/pull/50
- PR anti-course de session #51 : https://github.com/Neros31415/-aria-web/pull/51
- PR isolation multi-comptes #52 : https://github.com/Neros31415/-aria-web/pull/52
- PR harnais HTTP staging #53 : https://github.com/Neros31415/-aria-web/pull/53
- PR garde-fou authentification individuelle obligatoire #54 : https://github.com/Neros31415/-aria-web/pull/54
- Audit de parité backend staging : `docs/STAGING-BACKEND-PARITY-AUDIT-2026-11-01.md` (PR #54)

---

**Règle finale :** ce document est le registre consolidé proposé. Toute modification ultérieure doit être traçable, motivée, compatible avec les décisions explicites de Quentin et accompagnée de preuves techniques lorsqu'elle modifie un statut d'implémentation.
