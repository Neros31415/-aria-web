# ARIA — Test HTTP staging à deux comptes

**Statut :** harnais préparé, non exécuté.  
**Environnement autorisé par le script :** Worker `aria-brain-staging` et projet Supabase `aria-staging` uniquement.  
**Aucun déploiement, aucune modification de configuration et aucun secret n'ont été effectués pendant la création de ce harnais.**

## Objectif

Valider le parcours HTTP réel du Worker individuel avec deux comptes de test dédiés :
- authentification Supabase par e-mail/mot de passe ;
- état de santé et readiness du Worker ;
- lecture et écriture mémoire isolées ;
- impossibilité de changer de propriétaire en envoyant un `clientId` falsifié ;
- révocation du consentement et refus des lectures/écritures ;
- absence d'effet de la révocation du compte A sur le compte B.

Le test n'appelle pas `/chat` afin d'éviter une consommation de crédits modèle.

## Préconditions

Le script refuse de poursuivre si :
- le Worker n'est pas exactement `https://aria-brain-staging.quentineros-sevesi.workers.dev` ;
- le projet Supabase n'est pas exactement `https://mvcunzhhioeplrvanhgn.supabase.co` ;
- le health endpoint ne confirme pas `authenticationMode=individual`, D1, le registre de consentement et la mémoire persistante ;
- les deux comptes ne sont pas distincts ;
- les comptes n'ont pas de mémoire initiale vide.

Utiliser exclusivement deux comptes de test dédiés, jamais des comptes personnels ou clients.

## Exécution manuelle

Fournir les variables d'environnement dans un terminal local sécurisé, sans les inscrire dans le dépôt, les tickets ou les logs :

- `ARIA_RUN_STAGING_E2E=true`
- `ARIA_STAGING_BASE_URL=https://aria-brain-staging.quentineros-sevesi.workers.dev`
- `SUPABASE_URL=https://mvcunzhhioeplrvanhgn.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY`
- `ARIA_TEST_USER_A_EMAIL`
- `ARIA_TEST_USER_A_PASSWORD`
- `ARIA_TEST_USER_B_EMAIL`
- `ARIA_TEST_USER_B_PASSWORD`

Commande :

```bash
node scripts/staging-auth-two-account-http-e2e.mjs
```

Sans `ARIA_RUN_STAGING_E2E=true`, le script affiche SKIP et n'effectue aucune requête réseau.

## Données et nettoyage

Le script vérifie d'abord que les deux mémoires sont vides. Il active temporairement le consentement si nécessaire, écrit un marqueur aléatoire propre à chaque compte, exécute les contrôles d'isolation, révoque le consentement du compte A et vérifie les refus HTTP 403.

Dans un bloc `finally`, il supprime les documents qu'il a tenté d'écrire et restaure l'état de consentement initial de chaque compte. Si le nettoyage échoue, le script termine en erreur et indique de ne pas réutiliser les comptes avant vérification manuelle.

Le script ne journalise ni adresse e-mail, ni mot de passe, ni jeton, ni contenu mémoire. Il ne lit pas le contenu de mémoires préexistantes : il vérifie seulement que les tableaux sont vides avant d'écrire.

## Limites

- Ce harnais valide les endpoints Worker et l'identité serveur, pas l'interface iPhone.
- Il ne remplace pas les tests unitaires/CI ni les tests sur iPhone physique.
- Il ne configure pas Supabase Auth ou les bindings Cloudflare.
- Il ne déploie aucun Worker et ne touche pas à la production.
- Il doit rester désactivé tant que le projet staging, les bindings individuels et les deux comptes dédiés ne sont pas prêts.
