# ARIA — Préparation Supabase Auth (staging)

**Statut :** préparation de code et de configuration, non déployée.  
**Projet :** `aria-staging` — Project Ref `mvcunzhhioeplrvanhgn` — région `eu-west-3`.  
**Mode cible :** email + mot de passe, confirmation d'adresse email activée.  
**Périmètre :** branche `feat/aria-supabase-email-auth-staging`, Worker staging uniquement. Aucun accès production.

## 1. Configuration publique côté navigateur

Le fichier `supabase-config.js` contient uniquement :
- l'URL publique du projet Supabase staging ;
- la clé API **publishable** destinée au navigateur.

Cette clé n'est pas une clé secrète. Aucune clé `service_role`, `sb_secret_*`, mot de passe de base ou autre secret ne doit être placé dans ce fichier, dans Git ou dans le bundle web.

Le client Supabase JS v2 est initialisé avec :
- `persistSession: true` ;
- `autoRefreshToken: true` ;
- `detectSessionInUrl: true`.

Le JWT de session est envoyé au Worker comme `Authorization: Bearer <access_token>`. Le navigateur ne transmet pas de propriétaire mémoire ; le Worker doit dériver l'UUID de l'utilisateur depuis la réponse Auth vérifiée.

## 2. Réglages à effectuer dans le Dashboard Supabase

Le connecteur disponible permet de vérifier le projet, ses migrations, ses tables et ses advisors, mais n'expose pas d'action dédiée pour modifier les réglages Auth du Dashboard. Ces réglages restent donc à faire manuellement avant le test du parcours email.

Dans **Authentication → Sign In / Providers → Email** :
1. Activer le fournisseur Email.
2. Conserver la confirmation d'adresse email activée.
3. Autoriser l'inscription email/mot de passe.
4. Vérifier une longueur minimale de mot de passe de 8 caractères au minimum.
5. Ne pas activer de fournisseur social sans décision distincte.

Dans **Authentication → URL Configuration** pour les essais locaux :
- Site URL : `http://localhost:4173/`
- Redirect URL autorisée : `http://localhost:4173/**`
- Redirect URL alternative, uniquement si le serveur local l'utilise : `http://127.0.0.1:4173/**`

Ne pas ajouter le domaine de production GitHub Pages comme URL de redirection staging. Ne pas utiliser de wildcard global. Les URL de redirection doivent correspondre exactement à l'origine de test autorisée.

Le code utilise l'origine courante et le chemin courant pour les redirections de confirmation et de récupération. Le Worker candidat autorise les deux origines locales ci-dessus pour les tests sur `localhost:4173`.

**Email :** le service email par défaut de Supabase est limité et adapté aux essais. Avant toute distribution publique, configurer un SMTP dédié, vérifier les modèles de confirmation/récupération et les limites d'envoi.

## 3. Bindings Cloudflare attendus — staging seulement

Avant de basculer le Worker en mode individuel, préparer les bindings suivants sur `aria-brain-staging` :

| Nom | Type | Valeur attendue |
|---|---|---|
| `SUPABASE_URL` | variable texte | URL API du projet staging |
| `SUPABASE_PUBLISHABLE_KEY` | variable texte | clé publishable du projet staging |
| `ARIA_AUTH_MODE` | variable texte | `individual`, uniquement au moment d'une activation staging approuvée |

La clé publishable est conçue pour être publique ; aucune clé secrète Supabase ne doit être ajoutée au Worker pour le simple appel à `/auth/v1/user`. Les secrets OpenAI et tokens historiques ne doivent jamais être lus, affichés ou copiés.

**Important :** les bindings Cloudflare n'ont pas été modifiés. Le Worker actif reste en `session_kv`. L'ajout des bindings et le basculement de mode doivent être coordonnés avec un déploiement staging approuvé, car la modification de configuration d'un Worker actif peut changer son comportement.

## 4. Contrat d'authentification implémenté dans la branche

- Inscription email/mot de passe.
- Connexion via `signInWithPassword`.
- Restauration de session et renouvellement automatique.
- Déconnexion.
- Email de récupération et formulaire de mise à jour du mot de passe après le retour `PASSWORD_RECOVERY`.
- Le code retire l'ancien champ de saisie du jeton alpha de l'interface.
- Les souvenirs locaux sont isolés par UUID Supabase ; une session différente ne relit pas le cache mémoire local du compte précédent.
- Le consentement mémoire est rechargé depuis `GET /memory/consent` pour chaque compte. Si le serveur ne peut pas le confirmer, la mémoire distante reste désactivée.
- Le Worker accepte `SUPABASE_PUBLISHABLE_KEY` pour l'en-tête `apikey`, avec compatibilité temporaire avec `SUPABASE_ANON_KEY` pour les anciens environnements.

## 5. Vérifications et tests à réaliser

### Automatisés
- Vérification syntaxique de `app.js`, `supabase-config.js` et du Worker.
- Tests d'intégration UI : flux de connexion, inscription, récupération, refresh, séparation du stockage local par compte.
- Tests Worker : clé publishable utilisée pour `/auth/v1/user`, rejet d'un bearer invalide, erreurs Auth fail-closed.
- Tests D1/consentement de la PR #43 conservés.

### Manuels après configuration Auth et avant déploiement
1. Créer deux comptes de test A et B avec des adresses contrôlées.
2. Confirmer les deux emails et vérifier les redirections.
3. Vérifier connexion, rechargement de page, renouvellement, déconnexion et récupération de mot de passe.
4. Vérifier que A ne lit, n'écrit ni ne supprime aucune donnée de B.
5. Vérifier qu'un compte sans consentement mémoire n'accède pas aux documents D1.
6. Vérifier jeton invalide/expiré, compte supprimé, fournisseur indisponible et D1 indisponible.
7. Tester l'API staging après déploiement explicitement approuvé seulement.

## 6. État réel de livraison

- [x] Projet Supabase staging créé et sain.
- [x] URL et clé publishable de staging ajoutées au fichier de configuration public du candidat.
- [x] Parcours UI email/mot de passe, inscription, récupération et déconnexion préparé dans une branche isolée.
- [x] Contrat Worker adapté à la clé publishable moderne.
- [x] Séparation du cache mémoire local par utilisateur ajoutée.
- [ ] Réglages Auth du Dashboard appliqués et vérifiés.
- [ ] Bindings Cloudflare staging configurés.
- [ ] CI verte sur le commit candidat exact.
- [ ] Tests HTTP staging multi-comptes.
- [ ] Autorisation explicite avant déploiement staging.

Aucune migration Supabase SQL n'est requise pour utiliser Supabase Auth. Le projet ne contient actuellement aucune migration ni table dans le schéma `public`. La mémoire et l'autorisation restent sur D1 tant qu'une décision d'architecture distincte ne change pas ce choix.

Aucun secret n'a été lu. Aucun binding Cloudflare n'a été modifié. Aucun déploiement, merge ou changement de production n'a été effectué.
