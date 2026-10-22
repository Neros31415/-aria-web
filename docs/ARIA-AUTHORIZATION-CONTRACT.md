# ARIA — Contrat d’autorisation serveur

**Date :** 22 octobre 2026  
**Statut :** spécification de sécurité pour ARIA 1.0 ; ne constitue pas une autorisation déjà déployée.  
**Objectif :** définir des règles vérifiables avant l’ajout des comptes administrateurs, des offres Free/Premium et des clés destinées aux proches.

## 1. Règle de confiance

L’authentification répond à « qui est connecté ? ». L’autorisation répond à « que cette identité peut-elle faire ? ». Une identité validée ne confère aucun privilège administratif ni abonnement.

Les valeurs suivantes reçues du navigateur ne sont jamais une preuve d’autorisation : `role`, `isAdmin`, `isSuperAdmin`, `plan`, `premium`, `entitlement`, `userId`, `ownerId`, `clientId`, code d’invitation ou clé cadeau. Elles peuvent être ignorées ou rejetées, mais ne doivent jamais accorder de droits.

## 2. Sources d’autorité

- **Identité :** identifiant issu de la validation serveur du jeton utilisateur.
- **Rôle :** registre serveur protégé, indexé par l’identifiant authentifié. Aucun endpoint public ne peut modifier ce registre.
- **Offre/entitlement :** registre serveur distinct du rôle, avec état, période de validité et origine de l’attribution.
- **Clé cadeau :** secret aléatoire à usage unique ; seule son empreinte est conservée. La consommation doit être atomique et attribuer uniquement l’offre autorisée, jamais un rôle.
- **Super Admin :** attribution explicite et auditée hors du parcours public. Une clé cadeau, un abonnement, un champ de profil ou une invitation ne peuvent jamais créer ce rôle.

Aucun binding KV réel ni registre de rôles/offres n’est encore configuré. Le module de lecture `authorizeFromStore` et les préfixes de stockage sont implémentés dans `cloudflare/aria-authorization.mjs`, mais ils ne sont pas branchés aux routes du Worker et aucun endpoint de provisionnement n’existe. Ne pas présenter cette couche comme un système d’autorisation complet ou déployé.

## 3. Matrice minimale des droits

| Action | Visiteur | Compte utilisateur | Premium actif | Admin | Super Admin |
|---|---:|---:|---:|---:|---:|
| Utiliser les fonctions publiques autorisées | Oui | Oui | Oui | Oui | Oui |
| Lire/modifier/supprimer sa propre mémoire | Non | Oui | Oui | Oui | Oui |
| Accéder à la mémoire d’un autre compte | Non | Non | Non | Non, sauf outil d’assistance explicitement autorisé et audité | Non par défaut |
| Utiliser une fonction réservée Premium | Non | Non | Oui | Selon besoin explicite | Selon besoin explicite |
| Créer/révoquer des clés cadeau | Non | Non | Non | Selon permission serveur explicite | Oui |
| Attribuer ou révoquer un rôle Admin | Non | Non | Non | Non | Oui, avec MFA et audit |
| Modifier les paramètres globaux de sécurité | Non | Non | Non | Non | Oui, avec MFA et audit |

Un compte administrateur n’obtient pas automatiquement l’accès au contenu privé des utilisateurs. Toute exception doit être définie pour une action précise, justifiée, journalisée et limitée dans le temps.

## 4. Contrat de décision côté serveur

Toute route protégée doit suivre cet ordre :

1. Valider le jeton et dériver l’identité.
2. Charger le rôle et l’offre depuis leurs sources de confiance côté serveur.
3. Vérifier explicitement la permission requise pour cette action.
4. Appliquer les limites de débit et les validations d’entrée.
5. Exécuter l’action minimale autorisée.
6. Émettre un journal d’audit sans jeton, secret, contenu de mémoire ni données personnelles superflues.

Si l’identité, le registre de rôles, l’offre ou la politique ne peut pas être vérifié, refuser l’action protégée par défaut. Une panne d’un registre ne doit pas transformer un utilisateur en administrateur ni accorder Premium. Les erreurs publiques restent génériques.

## 5. Opérations administratives sensibles

- Exiger une session authentifiée, une permission dédiée et une MFA récente.
- Vérifier la permission côté serveur à chaque requête, pas seulement dans l’interface.
- Journaliser l’acteur, l’action, la cible, l’horodatage et le résultat, sans stocker les secrets.
- Prévoir révocation, rotation, expiration et prévention des rejeux pour les clés cadeau.
- Empêcher l’auto-attribution de rôle et l’élévation de privilèges par modification de profil.
- Ne pas utiliser CORS, un bouton masqué ou une route non liée dans l’interface comme contrôle d’accès.

## 6. Tests d’acceptation obligatoires

1. `role: "admin"`, `isAdmin: true` ou `isSuperAdmin: true` envoyé par un utilisateur ne change aucun droit.
2. Un compte Free ne peut pas utiliser une fonction Premium en forgeant `plan: "premium"`.
3. Une clé cadeau ne peut jamais attribuer un rôle administrateur.
4. Un utilisateur ne peut ni lire ni modifier le rôle ou l’offre d’un autre compte.
5. Un registre de rôles indisponible entraîne un refus fermé des opérations privilégiées.
6. Un utilisateur authentifié sans permission reçoit un refus sans effet de bord.
7. Une clé cadeau ne peut être activée qu’une fois, même en cas de requêtes concurrentes.
8. La révocation d’un rôle ou d’un entitlement prend effet dans le délai de cohérence documenté.
9. Toute opération privilégiée exige la MFA définie par la politique et produit une entrée d’audit.
10. Les tests de mémoire garantissent que les rôles n’ouvrent pas implicitement l’accès aux données privées.

## 7. Séquence d’implémentation

1. Finaliser l’authentification individuelle et l’isolation mémoire de la PR #21.
2. Sélectionner explicitement le projet Auth de développement ; aucun projet ou coût ne doit être créé sans décision explicite.
3. Choisir et documenter le registre persistant de rôles/offres et ses contrôles d’accès.
4. Implémenter les fonctions serveur pures de décision d’accès et leurs tests négatifs.
5. Ajouter les endpoints administratifs derrière authentification, permission dédiée, MFA et audit.
6. Ajouter les clés cadeau à usage unique et les offres Free/Premium sans lien avec les rôles.
7. Intégrer les écrans compte et administration à l’interface sans leur confier l’autorité.
8. Exécuter CI et tests de bout en bout en staging, faire relire la sécurité, puis seulement demander une autorisation distincte pour toute mise en production.

## 8. État vérifié

- Authentification individuelle et mémoire par compte : implémentation initiale dans la PR #21, ouverte et non fusionnée.
- Projet Auth réel : non configuré.
- Registre serveur de rôles/offres, MFA, endpoints administratifs, clés cadeau et audit : non implémentés.
- Le module `cloudflare/aria-authorization.mjs` implémente une décision d’accès et une lecture en mode fermé via le binding serveur `ARIA_AUTHZ`, sans méthode publique de mutation.
- Tests CI couvrent désormais les permissions et la lecture du registre simulé ; cela ne valide ni un binding KV réel ni l’intégration aux routes.
- Ce document formalise le contrat ; il ne prétend pas que les fonctionnalités décrites existent déjà.


## 7. Limite importante du stockage KV
Le binding `ARIA_AUTHZ` est actuellement une interface de lecture testée, pas un registre déployé. Cloudflare KV étant éventuellement cohérent, il ne doit pas être retenu seul comme source d’autorité pour les changements de privilèges qui exigent une révocation immédiate. Avant d’activer les opérations administratives, choisir et valider un stockage autoritatif adapté (par exemple D1 avec contraintes et opérations transactionnelles, ou une base serveur équivalente), documenter la révocation, l’audit et la restauration, puis intégrer le dépôt aux routes. Le binding KV reste un adaptateur/prototype tant que cette décision n’est pas validée.


## 8. D1 comme source autoritative envisagée
Le dépôt contient désormais :
- `migrations/0001_aria_authorization.sql` : tables séparées pour rôles, droits d’offre et journal d’audit.
- `cloudflare/aria-authorization-d1.mjs` : adaptateur de lecture D1 en lecture seule, requêtes paramétrées et refus fermé si binding, rôle ou données manquent.
- `tests/aria-authorization-d1.test.mjs` : tests unitaires de l’adaptateur.

**Statut réel :** aucun projet Supabase n’est connecté et aucun D1 n’est encore créé/configuré pour ARIA. La migration est un artefact versionné, pas une migration appliquée. L’adaptateur n’est pas branché au Worker ni aux routes HTTP. Le choix D1 est une option d’architecture à valider sur l’environnement Cloudflare existant ; aucune permission privilégiée n’est active par ce seul ajout.


## 9. Environnement staging : D1 créé, déploiement bloqué par un écart de configuration
Le 22 octobre 2026, la base Cloudflare D1 `aria-authz-staging` a été créée avec juridiction `eu`, réplication désactivée, puis la migration `0001_aria_authorization.sql` a été appliquée. Vérification API effectuée : les trois tables `aria_user_roles`, `aria_entitlements` et `aria_authorization_audit` existent. Identifiant de base conservé dans la configuration d’environnement Cloudflare, pas dans le code client.

**Le binding D1 n’est pas encore attaché au Worker et aucun rôle réel n’a été créé.** Aucun endpoint ne consomme ce registre.

### Écart bloquant relevé avant tout déploiement
L’inspection des paramètres du Worker Cloudflare `aria-brain-staging` montre des bindings `ARIA_USERS`, `ARIA_MEMORY`, `ARIA_REQUIRE_INDIVIDUAL_AUTH`, `ARIA_ACCESS_TOKEN` et `OPENAI_API_KEY`, mais pas `SUPABASE_URL` ni `SUPABASE_ANON_KEY`. Le code versionné sur la branche de staging exige actuellement Supabase Auth en mode individuel par défaut. Le déployer tel quel ferait échouer l’authentification faute de configuration.

Ne pas déployer ce code tant que le modèle d’identité n’est pas réconcilié : soit configurer et valider un projet Supabase Auth réel, soit adapter et tester explicitement l’intégration au mécanisme de session `ARIA_USERS` déjà présent dans le Worker déployé. Ne jamais basculer silencieusement entre ces modèles.
