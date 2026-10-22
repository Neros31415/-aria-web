# ARIA — Architecture proposée pour l'authentification individuelle

**Date :** 22 octobre 2026  
**Statut :** proposition d'architecture, non implémentée et non déployée.  
**Périmètre :** remplacement progressif du jeton partagé de l'alpha Cloudflare Worker.

## Décision proposée

Adopter **Supabase Auth comme fournisseur d'identité**, tout en conservant le Worker Cloudflare comme point d'entrée du modèle IA et de la mémoire pendant cette phase.

Cette option reste une proposition : l'inventaire des connexions Supabase disponibles dans l'espace de travail n'a retourné **aucun projet**. Aucun projet n'a été créé et aucun coût n'a été engagé. Avant d'implémenter le flux, il faut sélectionner/créer explicitement le projet et configurer ses domaines de redirection.

Ne pas distribuer le jeton `ARIA_ACCESS_TOKEN` actuel à des utilisateurs finaux. Il s'agit d'un secret de service partagé, pas d'une identité de compte.

## Flux d'authentification cible

1. L'utilisateur s'inscrit ou se connecte via Supabase Auth depuis l'application.
2. Le client obtient un jeton d'accès utilisateur Supabase et l'envoie au Worker dans `Authorization: Bearer <access_token>`.
3. Le Worker vérifie cryptographiquement le jeton avant d'accéder à la mémoire ou d'appeler le fournisseur IA :
   - signature via les clés publiques/JWKS du projet configuré ;
   - émetteur (`iss`) attendu ;
   - audience (`aud`) attendue ;
   - expiration (`exp`) et date de validité (`nbf` si présente) ;
   - sujet (`sub`) non vide et format conforme à l'identité du fournisseur.
4. Le Worker dérive l'identité exclusivement du jeton vérifié. Les valeurs `clientId`, `userId`, `role` ou `isAdmin` envoyées par le navigateur ne sont jamais des preuves d'identité ou d'autorisation.
5. Le Worker limite la mémoire à un espace associé au sujet authentifié, par exemple `memory:v2:<sub>`. Le client ne choisit plus la clé de stockage.
6. Les requêtes non authentifiées ou avec un jeton invalide sont rejetées avant tout accès à la mémoire ou tout appel payant au modèle.

Le Worker doit utiliser une bibliothèque JWT maintenue et compatible Cloudflare Workers, ou une implémentation de validation cryptographique documentée et testée. Ne pas écrire un décodeur JWT artisanal qui ne vérifie que le contenu du jeton. Les clés publiques JWKS doivent être mises en cache avec une stratégie de rotation et d'échec sûre.

## Autorisation : compte, rôle et offre commerciale

Ces trois concepts doivent rester distincts.

- **Identité** : sujet du jeton vérifié.
- **Rôle d'administration** : privilège attribué côté serveur. Ne jamais l'accepter depuis `user_metadata`, un champ client, un code d'invitation ou une clé cadeau. Si des claims Supabase sont utilisés, s'appuyer sur des claims contrôlés côté serveur (`app_metadata`) et tenir compte de leur fraîcheur jusqu'au renouvellement du jeton. Pour les opérations administratives sensibles, envisager une vérification en base et imposer la MFA.
- **Offre/entitlement** : plan Free/Premium/Pro ou accès cadeau, stocké et contrôlé côté serveur. Une clé premium ne doit jamais conférer le rôle Super Admin.

Le système de clés premium devra, dans une étape ultérieure, créer des clés uniquement depuis une interface d'administration authentifiée, ne stocker que leur empreinte côté serveur, permettre une consommation atomique à usage unique, et journaliser l'émission, l'activation, la révocation et l'identité administrative responsable. Cette partie n'est pas implémentée par ce document.

## Isolation et cycle de vie de la mémoire

- Les routes `GET /memory`, `PUT /memory` et `POST /chat` obtiennent l'identité à partir du jeton validé.
- Supprimer les paramètres client qui déterminent le propriétaire des notes.
- Ajouter des tests négatifs : l'utilisateur A ne peut pas lire, remplacer ou supprimer les notes de B, même en forgeant un `clientId` ou un `userId`.
- Définir un processus de suppression de compte et de mémoire, en tenant compte de la cohérence éventuelle de KV et des délais de propagation.
- Garder les limites de taille et les futures limites de débit côté serveur. CORS n'est pas un mécanisme d'autorisation.

## Migration sans casser l'alpha existante

1. Créer/configurer un projet Auth de développement distinct, avec domaines de redirection limités.
2. Implémenter un validateur JWT et des tests de signature invalide, issuer incorrect, audience incorrecte, jeton expiré et sujet manquant.
3. Ajouter une version de route ou un mode de staging réservé aux comptes Auth, avec une clé mémoire versionnée distincte (`memory:v2:`).
4. Tester l'isolation entre deux comptes indépendants et l'échec fermé lorsque l'authentification ou JWKS est indisponible.
5. Mettre à jour l'interface pour gérer inscription, connexion, déconnexion, renouvellement et expiration de session. Ne jamais conserver un secret de service dans `localStorage` ou `sessionStorage`.
6. Migrer les notes de l'alpha seulement avec une procédure explicite, après avoir vérifié leur propriétaire. Ne pas importer automatiquement les clés de mémoire fondées sur un UUID navigateur dans des comptes arbitraires.
7. Vérifier les tests et le comportement sur staging, puis demander une revue avant tout déploiement. Garder `aria-brain` production inchangé jusqu'à validation et plan de retour arrière.

## Critères d'acceptation

- [ ] Aucun secret de service partagé n'est requis dans le navigateur.
- [ ] Le Worker rejette les jetons invalides ou expirés avant tout accès aux données.
- [ ] L'identité et le propriétaire mémoire sont toujours dérivés côté serveur.
- [ ] Deux comptes ne peuvent pas accéder aux données l'un de l'autre, y compris en forgeant les identifiants client.
- [ ] Les rôles et les offres sont contrôlés côté serveur et ne sont jamais accordés par des données client.
- [ ] Les limites de corps, de messages et de débit sont testées.
- [ ] Le processus de révocation, de suppression et de retour arrière est documenté.
- [ ] Tous les tests sont exécutés avec résultats enregistrés ; aucune validation n'est présumée.

## Blocages actuels

- Aucun projet Supabase n'est actuellement connecté dans l'espace de travail.
- Le Worker et son frontend actuels utilisent encore le jeton partagé ; ce document ne les modifie pas.
- Le test automatisé du correctif d'entrée doit encore être exécuté.
- Aucun déploiement ou test de bout en bout n'est attesté par ce document.
