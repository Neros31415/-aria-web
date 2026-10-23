# ARIA — Décision d'identité et critères de sortie P0

**Statut :** décision requise avant d'activer la mémoire persistante pour les utilisateurs alpha.  
**Périmètre :** staging uniquement ; aucun changement de configuration ni déploiement autorisé par ce document.  
**Références :** `docs/SESSION-IDENTITY-MIGRATION-PLAN.md`, `docs/STAGING-RELEASE-GATE-2026-10-23.md`, PR #18, #19, #39 et #40.

## 1. État observé

- Le Worker de staging déployé utilise `ARIA_AUTH_MODE=session_kv`.
- Le code de la branche d'intégration accepte aussi `individual` et `legacy`.
- Aucun binding `SUPABASE_URL` ou `SUPABASE_ANON_KEY` n'était présent lors du dernier audit en lecture seule.
- En mode `session_kv`, le chat peut répondre, mais les routes de mémoire persistante doivent rester bloquées avec `409 identity_migration_required` tant qu'une liaison fiable vers une identité de compte canonique n'est pas prouvée.
- La variable `ARIA_REQUIRE_INDIVIDUAL_AUTH=true` observée sur le Worker n'est pas lue par le code inspecté : elle ne doit pas être considérée comme une protection effective.
- PR #39 ajoute un refus explicite pour un mode d'authentification inconnu. PR #40 teste qu'un consentement mémoire désactivé n'entraîne aucun accès au stockage persistant. Les deux ont une CI verte, mais restent des PR de brouillon selon le dernier état consulté.

## 2. Décision à prendre

Choisir et consigner **une seule** stratégie cible avant toute migration ou ouverture multi-utilisateur.

| Option | Avantage | Limite / condition |
|---|---|---|
| **A — Supabase Auth individuel** | Identité canonique vérifiée côté serveur ; base adaptée aux comptes, à l'isolation mémoire et aux rôles futurs. | Nécessite un projet explicitement choisi, les bindings de staging, des tests de jetons et un parcours de compte. Aucun projet ne doit être supposé créé ou connecté. |
| **B — Sessions alpha KV temporaires** | Permet de conserver le chat alpha actuel sans migration immédiate. | Ne résout pas l'identité de compte ; mémoire persistante, rôles commerciaux et clés premium restent bloqués pour ces sessions tant qu'une liaison vérifiée n'existe pas. |

**Recommandation technique :** retenir A pour le produit multi-utilisateur commercialisable, si le propriétaire confirme ce choix et fournit/configure l'environnement autorisé. En attendant, conserver les garde-fous de B et ne pas réactiver la mémoire. Ce document ne choisit pas à la place du propriétaire et n'autorise aucun achat, création de projet ou changement de secret.

## 3. Critères obligatoires avant activation de Supabase Auth

- [ ] Fournisseur et projet d'identité confirmés par le propriétaire.
- [ ] Bindings `SUPABASE_URL` et `SUPABASE_ANON_KEY` ajoutés au **staging uniquement** via le canal de configuration autorisé ; aucune valeur secrète dans Git, tickets ou logs.
- [ ] Vérification serveur du jeton : valide, invalide, expiré, révoqué, mauvaise audience/émetteur et indisponibilité du fournisseur.
- [ ] L'identifiant propriétaire provient uniquement de la réponse d'identité vérifiée côté serveur ; aucun `userId`, `ownerId` ou `clientId` fourni par le navigateur ne peut changer le propriétaire mémoire.
- [ ] Autorisation D1 échoue de manière fermée si la base est indisponible ou si le rôle n'est pas actif.
- [ ] Tests négatifs : A ne peut pas lire/écrire/supprimer la mémoire de B ; jeton invalide refusé ; consentement désactivé = zéro accès KV ; session alpha non liée = mémoire refusée ; suppression confirmée uniquement après succès serveur.
- [ ] Les résultats CI sont verts sur le commit exact qui sera déployé.
- [ ] Déploiement staging approuvé, puis vérification HTTP de `/health`, `/chat` et `/memory` avec comptes de test distincts.
- [ ] La réponse de santé reflète la configuration effective ; le mode invalide ne signale jamais le service comme configuré.
- [ ] Plan de retour arrière et vérification de non-régression documentés.

## 4. Séquence d'exécution sûre

1. Examiner et faire relire les PR #39 et #40 ; ne pas les fusionner automatiquement.
2. Consigner le choix d'identité.
3. Si A est choisi, configurer uniquement le staging, sans afficher les secrets.
4. Rejouer la suite de tests et les cas négatifs d'authentification/mémoire.
5. Comparer le commit candidat aux bindings réellement configurés.
6. Demander une validation de release avant tout déploiement staging.
7. Ne migrer aucune session ou note existante avant inventaire, liaison vérifiée, plan à blanc sans collision et approbation explicite.
8. Ne pas toucher à `main` ni au Worker de production dans cette phase.

## 5. État de livraison

Ce document formalise les conditions de décision et de sortie. Il ne constitue ni une implémentation d'authentification, ni une migration, ni une preuve de disponibilité HTTP, ni une autorisation de déploiement.
