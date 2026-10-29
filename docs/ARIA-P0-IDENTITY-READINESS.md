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
- PR #39 ajoute un refus explicite pour un mode d'authentification inconnu ; PR #40 teste que le chat avec consentement mémoire désactivé n'accède pas au stockage persistant. Leur CI est verte et elles sont actuellement ouvertes, non fusionnées et prêtes pour revue (elles ne sont plus en brouillon).
- PR #43 ajoute un garde-fou par requête sur `/memory` : GET et PUT exigent `X-ARIA-Memory-Consent: true`, tandis que DELETE reste possible sans ce signal. La CI du commit `f71372b6e0d043a44788db612d8f3378e6dba536` a réussi : 61 tests Worker et 16 tests d'intégration UI.
- **Limite à ne pas confondre avec une preuve de consentement :** l'en-tête de PR #43 est contrôlé par le client. Il réduit les accès accidentels mais ne constitue pas un registre de consentement durable ni une garantie contre un client malveillant. La conception d'un enregistrement serveur du consentement et de sa révocation reste à traiter avant la distribution publique.

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
- [ ] Tests négatifs : A ne peut pas lire/écrire/supprimer la mémoire de B ; jeton invalide refusé ; consentement désactivé = zéro accès KV sur le parcours chat ; session alpha non liée = mémoire refusée ; suppression confirmée uniquement après succès serveur.
- [ ] Contrat de consentement mémoire durable défini et vérifié côté serveur ; ne pas considérer un en-tête client comme preuve suffisante du consentement.
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


---

## 6. Revalidation du gate P0 — 29 octobre 2026

Cette section remplace toute hypothèse de statut fondée sur les anciens commits de la PR #43. Les sections précédentes sont conservées comme historique.

### État vérifié
- Le Worker Cloudflare `aria-brain-staging` est toujours sur la version active 26, avec `ARIA_AUTH_MODE=session_kv`, `ARIA_AUTHZ_DB`, `ARIA_USERS` et `ARIA_MEMORY`. Les secrets ne sont pas lus.
- La configuration observée ne comprend pas de bindings `SUPABASE_URL` et `SUPABASE_ANON_KEY`. Le mode Supabase individuel ne doit donc pas être considéré comme configuré.
- La version active du Worker ne contient pas la route `/memory/consent` ni le stockage D1 du consentement/documents de la PR #43.
- La PR #43 est ouverte et non fusionnée, base `feat/aria-brain-staging-integration), tête `97451097f0e265fd67a766908a67cfb1c1e9086a). Ses workflows `Staging Worker Tests` et `ARIA secure UI integration checks` sont tous deux terminés avec succès sur ce commit.
- Cette PR #43 a évolué depuis la version décrite plus haut dans ce document : elle ajoute un registre de consentement D1, des documents mémoire D1 et des écritures conditionnelles contrôlées côté serveur. Ce progrès est validé par la CI, mais il n'est pas actif dans le Worker déployé.
- Les migrations 0002/0003 ont été rapportées comme appliquées à la base D1 staging et les requêtes SQL ont été vérifiées ; cela ne prouve ni le déploiement du Worker candidat ni le parcours HTTP authentifié de bout en bout.

### Décision toujours requise
Le propriétaire doit confirmer explicitement l'option d'identité cible :
- **Option A — Supabase Auth individuel :** choix recommandé pour le produit multi-utilisateur si le propriétaire confirme le fournisseur/projet et autorise sa configuration dans le staging.
- **Option B — sessions alpha KV temporaires :** acceptable pour maintenir le chat alpha ; les identités opaques non migrées ne peuvent pas accéder à la mémoire individuelle persistante, aux rôles commerciaux ou aux clés premium.

Aucune option ne doit être activée par simple hypothèse. La variable `ARIA_REQUIRE_INDIVIDUAL_AUTH=true` ne constitue pas une protection effective si le code déployé ne la lit pas ; la politique d'authentification effective est déterminée par le code actif et ses bindings.

### Critères mis à jour avant toute release staging
- [ ] Le propriétaire confirme l'option d'identité et le fournisseur/projet, si option A.
- [ ] Les bindings requis correspondent au mode choisi ; aucun secret n'est exposé dans Git, les tickets ou les journaux.
- [ ] La version candidate est comparée au Worker actif et à la branche d'intégration.
- [ ] Les tests négatifs couvrent jeton invalide/expiré, mauvaise identité, session alpha non liée, consentement désactivé/révoqué, erreur D1 et isolation de deux comptes canoniques.
- [ ] Le consentement est lu et écrit côté serveur ; un en-tête client ne suffit pas comme source de vérité.
- [ ] Les migrations, bindings et tables requis sont vérifiés dans le staging ciblé.
- [ ] Les deux workflows CI sont verts sur le commit exact à promouvoir.
- [ ] Après approbation explicite du déploiement staging, le test HTTP vérifie `/health`, `/chat`, `/memory` et `/memory/consent` avec des comptes de test distincts.
- [ ] La version active et le comportement réel sont re-vérifiés après déploiement ; un plan de retour arrière est prêt.

**Statut : P0 ouvert.** La CI de la PR #43 est verte, mais l'identité cible n'est pas confirmée, le Worker actif n'est pas aligné avec ce code, et le parcours HTTP multi-compte n'est pas encore démontré. Cette mise à jour documentaire n'autorise aucune modification Cloudflare, migration supplémentaire ou déploiement.
