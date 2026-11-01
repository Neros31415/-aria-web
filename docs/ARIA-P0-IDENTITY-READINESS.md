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


---

## 7. Décision d'identité confirmée et préparation staging — 1 novembre 2026

### Décision
Le propriétaire confirme **Supabase Auth individuel comme stratégie cible d'identité d'ARIA**. L'option sessions alpha KV reste uniquement un mécanisme transitoire de compatibilité ; elle ne doit pas devenir l'identité durable du produit. Cette décision autorise la préparation technique et documentaire en staging, mais **n'autorise ni création/achat de projet, ni changement de configuration, ni migration, ni déploiement**.

### État recontrôlé en lecture seule
- Le Worker `aria-brain-staging` est toujours sur la version 26 (`c1387164-ffdd-48ea-9dbe-7034b98bb781)), déployée à 100 %. La liste des versions et déploiements Cloudflare ne montre aucune version plus récente.
- Les noms de bindings du Worker staging incluent `ARIA_AUTH_MODE`, `ARIA_AUTHZ_DB`, `ARIA_USERS`, `ARIA_MEMORY`, `ARIA_ACCESS_TOKEN` et `OPENAI_API_KEY`. Aucun binding `SUPABASE_URL` ou `SUPABASE_ANON_KEY` n'est présent. Seuls les noms/types de bindings ont été consultés ; aucune valeur de secret n'a été lue.
- L'inventaire Supabase accessible via la connexion actuelle retourne zéro projet visible. Cela ne prouve pas qu'aucun projet n'existe ; cela signifie qu'aucun projet ne peut être sélectionné ou inspecté avec l'accès actuellement disponible.
- Dans la branche de la PR #43, le Worker sait déjà valider un bearer token en appelant côté serveur `GET {SUPABASE_URL}/auth/v1/user`, avec une clé API dans `apikey`, puis utilise exclusivement l'UUID `user.id` retourné comme propriétaire. Le navigateur ne fournit pas l'identité propriétaire.
- En revanche, le front-end inspecté conserve encore un jeton alpha manuel dans `sessionStorage` (`aria.voice.alphaToken`) et ne montre pas de flux Supabase Auth (connexion, renouvellement de session, déconnexion). L'intégration du client Supabase reste donc à concevoir/implémenter.
- La PR #43 est toujours ouverte et non fusionnée. Ses deux workflows CI sur le commit `97451097f0e265fd67a766908a67cfb1c1e9086a` sont terminés avec succès : `Staging Worker Tests` (run `40767287051`) et `ARIA secure UI integration checks` (run `40767287066`). Cela ne constitue pas un test HTTP multi-compte du Worker actif.
- La PR #45 reste une documentation d'audit en brouillon, non fusionnée. La PR #41 reste une documentation P0 en brouillon, non fusionnée.

### Contrat cible recommandé
1. Le navigateur utilise Supabase Auth pour créer une session et obtient un access token court-vivant ; il ne fabrique jamais de `userId` ou `ownerId`.
2. Chaque appel à `aria-brain` transmet le JWT Supabase dans `Authorization: Bearer <access_token>`.
3. Le Worker valide le token côté serveur auprès de Supabase Auth (ou par validation JWKS si cette voie est retenue après revue), refuse les tokens invalides/expirés et dérive le propriétaire uniquement de l'identité vérifiée (`user.id` / claim `sub` vérifié).
4. L'UUID Supabase devient l'identifiant canonique pour les rôles D1, le consentement mémoire et les documents mémoire. Aucun identifiant client local ne doit pouvoir sélectionner le propriétaire.
5. La clé API publique/publishable est une configuration non secrète utilisée dans l'en-tête `apikey` ; aucune clé `service_role`/secret Supabase ne doit être envoyée au navigateur. Toute opération privilégiée reste strictement côté serveur.
6. Les jetons alpha `session_kv` ne sont pas convertis automatiquement en comptes. Toute liaison d'anciens comptes ou de souvenirs nécessite un processus séparé, explicite et vérifié.

### Plan staging — sans exécution à ce stade
- [ ] **S0 — Accès projet :** rendre le projet Supabase staging existant visible via la connexion autorisée, ou fournir son Project Ref/URL non sensible. Ne pas créer un projet sans choix d'organisation, région et validation des éventuels coûts.
- [ ] **S1 — Contrat de configuration :** confirmer le Project URL et la clé publishable (ou la clé anon historique si nécessaire à la compatibilité) ; configurer les valeurs uniquement dans les bindings staging. Les valeurs ne seront jamais copiées dans Git, PR, captures ou journaux. Garder toute clé secrète/service-role hors du Worker si elle n'est pas strictement nécessaire.
- [ ] **S2 — Client web :** intégrer le flux Supabase Auth au front-end, avec persistance de session appropriée, rafraîchissement automatique, déconnexion et gestion des erreurs ; supprimer la dépendance au jeton alpha manuel uniquement après validation du parcours de remplacement.
- [ ] **S3 — Worker :** conserver la validation serveur du bearer token et confirmer le contrat de réponse Auth, les délais/erreurs réseau, les statuts 401/503 et la validation UUID. Évaluer le passage du nom `SUPABASE_ANON_KEY` à `SUPABASE_PUBLISHABLE_KEY` pour alignement avec les clés actuelles, sans modifier le runtime avant validation.
- [ ] **S4 — Autorisation et mémoire :** vérifier les migrations D1 0002/0003 sur la base staging identifiée ; contrôler que chaque requête mémoire utilise l'UUID Auth vérifié, que le consentement serveur est actif et que les erreurs D1 ferment l'accès.
- [ ] **S5 — Tests :** ajouter des tests d'intégration avec deux comptes temporaires A/B : jeton valide, invalide, expiré, utilisateur supprimé/désactivé, fournisseur indisponible, A ne peut lire/écrire/supprimer les données de B, révocation de consentement, session alpha non migrée refusée, renouvellement et déconnexion.
- [ ] **S6 — Gate de release :** CI verte sur le SHA exact ; revue du diff et des bindings (noms seulement) ; test HTTP staging avec comptes temporaires après autorisation explicite de déploiement ; vérification health/configuration et plan de rollback.
- [ ] **S7 — Migration éventuelle :** inventaire des identités alpha et plan à blanc uniquement ; aucune migration automatique des jetons, rôles ou souvenirs sans approbation distincte.

### Blocages et limites
- **Bloquant immédiat :** aucun projet Supabase n'est visible dans la connexion actuelle ; il faut établir l'accès au projet staging existant avant toute configuration.
- **Bloquant applicatif :** le front-end inspecté n'intègre pas encore Supabase Auth et utilise toujours le jeton alpha manuel.
- **Bloquant release :** le Worker déployé est encore en `session_kv` et ne contient pas le code candidat de la PR #43 ; aucun test HTTP multi-compte n'a été réalisé sur un Worker candidat.
- Les migrations D1 rapportées comme appliquées précédemment ne remplacent pas la vérification de la base staging effectivement liée au projet choisi.
- Aucune configuration Cloudflare/Supabase n'a été modifiée, aucune migration n'a été exécutée pendant cette reprise, aucun secret n'a été lu, aucun test HTTP ni déploiement n'a été lancé.

**Statut P0 : décision d'architecture validée ; préparation staging en attente d'accès au projet Supabase et de l'intégration front-end.**


---

## 8. Projet Supabase staging créé — 1 novembre 2026

### Création confirmée
- Projet créé après confirmation explicite du propriétaire dans l'organisation **Neros Corp**.
- Nom : `aria-staging`.
- Project Ref : `mvcunzhhioeplrvanhgn`.
- Région : `eu-west-3` (Paris).
- Statut retourné par Supabase : `ACTIVE_HEALTHY`.
- Coût de création vérifié avant action : **0 USD/mois** au moment de la création.
- URL API publique du projet : `https://mvcunzhhioeplrvanhgn.supabase.co`.
- Le projet ne contient aucune migration ni table dans le schéma `public` à sa création. Les contrôles Security Advisor et Performance Advisor ne retournent aucun lint.

### Périmètre de cette vérification
- Aucun secret, aucune clé API et aucune donnée utilisateur n'ont été lus.
- L'URL du projet et son Project Ref sont des identifiants de configuration, pas des secrets.
- Aucun réglage Auth (méthodes d'inscription, confirmation email, URL du site ou URLs de redirection) n'a été modifié.
- Aucune migration SQL n'a été appliquée au projet Supabase.
- Aucun changement Cloudflare, déploiement Worker, fusion de PR ou changement de production n'a été effectué.

### Architecture de données retenue pour la préparation
Le projet Supabase nouvellement créé sert de fournisseur d'identité **Supabase Auth**. Il ne remplace pas automatiquement la base D1 Cloudflare déjà utilisée pour l'autorisation ARIA et le stockage de consentement/documents mémoire. Toute évolution de schéma dans Supabase doit être justifiée séparément ; ne pas dupliquer les données mémoire entre Supabase Postgres et D1 sans décision d'architecture explicite.

### État staging recontrôlé après création
- Le Worker Cloudflare `aria-brain-staging` conserve les bindings existants : `ARIA_AUTH_MODE`, `ARIA_AUTHZ_DB`, `ARIA_USERS`, `ARIA_MEMORY`, `ARIA_ACCESS_TOKEN`, `OPENAI_API_KEY` et `ARIA_REQUIRE_INDIVIDUAL_AUTH`. Les valeurs des secrets n'ont pas été consultées.
- Aucun binding `SUPABASE_URL` ou `SUPABASE_ANON_KEY` n'est présent.
- Le code candidat de la PR #43 vérifie le bearer token via `GET /auth/v1/user` et utilise l'UUID retourné. Il attend actuellement `SUPABASE_URL` et `SUPABASE_ANON_KEY`. Une adaptation contrôlée vers la clé publishable moderne est à évaluer ; ne pas confondre une clé publishable avec une clé secret/service-role.
- Le front-end de cette PR utilise encore le jeton alpha manuel `aria.voice.alphaToken` dans `sessionStorage`. Aucun flux Supabase Auth complet n'est encore livré dans ce code.
- Le projet Supabase étant neuf, l'URL du site et les URLs de redirection Auth doivent être configurées avant les tests de confirmation email et de récupération de compte. Les URL exactes de staging doivent être vérifiées depuis les origines réellement utilisées par ARIA ; ne pas autoriser un joker large ou une origine de production par commodité.

### Étapes restantes
- [ ] **S0 — Projet :** terminé ; projet staging créé et `ACTIVE_HEALTHY`.
- [ ] **S1 — Auth dashboard :** inspecter puis configurer explicitement les méthodes Auth retenues, la confirmation email, le Site URL et les URLs de redirection staging. Aucun fournisseur social n'est présumé nécessaire.
- [ ] **S2 — Configuration Worker staging :** ajouter uniquement les bindings de staging nécessaires (`SUPABASE_URL` et clé publishable si le code la requiert), sans exposer leurs valeurs. Ne pas changer `ARIA_AUTH_MODE` avant que le code candidat, les tests et la configuration soient prêts.
- [ ] **S3 — Front-end :** implémenter connexion, inscription, récupération de session, rafraîchissement, déconnexion et gestion des états Auth. Retirer le jeton alpha manuel uniquement après tests de remplacement.
- [ ] **S4 — Worker :** valider les tokens Supabase côté serveur, limiter les appels réseau et échouer de façon fermée ; dériver l'identité uniquement du résultat Auth vérifié. Revoir l'usage de `SUPABASE_ANON_KEY` versus clé publishable et documenter le contrat.
- [ ] **S5 — Autorisation/mémoire :** conserver D1 comme source de vérité actuelle pour les rôles et la mémoire tant qu'une décision contraire n'est pas approuvée ; confirmer les migrations D1 0002/0003 sur la base effectivement liée au Worker.
- [ ] **S6 — Tests :** comptes temporaires A/B, jetons invalides/expirés, rafraîchissement, déconnexion, fournisseur indisponible, isolation des données, révocation de consentement et sessions alpha non migrées.
- [ ] **S7 — Release :** revue du diff, CI sur SHA exact, vérification des bindings par noms/types, puis demander une autorisation distincte avant tout déploiement staging. Production reste hors périmètre.

**Statut P0 :** projet Supabase staging créé ; Auth n'est pas encore configuré, le Worker staging n'est pas relié à Supabase et le front-end n'utilise pas encore Supabase Auth. Aucune activation utilisateur ne doit être annoncée avant validation de bout en bout.
