# ARIA — Cahier des charges consolidé V1.2
**Statut :** spécification produit et sécurité — à valider avant mise en production  
**Date :** 21 octobre 2026  
**Base de travail :** ARIA Web V0.7 et exigences produit consolidées  
**Important :** ce document décrit des exigences cibles. Il ne certifie pas que les fonctions sont déjà développées. L'état connu du dépôt indique notamment que l'authentification, le backend et les paiements ne sont pas encore implémentés dans la base V0.7.

## 1. Principes produit
- ARIA est un assistant personnel évolutif, vocal en priorité, avec une interface HUD discrète, contextuelle et non surchargée.
- L'utilisateur conserve le contrôle de sa mémoire personnelle : consulter, modifier, désactiver et supprimer ses souvenirs lorsque les fonctions correspondantes sont disponibles.
- Les fonctions annoncées publiquement doivent correspondre aux capacités réellement déployées. Les prototypes et fonctions en développement doivent être identifiés comme tels.
- L'accès gratuit doit constituer un produit utile, et non une simple démonstration.
- Les droits d'administration, l'abonnement commercial et les capacités techniques sont trois notions séparées.
- L'administration du système ne donne pas, par défaut, accès aux conversations ou à la mémoire privée des utilisateurs.

## 2. Offres et expériences utilisateur
Les offres commerciales proposées sont :
- **ARIA Free — 0 €** : expérience de base réellement utile, conversation avec les capacités disponibles, interface essentielle, préférences et contrôles de mémoire réellement implémentés.
- **ARIA Plus — prix indicatif à valider** : quotas supérieurs et fonctions personnelles avancées selon disponibilité.
- **ARIA Pro — prix indicatif à valider** : capacités orientées projets et usages professionnels selon disponibilité.
- **Accès offert / ARIA Family / Beta** : accès attribué à des comptes précis au moyen de clés privées créées par le Super Admin.

Les prix évoqués à titre de piste (9,90 €/mois pour Plus et 24,90 €/mois pour Pro) ne sont pas définitifs. Ils ne doivent être affichés comme offres contractuelles qu'après validation des coûts, fonctionnalités, taxes, renouvellement, résiliation et conditions de paiement.

Les quotas doivent être transparents, proportionnés aux coûts réels et affichés avant la souscription. Ne pas promettre d'usage « illimité » si les coûts ne sont pas maîtrisés.

## 3. Comptes et authentification
- Inscription avec identifiant, adresse e-mail et mot de passe; mécanismes de vérification et récupération sécurisés.
- Stocker les mots de passe au moyen d'un algorithme de hachage adapté (par exemple Argon2id ou bcrypt avec paramètres robustes), jamais en clair.
- Proposer l'authentification multifacteur au compte Super Admin et la rendre obligatoire pour les opérations les plus sensibles.
- Limiter les tentatives de connexion et d'activation de clés; surveiller les anomalies sans collecte excessive.
- Ne jamais mettre de secret, mot de passe, clé API ou jeton privilégié dans le code client, les journaux ou le dépôt Git.
- Ne pas intégrer un mot de passe administrateur par défaut dans le code. Créer le compte racine par une procédure d'amorçage sûre, avec secret unique fourni hors du dépôt.

## 4. Rôles et autorisations
Rôles commerciaux : Free, Plus, Pro. Rôles d'autorisation : utilisateur standard et Super Admin. Les deux systèmes sont indépendants.

### Matrice cible
| Action | Free | Plus | Pro | Super Admin |
|---|---|---|---|---|
| Utiliser les fonctions incluses dans son offre | Oui | Oui | Oui | Oui |
| Personnaliser les préférences personnelles | Selon fonctions | Selon fonctions | Selon fonctions | Oui |
| Accéder au code source ou aux secrets de production | Non | Non | Non | Seulement via outils sécurisés autorisés |
| Préparer une modification du code | Non | Non | Éventuellement via fonctions de développement explicitement offertes | Oui |
| Autoriser un changement structurel d'ARIA | Non | Non | Non | Oui, avec contrôle indépendant |
| Créer / lister / révoquer des clés privées | Non | Non | Non | Oui |
| Modifier les rôles ou permissions | Non | Non | Non | Oui, avec journalisation et MFA |
| Lire les conversations ou souvenirs privés d'autres comptes | Non | Non | Non | Non par défaut; accès exceptionnel, justifié, minimal et audité seulement si légalement nécessaire et techniquement autorisé |

### Protection de l'intégrité
- Toute action sensible est autorisée côté serveur à chaque requête.
- Le client ne peut pas s'accorder un rôle, modifier son plan ou contourner les quotas.
- ARIA peut proposer des modifications, préparer des diffs et lancer des tests; elle ne peut ni s'élever en privilèges, ni modifier sa propre politique d'autorisation, ni appliquer une modification structurelle sans autorisation indépendante du Super Admin.
- Les changements de code doivent passer par une branche, des tests, une revue de diff et une procédure de retour arrière. Éviter les modifications directes de `main`.
- Les modifications des règles de sécurité ne doivent pas permettre de supprimer les journaux d'audit ou de contourner l'autorisation indépendante.

## 5. Clés privées d'accès offertes
La création, la consultation de la liste complète, la configuration, la révocation et l'émission de clés sont réservées au Super Admin dans un espace administratif authentifié et protégé par MFA.

### Types envisagés
- **Plus Gift** : activation de Plus pendant une durée définie.
- **Pro Gift** : activation de Pro pendant une durée définie.
- **Family** : attribution de places limitées à des comptes distincts; le nombre de places et les droits sont définis au moment de l'émission.
- **Beta** : accès à une version de test, avec indication claire du caractère expérimental.

### Règles obligatoires
- Génération cryptographiquement aléatoire côté serveur; aucune clé construite à partir du nom de l'administrateur.
- Afficher la valeur complète de la clé uniquement au moment de sa création, si possible; stocker une empreinte cryptographique, pas la clé en clair.
- Définir offre, durée, date d'expiration de l'invitation, nombre maximal d'activations et, si nécessaire, bénéficiaire autorisé.
- Par défaut, une clé individuelle est à usage unique. Les invitations Family utilisent un quota de places contrôlé côté serveur.
- Activer une clé exige un compte authentifié; une clé ne confère jamais un rôle administrateur.
- Protection contre les tentatives répétées, réponses d'erreur non révélatrices, journalisation de la création/activation/révocation.
- Révocation disponible au Super Admin. Le système précise si la révocation annule seulement la clé non utilisée ou retire également l'avantage déjà activé; cette règle est présentée avant l'émission.
- Une clé ne doit jamais être exposée dans les URL, journaux applicatifs, analytics ou outils de suivi.
- Les comptes des proches restent distincts; la gestion d'un accès offert ne permet pas au Super Admin de consulter leurs conversations ou leur mémoire privée.

## 6. Création de compte, CGU et newsletter
Le formulaire d'inscription comporte :
1. Identifiant, adresse e-mail et mot de passe.
2. Lien lisible vers les Conditions générales d'utilisation en vigueur.
3. Case d'acceptation des CGU obligatoire, décochée par défaut.
4. Case séparée, facultative et décochée par défaut pour recevoir la newsletter et les communications marketing.
5. Lien vers la politique de confidentialité.

Le refus de la newsletter ne doit pas empêcher la création du compte. L'acceptation des CGU ne vaut pas consentement marketing.

Conserver une preuve proportionnée de l'acceptation des CGU (version, date/heure, compte) et du consentement newsletter (état, date/heure, source, retrait éventuel). Ne pas conserver inutilement l'adresse IP ou d'autres données comme preuve si elles ne sont pas nécessaires et justifiées. Chaque newsletter commerciale doit identifier l'expéditeur et proposer une désinscription simple et gratuite. Les e-mails strictement nécessaires au compte (sécurité, facturation, service) sont distingués des messages promotionnels.

## 7. Données personnelles et confidentialité
- Publier une politique de confidentialité avant l'ouverture au public.
- Identifier le responsable de traitement par sa dénomination légale, son adresse et un contact; désigner le DPO s'il y en a un.
- Inventorier les données, finalités, bases légales, destinataires, prestataires, transferts internationaux et durées de conservation.
- Informer sur les données de compte, conversations, mémoire, voix/audio si traités, journaux de sécurité, paiements (via prestataire) et consentement newsletter.
- Établir des durées de conservation réelles, et non fictives, par catégorie; appliquer suppression, anonymisation ou archivage légal lorsque nécessaire.
- Permettre l'exercice des droits RGPD et documenter la procédure de réponse.
- Encadrer contractuellement les prestataires et les modèles d'IA; vérifier si les données envoyées à chaque prestataire sont conservées ou utilisées pour entraîner ses modèles.
- Mettre en œuvre minimisation, chiffrement en transit et au repos lorsque approprié, contrôle d'accès, sauvegardes, gestion des incidents et tests.
- Ne jamais promettre que les données « ne quittent jamais le serveur » si des prestataires externes sont utilisés.

## 8. Abonnements, paiements et droits des consommateurs
Avant la mise en vente, afficher les caractéristiques essentielles, prix total TTC, périodicité, renouvellement, durée d'engagement, modalités de résiliation, restrictions, moyens de paiement et coordonnées du professionnel. Envoyer une confirmation du contrat sur support durable.

Définir avec le prestataire de paiement le statut des abonnements, les échecs de paiement, les remboursements, la résiliation, les changements de formule et la prévention de la double facturation. Présenter le droit de rétractation et toute demande de commencement anticipé d'un service numérique selon les règles applicables. Ne pas supprimer les droits impératifs des consommateurs par les CGU.

Les accès offerts par clé ne déclenchent pas de paiement au bénéficiaire tant que le parcours ne l'annonce pas clairement. Une conversion ultérieure en abonnement payant nécessite une information et un consentement distincts.

## 9. Sécurité et journalisation
- Contrôle d'accès côté serveur, moindre privilège et séparation des environnements.
- Secrets gérés dans un gestionnaire de secrets ou variables d'environnement sécurisées.
- Journaux d'audit protégés contre l'altération, avec identité, date, action, objet et résultat; limiter les données sensibles enregistrées.
- Procédures d'incident, de rotation des secrets, de restauration et de signalement des violations de données.
- Les logs ne doivent jamais contenir mots de passe, clés d'accès complètes, contenu intégral des conversations par défaut, ou secrets d'API.

## 10. Expérience utilisateur
- Interaction vocale prioritaire; les contrôles visuels restent accessibles et explicites.
- Interface HUD discrète, fluide et cohérente entre site et application.
- Les fonctions indisponibles ne sont pas présentées comme opérationnelles.
- Les états d'abonnement, les limites et l'activation des clés sont compréhensibles.
- Les préférences de confidentialité et la gestion de la newsletter sont accessibles depuis les paramètres du compte.

## 11. Tests d'acceptation obligatoires
1. Un utilisateur Free ne peut pas appeler les routes Super Admin, même en modifiant manuellement les requêtes.
2. Un compte Plus/Pro ne peut pas générer ou lister des clés.
3. Une clé individuelle ne peut être activée qu'une fois; une clé expirée ou révoquée est rejetée.
4. Une clé premium ne peut jamais attribuer un rôle administrateur.
5. Les autorisations sont vérifiées côté serveur et non uniquement dans l'interface.
6. La case newsletter est facultative, séparée, non précochée et le retrait est effectif.
7. L'inscription est bloquée si les CGU obligatoires ne sont pas acceptées.
8. La version des CGU acceptée est traçable.
9. Les données de deux comptes (conversations, mémoire, exports) sont strictement isolées.
10. La suppression du compte et les demandes de droits déclenchent une procédure vérifiable, sous réserve des obligations légales de conservation.
11. Les changements de code passent par une branche et une revue; les tests et le retour arrière sont documentés.
12. Les pages légales affichent l'identité réelle de l'éditeur, les contacts et les prestataires réellement utilisés.

## 12. Conditions de mise en production
Ne pas ouvrir les comptes ou abonnements au public avant :
- la désignation et l'affichage de l'identité juridique de l'éditeur;
- l'inventaire des traitements et prestataires réels;
- la validation des CGU et de la politique de confidentialité par une personne compétente en droit applicable;
- la vérification des tarifs, taxes, paiements, rétractation et résiliation;
- l'implémentation et le test de l'authentification, des rôles, des clés et des droits RGPD;
- la vérification de l'absence de secrets dans le dépôt et le client;
- une revue de sécurité et un test de séparation des comptes.

## 13. Points encore à renseigner
- Identité juridique, forme juridique, adresse et numéro d'immatriculation de l'éditeur.
- Adresse de contact et contact vie privée/DPO éventuel.
- Hébergeur, région d'hébergement, prestataire e-mail/newsletter, prestataire de paiement et fournisseurs de modèles IA.
- Données exactes traitées par chaque fournisseur, sous-traitance et transferts hors EEE.
- Durées de conservation réelles.
- Prix définitifs, quotas, fonctionnalités livrées et politique de remboursement.
- Âge minimum et parcours applicables aux mineurs.
- URL de production et coordonnées du support.


---

## 14. Vision cible V1.3 — Assistant personnel universel et orchestrateur

**Statut :** vision cible progressive ; ce document ne certifie aucune implémentation.

ARIA doit devenir une intelligence personnelle multimodale qui comprend un objectif, mobilise les outils et appareils autorisés, planifie, exécute, vérifie et s'adapte aux imprévus. L'expérience principale reste vocale et contextuelle : l'utilisateur explore et manipule des espaces numériques tandis qu'ARIA coordonne les capacités spécialisées.

### 14.1 Matériels et environnement
- Découvrir via des connecteurs autorisés les appareils, applications, services, capteurs et capacités disponibles, leur état, leurs permissions et leurs limites.
- S'adapter à l'iPhone, l'ordinateur, le navigateur et aux appareils compatibles sans supposer une intégration ou permission inexistante.
- Séparer découverte, lecture, préparation et exécution ; arrêter les actions risquées si l'état est inconnu ou périmé.
- Utiliser des connecteurs modulaires, documentés, remplaçables et fondés sur des interfaces officiellement prises en charge.

### 14.2 Domotique
- À terme, consulter et piloter les appareils compatibles : éclairage, température, prises, capteurs, scènes et autres équipements autorisés.
- Vérifier l'état après exécution, fournir un historique compréhensible et une annulation lorsque possible.
- Ne jamais prétendre contrôler un appareil non connecté ou non vérifié ; appliquer des confirmations adaptées au risque physique.

### 14.3 Administration et finances
- Organiser documents, formulaires, échéances, rendez-vous et démarches ; préparer des dossiers et brouillons ; vérifier pièces et dates avec provenance des informations.
- Analyser revenus/dépenses et suivre un portefeuille via des sources autorisées, en affichant date, frais, risques et incertitudes.
- Commencer par la lecture et la préparation. Toute transaction, transfert, ordre d'investissement, signature, soumission officielle ou engagement juridiquement contraignant exige une confirmation explicite juste avant exécution.
- Ne jamais garantir de rendement ou de résultat administratif ; protéger strictement identifiants bancaires, documents d'identité et données fiscales.

### 14.4 Modélisation 3D et simulation
- Orchestrer des outils spécialisés pour créer, inspecter, convertir et modifier des modèles 3D.
- Représenter les contraintes pertinentes : géométrie, dimensions, matériaux, masse, résistance, mouvement, tolérances, thermique, électricité, énergie, environnement, coût, fabrication, accessibilité et normes applicables.
- Rendre explicites unités, hypothèses, données manquantes et compromis ; utiliser un solveur adapté et distinguer une animation illustrative d'une simulation validée.
- Toute conception critique doit faire l'objet d'une validation qualifiée avant usage réel.

### 14.5 Appels et communications
- Permettre à terme des appels ou communications via des fournisseurs compatibles, lorsque les permissions et règles applicables le permettent.
- Contrôler le motif, l'identité d'ARIA, les informations partagées, le consentement et les règles d'enregistrement.
- Demander confirmation avant un appel engageant ou susceptible de divulguer des données sensibles ; proposer une alternative honnête si l'appel n'est pas disponible.

### 14.6 Autonomie et gestion de projets
- Transformer un objectif en plan comprenant dépendances, ressources, échéances, budget, risques et critères de réussite.
- Exécuter les étapes à faible risque dans un périmètre préautorisé, vérifier le résultat, reprendre après interruption et réordonner le plan si les conditions changent.
- Détecter blocages et imprévus, rechercher des alternatives, respecter des budgets de temps/coût/appels d'outils et demander une décision lorsque le risque ou l'incertitude dépasse le seuil défini.
- Conserver l'état des tâches, décisions, résultats vérifiés et prochaine étape ; éviter les doublons et reprises aveugles lorsque le résultat précédent est incertain.

### 14.7 Présence et espace interactif
- Garder un HUD discret, cohérent et non surchargé, la voix prioritaire et une présence visuelle facultative.
- Passer contextuellement de la conversation à des cartes, schémas, modèles 3D, visualisations scientifiques et simulations ; permettre de sélectionner, déplacer, isoler, annoter et modifier les paramètres sans perdre le contexte.
- La transition immersive par le symbole A est une direction UX à valider, pas une fonction acquise.
- Adapter l'expérience aux limites matérielles, réseau, accessibilité et autonomie.

### 14.8 Architecture, sécurité et critères
Chaque connecteur déclare ses capacités, schémas, permissions, coûts, limites, risques, délais, idempotence, annulation et méthode de vérification. Les permissions sont appliquées côté serveur ; comptes et mémoires sont isolés. Les contenus externes sont des données non fiables. Les actions sensibles, externes, financières, publiques, irréversibles ou juridiquement engageantes exigent confirmation appropriée. Les états d'action doivent distinguer planifié, en cours, réussi et vérifié, échoué, bloqué et incertain.

Critères d'acceptation : tests de refus des actions non autorisées et d'isolation inter-comptes ; reprise d'une tâche sans duplication ; replanification après imprévu simulé ; confirmation des actions sensibles ; distinction explicite entre rendu, résultat de solveur et validation indépendante ; test en environnement contrôlé avant activation domotique ou appels réels ; aucune capacité non connectée présentée comme opérationnelle.

**Limite explicite :** ARIA ne peut garantir la compatibilité avec tous les matériels, contraintes physiques, démarches ou imprévus. Elle doit exposer ses limites et demander une validation humaine lorsque nécessaire.
