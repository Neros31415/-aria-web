# ARIA — Audit de parité et validation du déploiement staging

**Date :** 22 octobre 2026  
**Périmètre :** Worker Cloudflare `aria-brain-staging` uniquement.  
**Production :** inchangée.

## Résultat
La version testée de l’authentification par sessions serveur et du contrôle d’accès D1 a été déployée sur le Worker de staging après réussite de la CI.

- **Version Cloudflare :** `c1387164-ffdd-48ea-9dbe-7034b98bb781` (version 26)
- **Déploiement :** `388f7084-5639-44ae-8a75-2c73de22c514`
- **Répartition du trafic :** 100 % sur cette version du Worker de staging
- **CI :** [run 39790616842](https://github.com/Neros31415/-aria-web/actions/runs/39790616842), 57 tests réussis, 0 échec
- **Source :** branche `feat/aria-brain-staging-integration`, PR #25 fusionnée dans cette branche après validation.

## Configuration vérifiée par l’API Cloudflare
Le déploiement conserve les bindings préexistants via l’héritage strict des bindings et ajoute :
- `ARIA_AUTH_MODE=session_kv`
- `ARIA_AUTHZ_DB` lié à la base D1 `aria-authz-staging`

Les bindings `ARIA_USERS`, `ARIA_MEMORY`, `AI`, `OPENAI_API_KEY` et `ARIA_ACCESS_TOKEN` sont toujours déclarés dans la configuration de la version. Les valeurs des secrets n’ont pas été lues ni copiées dans le dépôt.

Le mode `session_kv` hache le jeton Bearer en SHA-256 et cherche `session:v1:<hash>` dans le registre serveur `ARIA_USERS`. L’identité vient exclusivement de cette entrée serveur, jamais du corps ou de l’URL client. Les identifiants historiques opaques sont conservés pour éviter de casser la mémoire existante.

## Base D1
- **Nom :** `aria-authz-staging`
- **Juridiction :** UE
- **Réplication :** désactivée
- **Binding Worker :** `ARIA_AUTHZ_DB`
- **Tables vérifiées :** `aria_user_roles`, `aria_entitlements`, `aria_authorization_audit`

Le Worker crée uniquement un rôle de base `user` au premier accès authentifié si aucun rôle n’existe. L’insertion et l’événement d’audit sont regroupés dans un batch D1. Les rôles existants/inactifs ne sont pas remplacés ou réactivés. L’interface publique ne peut pas attribuer un rôle administratif.

Les routes `GET/PUT/DELETE /memory` et l’accès mémoire depuis `/chat` consultent désormais l’autorisation D1 et refusent l’accès si le binding ou le registre est indisponible. Le health check expose `authenticationMode` et `authorizationStore`, et marque `configured=false` si le binding D1 requis manque en mode individuel.

## Validation post-déploiement et limite
L’API Cloudflare confirme :
1. le déploiement le plus récent pointe vers la version 25 à 100 % ;
2. les bindings de cette version incluent `ARIA_AUTHZ_DB` et `ARIA_AUTH_MODE=session_kv` ;
3. le code servi contient le mode session KV, le contrôle d’accès D1 et le provisionnement du rôle de base ;
4. les trois tables D1 sont présentes.

Un test SQL réel sur la base staging a confirmé que l’insertion du rôle `user` et l’écriture de l’audit fonctionnent ensemble via le batch D1 ; les lignes temporaires de test ont été nettoyées. Le test HTTP direct de `/health` n’a pas pu être exécuté depuis l’environnement d’outillage : les requêtes sortantes vers le domaine `workers.dev` y sont bloquées. Ce n’est **pas** présenté comme un test de santé réussi. Une vérification fonctionnelle depuis un navigateur autorisé ou un test d’intégration dédié reste nécessaire.

## Bloqueurs avant production
- Vérification HTTP réelle de `/health`, authentification, lecture/écriture/suppression mémoire et journalisation.
- Tests d’intégration avec une session authentifiée réelle et une panne D1.
- Provisionnement sécurisé du Super Admin et procédure de récupération.
- Source fiable pour la MFA récente avant opérations sensibles.
- Routes admin auditées pour rôles, clés cadeaux et offres Premium.
- Validation complète du périmètre ARIA 1.0, revue sécurité et tests iOS avant promotion en production.

Aucun secret, jeton ni contenu de mémoire personnelle n’est enregistré dans ce document.


---

## Reprise de l'audit — 29 octobre 2026

**Périmètre :** état GitHub et Cloudflare en lecture seule. Aucun secret n'a été lu. Aucun déploiement, changement de configuration ou migration n'a été exécuté pendant cette reprise.

### 1. État de référence de main

- Commit de référence observé : `32e7e9d7a7912b7b797d49b0423db47a5050a18e` (22 octobre 2026).
- `main` reste la PWA statique V0.7 décrite dans `README.md` : interface, historique local, mémoire locale et cache hors ligne de base.
- Le README de `main` indique toujours que le modèle IA réel, la recherche Web, la synchronisation iPhone-PC, le contrôle Windows, l'authentification, le backend commercial et les paiements ne sont pas implémentés dans cette branche.
- Les branches de backend et les améliorations vocales ne doivent donc pas être confondues avec le produit publié depuis `main`.

### 2. État Cloudflare observé

L'inventaire en lecture seule confirme trois Workers : `aria-brain`, `aria-brain-staging` et `aria-companion-preview`.

Pour `aria-brain-staging` :
- Version active observée : **26**, ID `c1387164-ffdd-48ea-9dbe-7034b98bb781`, créée le 22 octobre 2026 ; les paramètres indiquent que cette version reste la version de staging.
- `ARIA_AUTH_MODE=session_kv`.
- `ARIA_REQUIRE_INDIVIDUAL_AUTH=true`.
- Binding D1 `ARIA_AUTHZ_DB` présent, pointant vers `aria-authz-staging` (UUID `564c348b-aaea-4cba-aab2-a071b5dd9635)).
- Bindings KV `ARIA_USERS` et `ARIA_MEMORY` présents. Les valeurs des secrets n'ont pas été consultées.
- Les migrations D1 0002/0003 sont décrites comme appliquées et les requêtes SQL testées dans la documentation de la PR #43 ; cela ne signifie pas que le Worker correspondant est déployé.

La branche `fix/memory-consent-revocation-race` contient le nouvel endpoint `/memory/consent` et le stockage individuel de consentement/documents en D1. La version Cloudflare active observée ne contient pas cet endpoint ni cette logique ; elle utilise encore la route mémoire historique KV. **Le code de la PR #43 n'est donc pas actif sur le Worker staging observé.**

Aucun test HTTP réel de bout en bout n'a été exécuté pendant cette reprise. La configuration et le code source ne suffisent pas à certifier le comportement en production.

### 3. État des PR et dépendances

- **PR #43** — consentement mémoire, annulation des synchronisations obsolètes et stockage D1 : ouverte, non fusionnée ; base `feat/aria-brain-staging-integration`. Les deux workflows CI les plus récents associés au commit `97451097f0e265fd67a766908a67cfb1c1e9086a` sont réussis : `Staging Worker Tests` et `ARIA secure UI integration checks`. Cela valide les tests de branche, pas le déploiement.
- **PR #42** — garde-fous UI du consentement distant : ouverte en brouillon. Protection complémentaire ; ne remplace pas les contrôles serveur.
- **PR #41** — décision de fournisseur d'identité / readiness gate : ouverte en brouillon, base `feat/aria-brain-staging-integration`. Le choix d'identité reste une dépendance de livraison à résoudre avant l'activation de la mémoire multi-utilisateur.
- **PR #39 et #40** — correctif de readiness du mode d'authentification et test de consentement chat : ouvertes ; elles ciblent la branche d'intégration, pas `main`.
- **PR #15** — ancienne branche vocale/HUD : ouverte en brouillon. Une revue de cette PR documente des risques de confiance liés au contexte système client et à l'identité alpha ; ne pas la fusionner directement sans comparaison et tests sur le résultat intégré.
- **PR #16 et #17** — documents V1.2 et audit/feuille de route : toujours ouvertes en brouillon. Leurs exigences ne sont donc pas encore consolidées dans `main`.
- **PR #44** — vision documentaire V1.3 : ouverte en brouillon et empilée sur la branche `docs/aria-legal-commercial-v1-2` (base de la PR #16), pas directement sur `main`. Après décision sur les PR documentaires antérieures, réaligner explicitement sa base pour éviter une intégration incomplète ou des doublons.

### 4. Diagnostic révisé

Le risque dominant reste l'écart entre les changements testés dans les branches et le code réellement déployé. Le blocage n'est pas simplement l'absence d'une fonction : il faut stabiliser une chaîne complète d'identité, de consentement, de mémoire et de déploiement.

Le mode `session_kv` authentifie des sessions alpha par un jeton retrouvé dans le registre serveur, mais ces identités opaques ne sont pas des UUID de compte canoniques. Le code de la PR #43 bloque explicitement la mémoire persistante et le consentement D1 pour ces identités non migrées. Il ne faut pas contourner ce verrou en convertissant l'identifiant du navigateur ou le jeton en identité de compte.

Le mode Supabase individuel requiert une configuration réelle et une validation de bout en bout ; sa disponibilité ne doit pas être supposée. La décision documentée dans la PR #41 doit être examinée et actée avant de choisir le chemin d'activation de la mémoire multi-utilisateur.

### 5. Feuille de route immédiate

#### P0-A — Choix et contrat d'identité
- [ ] Lire et valider la proposition de décision de la PR #41.
- [ ] Décider explicitement si l'alpha reste en sessions temporaires ou si l'on passe à des comptes individuels Supabase.
- [ ] Définir l'identité canonique, la durée de vie/révocation des sessions et le comportement mémoire attendu dans chaque mode.
- [ ] Conserver l'interdiction d'accès mémoire pour les identités alpha non migrées.

#### P0-B — Préparer la promotion de la mémoire D1 sans la déployer
- [ ] Comparer le code de la PR #43 à la tête actuelle de `feat/aria-brain-staging-integration`.
- [ ] Examiner la CI du commit exact et le diff complet.
- [ ] Vérifier les migrations D1, le comportement readiness et les bindings nécessaires.
- [ ] Préparer un plan de déploiement staging et de retour arrière ; ne pas l'exécuter sans autorisation.
- [ ] Prévoir des tests HTTP avec deux comptes canoniques distincts : consentement activé/désactivé, lecture/écriture/suppression, révocation concurrente, isolation et erreur D1.

#### P0-C — Parité et preuve
- [ ] Vérifier via l'API Cloudflare la version active après tout futur déploiement.
- [ ] Exécuter le parcours HTTP autorisé de `/health`, `/chat`, `/memory` et `/memory/consent`.
- [ ] Documenter séparément CI, SQL local, SQL D1 réel et test HTTP : aucune preuve ne remplace les autres.

#### P1 — Intégration produit
- [ ] Ne réconcilier la branche HUD/vocale avec le backend qu'après comparaison des bases, résolution des divergences et tests du résultat intégré.
- [ ] Maintenir `main` comme produit honnête tant que le backend n'est pas intégré et validé.
- [ ] Réaligner les PR documentaires V1.2/V1.3 pour qu'elles convergent vers une feuille de route unique, sans dupliquer les mêmes documents.

### 6. Critères de sortie P0

P0 ne peut être marqué comme terminé que lorsque :
1. Le modèle d'identité a été choisi et documenté.
2. Les sessions alpha non migrées ne peuvent pas accéder à la mémoire individuelle.
3. Les tests d'isolation et de consentement réussissent sur le commit intégré.
4. Les migrations et bindings requis sont confirmés dans le bon environnement.
5. Le Worker staging actif correspond au commit prévu.
6. Le parcours HTTP avec identités canoniques est validé.
7. Un plan de retour arrière existe.
8. Aucun déploiement de production n'a lieu sans autorisation explicite.

**Statut à cette date : P0 non terminé.** Les tests CI de la PR #43 sont verts, mais la parité du Worker et le test HTTP multi-compte restent à démontrer.
