# ARIA — provisionnement des accès alpha individuels

**Statut :** procédure de staging à effectuer par un administrateur. Aucun jeton n’est créé, distribué ou déployé par ce document.

## But et limites

Le Worker peut authentifier des jetons individuels sans exposer de secret fournisseur au navigateur. Le jeton brut est envoyé dans l’en-tête Bearer; le Worker accepte uniquement les jetons de 43 à 256 caractères pour le mode individuel, calcule leur SHA-256 et recherche uniquement leur empreinte dans le binding KV `ARIA_USERS`. La valeur KV est un identifiant opaque de compte, pas un nom ou une adresse e-mail.

Cette procédure permet des accès alpha individuels et une isolation mémoire par compte. **Ce n’est pas encore une authentification publique complète** : inscription, vérification d’adresse e-mail, récupération de compte, renouvellement automatique et interface de gestion des sessions ne sont pas implémentés.

## Préparer le Worker

1. Créer ou choisir un namespace Cloudflare KV dédié aux sessions et le lier au Worker sous le nom `ARIA_USERS`.
2. Conserver `OPENAI_API_KEY` uniquement comme secret Worker.
3. Garder le jeton partagé `ARIA_ACCESS_TOKEN` uniquement pendant la transition de l’alpha fermé.
4. Après avoir provisionné et testé chaque accès individuel, configurer `ARIA_REQUIRE_INDIVIDUAL_AUTH=true`. Dans ce mode, le jeton partagé ne permet plus l’accès. Si le binding `ARIA_USERS` n’est pas configuré, le Worker échoue fermé au lieu de revenir à l’authentification partagée.
5. Une fois le mode individuel validé, supprimer le secret partagé `ARIA_ACCESS_TOKEN` si aucune opération alpha ne dépend encore de lui.

## Créer un accès pour un testeur

1. Générer un jeton aléatoire cryptographiquement sûr d’au moins 32 octets. Ne pas le dériver d’un nom, d’un e-mail ou d’un mot de passe.
2. Calculer son empreinte SHA-256 en hexadécimal minuscule, sans espaces ni saut de ligne ajouté.
   - macOS/Linux : `printf '%s' "$TOKEN" | shasum -a 256` (ou `sha256sum` sur les distributions qui le proposent).
3. Dans le namespace KV lié sous `ARIA_USERS`, créer l’entrée :
   - **clé :** `session:v1:<empreinte-sha256>`
   - **valeur :** identifiant opaque stable, par exemple `alpha_user_7f31`.
4. Définir une expiration KV courte adaptée à l’alpha fermé. La durée de vie est gérée par l’expiration de l’entrée KV; supprimer l’entrée révoque immédiatement le jeton au prochain appel.
5. Transmettre le jeton brut au testeur par un canal sécurisé, séparément du rapport de test. Ne jamais le placer dans Git, les issues, les captures, les journaux ou les messages de diagnostic.
6. Tester `/memory` et `/chat` avec le jeton individuel. Vérifier aussi que le jeton partagé est refusé après activation de `ARIA_REQUIRE_INDIVIDUAL_AUTH=true`.

## Isolation et migration mémoire

- Les accès individuels utilisent la clé `memory:v2:user:<identifiant-opaque>`; la clé ne dépend pas du `clientId` fourni par le navigateur.
- Deux identifiants de compte distincts ne doivent jamais lire ni écrire la même clé mémoire.
- Les anciennes entrées alpha `memory:v1:<clientId>` ne sont pas migrées automatiquement vers un compte. Ne les attribuer à un compte qu’après vérification explicite de propriété et validation de l’administrateur.
- Les suppressions doivent toujours être confirmées par la réponse `deleted: true` et `persisted: true`; un HTTP 2xx seul ne suffit pas.
- La mémoire personnelle reste désactivée par défaut. Un jeton valide ne vaut pas consentement à utiliser ou enregistrer des souvenirs.

## Avant toute ouverture publique

Ne pas ouvrir l’inscription publique tant que l’authentification n’inclut pas la vérification d’e-mail, la récupération de compte, la révocation visible des sessions, la limitation de débit/coût, la revue de sécurité et des tests de bout en bout. Les jetons individuels provisionnés manuellement sont réservés aux tests fermés et temporaires.

## État réel du staging — 20 octobre 2026

- Namespace de sessions créé : `ARIA_USERS_STAGING` (`9f1d1da82c0246b0b19b8c20fa93e55a`). Il est actuellement vide et n’est pas encore lié au Worker.
- Aucun jeton individuel n’a été provisionné.
- La configuration du Worker précédemment lue ne contenait que les bindings `AI`, `ARIA_MEMORY`, `ARIA_ACCESS_TOKEN` et `OPENAI_API_KEY`; le code actuellement déployé est une ancienne version qui authentifie uniquement le jeton partagé.
- Le déploiement du code avec authentification individuelle n’a pas été effectué. Ne pas ajouter `ARIA_REQUIRE_INDIVIDUAL_AUTH=true` avant que le code compatible et le binding `ARIA_USERS` soient tous deux déployés, au risque de verrouiller l’accès au service.
- Prochaine séquence autorisée : déployer le code de la branche sur staging en préservant les secrets et bindings existants; ajouter le binding KV; vérifier `/health`; provisionner un jeton temporaire avec expiration; tester l’accès individuel et le refus du jeton partagé; supprimer le secret partagé uniquement après validation et préparation d’un retour arrière.
- Aucun jeton brut n’a été créé ou transmis. Aucun secret fournisseur n’a été lu ou exposé. Aucune modification du code déployé ni aucune modification des bindings du Worker n’a été effectuée.
