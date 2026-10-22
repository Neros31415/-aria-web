# ARIA — Feuille de route jusqu’à l’Apple App Store
**Version du document :** 1.2  
**Date de référence :** 22 octobre 2026  
**Périmètre :** ARIA iOS, depuis l’état actuel du projet jusqu’à une première version publique approuvée sur l’App Store.  
**Statut :** plan d’exécution proposé — les jalons ne sont pas réputés accomplis tant que leurs critères de sortie n’ont pas été vérifiés.

## 1. Objectif de livraison

Livrer une première application iPhone ARIA utile, stable, sécurisée et conforme, centrée sur une interaction vocale naturelle, un HUD discret, une mémoire contrôlée par l’utilisateur et un backend IA sécurisé. Cette version doit être un vrai produit iOS, pas seulement un site web emballé dans une coquille.

**Cible initiale :** une version publique iOS limitée mais fiable (« ARIA iOS 1.0 »).  
**Estimation de planification révisée :** au minimum 6 à 12 mois de travail soutenu, potentiellement davantage selon la taille réelle de l’équipe, les intégrations tierces, la validation des capacités 3D/PC, la sécurité, la conformité et les retours Apple. Cette estimation est indicative et non une date garantie. Le périmètre complet demandé augmente fortement l’effort par rapport à une première version limitée.

### Inclus dans ARIA 1.0 — périmètre complet
- Onboarding, interaction vocale prioritaire, chat texte de secours, HUD, accessibilité et paramètres.
- Comptes individuels, rôles, Super Admin protégé, gestion des clés d’accès privées pour les proches, offres et droits vérifiés côté serveur.
- Mémoire persistante contrôlée, historique, correction, export et suppression des données et du compte.
- Compréhension d’intention, planification multi-étapes, continuité/reprise de tâches, exécution d’outils autorisés et vérification des résultats.
- Registre de compétences versionnées, tests, permissions strictes et retour arrière.
- Mémoire des décisions, hypothèses, options et raisons.
- Proactivité configurable, ordonnanceur opérationnel, notifications, périodes silencieuses, déduplication et désactivation.
- Abstraction fournisseur IA, gestion des indisponibilités, quotas et coûts.
- Profil professionnel, offres gratuites/premium, paiements et gestion complète des abonnements si une offre payante est proposée ; la gestion des droits, paiements, renouvellements, annulations, restaurations et états d’échec fait partie du périmètre de lancement.
- Inscription newsletter facultative et désinscription.
- Site web associé cohérent : HTTPS, API côté serveur, pages RGPD/CGU, cookies lorsque requis, SEO, métadonnées et support.
- Modules de visualisation 3D et God’s Eye View prévus par le cahier des charges, avec données réelles/simulées clairement distinguées, provenance, limites, sécurité des échanges et transition immersive via le logo.
- Application compagnon PC, appairage sécurisé, commandes explicitement autorisées, révocation d’appareil et échanges chiffrés.
- Observabilité, tests de sécurité, tests d’acceptation, sauvegardes, support et procédure de gestion d’incident.

### Hors périmètre permanent ou interdit par défaut
- Écoute microphone cachée ou permanente sans activation et indication explicites.
- Contrôle arbitraire et non autorisé d’un appareil, élévation automatique de privilèges ou exécution d’action sensible sans confirmation requise.
- Présentation d’une simulation comme une donnée réelle, ou d’une action comme réussie sans preuve.
- Toute fonction dont les garanties de sécurité, les droits, les données, les coûts ou la conformité ne sont pas établis. Elle ne peut être activée qu’après résolution du blocage et validation formelle.

**Principe de livraison :** toutes les familles fonctionnelles décrites dans le cahier des charges sont ciblées pour ARIA 1.0. Elles peuvent être livrées en plusieurs incréments internes, mais aucune n’est automatiquement repoussée à une version publique ultérieure. La version App Store ne sortira que lorsque les critères de chaque famille activée et annoncée seront satisfaits.

## 2. État de départ et risques connus

Le socle ARIA Web V0.7 est une PWA avec interface mobile, conversation locale et mémoire sur l’appareil. Des branches séparées contiennent des travaux sur l’interface vocale/HUD, le Worker de staging, la validation d’entrées et l’architecture d’authentification individuelle. Ces branches ne sont pas équivalentes à une version livrée sur `main`, ni à une application iOS signée et distribuable.

Bloqueurs à lever avant une distribution multi-utilisateur :
1. Le jeton partagé de l’alpha ne doit pas être distribué aux utilisateurs.
2. Un identifiant fourni par le navigateur ne constitue pas une identité authentifiée.
3. La mémoire serveur doit être isolée côté serveur par identité vérifiée.
4. La configuration d’authentification, les tests d’isolation et les chemins d’effacement doivent être réellement exécutés.
5. La disponibilité et l’état de production du backend doivent être validés séparément du staging.
6. Une application native iOS doit être compilée, signée et testée sur appareil réel. Il faut prévoir un accès à macOS/Xcode (Mac disponible ou service CI macOS adapté) et un compte Apple Developer pour la distribution.

## 3. Principes de livraison

- Développer sur des branches dédiées et utiliser des PR ; ne pas pousser directement sur `main` sans revue.
- Ne jamais déployer en production ni activer une facturation sans autorisation explicite.
- Une PR fusionnée, une CI verte ou un document ne prouvent pas à eux seuls qu’un parcours fonctionne sur iPhone.
- Les secrets ne doivent jamais être stockés dans le dépôt, le bundle iOS, le stockage local non sécurisé ou les journaux.
- Toute fonctionnalité a des critères d’acceptation et des tests reproductibles.
- Toute action est rapportée comme « réussie » uniquement si un résultat vérifiable le confirme.
- Les fonctions non livrées sont étiquetées comme prototypes ou retirées de l’interface publique.
- Chaque phase se termine par une décision explicite : poursuivre, corriger ou réduire le périmètre.

## 4. Phases et jalons

### Phase 0 — Cadrage du produit et inventaire technique
**Durée indicative :** 3 à 5 jours  
**Priorité :** P0

**Travail**
1. Geler le périmètre 1.0 décrit ci-dessus.
2. Examiner les PR ouvertes et classer chaque changement : à intégrer, à corriger, à reporter ou à abandonner.
3. Établir un tableau de traçabilité entre exigences du cahier des charges, fichiers/code, tests et statut réel.
4. Définir les environnements dev, staging et production, leurs domaines, secrets et responsabilités.
5. Définir la cible iOS minimale, les langues initiales et la politique de compatibilité.
6. Vérifier la disponibilité d’un Mac/Xcode ou d’un service de build macOS ; déterminer qui détiendra le compte Apple Developer et les certificats.
7. Définir les indicateurs de lancement : taux de crash, réussite du parcours vocal, latence, erreurs backend, incidents de sécurité et demandes de suppression.

**Critères de sortie**
- Périmètre 1.0 approuvé et non ambigu.
- Matrice exigences → implémentation → tests créée.
- Aucun secret de production dans les sources ou les logs.
- Chemin de build/signature iOS confirmé, ou blocage explicite documenté.

### Phase 1 — Sécuriser le backend et l’identité
**Durée indicative :** 1 à 3 semaines  
**Priorité :** P0 — bloqueur de toute bêta ouverte

**Travail**
1. Revoir les changements de validation du Worker et les tests associés ; ne pas confondre validation d’entrée et authentification.
2. Choisir et configurer une solution d’identité individuelle supportée.
3. Vérifier les jetons côté serveur : expiration, audience, révocation, absence de jetons partagés entre utilisateurs.
4. Dériver l’identifiant propriétaire depuis le contexte d’authentification validé côté serveur, jamais depuis un champ client.
5. Protéger chaque route API et vérifier l’autorisation sur chaque ressource.
6. Isoler les données de mémoire par compte et appliquer le principe du moindre privilège.
7. Ajouter quotas, limites de taille, limites de fréquence, délais d’expiration et réponses d’erreur génériques sans secrets.
8. Séparer clairement les environnements staging et production.
9. Ajouter journalisation minimale avec identifiant de corrélation, sans enregistrer les clés API, jetons ou conversations privées complètes.
10. Définir sauvegarde, rétention, suppression et procédure de réponse à incident.

**Tests obligatoires**
- Jeton absent, invalide, expiré ou révoqué.
- Tentative de lire, modifier ou supprimer la mémoire d’un autre compte.
- Identité ou propriétaire falsifié dans le corps de requête.
- Consentement mémoire désactivé.
- Stockage indisponible, timeout, requête trop volumineuse et origine non autorisée.
- Suppression d’un compte et de ses données associées.
- Vérification que les clés du fournisseur ne sont pas accessibles depuis le client ou le dépôt.

**Critères de sortie**
- Tous les tests de sécurité critiques passent.
- Isolation inter-comptes démontrée par des tests reproductibles.
- Aucun jeton partagé requis par le parcours utilisateur.
- Aucun secret exposé.
- Revue du Worker et du contrat API documentée.

### Phase 2 — Consolider l’expérience vocale et le HUD
**Durée indicative :** 1 à 2 semaines  
**Priorité :** P0

**Travail**
1. Revoir et intégrer progressivement les éléments pertinents de la branche vocale dans une branche de livraison.
2. Définir les états visibles : prêt, écoute, transcription, réflexion, réponse, interruption, erreur et hors ligne.
3. Exiger une action explicite pour commencer l’écoute et fournir une indication visuelle/audible quand le microphone est actif.
4. Gérer autorisation microphone refusée, reconnaissance vocale indisponible, réseau coupé et annulation.
5. Ajouter une alternative texte complète, sans forcer l’accès au microphone.
6. Tester le français réel : accents, bruit ambiant, noms propres, phrases longues et correction de transcription.
7. Garder les animations légères et le HUD discret ; vérifier lisibilité, VoiceOver, tailles de texte et contraste.
8. Garder toute visualisation fictive explicitement identifiée comme démo.

**Critères de sortie**
- Un parcours vocal complet fonctionne sur iPhone physique.
- Le microphone peut être arrêté immédiatement et son état est toujours visible.
- Le mode texte reste utilisable sans permission microphone.
- Pas de boucle de lecture, de requête dupliquée ni de réponse annoncée comme reçue avant confirmation serveur.
- Les erreurs sont compréhensibles et récupérables.

### Phase 3 — Créer le client iOS distribuable
**Durée indicative :** 2 à 4 semaines  
**Priorité :** P0

**Orientation**
Privilégier une application iOS native SwiftUI pour une expérience robuste du microphone, de l’audio, des permissions, de l’accessibilité et des comportements système. Réutiliser les contrats API et la logique métier documentée ; ne pas copier mécaniquement le site dans une WebView. La PWA peut rester le canal de test web.

**Travail**
1. Créer un projet iOS versionné et reproductible, avec configuration dev/staging/prod.
2. Construire les écrans essentiels : première rencontre, conversation, historique, mémoire, paramètres, confidentialité/aide.
3. Implémenter le client API avec TLS, gestion de session, erreurs et délais.
4. Stocker les jetons de session dans Keychain ; ne pas embarquer de clé de fournisseur IA.
5. Implémenter les permissions microphone et reconnaissance vocale avec des textes d’usage précis.
6. Ajouter la gestion du cycle de vie : suspension, reprise, interruption audio, changement réseau et fermeture de session.
7. Ajouter une page de suppression de compte dans l’application si la création de compte est prise en charge.
8. Ajouter version/build, environnement et signalement d’erreur sans données privées inutiles.
9. Configurer icône, lancement, liens profonds si nécessaires et identité visuelle cohérente.
10. Documenter la compilation locale/CI, la signature et la procédure de publication.

**Critères de sortie**
- Build iOS signé pour un environnement de test.
- Installation et parcours complet testés sur un iPhone réel.
- Pas de secret fournisseur dans le bundle.
- Toutes les permissions sont demandées au bon moment, avec justification compréhensible.
- L’application apporte une utilité propre à iOS, pas seulement l’affichage d’un site.

### Phase 4 — Mémoire, historique et contrôles du compte
**Durée indicative :** 1 à 2 semaines  
**Priorité :** P0/P1

**Travail**
1. Distinguer historique de conversation, préférences et souvenirs persistants.
2. Obtenir un consentement compréhensible avant d’activer la mémoire serveur.
3. Fournir des écrans pour voir, corriger et supprimer les souvenirs.
4. Signaler le résultat réel de chaque opération ; ne jamais afficher « supprimé » si le serveur n’a pas confirmé.
5. Gérer les conflits entre stockage local et serveur et les erreurs de synchronisation.
6. Implémenter fermeture de session, suppression du compte et suppression des données associées.
7. Définir l’export des données personnelles ou une procédure de demande d’accès conforme au périmètre légal.
8. Éviter de stocker les données sensibles qui ne sont pas nécessaires.

**Critères de sortie**
- Tests de consultation, correction, consentement, synchronisation et suppression passent.
- Les données de deux comptes restent totalement séparées.
- L’utilisateur comprend ce qui est local, distant et transmis à un fournisseur IA.

### Phase 5 — Boucle d’intention et qualité des réponses
**Durée indicative :** 1 à 3 semaines  
**Priorité :** P1

**Travail**
1. Définir le contrat de réponse structuré : réponse textuelle, intention, action proposée, statut, preuve et éventuelle confirmation requise.
2. Séparer compréhension, planification, autorisation, exécution et vérification.
3. Refuser les actions inconnues ou malformées côté serveur.
4. Ajouter une bibliothèque de scénarios de test en français : demandes simples, ambiguës, impossibles, longues et multi-étapes.
5. Mesurer pertinence, exactitude, latence et taux d’échec ; comparer les changements de prompt/modèle sur les mêmes scénarios.
6. Définir les limites de l’assistant et le comportement en cas d’incertitude.
7. Ne pas exposer d’actions système sensibles dans la 1.0 tant que les permissions et la vérification ne sont pas éprouvées.

**Critères de sortie**
- Les scénarios critiques ont des résultats attendus et sont reproductibles.
- Les échecs, incertitudes et indisponibilités sont signalés honnêtement.
- Aucune action sensible ne s’exécute sans contrôle requis.

### Phase 5B — Capacités avancées, compagnon PC et visualisations
**Durée indicative :** 4 à 10 semaines, à ajuster après prototype et tests de faisabilité  
**Priorité :** P0 — fait partie du périmètre de lancement

**Travail**
1. Implémenter l’état de tâche durable : objectif, plan, étape, dépendances, résultats vérifiés, prochaine action, permissions et reprise après interruption.
2. Créer le registre des compétences versionnées avec schémas, permissions, tests reproductibles, revue, versionnement et rollback.
3. Implémenter la mémoire des décisions en distinguant choix explicites, hypothèses, options et raisons, avec consultation et correction.
4. Construire l’ordonnanceur de proactivité, les déclencheurs autorisés, les préférences de fréquence, les périodes silencieuses, la déduplication et l’arrêt immédiat.
5. Construire l’abstraction fournisseur IA et vérifier le comportement en cas de timeout, quota, indisponibilité et changement d’adaptateur.
6. Implémenter le compagnon PC : appairage, identité de l’appareil, chiffrement, permissions granulaires, liste des appareils, révocation et état de connexion.
7. Exposer uniquement les commandes PC autorisées, avec confirmation pour les opérations sensibles et vérification indépendante du résultat.
8. Implémenter les modules de visualisation 3D/God’s Eye View prévus, les contrats d’échange, la provenance des données, les unités, les états de chargement/erreur et la distinction visible entre données réelles, simulées et démonstrations.
9. Intégrer la transition immersive via le logo comme navigation, avec annulation et retour accessible à l’interface principale.
10. Tester les capacités sur les appareils cibles, les limites de performances, la consommation, les pertes réseau, les erreurs de données et les accès non autorisés.

**Critères de sortie**
- Les tâches peuvent être interrompues et reprises sans rejouer aveuglément une action incertaine.
- Les compétences sont versionnées, testées, limitées par permissions et réversibles.
- Les décisions sont consultables et ne transforment pas des inférences en faits explicitement décidés par l’utilisateur.
- La proactivité respecte les autorisations, les plages silencieuses et les limites de fréquence.
- Le compagnon PC ne permet aucun contrôle arbitraire ; l’appairage et la révocation ont passé leurs tests.
- Les visualisations indiquent la provenance et le statut des données ; les échanges inter-modules sont validés.
- Les fonctions prévues dans cette phase sont testées de bout en bout et disponibles dans le build candidat.

### Phase 6 — Conformité juridique, confidentialité et monétisation
**Durée indicative :** 1 à 3 semaines, en parallèle des phases 3 à 5  
**Priorité :** P0 avant soumission

**Travail**
1. Publier une politique de confidentialité accessible depuis l’application et les métadonnées App Store.
2. Finaliser les CGU, les coordonnées de contact et la description du service.
3. Expliquer les données collectées, finalités, durées de conservation, fournisseurs IA, transferts, droits, consentement et suppression.
4. Vérifier le RGPD : base légale, minimisation, demandes de droits, sous-traitants, contrats et transferts internationaux pertinents.
5. Ajouter une bannière/gestion des cookies sur le site web quand elle est applicable ; ne pas transposer mécaniquement une bannière web à l’application native.
6. Rédiger les descriptions d’usage du microphone et de la reconnaissance vocale.
7. Remplir les déclarations de confidentialité App Store Connect à partir des pratiques réelles et des SDK effectivement utilisés.
8. Si les comptes sont créables dans l’app, intégrer la suppression du compte dans l’app.
9. Si une connexion tierce est utilisée pour le compte principal, vérifier si les règles Apple imposent une option de connexion équivalente, notamment Sign in with Apple.
10. Si une offre premium est proposée dans l’application, définir et implémenter le parcours de paiement conforme aux règles Apple applicables ; ne pas lancer un écran d’abonnement factice.
11. Préparer les conditions d’abonnement, prix, renouvellement, annulation et restauration des achats si applicables.
12. Vérifier droits sur le nom ARIA, le logo, les polices, les illustrations, les sons et toutes les ressources.

**Critères de sortie**
- Tous les liens légaux fonctionnent et reflètent les traitements réellement en place.
- Déclarations de confidentialité cohérentes avec le code et les SDK.
- Consentement, retrait, suppression et contact de support testés.
- Si les offres payantes font partie du lancement, leur parcours de paiement est entièrement fonctionnel, testé et conforme ; sinon, les offres payantes ne doivent pas être annoncées dans la V1.0.

### Phase 7 — Tests internes et bêta TestFlight
**Durée indicative :** 1 à 3 semaines  
**Priorité :** P0

**Travail**
1. Mettre en place CI : lint/format si configurés, tests unitaires, tests API et compilation iOS.
2. Définir une matrice d’appareils et de versions iOS réellement prises en charge.
3. Tester installation neuve, mise à jour, connexion, déconnexion, permissions refusées, mode avion, réseau faible, timeout, backend indisponible et fermeture forcée.
4. Tester les sessions longues, les interruptions audio, la consommation batterie et la latence.
5. Tester VoiceOver, Dynamic Type, contraste et navigation sans geste complexe.
6. Faire une bêta privée d’abord, puis élargir à un groupe de testeurs via TestFlight.
7. Collecter des retours structurés : tâche tentée, résultat attendu, résultat observé, appareil/iOS, gravité et reproduction.
8. Corriger les blocages et réexécuter la suite de tests après chaque correction.
9. Préparer une procédure de désactivation du backend et une procédure de rollback applicatif si un incident survient.

**Critères de sortie**
- Aucun crash bloquant connu sur les appareils ciblés.
- Aucun défaut critique d’authentification, d’isolation ou de suppression.
- Parcours vocal et texte fonctionnels de bout en bout.
- Retours bêta triés et bugs bloquants fermés.
- Build candidat identifié par numéro et commit exact.

### Phase 8 — Préparation App Store Connect
**Durée indicative :** 3 à 7 jours  
**Priorité :** P0

**Travail**
1. S’inscrire au programme Apple Developer avec le titulaire approprié et accepter les accords requis.
2. Créer la fiche app dans App Store Connect, l’identifiant de bundle et les profils de signature nécessaires.
3. Préparer nom, sous-titre, description, catégorie, âge, mots-clés et captures d’écran de l’application réelle.
4. Ajouter l’URL de politique de confidentialité et une URL d’assistance avec contact valide.
5. Remplir les déclarations de confidentialité, les informations de collecte, les droits de contenu et les questions de classification.
6. Fournir un compte de démonstration ou un mode de démonstration complet pour la revue, sans exposer de données personnelles.
7. Rédiger les notes de revue décrivant la voix, le compte, la mémoire, les fournisseurs IA, les fonctionnalités premium et tout prérequis.
8. Vérifier que les serveurs sont disponibles et que les identifiants de revue fonctionnent.
9. Valider les captures sur appareils pris en charge et supprimer tous les placeholders.
10. Archiver le build final et conserver le lien entre build, commit, tests et déclarations.

**Critères de sortie**
- Fiche complète, exacte et cohérente avec le binaire.
- Tous les liens testés.
- Compte/mode de démonstration opérationnel.
- Aucun écran factice ni fonctionnalité annoncée mais absente.

### Phase 9 — Soumission, revue et publication
**Durée indicative :** variable, prévoir au moins une boucle de correction  
**Priorité :** P0

**Travail**
1. Envoyer le build à App Store Connect et vérifier le traitement automatique.
2. Soumettre pour revue avec les notes, comptes et explications nécessaires.
3. Répondre rapidement et précisément aux demandes de l’équipe App Review.
4. En cas de rejet, identifier la règle concernée, corriger le produit ou la fiche, exécuter les tests de non-régression puis soumettre un nouveau build si nécessaire.
5. Après approbation, publier manuellement ou programmer la sortie.
6. Vérifier la disponibilité effective sur le storefront cible et installer l’app depuis la fiche publique.
7. Surveiller les erreurs serveur, les crashs, les coûts IA et les retours utilisateurs dès la sortie.

**Critères de sortie**
- Statut Apple : approuvée et publiée, pas simplement « envoyée en revue ».
- App installable depuis l’App Store dans la région ciblée.
- Parcours réel vérifié sur une installation issue de la boutique.
- Plan de support et de correction actif.

## 5. Après le lancement — versions 1.1 et suivantes

Le périmètre fonctionnel du cahier des charges doit être livré dans la 1.0. Les versions suivantes sont réservées aux améliorations, à l’extension de capacité, aux optimisations et aux nouvelles fonctions qui ne sont pas déjà promises dans le cahier des charges. Elles ne servent pas à repousser les familles fonctionnelles listées dans la section 1 ou dans l’annexe A.

Exemples d’améliorations post-lancement : optimisation de latence/coût, nouveaux adaptateurs IA, nouvelles compétences après validation, extensions de visualisations, nouvelles intégrations PC et améliorations ergonomiques. Toute nouvelle fonction doit être distinguée des exigences de la 1.0 dans le backlog.

## 6. Tableau de pilotage

| ID | Jalon | Priorité | Dépendance | Preuve de fin |
|---|---|---|---|---|
| M0 | Périmètre et inventaire approuvés | P0 | Aucune | Matrice exigences/tests |
| M1 | Authentification et Worker sécurisés | P0 | M0 | Tests d’autorisation et d’isolation verts |
| M2 | Voix/HUD fiable | P0 | M1, contrat API | Test iPhone réel |
| M3 | Application iOS signée | P0 | M0–M2, macOS/Xcode | Build installé sur appareil |
| M4 | Mémoire et suppression maîtrisées | P0 | M1, M3 | Tests de consentement et suppression |
| M5 | Qualité des réponses et planification validées | P0 | M1–M4 | Suite de scénarios validée |
| M5B | Tâches, compétences, proactivité, décisions, 3D et compagnon PC livrés | P0 | M1–M5 | Tests d’intégration, de sécurité et appareils cibles |
| M6 | Conformité, offres et fiche terminées | P0 | M1–M5B | Checklist juridique/App Store et parcours commerciaux testés |
| M7 | Bêta TestFlight validée sur le périmètre complet | P0 | M1–M6 | Rapport de bêta, aucun blocage critique |
| M8 | App Store approuvé et publié | P0 | M7 | Fiche publique et installation vérifiée |

## 7. Règles de décision et conditions de lancement

**NO-GO** si l’un de ces points est vrai :
- jeton partagé nécessaire pour utiliser l’application ;
- possibilité de lire ou modifier la mémoire d’un autre compte ;
- secret fournisseur présent dans le client ou le dépôt ;
- suppression de compte/données annoncée mais non fonctionnelle ;
- microphone activé sans consentement et indication claire ;
- crash bloquant ou parcours principal inutilisable ;
- politique de confidentialité, liens de support ou déclarations App Store incomplets ;
- abonnement proposé mais paiement/restauration/annulation non fonctionnels ;
- application essentiellement une WebView sans valeur iOS suffisante ;
- capacités annoncées non présentes dans le binaire soumis.

**GO** uniquement après validation des critères des phases 1 à 8, revue finale de sécurité et tests de bout en bout sur iPhone réel.

## 8. Prochaine action concrète

Commencer par **M0 puis M1** : inventorier et comparer les PR ouvertes, décider des changements à intégrer, puis achever l’identité individuelle et les tests d’isolation mémoire. Ne pas ajouter de nouvelles fonctions ambitieuses avant d’avoir levé ce bloqueur. En parallèle, confirmer le chemin macOS/Xcode/signature afin qu’il ne retarde pas la création du client iOS natif.

## 9. Références Apple à revalider avant soumission

- App Review Guidelines : https://developer.apple.com/app-store/review/guidelines/
- App Review : https://developer.apple.com/app-store/review/
- Apple Developer Program : https://developer.apple.com/programs/

Les exigences Apple peuvent évoluer. Les règles de paiement, de connexion, de confidentialité et de distribution doivent être vérifiées à nouveau au moment de la soumission.


---

# ANNEXE A — Spécifications d’implémentation fonctionnelle détaillées
**Version :** 1.2 — spécification d’implémentation de la feuille de route App Store.  
**Règle :** cette annexe décrit le travail à réaliser et ses critères de validation. Elle ne signifie pas que les fonctionnalités sont déjà codées. Toutes les familles fonctionnelles du cahier des charges sont incluses dans la cible de livraison ARIA 1.0, avec un ordre d’intégration interne et des critères de blocage explicites.

## A1. Architecture cible et frontières de confiance

### A1.1 Composants
1. **Client iOS SwiftUI** : interface, audio au premier plan, état de session, navigation, paramètres et affichage des résultats. Aucun secret de fournisseur IA n’y est inclus.
2. **Client Web/PWA** : expérience web cohérente avec iOS ; appels à la même API publique et aux mêmes contrats, sans logique de sécurité faisant autorité dans le navigateur.
3. **API backend** : authentification, autorisation, validation des entrées, orchestration des requêtes, limites d’usage, mémoire, journal d’audit et accès aux fournisseurs IA.
4. **Stockage de données** : comptes/profils, préférences, conversations, souvenirs, tâches, décisions, clés d’accès et abonnements. Chaque donnée utilisateur doit être liée à une identité vérifiée.
5. **Adaptateur fournisseur IA** : interface interne indépendante du fournisseur, avec gestion des délais, erreurs, quotas, sortie structurée et annulation si prise en charge.
6. **Services de publication** : environnements de développement, staging et production isolés ; CI, tests, signature iOS et livraison App Store.

### A1.2 Règles non négociables
- Le client ne décide jamais de son propre rôle, de son identité propriétaire ou de ses droits premium.
- Toute permission est vérifiée côté serveur à chaque action protégée.
- Les secrets résident dans un gestionnaire de secrets ou une configuration serveur protégée, jamais dans Git, le bundle iOS ou les logs.
- Toutes les connexions réseau de production utilisent HTTPS/TLS ; les accès non sécurisés sont refusés ou redirigés au niveau de l’hébergement.
- Les réponses externes sont considérées comme non fiables : validation de schéma, échappement d’affichage et protection contre les injections dans les sorties d’outils.
- Les données sensibles ne sont pas journalisées par défaut.
- Chaque action possède un identifiant de corrélation et un état explicite ; un succès n’est déclaré qu’après preuve vérifiable.
- Toute modification de schéma de données est versionnée et accompagnée d’une migration réversible lorsque c’est raisonnablement possible.

### A1.3 Contrat d’API proposé
Le préfixe exact et les noms peuvent évoluer, mais les responsabilités doivent rester distinctes :
- `POST /v1/chat` : envoyer un message, recevoir une réponse structurée et son statut.
- `POST /v1/voice/transcription` ou intégration native équivalente : utiliser uniquement si la transcription passe par le backend ; documenter explicitement le fournisseur et le traitement audio.
- `GET /v1/me`, `PATCH /v1/me/preferences` : profil minimal et préférences.
- `GET /v1/conversations`, `POST /v1/conversations`, `GET /v1/conversations/{id}`, `DELETE /v1/conversations/{id}` : historique et suppression.
- `GET /v1/memories`, `POST /v1/memories`, `PATCH /v1/memories/{id}`, `DELETE /v1/memories/{id}` : mémoire contrôlée.
- `GET /v1/tasks`, `POST /v1/tasks`, `GET /v1/tasks/{id}`, `POST /v1/tasks/{id}/resume`, `POST /v1/tasks/{id}/cancel` : état et reprise des tâches lorsque cette capacité sera activée.
- `GET /v1/decisions`, `POST /v1/decisions`, `PATCH /v1/decisions/{id}` : registre des décisions, post-V1.
- `POST /v1/account/delete` : demande de suppression du compte et de ses données, avec statut et confirmation.
- `GET /v1/entitlements` : droits calculés côté serveur, jamais fournis comme vérité par le client.
- `POST /v1/admin/access-keys`, `GET /v1/admin/access-keys`, `POST /v1/admin/access-keys/{id}/revoke` : gestion administrative des clés privées, réservée au rôle autorisé et postérieure à la mise en place de l’administration sécurisée.
- `POST /v1/billing/webhook` : événements de paiement signés, uniquement si le produit de paiement retenu l’exige et après validation des règles Apple.

Chaque route doit documenter : authentification, rôle/permission, schéma, limites, erreurs, données conservées, idempotence et tests. Ces chemins sont une proposition de contrat, pas l’affirmation que les routes existent déjà.

## A2. Compte, authentification, rôles et clés privées

### A2.1 Authentification individuelle
1. Choisir le fournisseur d’identité après examen de ses capacités, coûts, résidence des données et intégration iOS.
2. Implémenter création de compte, connexion, déconnexion, expiration/renouvellement de session et réinitialisation sécurisée du mot de passe si une connexion par mot de passe est retenue.
3. Stocker les jetons côté iOS dans Keychain ; côté web, privilégier une stratégie de session sûre, cookies `HttpOnly`, `Secure`, `SameSite` lorsque l’architecture s’y prête, et protection CSRF si nécessaire.
4. Vérifier la signature, l’émetteur, l’audience, l’expiration et la révocation côté serveur.
5. Refuser l’accès aux ressources d’un autre compte même si un identifiant est deviné ou injecté.
6. Prévoir suppression du compte depuis l’application si le compte peut être créé dans l’application, ainsi que suppression de ses données conformément aux obligations applicables.

**Tests :** compte A ne peut ni lire, ni modifier, ni supprimer les données du compte B ; session expirée/invalide refusée ; déconnexion révoque ou invalide la session selon le modèle choisi ; suppression vérifiée sur tous les stockages.

### A2.2 Rôles et privilèges
Définir des rôles explicites, attribués côté serveur :
- **Visiteur/invité** : accès aux fonctions explicitement ouvertes sans données partagées.
- **Utilisateur** : conversation, préférences et mémoire personnelle selon consentement.
- **Premium** : fonctionnalités supplémentaires selon droits d’abonnement vérifiés côté serveur.
- **Super Admin** : administration restreinte, idéalement avec MFA, journalisation renforcée et protections contre les actions accidentelles.

Ne jamais se fier à un champ `role` envoyé par l’application. Vérifier chaque permission sur chaque endpoint administratif. Les comptes Super Admin ne doivent pas être créés via une inscription publique normale.

### A2.3 Clés d’accès réservées aux proches
1. Permettre uniquement à un Super Admin autorisé de créer une clé via l’interface d’administration protégée.
2. Générer des clés à forte entropie côté serveur ; ne conserver qu’une empreinte cryptographique lorsque cela est possible.
3. Afficher la clé en clair une seule fois lors de sa création ; proposer révocation, date d’expiration, nombre d’utilisations et état.
4. Associer la clé à une offre/durée et à un nombre d’utilisations défini ; empêcher la réutilisation non autorisée.
5. Lors de l’utilisation, vérifier la clé côté serveur, créer ou associer un compte individuel et attribuer les droits à ce compte, sans créer de session partagée.
6. Ne jamais coder une liste de clés dans le front-end ni placer les clés dans les logs.
7. Ajouter un journal d’audit : créateur, date, offre, état, révocation et utilisation, sans enregistrer inutilement le secret complet.

**Tests :** utilisateur ordinaire interdit de créer une clé ; clé invalide/expirée/révoquée refusée ; limite d’usage respectée ; révocation immédiate ; droits retirés ou recalculés selon la politique documentée.

## A3. Onboarding et première interaction

1. Présenter ARIA, ce qu’elle peut faire aujourd’hui, ce qu’elle ne peut pas faire et les traitements de données pertinents.
2. Proposer la voix comme chemin principal, mais laisser l’utilisateur continuer par texte.
3. Demander les permissions microphone/reconnaissance vocale au moment où l’utilisateur active la fonction, avec une explication contextuelle.
4. Présenter séparément le consentement à la mémoire persistante ; ne pas le considérer comme accepté par défaut.
5. Permettre de choisir les préférences essentielles : voix, langue, mode texte/voix, mémoire, notifications et profil d’usage.
6. Ne pas imposer l’inscription avant de montrer une démonstration locale si une telle démonstration est sûre et utile.
7. Enregistrer la version du texte de consentement et l’état du consentement quand cette traçabilité est nécessaire.
8. Ajouter une procédure de reprise si l’utilisateur refuse une permission : expliquer comment utiliser le texte ou modifier le réglage système.

**Critères :** onboarding complétable sans microphone ; consentement non ambigu ; aucune donnée persistante envoyée sans base légale/consentement approprié ; tests d’installation neuve et de reprise.

## A4. Voix, conversation et HUD

### A4.1 Cycle vocal
Modéliser un état exclusif parmi : `idle`, `requesting_permission`, `listening`, `transcribing`, `thinking`, `speaking`, `interrupted`, `error`. Toute transition invalide est refusée et testée.

1. L’utilisateur démarre l’écoute par une action claire.
2. L’interface indique visuellement et, si pertinent, auditivement que le microphone est actif.
3. La capture s’arrête sur action utilisateur, fin de phrase ou limite de durée ; aucun enregistrement permanent caché.
4. La transcription est affichée lorsqu’elle est disponible et peut être corrigée avant envoi si la reconnaissance est incertaine.
5. Le message est envoyé avec identifiant de requête pour prévenir les doublons.
6. La réponse textuelle est rendue avant ou en parallèle de la synthèse vocale selon la latence.
7. L’utilisateur peut interrompre immédiatement la lecture et la génération si le backend le permet.
8. Une réponse interrompue n’est pas considérée comme une action achevée si elle devait déclencher une opération.
9. En cas de réseau indisponible, conserver uniquement ce qui est nécessaire localement et indiquer clairement que le message n’a pas été envoyé.

### A4.2 Interface HUD
- Garder une zone principale centrée sur l’interaction et l’état courant, pas une grille de nombreuses pages.
- Rendre paramètres, mémoire, compte, aide et confidentialité accessibles sans surcharger l’écran principal.
- Prévoir Dynamic Type, VoiceOver, contrastes suffisants, zones tactiles confortables et réduction des animations.
- Ne pas communiquer uniquement par couleur ; combiner texte, icône et état accessible.
- Limiter les animations en arrière-plan et respecter le mode économie d’énergie.
- Maintenir la cohérence visuelle entre site, PWA et iOS, tout en utilisant les conventions natives iOS.
- Ne pas utiliser d’animation pour suggérer une capacité de calcul, une donnée en temps réel ou une action qui n’existe pas.

**Tests :** interruption audio, appels entrants, verrouillage/déverrouillage, bascule d’application, permission refusée, bruit, latence, réponse vide/malformée et VoiceOver.

## A5. Conversation, historique et rendu sécurisé

1. Définir un modèle de message versionné : identifiant, conversation, rôle autorisé, contenu, date, statut d’envoi et métadonnées minimales.
2. Accepter uniquement les rôles de message permis par le contrat serveur ; le client ne peut pas soumettre de message système.
3. Afficher explicitement les statuts : envoi, reçu, échec, réponse partielle ou non vérifiée.
4. Échapper le contenu affiché et autoriser les liens selon une politique de schémas sûrs ; ne pas injecter du HTML arbitraire.
5. Paginer l’historique, gérer les erreurs de chargement et permettre la suppression.
6. Distinguer messages locaux non synchronisés et données confirmées sur le serveur.
7. Définir la rétention des conversations et ne pas utiliser automatiquement le contenu pour l’entraînement d’un fournisseur.
8. Ajouter des limites de taille et de fréquence, des délais d’expiration et un comportement de reprise sans renvoi aveugle.

**Tests :** contenu HTML hostile, liens dangereux, réponse tronquée, double clic/envoi, offline, pagination, suppression confirmée et erreurs serveur.

## A6. Mémoire persistante contrôlée

### A6.1 Modèle
Chaque souvenir doit comporter au minimum : identifiant, propriétaire serveur, type, contenu minimal, origine (déclaré/inféré/importé), confiance ou incertitude si applicable, date de création/mise à jour, consentement/état, durée de conservation éventuelle et provenance de la modification.

### A6.2 Flux
1. Le système distingue le contexte temporaire d’une conversation de la mémoire persistante.
2. Avant d’enregistrer un nouveau souvenir, il vérifie le consentement et la politique de mémorisation.
3. Il informe l’utilisateur quand une information importante est proposée pour la mémoire, selon le niveau de sensibilité et les réglages.
4. L’utilisateur peut consulter, corriger et supprimer un souvenir.
5. Le backend vérifie l’identité et le propriétaire de la donnée à chaque opération.
6. Lorsqu’un consentement est désactivé, aucun souvenir persistant ne doit être ajouté au contexte du modèle via ce chemin.
7. Une suppression doit être propagée aux copies contrôlées par ARIA et aux index associés selon la politique de rétention ; les limites légales/techniques restantes sont expliquées.
8. Les échecs de synchronisation sont visibles ; l’interface ne prétend pas qu’une modification a été sauvegardée tant que le serveur ne l’a pas confirmé.
9. Les exports et demandes de droits doivent suivre un flux documenté et vérifiable.

**Tests obligatoires :** consentement activé/désactivé, correction, suppression, panne du stockage, conflit de synchronisation, accès inter-comptes, export et suppression du compte.

## A7. Compréhension de l’intention et planification

Créer une représentation interne versionnée, par exemple :
- `goal` : objectif compris ;
- `constraints` : contraintes explicites ;
- `assumptions` : hypothèses signalées ;
- `steps` : étapes ordonnées ;
- `required_capabilities` : capacités nécessaires ;
- `permissions_required` : autorisations ;
- `success_criteria` : conditions vérifiables ;
- `risk_level` : risque évalué ;
- `status` : proposé, en cours, bloqué, terminé ou annulé.

**Boucle d’exécution :**
1. Classer la demande : réponse directe, clarification, recherche, action autorisée ou refus/limite.
2. Poser une question si une ambiguïté change sensiblement le résultat, le coût ou le risque.
3. Vérifier que les capacités requises existent dans l’environnement courant.
4. Construire un plan proportionné à la tâche ; ne pas planifier lourdement les questions simples.
5. Présenter le plan ou demander confirmation selon le risque.
6. Exécuter uniquement les étapes permises.
7. Vérifier les résultats et mettre à jour l’état.
8. Signaler ce qui est accompli, échoué, incertain ou encore à faire.

**Tests :** requête simple, requête ambiguë, multi-étapes, outil indisponible, dépendance manquante, sortie modèle malformée, annulation et action sensible nécessitant confirmation.

## A8. Exécution d’outils et vérification des résultats

Pour chaque outil, définir une fiche avec nom/version, description, schéma d’entrée/sortie, permissions, niveau de risque, délai maximal, idempotence, stratégie d’annulation, preuves de réussite et cas de test.

1. Le modèle peut proposer un appel ; le backend décide s’il est autorisé.
2. Valider strictement les paramètres, l’utilisateur, les limites et les permissions.
3. Demander une confirmation explicite pour les actions sensibles ou irréversibles.
4. Exécuter dans un environnement isolé avec le minimum de privilèges.
5. Vérifier le résultat à partir de l’état réel retourné, d’un artefact, d’un test ou d’une confirmation externe.
6. Persister le résultat et la preuve minimale utile.
7. Utiliser les états `planned`, `running`, `succeeded`, `failed`, `blocked`, `cancelled`, `unverified`.
8. Ne pas réexécuter automatiquement une action non idempotente dont le résultat est incertain.
9. Offrir une annulation ou un retour arrière lorsque la capacité le permet.

**Exigence V1.0 :** implémenter l’ensemble des outils et boucles d’exécution prévus par le cahier des charges, avec un registre de capacités explicite, permissions minimales, confirmations adaptées au risque, sandboxing, journalisation minimisée et vérification du résultat. Le contrôle arbitraire non autorisé reste interdit ; cela ne justifie pas de repousser les fonctions d’exécution autorisées et spécifiées.

## A9. Continuité et reprise de tâches — obligatoire en V1.0

Stocker un objet tâche contenant : objectif, plan versionné, étape courante, résultats vérifiés, dépendances, permissions accordées, erreurs, prochaine action, horodatage et statut.

- Sauvegarder les changements d’état importants.
- À la reprise, revalider identité, permissions, dépendances et fraîcheur des données.
- Ne pas répéter aveuglément une opération non idempotente.
- Permettre pause, reprise, annulation et clôture.
- Afficher le dernier état connu et les actions qui restent à effectuer.
- Prévoir expiration et suppression des tâches anciennes.

**Critères :** fermeture/réouverture, panne réseau, dépendance changée, tâche annulée et résultat d’action incertain.

## A10. Compétences versionnées — obligatoire en V1.0

Une compétence est un paquet contrôlé de procédure, pas un privilège supplémentaire :
1. Décrire objectif, déclencheurs, entrées, sorties, outils nécessaires, permissions et limites.
2. Définir tests déterministes et exemples d’échec.
3. Versionner la définition et les dépendances.
4. Exécuter dans un bac à sable ou une enveloppe de permissions stricte.
5. Publier uniquement après revue et tests.
6. Mesurer les échecs et permettre le retour à une version précédente.
7. Interdire à une compétence de s’auto-autoriser, d’altérer les règles de sécurité ou de masquer ses résultats.

**Critères :** version identifiable, tests reproductibles, comparaison des versions, rollback et refus des permissions non déclarées.

## A11. Proactivité et notifications — obligatoire en V1.0

1. N’activer une surveillance que si la source, l’autorisation et l’ordonnanceur sont réellement configurés.
2. Recueillir des préférences explicites : types d’événements, fréquence, plages silencieuses, canal et désactivation.
3. Enregistrer la provenance, l’heure de collecte, la fraîcheur et la confiance des informations utilisées.
4. Évaluer pertinence, urgence, confiance et coût d’interruption avant notification.
5. Dédupliquer, limiter la fréquence et éviter les notifications répétitives.
6. Prévoir pause globale, révocation des autorisations et journal de ce qui a déclenché une notification.
7. Respecter les permissions de notification iOS ; ne pas les demander avant que leur utilité soit expliquée.

**Critères :** aucune notification sans déclencheur démontrable, préférence respectée, mode silencieux respecté et désactivation effective.

## A12. Mémoire des décisions — obligatoire en V1.0

Modèle proposé : décision, contexte, objectif, options considérées, choix retenu, raisons, hypothèses, conséquences attendues, propriétaire, date, statut (active, remplacée, à réexaminer) et provenance.

- Distinguer fait, hypothèse et préférence.
- Permettre correction, archivage et réévaluation.
- Éviter d’enregistrer une déduction comme une décision explicitement prise par l’utilisateur.
- Relier une décision à la tâche ou au projet pertinent.
- Afficher le contexte nécessaire pour comprendre pourquoi une décision a été retenue.

**Critères :** création, correction, recherche, archivage, réévaluation et respect de l’isolation par compte.

## A13. Indépendance des fournisseurs IA

1. Définir une interface interne minimale pour génération, sorties structurées, capacités multimodales disponibles, délais, erreurs et métadonnées d’usage.
2. Garder l’orchestration, les permissions, la mémoire, les tâches et la journalisation indépendantes du format d’un fournisseur.
3. Implémenter un adaptateur réel et un adaptateur simulé pour les tests.
4. Définir une stratégie de timeout, retry limité, circuit breaker et fallback si un fournisseur secondaire est configuré.
5. Ne jamais basculer vers un fournisseur qui ne respecte pas les exigences de confidentialité ou de capacités attendues.
6. Mesurer latence, coût et taux d’échec sans journaliser les contenus privés par défaut.

**Critères :** tests contractuels communs et possibilité de remplacer l’adaptateur sans modifier les modèles de données métier.

## A14. Profil professionnel, offre premium et abonnements

1. Définir les fonctionnalités réellement incluses dans Free, Plus et Pro ; ne pas utiliser le nom d’une offre pour laisser croire à des capacités absentes.
2. Calculer quotas et droits côté serveur ; le client ne fait qu’afficher les droits retournés.
3. Séparer profil professionnel (préférences/présentation) et rôle d’autorisation (permissions de sécurité).
4. Si un abonnement numérique est vendu dans l’app iOS, vérifier les règles Apple applicables et implémenter le parcours de paiement autorisé, restauration, renouvellement, annulation et gestion des états.
5. Valider les notifications de paiement côté serveur et traiter les événements en idempotence.
6. Afficher prix, période, renouvellement et conditions avant confirmation.
7. Ne jamais accorder un droit premium uniquement sur la base d’un succès de paiement déclaré par le client.
8. Si le paiement iOS n’est pas prêt, retirer l’achat de l’app soumise ou suivre une voie explicitement validée par les règles applicables.

**Tests :** achat réussi/échoué/annulé, restauration, remboursement, expiration, webhook dupliqué, droits périmés et perte réseau.

## A15. Newsletter, consentement marketing et communication

1. Proposer une case d’inscription à la newsletter facultative, décochée par défaut et distincte des CGU et de la politique de confidentialité.
2. Enregistrer la preuve du choix, la date, la version du texte et le canal ; ne pas empêcher l’utilisation du produit si la personne refuse.
3. Fournir un lien de désinscription fonctionnel dans chaque communication marketing pertinente.
4. Synchroniser les changements de consentement avec le service de newsletter ; signaler les erreurs et prévoir une procédure manuelle.
5. Ne pas réutiliser l’adresse pour du marketing au-delà de la finalité et du fondement juridique définis.
6. Ne pas partager la liste de diffusion avec des tiers non déclarés.

**Critères :** inscription facultative, refus sans blocage, désinscription vérifiée et preuve de consentement conservée selon la politique.

## A16. Site web, SEO, HTTPS et cookies

### A16.1 Transport et sécurité
- Forcer HTTPS au niveau de l’hébergement/edge, activer HSTS après vérification des sous-domaines et éviter les ressources mixtes.
- Vérifier certificats, redirections, en-têtes de sécurité, politique CORS et politique de contenu (CSP) adaptée à l’application.
- Garder les API hors du front-end : aucun secret fournisseur ou privilège serveur dans le JavaScript livré.
- Appliquer des limites de requêtes et une validation de schéma côté serveur.

### A16.2 Cookies
- Inventorier tous les cookies, SDK et traceurs réellement utilisés.
- Bloquer les traceurs non essentiels avant consentement lorsque requis.
- Présenter des choix compréhensibles : accepter, refuser et personnaliser, avec un accès ultérieur aux préférences.
- Enregistrer la preuve du choix et permettre son retrait.
- Ne pas afficher une bannière inutile si le site n’utilise aucun traceur nécessitant un consentement ; documenter la décision.

### A16.3 SEO et métadonnées
- Définir un `title` unique et descriptif par page, une description meta, une URL canonique et les métadonnées de partage appropriées.
- Ajouter sitemap/robots adaptés, favicon, Open Graph et structure sémantique accessible.
- Ne pas indexer les routes privées, l’administration ou les pages de compte.
- Vérifier les titres, descriptions, liens et aperçus après déploiement.

### A16.4 Pages publiques obligatoires
- Politique de confidentialité/RGPD, CGU, contact/support et informations de l’éditeur.
- Les pages doivent être accessibles depuis le site et l’app lorsque pertinent, versionnées et cohérentes avec les traitements réellement déployés.
- Ne pas prétendre que la simple publication d’une politique suffit à rendre conforme un traitement qui ne l’est pas.

## A17. Visualisations, 3D et God’s Eye View — obligatoire en V1.0

1. Définir chaque visualisation comme un module séparé avec contrat d’entrée/sortie, version et permissions.
2. Distinguer visuellement données réelles, données simulées et démonstrations.
3. Définir l’origine, l’horodatage, l’incertitude et la licence des données externes.
4. Valider les messages échangés entre ARIA et le moteur de visualisation par schéma et origine autorisée.
5. Permettre d’annuler une transition immersive et de revenir à l’interface principale.
6. La transition caméra à travers le logo doit être purement navigationnelle : elle ne doit pas suggérer qu’une simulation ou une donnée a été chargée avant confirmation.
7. Pour les visualisations scientifiques, documenter les unités, hypothèses, limites du modèle et paramètres contrôlables.
8. Tester performance, accessibilité, chauffe, consommation énergétique et compatibilité mobile.

**Critères :** données clairement identifiées, aucun message inter-module non validé, état de chargement/erreur clair et sortie de visualisation toujours possible.

## A18. Application compagnon PC — obligatoire pour la livraison globale ARIA 1.0

- Garder le backend, l’identité, la mémoire et les contrats métier partagés ; construire un client PC séparé plutôt qu’un tunnel de confiance implicite depuis l’iPhone.
- Appairer les appareils avec une preuve d’identité, révocation et liste des appareils associés.
- Chiffrer les communications, limiter les commandes à une liste autorisée et exiger confirmation pour les actions sensibles.
- Présenter l’état de connexion et permettre la révocation de l’appareil depuis le compte.
- Ne pas ouvrir de contrôle distant général du PC par défaut.
- Tester le renouvellement de session, le rejeu, l’appareil perdu, la déconnexion et l’isolement des comptes.

## A19. Observabilité, support et incidents

1. Définir des métriques minimales : disponibilité API, latence, taux d’erreur, crashs, erreurs audio, coûts et limites d’usage.
2. Exclure secrets, jetons et contenu conversationnel des logs par défaut.
3. Définir des alertes pour les erreurs serveur, la hausse des coûts et les échecs d’authentification.
4. Fournir une adresse de support ou un formulaire fonctionnel avec suivi des demandes.
5. Établir un runbook : identifier incident, réduire l’impact, désactiver la fonction affectée, restaurer le service et communiquer aux utilisateurs si nécessaire.
6. Prévoir sauvegarde/restauration et vérifier périodiquement la restauration, pas uniquement l’existence des sauvegardes.
7. Définir la procédure de retrait d’une version problématique et la publication d’un correctif.

## A20. Matrice d’acceptation transversale

Chaque fonctionnalité livrée doit fournir :
- identifiant d’exigence et description utilisateur ;
- composants et fichiers touchés ;
- migration éventuelle ;
- permissions et données utilisées ;
- tests unitaires, intégration et parcours utilisateur ;
- test d’échec et de reprise ;
- preuve de validation en staging ;
- procédure de rollback ou de désactivation ;
- documentation d’aide et mise à jour des pages légales si nécessaire ;
- état explicite : non commencé, en cours, bloqué, implémenté, vérifié en staging, validé sur appareil ou publié.

**Règle de release :** une fonctionnalité ne peut être qualifiée de « terminée » sur la seule base du code écrit. Elle doit passer ses critères, ses tests, une revue de sécurité proportionnée et la validation sur les environnements concernés.

## A21. Ordre d’intégration concret

Toutes les familles fonctionnelles sont des exigences de la version publique 1.0. L’ordre ci-dessous est un ordre de développement interne destiné à réduire les risques, et non une liste de fonctionnalités à repousser après lancement.

1. Revue des PR existantes et matrice exigence/code/test.
2. Authentification individuelle, contrôle d’accès, rôles et tests d’isolation.
3. Contrats API, limites, gestion des secrets, environnements et observabilité.
4. Contrat d’intention, permissions, boucle d’exécution et preuve de résultat.
5. Mémoire, historique, tâches reprenables et registre des décisions.
6. Compétences versionnées et testées, avec retour arrière.
7. Proactivité, ordonnanceur, notifications et contrôles de fréquence.
8. Stabilisation voix/HUD et client iOS natif.
9. Modules 3D/God’s Eye View et transition immersive, en distinguant clairement simulation et données réelles.
10. Compagnon PC, appairage sécurisé, autorisations et révocation.
11. Offres, comptes, clés privées, newsletter et parcours de paiement selon les règles applicables.
12. Site public, pages légales, HTTPS, cookies, SEO, support et suppression de compte.
13. Tests unitaires, intégration, sécurité, end-to-end, validation sur appareils et bêta TestFlight.
14. Préparation de la fiche App Store, soumission, corrections de revue et publication.

Le développement peut être mené par incréments et sous-systèmes, mais aucune famille fonctionnelle du cahier des charges n’est automatiquement reportée à une version publique ultérieure. Si une capacité dépend d’un service externe, d’un matériel ou d’une règle de plateforme, cette dépendance doit être résolue ou une solution de remplacement approuvée doit être livrée avant la sortie.

Cette annexe doit être relue conjointement avec le cahier des charges V1.2, son complément fonctionnel V1.2.1 et l’audit de code. En cas de contradiction, ne pas choisir silencieusement : documenter la différence et la résoudre avant implémentation.
