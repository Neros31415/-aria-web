# ARIA — Plan de migration des sessions alpha vers des comptes canoniques

**Date :** 23 octobre 2026  
**Statut :** plan opératoire, pas une migration exécutée.  
**Branche de référence :** `feat/aria-brain-staging-integration`

## Décision de sécurité

Ne pas réactiver la mémoire persistante des sessions `session_kv` tant qu'une relation fiable entre une session existante et un compte canonique n'est pas établie par une source d'autorité serveur. Le fait qu'une session soit authentifiée prouve seulement qu'elle possède un jeton valide dans le registre alpha ; cela ne prouve pas quel compte utilisateur devrait en être propriétaire.

Les contrôles actuellement intégrés :
- le Worker refuse les routes mémoire pour les identités `session_kv` avec `409 identity_migration_required` ;
- le chat peut continuer, mais ne lit et n'écrit pas la mémoire persistante de ces sessions ;
- l'adaptateur D1 refuse les identités non UUID avant toute lecture ou écriture ;
- `/health` rapporte `persistentMemory: false` et `memoryStatus: identity_migration_required` dans ce mode.

Ces contrôles ne sont pas la migration. Ils doivent rester actifs jusqu'à la validation de tous les critères ci-dessous.

## État des preuves disponibles dans le dépôt

Le Worker lit le registre de sessions `ARIA_USERS` sous la clé `session:v1:<sha256 du jeton>` et reçoit un identifiant opaque attribué côté serveur. Le dépôt actuel ne montre pas de mécanisme complet de création de comptes ou de liaison session-compte permettant d'attester que cet identifiant opaque correspond à un UUID Supabase Auth. L'identifiant de profil navigateur `clientId`, le jeton lui-même, l'adresse e-mail déclarée par le client ou une ressemblance de noms ne sont pas des preuves de liaison.

**Blocage à lever avant tout développement de migration :** identifier et documenter le composant autoritaire qui crée les sessions alpha, la structure exacte des enregistrements `ARIA_USERS`, et le mécanisme de vérification de possession du compte canonique. Ne pas supposer que ces données existent dans le dépôt ou dans le KV.

## Phases proposées

### Phase 0 — Inventaire sans modification
1. Identifier le compte Cloudflare, l'environnement et le namespace KV exacts utilisés par la configuration de staging ; ne pas inspecter ni modifier la production par défaut.
2. Documenter le schéma réel de chaque enregistrement de session, sa date de création, son expiration/révocation et le processus qui le crée.
3. Inventorier les clés mémoire concernées et les formats de données, sans afficher ni exporter le contenu des notes personnelles dans les logs ou les rapports.
4. Vérifier la rétention, les sauvegardes et la procédure de retour arrière.
5. Produire un rapport de comptage agrégé : sessions valides, expirées, révoquées, sans correspondance et correspondances candidates. Ne jamais journaliser les jetons ou leur valeur brute.

**Sortie attendue :** inventaire relu et approuvé ; aucun changement de données.

### Phase 1 — Établir une liaison vérifiée
1. Le compte canonique doit être obtenu par validation serveur d'un jeton Supabase Auth valide ; l'identifiant retenu est l'UUID issu de la réponse authentifiée.
2. Ajouter une liaison explicite côté serveur entre la session alpha et cet UUID, créée uniquement après une preuve de possession acceptable (par exemple, connexion au compte canonique dans un parcours contrôlé).
3. Ne pas accepter de `userId`, `ownerId`, `role` ou `clientId` fourni par le navigateur comme autorité.
4. Enregistrer les métadonnées minimales nécessaires à l'audit : identifiant de session interne, UUID canonique, heure, source de preuve et acteur/processus. Ne pas enregistrer de jeton ou de contenu de mémoire.
5. En cas de liaison absente, multiple ou contradictoire, garder la session en état non migré et demander une nouvelle authentification ; ne jamais choisir automatiquement une correspondance.

**Critère de sortie :** chaque liaison est univoque, vérifiable côté serveur, révocable et auditée.

### Phase 2 — Prévisualisation et validation des données
1. Générer un plan de migration à blanc, sans écrire, listant les clés source et destination pseudonymisées.
2. Détecter les collisions : plusieurs sessions alpha vers un compte, une même source vers plusieurs comptes, clé destination déjà existante, profil navigateur partagé et enregistrements orphelins.
3. Ne fusionner aucune mémoire automatiquement en cas de collision. Conserver la source intacte et traiter le cas par une procédure explicitement approuvée.
4. Définir les règles de conservation : données copiées, données supprimées à la demande, données non migrables, durée de rétention et mécanisme d'effacement.
5. Vérifier que les clés destination sont exclusivement dérivées de l'UUID authentifié, jamais d'un paramètre client.

**Critère de sortie :** zéro collision non résolue et validation explicite du rapport de prévisualisation.

### Phase 3 — Migration contrôlée
1. Tester sur un namespace de staging isolé et des données synthétiques avant toute donnée réelle.
2. Copier les données approuvées vers une clé versionnée appartenant à l'UUID canonique ; utiliser une opération idempotente et un identifiant de lot.
3. Vérifier les nombres d'éléments, les limites, les empreintes de comparaison appropriées et la propriété de chaque destination sans imprimer les notes.
4. Ne pas effacer les sources pendant la première passe. Les garder temporairement selon une durée approuvée, avec accès restreint et politique d'effacement définie.
5. N'activer la mémoire pour un compte que lorsque sa liaison et sa migration sont validées. Garder les sessions restantes bloquées.

### Phase 4 — Tests de sécurité obligatoires
- Le compte A ne peut ni lire, ni écrire, ni supprimer la mémoire du compte B.
- Un identifiant UUID fourni arbitrairement par le navigateur ne permet pas de changer de propriétaire.
- Jeton expiré, révoqué, invalide ou appartenant à un autre compte : refus.
- Session alpha non liée, liée plusieurs fois ou collisionnée : mémoire persistante toujours refusée.
- Une liaison révoquée bloque immédiatement les accès concernés.
- Les autorisations D1 exigent un UUID canonique et un rôle actif appartenant exactement à cette identité.
- Les pannes KV, D1 ou Supabase échouent de manière fermée : aucune élévation de privilège et aucune fausse confirmation de sauvegarde.
- Les opérations répétées ne dupliquent pas les notes ; les demandes d'effacement sont respectées.
- Les réponses `/health` et l'interface reflètent l'état réel, sans annoncer la mémoire comme disponible prématurément.

### Phase 5 — Activation progressive et retour arrière
1. Déployer d'abord sur staging après revue de code et CI verte ; effectuer des tests manuels avec comptes de test A et B.
2. Activer pour un petit groupe explicitement autorisé, en conservant la possibilité de désactiver le nouveau chemin par configuration serveur.
3. Surveiller uniquement des métriques minimales : taux d'erreur, nombre de migrations réussies/ignorées, collisions et refus d'accès. Exclure jetons et contenu mémoire des logs.
4. En cas d'écart de propriété, de lecture croisée ou de perte de données : désactiver immédiatement la mémoire migrée, préserver les sources et lancer l'incident de sécurité.
5. Après période de validation et approbation de rétention, supprimer les anciennes données uniquement selon la politique validée et les demandes d'effacement.

## Critères d'autorisation avant activation

La migration ne peut être considérée prête que si :
- la source autoritaire de création des sessions et son schéma sont identifiés ;
- la liaison session-compte est prouvée côté serveur ;
- le plan à blanc ne présente aucune collision non résolue ;
- les tests d'isolation, de révocation, d'idempotence et d'effacement passent ;
- les vérifications CI sont vertes ;
- les essais de staging sont documentés ;
- la politique de conservation/effacement et le retour arrière sont approuvés.

## Non-objectifs

Ce plan n'autorise pas à migrer des données de production, à modifier les secrets, à déployer le Worker, à créer des rôles administrateur, ni à réactiver la mémoire alpha par défaut. Aucune de ces actions n'a été exécutée par la rédaction de ce document.
