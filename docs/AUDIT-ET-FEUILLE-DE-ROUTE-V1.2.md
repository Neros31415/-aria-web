# ARIA — Audit cahier des charges vs code et feuille de route
**Version :** 1.0  
**Date :** 22 octobre 2026  
**Base technique examinée :** branche `main`, ARIA Web V0.7  
**Documents de référence :** cahier des charges consolidé V1.2 et documents juridiques de travail sur `docs/aria-legal-commercial-v1-2`  
**Statut :** audit documentaire du code source disponible ; aucun test du site déployé ni test d'intrusion n'est prétendu.

## 1. Résumé exécutif

La branche `main` contient une PWA statique V0.7 avec conversation et mémoire locales. L'inventaire Cloudflare réalisé le 22 octobre 2026 confirme toutefois que des services existent hors de cette branche : Workers `aria-brain` (production), `aria-brain-staging` (staging) et `aria-companion-preview`, ainsi que Pages `aria-official-site`. Une branche non fusionnée `feat/aria-brain-staging-integration` contient un client qui appelle `/chat` et `/memory` sur le Worker de staging. Il existe donc déjà un backend alpha et un début d'intégration ; ils ne sont pas intégrés à `main` et ne constituent pas encore une authentification multi-utilisateur commerciale.

L'écart majeur n'est donc pas une liste de petits correctifs visuels : c'est l'absence du socle serveur nécessaire à l'authentification, à la mémoire persistante contrôlée, aux autorisations, aux clés premium et à l'utilisation d'un modèle réel. Le site public peut avancer en parallèle sur les éléments statiques et juridiques, mais ne doit pas présenter comme opérationnelles les fonctions qui ne le sont pas.

### État de maturité constaté
- **Présent dans le code :** interface responsive de base, titre HTML et meta description, historique local, mémoire locale, formulaire de chat côté client, limite de longueur du message, textes de statut honnêtes sur le mode prototype, manifeste PWA, service worker/cache hors ligne de base.
- **Présent dans les documents, non implémenté par ces documents :** cahier des charges commercial/juridique V1.2, brouillons des CGU et de la politique de confidentialité, checklist pré-lancement. La PR #16 est documentaire et ne prouve pas l'existence des fonctions serveur.
- **Absent ou non trouvé dans `main` :** intégration de l'API de staging, authentification par compte individuel, rôles/permissions commerciales, gestion Super Admin, clés premium, paiements, newsletter, consentement cookies, analytics, pages légales accessibles dans le site, sitemap, robots.txt, page 404 dédiée, balises Open Graph et déclaration explicite de favicon. Le Worker de staging dispose déjà de routes `/health`, `/chat` et `/memory`, d'un secret partagé `ARIA_ACCESS_TOKEN`, d'un secret fournisseur IA et d'un binding KV de mémoire ; voir la revue de sécurité dédiée.
- **À vérifier par exécution/déploiement :** HTTPS et redirections, certificat TLS, statut HTTP 404, liens cassés, contraste WCAG, performance mesurée, compression des médias, compatibilité réelle avec les navigateurs/appareils et paramètres de l'hébergeur.

## 2. Matrice cahier des charges ↔ code

Légende : **Implémenté**, **Partiel**, **Absent/non trouvé**, **À vérifier**. « Non trouvé » signifie que l'élément n'apparaît pas dans les fichiers consultés, et non qu'il est forcément absent de toute infrastructure externe.

| Exigence | État constaté | Éléments de preuve / écart | Action attendue |
|---|---|---|---|
| Politique RGPD / confidentialité | Absent du front-end ; brouillon documentaire | Aucun lien vers une page de confidentialité dans `index.html`. Brouillon juridique séparé à compléter. | Compléter à partir des flux réels, publier une page et la relier au site/app. |
| CGU | Brouillon documentaire | Les CGU sont dans `legal/CGU-ARIA-DRAFT.md` sur la branche documentaire ; pas de page/lien visible dans le front-end examiné. | Compléter les champs manquants, vérifier juridiquement, publier et enregistrer la version acceptée lorsque nécessaire. |
| API séparée du front-end | Partiel / alpha déployée hors de `main` | Le Worker Cloudflare `aria-brain-staging` expose `/health`, `/chat` et `/memory`; la branche `feat/aria-brain-staging-integration` contient un client d'intégration. `main` n'utilise pas cette API. Le staging emploie un jeton partagé et un UUID client, pas une identité utilisateur vérifiée. | Auditer/corriger les contrôles du Worker, tester le staging, documenter le contrat API et intégrer ensuite via une PR distincte. Ne pas reconstruire une API parallèle. |
| HTTPS forcé | À vérifier | La PWA indique que le service worker exige HTTPS ou localhost, mais le dépôt ne prouve pas la configuration de l'hébergeur. | Vérifier TLS, redirections HTTP, ressources mixtes et configuration HSTS appropriée. |
| Bannière cookies | Absent | Aucun mécanisme de consentement dans `index.html` ou `app.js`. | Inventorier les traceurs ; implémenter refus/acceptation/personnalisation et retrait si consentement requis. |
| Meta title | Implémenté | `<title>ARIA — Assistant personnel</title>`. | Garder un titre unique et pertinent par page. |
| Image réseaux sociaux | Absent/non trouvé | Pas de balises Open Graph/Twitter ni d'image déclarées dans `index.html`. | Créer l'image officielle et les métadonnées de partage. |
| Favicon | À vérifier / non déclaré dans le HTML consulté | Aucun lien `rel=icon` dans `index.html`; le manifeste PWA existe, mais cela ne suffit pas à prouver le favicon navigateur. | Ajouter les formats d'icône adaptés et les tester. |
| Sitemap + robots.txt | Absent/non trouvé | Aucun fichier à la racine du dépôt listée. | Ajouter les fichiers pour le domaine public réel ; ne pas les utiliser pour protéger des routes privées. |
| Textes alternatifs des images | Partiel / faible présence d'images | Le logo CSS est masqué aux lecteurs d'écran avec `aria-hidden=true`; pas de catalogue d'images à auditer. | Vérifier chaque image informative ; alt vide pour les images décoratives. |
| Compression des images | À vérifier | Aucun inventaire de fichiers image fourni dans la racine examinée. | Optimiser formats, dimensions et chargement différé selon les ressources réellement utilisées. |
| Vitesse des pages | À mesurer | Aucun résultat Lighthouse/Core Web Vitals n'est fourni. | Mesurer avant/après sur mobile et desktop ; fixer des seuils de livraison. |
| Contraste et accessibilité | À auditer | Quelques labels accessibles existent ; les couleurs et états focus n'ont pas été mesurés. | Tester contrastes, clavier, VoiceOver, zoom, focus et réduction des animations. |
| Site responsive | Implémenté au niveau CSS | `styles.css` contient des breakpoints à 700 px et 390 px, avec viewport mobile. | Tester sur appareils et navigateurs réels ; corriger les débordements éventuels. |
| Page 404 personnalisée | Absent/non trouvé | Pas de page 404 dans les fichiers de la racine. | Créer une page adaptée et configurer un vrai statut HTTP 404 côté hébergement. |
| Liens cassés | À vérifier | Le site comporte peu de liens visibles ; pas de rapport automatisé. | Scanner liens internes/externes et vérifier destinations de boutons et liens légaux. |
| Validation formulaires | Partiel | Le chat ignore les messages vides et limite la longueur du texte ; la mémoire ignore les notes vides. Pas de validation serveur car pas de backend. | Ajouter validation stricte côté serveur pour tout nouvel endpoint et tests d'erreurs. |
| Anti-spam / limitation d'abus | Absent/non trouvé | Pas de compte, API ou formulaire public serveur ; le contrôle client seul ne serait pas suffisant. | Rate limiting, détection d'abus et protections adaptées lors de la création du backend. |
| Analytics | Absent/non trouvé | Aucun outil ni événement analytique identifié. | Décider si l'analytics est nécessaire, minimiser les données et respecter le consentement applicable. |
| Un CTA principal | À vérifier | L'interface prototype est davantage un espace d'interaction que des pages commerciales ; aucune règle de conversion définie. | Un objectif principal par page publique, sans supprimer les actions nécessaires (aide, paramètres, CGU, confidentialité). |

## 3. Écarts V1.2 supplémentaires à ne pas oublier

Les 20 exigences web ne couvrent pas à elles seules le cahier des charges commercial et de sécurité. Ces points V1.2 sont également bloquants avant une ouverture commerciale :

1. **Comptes et authentification :** inscription, vérification e-mail, récupération sécurisée, hachage robuste des mots de passe, sessions et limitation des tentatives.
2. **Séparation des rôles :** Free/Plus/Pro sont des offres ; utilisateur/Super Admin sont des rôles d'autorisation indépendants.
3. **Super Admin :** MFA obligatoire pour les opérations sensibles, journalisation, procédure d'amorçage sécurisée, aucun mot de passe par défaut.
4. **Clés privées offertes :** création, liste, configuration, émission et révocation exclusivement par le Super Admin ; génération cryptographiquement aléatoire côté serveur ; stockage d'une empreinte plutôt que de la clé en clair ; expiration/quota/usage définis ; l'activation ne confère jamais un rôle administrateur.
5. **Données privées :** isolation des comptes ; l'administration n'ouvre pas par défaut l'accès aux conversations ou à la mémoire privée.
6. **Mémoire persistante :** contrôles utilisateur pour consulter, modifier, désactiver et supprimer les souvenirs ; API dédiée ; politique de conservation cohérente avec les flux réels.
7. **Newsletter :** consentement séparé, facultatif et non précoché ; refus sans effet sur l'inscription ; désinscription simple.
8. **Offres et paiement :** aucun prix, quota ou avantage annoncé avant validation du produit réellement livré, du prestataire, du renouvellement et de la résiliation.
9. **Transparence IA :** ne pas présenter le prototype local comme une IA connectée ; documenter les fournisseurs, les données transmises et les paramètres réels.
10. **Tests de sécurité :** autorisation côté serveur, isolation inter-comptes, validation/encodage, sessions, secrets, journalisation et tests de régression.

## 4. Feuille de route proposée

Les phases sont ordonnées par dépendance et risque, et non par facilité visuelle. La durée dépend de la stack retenue, du backend existant hors de ce dépôt et des tests disponibles ; aucune estimation calendaire n'est présentée comme garantie.

### Phase 0 — Inventaire confirmé et périmètre
**Priorité : P0 — inventaire initial effectué ; contrôles restants ouverts**

- [x] Confirmer que `main` est une PWA statique V0.7 et qu'elle n'intègre pas le backend.
- [x] Inventorier les ressources Cloudflare visibles : `aria-brain` (production), `aria-brain-staging` (staging), `aria-companion-preview` et Pages `aria-official-site`.
- [x] Identifier la branche `feat/aria-brain-staging-integration` et son client d'API `/chat` + `/memory`.
- [ ] Examiner les différences de cette branche, les tests existants et les résultats CI avant toute intégration.
- [ ] Tester les endpoints de staging avec des requêtes non destructives depuis un environnement autorisé ; les requêtes directes depuis l'outil de contrôle ont renvoyé un refus de passerelle (403), donc la disponibilité publique n'est pas confirmée par ce test.
- [ ] Confirmer les fournisseurs, les paramètres de rétention et les usages réels des données ; ne jamais afficher ou copier la valeur de secrets.
- [ ] Préserver `main` et surtout ne pas modifier ni redéployer `aria-brain` en production sans décision explicite et procédure de rollback.

**Sortie attendue :** état réel de l'alpha documenté, tests reproductibles et prochain correctif isolé sur staging.

### Phase 1 — Sécuriser le backend alpha existant et définir le contrat cible
**Priorité : P0 — aucun nouveau backend ne doit être construit avant la revue de l'alpha**

- [ ] Corriger les risques identifiés dans `docs/ARIA-STAGING-SECURITY-REVIEW.md` avant d'élargir l'accès au staging.
- [ ] Définir le contrat API à partir des routes déjà existantes (`/health`, `/chat`, `/memory`) ; versionner et documenter schémas, erreurs, quotas et limites.
- [ ] Remplacer le jeton partagé par une authentification utilisateur individuelle avant toute alpha multi-utilisateur ; ne pas distribuer un secret serveur commun à des proches ou clients.
- [ ] Lier la mémoire à une identité authentifiée vérifiée côté serveur, et non au seul `clientId` fourni par le navigateur.
- [ ] Refuser les rôles `system` fournis par le client et ne jamais faire confiance à un contexte système arbitraire provenant du front-end.
- [ ] Ajouter une limite de taille du corps et des messages, des quotas/rate limits et une journalisation minimale des événements de sécurité.
- [ ] Conserver les secrets fournisseur côté Worker ; confirmer que `store: false` et les conditions de traitement du fournisseur correspondent aux paramètres réels.
- [ ] Une fois les contrôles testés, intégrer l'appel API à la branche de l'interface via une PR dédiée, sans redéployer la production.
- [ ] Choisir une référence de vérification de sécurité ; utiliser OWASP ASVS 5.0.0 comme checklist de conception et de tests adaptée au niveau de risque.

**Critères de sortie :** aucune clé privée dans les ressources publiques ; chaque route privée exige une authentification et une autorisation ; tests d'accès non autorisé et d'isolation inter-comptes réussis.

### Phase 2 — Mémoire persistante et contrôle utilisateur
**Priorité : P0/P1**

- [ ] Créer les modèles de données de mémoire et les endpoints dédiés.
- [ ] Implémenter création, consultation, modification, désactivation et suppression.
- [ ] Ajouter catégories, importance et confiance si elles sont retenues dans le cahier des charges fonctionnel.
- [ ] Appliquer les règles de rétention, export et suppression définies.
- [ ] Éviter de transmettre au modèle plus de mémoire que nécessaire pour la requête.
- [ ] Tester l'absence de fuite de mémoire entre comptes et les suppressions.
- [ ] Conserver un comportement explicite si le backend est hors ligne.

**Critères de sortie :** la mémoire est persistante côté serveur, contrôlée par l'utilisateur, isolée par compte et testée sur iPhone.

### Phase 3 — Rôles, Super Admin et clés premium
**Priorité : P0 avant toute offre premium ou distribution à des proches**

- [ ] Séparer le statut d'abonnement des permissions.
- [ ] Mettre en place le rôle Super Admin avec MFA et journalisation.
- [ ] Créer l'espace administratif protégé.
- [ ] Permettre au seul Super Admin de créer, lister, configurer, émettre et révoquer les clés.
- [ ] Générer les clés avec un générateur cryptographiquement sûr ; stocker une empreinte ; n'afficher la clé complète qu'à l'émission.
- [ ] Appliquer côté serveur expiration, usage unique, nombre de places, offre et éventuel bénéficiaire.
- [ ] Permettre à un utilisateur authentifié d'activer une clé reçue, sans lui donner de droits d'administration.
- [ ] Tester les tentatives de réutilisation, révocation, expiration, bruteforce et élévation de privilèges.

**Critères de sortie :** aucune opération de gestion de clés accessible aux utilisateurs standards, même par appel API direct ; tests négatifs réussis.

### Phase 4 — Conformité et parcours de compte
**Priorité : P1 — avant ouverture publique**

- [ ] Cartographier les données réellement traitées et les flux vers les fournisseurs.
- [ ] Compléter les CGU et la politique de confidentialité ; remplacer les champs entre crochets par des informations exactes.
- [ ] Ajouter mentions légales et informations d'hébergement nécessaires.
- [ ] Publier les pages légales et les rendre accessibles depuis le site et l'application.
- [ ] Construire le consentement newsletter séparé, facultatif et non précoché.
- [ ] Implémenter preuve proportionnée d'acceptation des CGU et gestion du retrait newsletter.
- [ ] Déterminer les traceurs et mettre en place un mécanisme cookies conforme au besoin réel.
- [ ] Implémenter les demandes d'accès, rectification, effacement, export et suppression de compte selon les droits applicables.
- [ ] Définir durées de conservation, sauvegardes, incidents et procédure de violation de données.
- [ ] Faire relire les documents par un professionnel compétent avant publication.

**Critères de sortie :** aucun texte légal ne décrit un fournisseur ou un traitement non vérifié ; parcours de retrait et suppression testé ; champs incomplets éliminés.

### Phase 5 — Durcissement web et qualité
**Priorité : P1/P2**

- [ ] Vérifier HTTPS, certificats, redirections, ressources mixtes et en-têtes de sécurité pertinents.
- [ ] Ajouter page 404 avec vrai statut HTTP.
- [ ] Ajouter favicon et métadonnées Open Graph.
- [ ] Ajouter sitemap XML et robots.txt adaptés au domaine de production.
- [ ] Vérifier les liens et les formulaires.
- [ ] Mesurer les Core Web Vitals et établir une baseline.
- [ ] Contrôler le contraste, la navigation clavier, les états focus et les lecteurs d'écran.
- [ ] Optimiser les images si le site en utilise ; ne pas créer de travail de compression artificiel s'il n'y a pas d'images lourdes.
- [ ] Définir un CTA principal par page publique, en conservant les liens légaux et les commandes fonctionnelles.
- [ ] Ajouter analytics uniquement après décision documentée sur les besoins, la minimisation et le consentement applicable.

**Critères de sortie :** checklist qualité complétée avec résultats mesurés ; aucune régression mobile ; liens légaux visibles ; pages publiques indexables correctement configurées.

### Phase 6 — Offres et paiements
**Priorité : P1 avant vente**

- [ ] Valider les fonctionnalités réelles de Free, Plus et Pro.
- [ ] Définir quotas, prix TTC, périodicité, renouvellement, résiliation, rétractation et remboursement.
- [ ] Intégrer un prestataire de paiement reconnu avec webhooks vérifiés côté serveur.
- [ ] Vérifier chaque changement d'abonnement côté serveur ; ne jamais se fier au statut envoyé par le client.
- [ ] Tester paiements réussis/échoués, annulations, remboursements et incohérences de webhook.
- [ ] Publier les conditions commerciales seulement lorsque le parcours fonctionne réellement.

**Critères de sortie :** statut d'abonnement fiable côté serveur ; paiements testés en environnement de test ; conditions commerciales cohérentes avec les fonctions livrées.

### Phase 7 — Validation de bout en bout et lancement progressif
**Priorité : P0 de sortie**

- [ ] Tests unitaires et d'intégration des routes critiques.
- [ ] Tests de sécurité fondés sur une checklist OWASP ASVS adaptée au produit.
- [ ] Tests de bout en bout : inscription, connexion, conversation IA, mémoire, suppression, clé offerte et permissions.
- [ ] Tests sur iPhone réel et navigateurs mobiles/desktop.
- [ ] Vérifier performances, accessibilité, erreurs réseau, mode hors ligne et récupération après panne.
- [ ] Revue de code et diff sur une pull request ; aucune fusion automatique sans contrôle.
- [ ] Préparer retour arrière, sauvegarde/restauration et procédure de gestion d'incident.
- [ ] Lancer une alpha privée, recueillir les erreurs et corriger avant l'ouverture publique.
- [ ] N'annoncer comme « disponible » que ce qui est déployé et testé.

## 5. Ordre recommandé pour le prochain cycle d'ingénierie

1. **Auditer et durcir le Worker `aria-brain-staging` existant** : il existe déjà et ne doit pas être remplacé par un backend parallèle.
2. **Corriger l'autorisation de mémoire, le contexte système fourni par le client, les limites de requête et l'absence de limitation d'abus** avant d'inviter d'autres utilisateurs.
3. **Valider l'API de staging par des tests reproductibles** ; le test HTTP via l'outil de contrôle a été bloqué par une passerelle et ne prouve pas l'indisponibilité du Worker.
4. **Intégrer l'interface à l'API sécurisée dans une PR isolée**, après vérification du code de la branche d'intégration.
5. **Évoluer vers une authentification individuelle et des données de mémoire isolées par compte**, puis mettre en place le Super Admin et les clés premium.
6. **Implémenter les rôles Super Admin et les clés premium** avant d'inviter les proches.
7. **Finaliser les documents et les parcours RGPD** en fonction des flux effectivement implémentés.
8. **Fermer les écarts du site public** et mesurer qualité/performance.
9. **Activer les paiements seulement après validation des offres et des tests.**

## 6. Règles de livraison

- Ne pas modifier `main` directement pour une fonctionnalité nouvelle.
- Une tâche doit être livrée dans une branche avec un diff limité et une pull request.
- Chaque PR doit inclure : objectif, fichiers touchés, risques, tests exécutés, résultats et limites restantes.
- Ne jamais déclarer un test, audit, déploiement ou contrôle juridique effectué s'il ne l'a pas été.
- Une exigence passe à « implémentée » après écriture du code, à « testée » après preuve de test, et à « déployée » après vérification de l'environnement cible.
- Les pages légales doivent refléter les traitements réels et être relues avant publication.
- L'interface doit rester discrète, vocale en priorité et non surchargée ; les réglages, la mémoire, l'aide et les informations légales restent accessibles sans ajouter des onglets inutiles.

## 7. Ressources et état Cloudflare confirmés le 22 octobre 2026

- `aria-brain` : Worker de production existant ; ne pas modifier ou redéployer dans le cadre de cette feuille de route sans validation explicite.
- `aria-brain-staging` : Worker de staging actif, avec bindings de secret fournisseur IA, jeton d'accès partagé, KV de mémoire et KV d'utilisateurs. La présence d'un binding `ARIA_USERS` ne prouve pas que le code applique une authentification utilisateur individuelle.
- `aria-companion-preview` : Worker de prévisualisation distinct.
- `aria-official-site` : projet Cloudflare Pages existant, configuré avec le répertoire de sortie `site/` dans le déploiement observé.
- `feat/aria-brain-staging-integration` : branche existante contenant l'intégration client de staging et une documentation de mémoire persistante alpha.

Les paramètres ont été lus en mode inspection. Aucun secret n'a été lu en clair, aucune ressource Cloudflare n'a été modifiée et aucun déploiement n'a été lancé.

## 8. Référence sécurité

La vérification du backend et de l'API peut s'appuyer sur l'**OWASP Application Security Verification Standard (ASVS) 5.0.0**, standard de vérification pour applications web et services API. Il doit servir de checklist adaptée au risque, pas de déclaration automatique de conformité.

- Site officiel : https://asvs.owasp.org/
- Guide de périmètre : https://devguide.owasp.org/en/03-requirements/05-asvs/

---
**Limite de l'audit :** les métadonnées des Workers et Pages Cloudflare ont été consultées en lecture seule, et le code source de la branche d'intégration a été examiné. Les valeurs des secrets, les données utilisateurs, les performances réelles et le comportement de production n'ont pas été inspectés. Les requêtes directes au Worker de staging ont reçu un 403 de la passerelle de contrôle ; elles ne constituent pas un test de disponibilité du service.


## 9. Audit complémentaire — exigences fonctionnelles V1.2.1

**Document comparé :** `docs/CAHIER-DES-CHARGES-ARIA-COMPLEMENT-FONCTIONNEL-V1.2.1.md`, disponible sur la branche documentaire `docs/aria-legal-commercial-v1-2`.  
**Périmètre de comparaison :** `main` (base de référence), plus les branches de travail d'intégration vocale et de sécurisation du Worker. Les capacités présentes uniquement dans une branche non fusionnée sont indiquées comme prototypes/propositions, et non comme fonctions livrées.

| Exigence V1.2.1 | État dans `main` | Éléments repérés hors de `main` | Conclusion / action |
|---|---|---|---|
| F-INT-01 — compréhension de l'intention et planification | **Absent / non connecté** : l'interface V0.7 n'est pas connectée à un modèle réel. | La branche `feat/aria-voice-first-onboarding` contient un routage d'intentions et des actions structurées validées par schéma, mais pas un planificateur générique de tâches multi-étapes. | Réutiliser le routage structuré après validation ; définir ensuite un format de plan et des critères de réussite. Ne pas appeler cela un « compilateur d'intentions » complet à ce stade. |
| F-MEM-01 — mémoire contextuelle contrôlée | **Partiel local** : notes et historique sont stockés dans le navigateur. | La branche d'intégration staging fournit des routes de mémoire KV. La branche vocale ajoute un consentement explicite et une suppression/synchronisation confirmée côté serveur. Des identités alpha provisionnées sont prévues dans une branche non fusionnée. | Bloquant : ne pas traiter le `clientId` navigateur comme identité. Lier la mémoire à une identité vérifiée côté serveur, tester l'isolation, le consentement désactivé, l'export/suppression et les échecs réseau. |
| F-ACT-01 — exécution et vérification des actions | **Absent comme boucle d'agent** : le front-end V0.7 ne fournit pas d'exécution d'outils IA vérifiée. | Le routage vocal classe certaines actions d'interface ; cela ne démontre pas l'exécution générale de tâches ni une vérification de résultats externes. | Créer des contrats d'outils, des états d'action explicites et des tests réussite/échec/timeout/annulation avant d'élargir les actions disponibles. |
| F-CONT-01 — continuité et reprise des tâches | **Absent** : l'historique local ne constitue pas un état structuré de tâche reprenable. | Aucun état durable de tâche multi-étapes n'a été identifié dans les fichiers examinés. | Définir un modèle de tâche versionné (objectif, étape, preuves, dépendances, prochaine action) après les fondations d'identité et de persistance. |
| F-SKILL-01 — compétences réutilisables | **Absent / non trouvé** : pas de registre de compétences versionnées ni de banc de tests par compétence. | Aucun registre correspondant identifié dans les branches examinées. | Différer jusqu'à ce que le contrat d'outil et les tests d'exécution soient stables ; exiger permissions explicites, versions et retour arrière. |
| F-PRO-01 — proactivité et gestion de l'attention | **Absent / non trouvé** : aucune orchestration planifiée ou gestion des notifications identifiée. | Des préférences de proactivité sont présentes dans le prototype vocal, mais pas un système de surveillance planifiée démontré. | Commencer par préférences, règles de fréquence et déclencheurs explicites ; ne pas annoncer de surveillance active sans ordonnanceur/connecteurs opérationnels. |
| F-DEC-01 — mémoire des décisions | **Absent / non trouvé** : les notes ne distinguent pas décisions, hypothèses, options rejetées et raisons. | Aucun registre de décisions structuré identifié. | Ajouter après la mémoire par compte et le modèle de tâches, avec statut et mécanisme de réévaluation. |
| ARCH-01 — modularité | **Partiel** : séparation basique HTML/CSS/JS, mais pas de contrats internes complets pour planification, outils, mémoire et vérification. | Les branches d'intégration séparent UI, Worker et moteur de visualisation. | Formaliser les contrats et leurs tests avant d'ajouter des modules spécialisés. |
| ARCH-02 — indépendance du fournisseur IA | **Partiel / non démontré** : le socle `main` n'est pas connecté à un fournisseur. Le Worker alpha examiné appelle directement une API fournisseur. | Le Worker garde la clé côté serveur, mais son appel et son format sont spécifiques au fournisseur. | Définir une interface fournisseur interne, sans abstraction prématurée ; tester au moins un adaptateur réel et un adaptateur simulé. |
| SEC-01 — autonomie contrôlée | **Partiel** : pas de système d'actions agentiques dans `main`. | Les branches de staging ajoutent des contrôles d'entrée ; la PR #18 propose le rejet du rôle `system` client, des limites de taille et la suppression du profil personnel codé en dur. La PR #19 documente une architecture d'authentification individuelle, mais n'implémente pas une inscription publique. | P0 : fusionner uniquement après revue, CI et tests de staging autorisés ; conserver le contrôle d'accès côté serveur. L'authentification multi-utilisateur reste un bloqueur distinct. |
| OBS-01 — traçabilité et preuve | **Partiel** : états d'interface de base, pas de preuve durable par action. | Des tests et des messages d'erreur existent dans les branches de travail, mais aucune piste d'audit générale des actions n'a été identifiée. | Ajouter journaux minimisés sans secrets/contenu privé inutile, corrélation d'action et résultat vérifié. |
| UX-01 — expérience ARIA cohérente | **Partiel dans `main`** : PWA responsive ; l'expérience vocale/HUD plus avancée se trouve dans une branche non fusionnée. | La branche vocale inclut onboarding, écoute interrompable, contrôles explicites et visualisations de démonstration clairement limitées. | Conserver le principe vocal/HUD ; tester sur iPhone réel et ne pas confondre scène de démonstration avec données 3D ou cartographiques réelles. |

### 9.1 Conclusion de l'audit fonctionnel

Les sept exigences fonctionnelles de l'annexe V1.2.1 ne sont pas toutes implémentées dans `main`. La mémoire locale est la seule capacité proche d'une première version, et elle ne remplace pas une mémoire distante isolée par identité. Le routage d'intentions, le consentement mémoire, la voix et certaines visualisations existent dans des branches de travail, mais ne doivent pas être annoncés comme livrés tant que les PR correspondantes ne sont pas fusionnées, testées et déployées.

Les éléments les plus risqués sont toujours l'identité utilisateur, l'autorisation côté serveur et l'isolation mémoire. La validation des entrées (PR #18) améliore la sécurité, mais ne résout pas à elle seule le problème du jeton partagé ni l'absence d'inscription/authentification publique. La proposition d'authentification individuelle (PR #19) est documentaire et conditionnelle à une configuration explicite ; aucun projet Supabase n'est réputé créé ou connecté sur la seule base de cette proposition.

## 10. Feuille de route ajustée aux exigences V1.2.1

Les priorités suivantes complètent les phases existantes ; elles ne remplacent pas les obligations de conformité, les contrôles de sécurité ni la validation sur appareil réel.

### P0-A — Consolider et valider les frontières de confiance du Worker
1. Examiner le diff et la CI de la PR #18 (rôles de messages, tailles de corps/messages, profil générique, tests).
2. Conserver l'exigence d'identité individuelle comme bloqueur avant toute distribution à plusieurs personnes ; ne pas partager le jeton d'alpha.
3. Choisir explicitement la solution d'identité (par exemple une intégration Auth validée) avant d'implémenter les comptes. Ne pas supposer qu'une proposition documentaire ou un binding KV suffit.
4. Dériver côté serveur l'identité qui indexe la mémoire ; ignorer tout identifiant de propriétaire envoyé par le navigateur.
5. Ajouter des tests négatifs d'isolation inter-comptes, consentement mémoire désactivé, suppression confirmée, token absent/invalide, origine inconnue et limites de requête.
6. Vérifier les résultats CI et le runtime de staging sans lire les secrets ni toucher à `aria-brain` production.

**Sortie attendue :** contrat API documenté, contrôles d'entrée validés, identité serveur choisie, aucune affirmation de sécurité multi-utilisateur sans tests d'isolation réussis.

### P0-B — Intégrer l'expérience vocale/HUD sans élargir prématurément l'autonomie
1. Revoir la PR #15 : onboarding, consentement mémoire, sérialisation/annulation de la voix, sorties d'intention structurées, validation de schéma et états de visualisation.
2. Vérifier que le Worker et le client utilisent le même contrat de sortie ; rejeter les actions inconnues ou malformées.
3. Exécuter les tests automatisés existants, puis compléter les cas d'échec et tester sur iPhone réel.
4. Garder les visualisations de démonstration étiquetées comme telles tant qu'aucune donnée ou simulation réelle n'est connectée.

**Sortie attendue :** une interaction vocale cohérente et testable, sans prétendre qu'ARIA exécute déjà des tâches générales.

### P1-A — Mémoire par compte et continuité
1. Implémenter une mémoire distante associée à l'identité vérifiée, avec consentement, consultation, correction, suppression et stratégie de reprise sur erreur.
2. Créer un état de tâche distinct des simples messages/souvenirs.
3. Persister objectif, étapes, résultats vérifiés, dépendances et prochaine action.
4. Tester fermeture/réouverture, interruption réseau et reprise sans rejouer aveuglément une action non idempotente.

**Sortie attendue :** mémoire contrôlée par compte et tâches reprenables avec état vérifiable.

### P1-B — Exécution vérifiée et compétences
1. Définir un contrat d'outil (schéma d'entrée/sortie, permissions, délais, erreurs, preuve de résultat).
2. Introduire des états « prévu », « en cours », « réussi », « échoué », « bloqué » et « non vérifié ».
3. Autoriser uniquement les outils explicitement déclarés et testés ; demander confirmation pour les opérations sensibles.
4. Transformer une procédure en compétence versionnée seulement après réussite des tests ; prévoir comparaison et retour arrière.

**Sortie attendue :** aucune action annoncée comme réussie sans preuve, aucune compétence capable d'augmenter ses propres permissions.

### P2 — Mémoire des décisions et proactivité
1. Ajouter un registre structuré des décisions, hypothèses, alternatives et raisons, avec possibilité de réévaluation.
2. Définir préférences de notification, fréquence, périodes de silence, sources autorisées et déclencheurs explicites.
3. N'activer la proactivité que lorsque l'ordonnanceur ou l'intégration source existe réellement et a été testé.
4. Mesurer les faux positifs et le coût d'interruption avant de généraliser les notifications.

**Sortie attendue :** suggestions utiles et contrôlables, sans surveillance implicite ni notifications excessives.

### P3 — Abstraction fournisseur et évolutivité
1. Introduire une interface interne stable pour les fournisseurs IA, seulement au niveau nécessaire aux cas d'usage existants.
2. Garder mémoire, autorisations, état des tâches et journalisation indépendants du format propriétaire du modèle.
3. Tester les erreurs, indisponibilités et changements de fournisseur sans exposer les secrets.
4. Reporter le registre étendu de compétences et les simulations avancées jusqu'à la stabilité des contrats d'outils.

**Sortie attendue :** capacité de changer de modèle sans reconstruire la mémoire et l'orchestration.

### Prochain incrément recommandé

**Le prochain incrément de plus grande valeur est une revue consolidée de la PR #18 et de la PR #19, puis la validation du chemin d'authentification et de mémoire par identité avant de brancher davantage de capacités.** La PR #18 durcit la validation d'entrée, mais ne résout pas l'identité multi-utilisateur. La PR #19 décrit une architecture possible, mais son choix de fournisseur et sa configuration doivent être confirmés. Ne pas fusionner automatiquement, ne pas déployer, et ne pas toucher à la production dans le cadre de cet audit documentaire.

---
