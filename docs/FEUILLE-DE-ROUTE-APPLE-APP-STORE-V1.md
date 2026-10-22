# ARIA — Feuille de route jusqu’à l’Apple App Store
**Version :** 1.0  
**Date de référence :** 22 octobre 2026  
**Périmètre :** ARIA iOS, depuis l’état actuel du projet jusqu’à une première version publique approuvée sur l’App Store.  
**Statut :** plan d’exécution proposé — les jalons ne sont pas réputés accomplis tant que leurs critères de sortie n’ont pas été vérifiés.

## 1. Objectif de livraison

Livrer une première application iPhone ARIA utile, stable, sécurisée et conforme, centrée sur une interaction vocale naturelle, un HUD discret, une mémoire contrôlée par l’utilisateur et un backend IA sécurisé. Cette version doit être un vrai produit iOS, pas seulement un site web emballé dans une coquille.

**Cible initiale :** une version publique iOS limitée mais fiable (« ARIA iOS 1.0 »).  
**Estimation de planification :** environ 12 à 20 semaines de travail à temps régulier, potentiellement davantage selon les blocages d’authentification, la disponibilité d’un environnement macOS/Xcode, la conformité et les retours Apple. Ce n’est pas une date garantie.

### Inclus dans la première version publique
- Onboarding clair et présentation des capacités/limites d’ARIA.
- Interaction vocale au premier plan : démarrer/arrêter l’écoute, transcription visible, réponse vocale et interruption contrôlée.
- Chat texte de secours.
- HUD iOS cohérent, responsive, accessible et non surchargé.
- Comptes individuels si la synchronisation serveur est activée ; session invitée possible uniquement si elle est sécurisée et cohérente avec le produit.
- Mémoire explicite : consentement, consultation, correction et suppression ; indication claire quand une opération échoue.
- Backend isolé du client, secrets uniquement côté serveur, limites d’usage et gestion des erreurs.
- Historique des conversations, suppression de conversation et fermeture/suppression du compte si un système de compte est proposé.
- Page de paramètres, aide/contact, politique de confidentialité et CGU accessibles.
- Gestion des offres gratuite/premium seulement si les droits, les paiements et les parcours sont complètement fonctionnels.
- Télémétrie minimale et respectueuse de la vie privée, désactivable lorsque requis.

### Hors périmètre du premier lancement
- Autonomie générale sur le téléphone ou l’ordinateur.
- Microphone permanent en arrière-plan ou écoute toujours active.
- Contrôle distant du PC, automatisations sensibles et actions irréversibles.
- Registre complet de compétences autonomes, proactivité planifiée étendue, simulations 3D avancées et « God’s Eye View » connecté à des sources réelles.
- Promesses de capacités qui ne sont pas réellement implémentées et testées.

Ces éléments restent dans la feuille de route post-lancement. Leur absence ne doit pas empêcher le lancement d’un assistant vocal de base de qualité.

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
10. Si des fonctionnalités numériques premium sont vendues dans l’application, définir le modèle de paiement et implémenter les achats intégrés Apple selon les règles applicables ; ne pas lancer un écran d’abonnement factice.
11. Préparer les conditions d’abonnement, prix, renouvellement, annulation et restauration des achats si applicables.
12. Vérifier droits sur le nom ARIA, le logo, les polices, les illustrations, les sons et toutes les ressources.

**Critères de sortie**
- Tous les liens légaux fonctionnent et reflètent les traitements réellement en place.
- Déclarations de confidentialité cohérentes avec le code et les SDK.
- Consentement, retrait, suppression et contact de support testés.
- Parcours de paiement entièrement fonctionnel ou fonctionnalités payantes retirées de la version 1.0.

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

À ne démarrer qu’après stabilisation de la 1.0 :
1. **V1.1 — Continuité :** tâches reprenables avec état durable et dépendances vérifiées.
2. **V1.2 — Actions sûres :** premier petit ensemble d’outils avec permissions, confirmations et preuves de résultat.
3. **V1.3 — Compétences :** procédures versionnées et testées, avec retour arrière.
4. **V1.4 — Proactivité :** préférences, horaires silencieux et déclencheurs explicites, uniquement avec ordonnanceur opérationnel.
5. **V1.5 — Décisions :** journal structuré des décisions et hypothèses.
6. **V2.x — Intégration PC :** app compagnon, appairage sécurisé, relais chiffré et contrôle explicitement autorisé.
7. **Plus tard :** visualisations scientifiques et 3D avancées connectées à des données réelles.

## 6. Tableau de pilotage

| ID | Jalon | Priorité | Dépendance | Preuve de fin |
|---|---|---|---|---|
| M0 | Périmètre et inventaire approuvés | P0 | Aucune | Matrice exigences/tests |
| M1 | Authentification et Worker sécurisés | P0 | M0 | Tests d’autorisation et d’isolation verts |
| M2 | Voix/HUD fiable | P0 | M1, contrat API | Test iPhone réel |
| M3 | Application iOS signée | P0 | M0–M2, macOS/Xcode | Build installé sur appareil |
| M4 | Mémoire et suppression maîtrisées | P0 | M1, M3 | Tests de consentement et suppression |
| M5 | Qualité des réponses acceptable | P1 | M1–M3 | Suite de scénarios validée |
| M6 | Conformité et fiche terminées | P0 | Produit stabilisé | Checklist juridique/App Store |
| M7 | Bêta TestFlight validée | P0 | M1–M6 | Rapport de bêta, aucun blocage critique |
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
