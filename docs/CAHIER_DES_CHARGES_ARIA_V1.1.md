# ARIA — Cahier des charges V1.1 consolidé
**Version :** 1.1 consolidée  
**Date de consolidation :** 20 octobre 2026  
**Statut :** référence produit et critères d’acceptation — les éléments non vérifiés ne doivent pas être présentés comme opérationnels.

## 1. Vision produit
ARIA est une assistante personnelle généraliste, vocale en priorité, capable de converser, réfléchir avec l’utilisateur, apprendre selon ses préférences, organiser des tâches, utiliser des outils autorisés et présenter l’information sous forme visuelle ou 3D. L’interface doit évoquer une présence discrète et vivante, pas un tableau de bord encombré ni un chatbot classique.

La première cible de validation est l’expérience iPhone via une PWA installable. L’architecture doit pouvoir évoluer vers des applications natives et une expérience ordinateur synchronisée, sans prétendre que ces intégrations existent avant leur validation.

## 2. Principes non négociables
1. **Voix prioritaire :** parler à ARIA est le parcours principal. L’écrit et la transcription sont des alternatives facultatives, jamais la structure permanente de l’accueil.
2. **Honnêteté d’exécution :** ARIA distingue clairement ce qu’elle sait, ce qu’elle suppose, ce qu’elle peut faire et ce qu’elle a réellement exécuté. Une action n’est confirmée qu’après retour positif de l’outil ou du service.
3. **Autonomie intellectuelle :** favoriser curiosité, pensée critique, honnêteté et exploration. Aucun sujet ne doit être interdit par principe uniquement parce qu’il est controversé, intime ou dérangeant. Les limites portent sur les préjudices réels, l’exploitation, les atteintes aux droits fondamentaux et les actions dangereuses ou non autorisées.
4. **Contrôle utilisateur :** l’utilisateur décide de la mémoire, des permissions, du niveau de proactivité et des actions externes. Les préférences sont modifiables et réinitialisables.
5. **Confidentialité par défaut :** mémoire personnelle vierge au démarrage de cette version; aucune collecte implicite de souvenirs. Les clés et secrets de fournisseur restent côté serveur.
6. **Discrétion et fluidité :** interface sans bordures lourdes, sans accumulation de menus et sans boutons massifs permanents. Les contrôles apparaissent au bon moment.
7. **Accessibilité et robustesse :** états visibles, commandes d’arrêt, gestion des erreurs, prise en compte de prefers-reduced-motion, adaptation mobile et solution de repli lorsque la voix n’est pas disponible.

## 3. Interaction et première rencontre
### 3.1 Parcours principal
- À l’ouverture, ARIA se présente par une présence visuelle calme et une invitation claire à commencer la rencontre.
- Après autorisation explicite du microphone, l’utilisateur peut parler naturellement.
- ARIA indique visuellement et oralement les états utiles : présence, écoute, réflexion, réponse, initiative, attention et indisponibilité.
- L’utilisateur peut interrompre la parole ou mettre l’écoute en pause à tout moment.
- La transcription est désactivée ou discrète par défaut et peut être affichée/masquée à la demande.
- Si le navigateur ne prend pas en charge la reconnaissance vocale, ARIA l’explique sans simuler une écoute fonctionnelle et propose une solution de repli.

### 3.2 Première rencontre — une seule fois
La première rencontre est une séquence d’accueil et de configuration, jouée une seule fois après validation, sauf demande explicite de recommencer. Elle doit :
1. présenter ARIA et ses capacités sans promesse excessive;
2. expliquer les états de l’orbe et la façon d’interrompre ARIA;
3. recueillir le style de réponse (court, équilibré, détaillé);
4. recueillir la préférence d’humour;
5. recueillir le degré d’initiative (discret, équilibré, proactif);
6. demander séparément le consentement à proposer ou enregistrer des souvenirs;
7. préciser que tous ces choix peuvent être modifiés plus tard.

Les questions doivent être comprises même si l’utilisateur répond librement. Une réponse ambiguë ne doit pas être traitée comme un consentement positif. L’utilisateur peut passer une question; aucune option de mémoire ne doit autoriser l’enregistrement automatique sans contrôle explicite.

### 3.3 Écoute et disponibilité
- L’écoute continue n’est activée que si la plateforme le permet, après autorisation explicite et avec un indicateur compréhensible.
- Ne jamais promettre l’écoute en arrière-plan sur iOS : les navigateurs et le système peuvent suspendre la reconnaissance.
- L’état de microphone doit être visible; la pause et l’arrêt doivent rester accessibles.
- Une interruption utilisateur doit annuler la synthèse vocale et arrêter toute reprise automatique.
- Prévoir les états de permission refusée, réseau indisponible, reconnaissance non prise en charge et fournisseur IA indisponible.

## 4. Interface HUD
### 4.1 Orbe et identité
- L’orbe est un élément visuel expressif, **pas un bouton de commande**. Les commandes explicites sont accessibles par des contrôles discrets et correctement nommés.
- Les animations reflètent l’état réel : présence calme, écoute réactive, réflexion, parole, initiative, attention et erreur/indisponibilité.
- Esthétique sombre, épurée, lumineuse avec retenue; éviter les textures chargées, les panneaux opaques et les effets qui nuisent à la lecture.
- Le symbole ARIA doit rester cohérent entre l’application et les supports de présentation.

### 4.2 Transition immersive via le logo
Lorsqu’une visualisation est demandée, la caméra doit pouvoir effectuer une transition cinématique naturelle : approche du symbole-logo, passage à travers son centre, puis ouverture sur la scène demandée (globe, carte, lieu, objet, mécanisme ou modèle scientifique). Le retour à l’espace principal suit le mouvement inverse ou une transition tout aussi fluide. Cette transition est une exigence d’expérience, pas un effet à déclencher sur chaque réponse textuelle. Elle ne doit pas empêcher le retour arrière, le zoom manuel ou les commandes d’accessibilité.

### 4.3 Disposition
- Le contenu de visualisation 3D occupe le centre de l’écran et constitue la scène principale.
- Les widgets latéraux sont contextuels, compacts, translucides et fermables; ils apportent des détails, sources, paramètres ou étapes sans remplacer la scène centrale.
- Sur iPhone, les panneaux se replient en tiroirs ou cartes accessibles sans masquer durablement la visualisation.
- Pas de barre de navigation permanente chargée ni d’onglets pour chaque fonction. Les paramètres, la mémoire et les commandes système restent accessibles; les autres fonctions sont invoquées contextuellement.
- Les commandes de conversation doivent être intégrées au HUD, discrètes et compatibles avec le parcours vocal.

## 5. Conversation et personnalité
- Conversation naturelle, cohérente et contextuelle, avec réponses structurées quand le sujet le nécessite.
- Persona d’ARIA : chaleureuse, élégante, complice, vive et parfois sarcastique, sans humour forcé ni ton corporatif. Elle tutoie l’utilisateur dans sa propre persona.
- L’assistant doit pouvoir approfondir, clarifier une demande ambiguë, signaler l’incertitude et proposer des prochaines étapes utiles.
- Le texte est un canal secondaire disponible pour la consultation, la correction et l’accessibilité.
- L’historique de session peut exister en mémoire vive. Sa persistance et sa synchronisation doivent être explicites, contrôlées et documentées.

## 6. Mémoire personnelle
- La mémoire personnelle est **vierge par défaut** dans le parcours de réinitialisation de cette version.
- La mémoire est séparée de l’historique de conversation.
- L’utilisateur peut consulter, ajouter, corriger et supprimer chaque souvenir, ou demander une purge complète.
- Le consentement à utiliser la mémoire est explicite; une préférence de mémoire ne vaut pas consentement à enregistrer automatiquement tout échange.
- Afficher distinctement l’état local et l’état distant. Une suppression locale ne signifie pas que la copie distante a été supprimée.
- La purge distante exige une réponse serveur confirmant le résultat. En cas d’échec ou d’incertitude, l’interface le dit clairement et ne prétend pas que tout a été effacé.
- Les données distantes doivent être isolées par identité utilisateur et protégées par authentification individuelle avant tout accès public. Le jeton alpha partagé ne convient qu’à un test fermé et temporaire.

## 7. Moteurs fonctionnels
### 7.1 Voice Engine
Reconnaissance vocale, synthèse vocale, interruption, pause/reprise, gestion des permissions, langues et états vocaux. La compatibilité réelle est validée par navigateur et appareil.

### 7.2 Conversation Engine
Orchestration du contexte, conversation avec un modèle réel via backend, gestion des erreurs, limitation de contexte et absence de faux succès. Aucune clé fournisseur dans le frontend.

### 7.3 Initiative Engine
Interventions proactives selon le niveau choisi. Toute notification ou interruption doit être pertinente, réglable et non intrusive. Les actions externes importantes nécessitent une confirmation adaptée au risque.

### 7.4 Memory Engine
Consentement, lecture, écriture, modification, suppression, synchronisation et audit du résultat. Mémoire locale et distante identifiées séparément.

### 7.5 Action Engine
Outils pour recherche, organisation, applications et appareils, avec permissions explicites, validation des entrées, retours d’exécution et journalisation utile. Une commande vocale ne doit pas exécuter une action sensible sans garde-fou approprié. Le contrôle ordinateur/téléphone n’est pas considéré comme implémenté tant qu’un adaptateur réel n’a pas été connecté et testé.

### 7.6 Visual Engine
Scènes interactives au centre : globe et carte, lieux, relief, objets, mécanismes, modèles scientifiques et autres visualisations pertinentes. Distinguer maquette visuelle, modèle manipulable, données réelles et visualisation temps réel. Les sources, unités, contraintes physiques et limites sont présentées quand elles comptent.

### 7.7 Onboarding Engine
Première rencontre vocale unique, choix compréhensibles, consentement explicite, sauvegarde après validation et possibilité de relancer manuellement.

## 8. Architecture et sécurité
- Frontend PWA adapté iPhone, service worker et cache versionné.
- Backend isolé pour modèle et outils; secrets conservés dans les variables serveur.
- En alpha, l’accès partagé est limité à des testeurs identifiés, révocable et non présenté comme une authentification publique.
- Avant lancement public : authentification individuelle, autorisation par utilisateur pour chaque ressource mémoire, protection contre l’abus, limites de coût et de débit, validation des origines/CORS, erreurs non sensibles et procédure de récupération de compte.
- Aucune donnée personnelle codée en dur dans le prompt ou le dépôt.
- Les actions externes, les appels réseau et les suppressions doivent être vérifiables.
- Aucun déploiement ou changement de production n’est considéré réalisé sans preuve observable.

## 9. Critères d’acceptation
1. L’accueil ne présente pas de chat écrit permanent; l’orbe n’est pas cliquable comme un bouton.
2. Le parcours vocal, les permissions, l’arrêt et les erreurs sont explicites.
3. La première rencontre se joue une seule fois et ne se relance que sur demande.
4. La transcription est facultative.
5. La mémoire démarre vide et son consentement n’est jamais supposé.
6. La suppression locale et distante est distinguée, et les échecs sont annoncés honnêtement.
7. Les secrets ne sont pas inclus dans les fichiers publics.
8. Le moteur distant est testé de bout en bout; une CI verte seule ne prouve pas la disponibilité du fournisseur IA.
9. La visualisation centrale et les widgets contextuels sont responsive, et les états visuels respectent la réduction des animations.
10. Le zoom à travers le logo est intégré comme transition de visualisation, avec retour et commandes accessibles.
11. Toute capacité non connectée est clairement indiquée comme maquette ou en attente.
12. Aucun déploiement public ni fusion n’est fait avant revue des critères critiques.

## 10. Priorités de réalisation
- **P0 — Intégrité et sécurité :** mémoire vierge, purge vérifiable, secrets côté serveur, état réel des capacités, pas de faux succès.
- **P1 — Boucle vocale :** démarrer, écouter, comprendre, répondre à voix haute, interrompre et gérer les erreurs.
- **P2 — Première rencontre :** onboarding unique, consentement mémoire et préférences sauvegardés correctement.
- **P3 — HUD :** orbe expressive non interactive, scène centrale, widgets contextuels, responsive et accessibilité.
- **P4 — Conversation et mémoire distantes :** authentification, conversation réelle, mémoire contrôlée, tests de bout en bout.
- **P5 — Visualisations :** première scène réellement manipulable, transition immersive logo↔scène, distinction entre démo et données réelles.
- **P6 — Actions et extension :** recherche, missions, automatisations, intégrations iPhone/ordinateur et publication après validations de sécurité.

## 11. État de la référence au 20 octobre 2026 — suivi d’implémentation
Le cahier des charges ci-dessus reste la source normative; cet état ne remplace pas les critères d’acceptation.

La branche `feat/aria-voice-first-onboarding` contient :
- un socle vocal prioritaire et une première rencontre conversationnelle;
- un consentement mémoire explicite, une mémoire désactivée par défaut et des retours de purge/synchronisation exigeant une confirmation serveur;
- un protocole d’intention structuré (`reply`, `action`, `scene`) généré par le modèle, validé côté Worker et limité à des actions d’interface autorisées;
- des widgets contextuels, une transition immersive logo↔scène et un globe WebGL local manipulable;
- des tests automatisés de syntaxe, de consentement mémoire, de purge, d’intentions et de rendu de scène.

Restent non validés ou incomplets : configuration du binding de sessions individuelles en staging, tests du fournisseur réel de bout en bout, tests Safari/PWA sur iPhone physique, données géographiques fiables, visualisations métier 3D et intégrations Action Engine. Une lecture en mode consultation de la configuration Cloudflare le 20 octobre 2026 confirme que le Worker déployé possède `ARIA_ACCESS_TOKEN`, `OPENAI_API_KEY` et `ARIA_MEMORY`, mais ne présente pas encore de binding `ARIA_USERS` ni de variable `ARIA_REQUIRE_INDIVIDUAL_AUTH`; le staging reste donc en mode alpha partagé. Le endpoint `/health` distingue désormais le mode d’authentification alpha du mode individuel et calcule `configured` à partir des bindings/secrets requis par le mode choisi; un test automatisé couvre le mode individuel sans jeton partagé. Cette correction décrit la configuration du code, pas la validation d’un jeton de testeur ni la disponibilité réelle du fournisseur. Aucune configuration Cloudflare ni aucun déploiement n’a été modifié. Le Worker contient désormais le support de jetons alpha individuels et de mémoire isolée par identité, mais ce mode n’est pas considéré actif tant que la configuration et les tests de staging ne l’ont pas confirmé. L’inscription vérifiée et la récupération de compte restent absentes; aucun lancement public n’est autorisé. La branche n’est pas fusionnée dans `main`. Voir `docs/ARIA_AUDIT_2026-10-20.md`, `docs/ALPHA_AUTH_PROVISIONING.md` et `docs/TEST_PLAN_IPHONE_ALPHA.md` pour le suivi détaillé.


## 12. Point de contrôle staging — 20 octobre 2026 (mise à jour)
- Le namespace Cloudflare KV `ARIA_USERS_STAGING` a été créé (ID `9f1d1da82c0246b0b19b8c20fa93e55a`), mais il est vide et n’est pas lié au Worker.
- Le Worker actuellement déployé utilise toujours l’authentification alpha partagée. Le code individuel présent dans la branche Git n’est pas encore déployé en staging.
- Aucun jeton individuel n’a été généré ni provisionné. Aucun secret existant n’a été supprimé et aucun réglage du Worker n’a été modifié.
- **Interdiction de basculer** `ARIA_REQUIRE_INDIVIDUAL_AUTH=true` tant que le code compatible n’est pas déployé, que le binding `ARIA_USERS` n’est pas lié et que le endpoint de santé n’a pas confirmé la configuration; cette séquence évite un verrouillage d’accès.
- Séquence exigée : déployer le code compatible en préservant les bindings et secrets existants → lier le namespace → vérifier `/health` → créer un jeton individuel à durée limitée et stocker uniquement son hash dans KV → tester l’isolement des sessions et le rejet des accès non autorisés → seulement ensuite désactiver l’authentification partagée si les tests sont concluants.
- Le déploiement via l’API Cloudflare n’a pas pu être exécuté avec les outils disponibles lors de ce contrôle. L’état de sécurité reste **non validé pour les testeurs**; pas de lancement public. La PR reste ouverte en brouillon et `main` n’a pas été modifiée.


## 13. Point de contrôle staging — 20 octobre 2026, 17:45 CEST
Le staging a progressé depuis le point de contrôle précédent :
- Le code Worker de `cloudflare/aria-brain-staging.mjs` (blob Git `89cdd33a5e87deedcbcfa3692339c6550a6ce7ce`) a été déployé via l’endpoint Cloudflare de remplacement du contenu, qui ne modifie pas la configuration.
- Le binding KV `ARIA_USERS` est lié au namespace `ARIA_USERS_STAGING` (`9f1d1da82c0246b0b19b8c20fa93e55a`). Les bindings `AI`, `ARIA_MEMORY` et les secrets existants `ARIA_ACCESS_TOKEN` / `OPENAI_API_KEY` ont été conservés; cela a été confirmé par une lecture de configuration après mise à jour.
- Un jeton alpha individuel aléatoire a été provisionné avec une expiration KV de 7 jours. Seul le hash SHA-256 est stocké sous `session:v1:<hash>`; l’identité associée est opaque. Le jeton brut n’est pas consigné dans le dépôt ni dans les documents.
- `ARIA_REQUIRE_INDIVIDUAL_AUTH=true` est maintenant configuré. Le déploiement actif version 24 (ID `cfe2d049-56ec-4c57-8355-7701d25e06c3`) contient le code et les bindings attendus.
- Le stockage du mapping jeton→identité a été vérifié via l’API KV. En revanche, l’appel réel à `/health`, le rejet du jeton partagé, l’accès au jeton individuel via HTTP et l’isolation mémoire entre deux comptes n’ont pas encore été validés de bout en bout. Ne pas annoncer ces tests comme réussis.
- Le staging est en mode individuel mais reste **en validation technique**. Ne pas supprimer le secret partagé avant les tests HTTP et la préparation d’un retour arrière. Aucun lancement public; PR toujours en brouillon; `main` inchangée.
