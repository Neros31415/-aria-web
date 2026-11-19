# Contrat d'intégration ARIA ↔ OpenJarvis — V1

**Date :** 19 novembre 2026  
**Statut :** proposition contractuelle pour revue ; aucun runtime connecté  
**Référence OpenJarvis auditée :** `open-jarvis/OpenJarvis@427c2dd11d180ac254a03e92c5fb01189fb4b23b`  
**Dépendance ARIA :** contrat logique de la PR #61.

## 1. Décision

Le premier raccordement utilisera le serveur API FastAPI d'OpenJarvis derrière la passerelle ARIA, en s'appuyant sur son endpoint compatible OpenAI `POST /v1/chat/completions`.

Le client iPhone/PWA ne contacte jamais OpenJarvis directement. Il appelle ARIA. Le Worker ARIA authentifie l'utilisateur, calcule le contexte autorisé et appelle le service OpenJarvis en HTTPS avec une clé interservice conservée côté serveur.

Le premier essai est volontairement **conversation-only** :
- agent OpenJarvis configuré sur `simple` ;
- aucun outil transmis (`tools: null`) ;
- mémoire OpenJarvis désactivée et aucun service de mémorisation branché ;
- pas de scheduler, channel, MCP, sandbox d'exécution de code ou Learning actif ;
- streaming désactivé pour le premier contrat.

## 2. Flux de confiance

```text
iPhone / PWA
  | POST /api/v1/chat
  | ARIA user token
  v
ARIA Worker / API Gateway
  1. Vérifier token et identité
  2. Dériver user_id / session_id côté serveur
  3. Appliquer consentement, quota et budget
  4. Valider taille et historique
  5. Construire messages autorisés
  |
  | HTTPS + Authorization: Bearer <OPENJARVIS_API_KEY>
  v
OpenJarvis FastAPI (privé)
  - AuthMiddleware actif
  - Agent simple
  - Aucun outil / mémoire / scheduler
  |
  v
Model provider autorisé
  |
  v
OpenJarvis response
  |
  v
ARIA Worker : validation, trace minimale, réponse au client
```

La clé OpenJarvis n'est jamais renvoyée au client, inscrite dans les logs, incluse dans le prompt ou stockée dans le dépôt. Le Worker ne transmet pas le jeton utilisateur brut comme clé OpenJarvis.

## 3. Contrat client → ARIA (proposition)

### Requête

```http
POST /api/v1/chat
Authorization: Bearer <ARIA_USER_TOKEN>
Content-Type: application/json
```

```json
{
  "conversationId": "opaque-session-id",
  "message": "Bonjour ARIA",
  "history": [
    { "role": "user", "content": "Salut" },
    { "role": "assistant", "content": "Bonjour." }
  ]
}
```

Règles :
- `conversationId` est un identifiant opaque, jamais une preuve d'identité.
- L'identité et le propriétaire de la conversation sont établis par le Worker à partir du jeton vérifié.
- Les rôles autorisés sont strictement `user` et `assistant` dans l'historique fourni.
- Le client ne peut pas envoyer de message `system`, d'outil, de propriétaire, de permission, de modèle, de budget ou de consigne de routage.
- Le Worker borne le nombre de messages, la taille de chaque message et la taille totale du corps.
- Le Worker reconstruit lui-même le message système ARIA et ne fait pas confiance à un prompt système client.
- La politique de consentement mémoire s'applique avant tout chargement de contexte ; la mémoire est absente du premier vertical slice.

### Réponse

```json
{
  "requestId": "opaque-request-id",
  "conversationId": "opaque-session-id",
  "status": "succeeded",
  "message": {
    "role": "assistant",
    "content": "Bonjour. Comment puis-je vous aider ?"
  },
  "usage": {
    "inputTokens": 0,
    "outputTokens": 0
  }
}
```

Les champs d'usage sont facultatifs si le fournisseur ne les renvoie pas ; ne jamais inventer des métriques. Les erreurs sont structurées et n'exposent pas les corps d'erreur bruts du fournisseur.

## 4. Contrat Worker → OpenJarvis

### Endpoint

`POST https://<OPENJARVIS_PRIVATE_ORIGIN>/v1/chat/completions`

En-têtes :
- `Authorization: Bearer <OPENJARVIS_API_KEY>`
- `Content-Type: application/json`
- `Accept: application/json`

Corps initial :
```json
{
  "model": "<ARIA_SERVER_SELECTED_MODEL>",
  "messages": [
    { "role": "system", "content": "<ARIA_SERVER_SYSTEM_PROMPT>" },
    { "role": "user", "content": "Bonjour ARIA" }
  ],
  "temperature": 0.7,
  "max_tokens": 512,
  "stream": false,
  "tools": null
}
```

Contraintes :
- Le modèle est choisi par configuration serveur/allowlist, jamais par le client.
- `max_tokens` est plafonné côté Worker et côté service.
- `temperature` est fixée par la politique ARIA ; elle n'est pas librement choisie par le client.
- Le Worker ne transmet que le contexte explicitement autorisé.
- Pas de champ `user`, de métadonnée de propriétaire ou de contenu mémoire non requis.
- Aucun retry automatique non borné ; une requête d'inférence interrompue peut avoir déjà consommé du budget.
- Pas de fallback vers un autre fournisseur sans nouvelle vérification des règles de données et de budget.

### Réponse attendue

Lire uniquement `choices[0].message.content`, `model` et `usage` si présents. Refuser une réponse sans choix, avec contenu non textuel inattendu ou dépassant la limite configurée. Ne jamais interpréter une sortie textuelle comme preuve qu'une action a été exécutée.

## 5. Authentification et exposition réseau

OpenJarvis possède un `AuthMiddleware` qui protège les routes `/v1/*` et `/api/*` lorsque `OPENJARVIS_API_KEY` est configurée. Le mode sans clé laisse l'authentification désactivée ; il ne doit pas être utilisé pour un service accessible depuis ARIA.

Exigences de déploiement :
- `OPENJARVIS_API_KEY` non vide et générée aléatoirement ;
- vérifier que le middleware est effectivement installé sur l'application déployée ;
- service non public si possible, ou ingress limité aux appels ARIA ;
- TLS obligatoire ;
- CORS désactivé/non nécessaire pour le Worker-à-Worker ; si une origine navigateur est utilisée pour un outil d'administration, liste exacte, jamais `*` ;
- endpoint health ouvert uniquement pour une sonde non sensible ; aucune donnée de compte dans health ;
- clé renouvelable, révocable et absente des logs ;
- limiter les connexions entrantes et sortantes.

La protection par clé OpenJarvis est une authentification de service, pas une identité multi-utilisateur. Elle ne remplace pas la validation du jeton ARIA, les scopes, les consentements ou les permissions.

## 6. Mapping d'erreurs ARIA

| Cas | Réponse ARIA | Comportement |
|---|---:|---|
| Jeton ARIA absent/invalide | 401 | Ne pas appeler OpenJarvis |
| Identité sans accès à la conversation | 403 ou 404 selon politique | Ne pas appeler OpenJarvis |
| Corps invalide / trop grand | 400 / 413 | Rejeter avant appel |
| Quota/budget ARIA dépassé | 429 | Ne pas appeler OpenJarvis |
| Clé interservice invalide | 502 | Alerte interne ; ne pas exposer la clé |
| OpenJarvis indisponible | 503 | Erreur contrôlée |
| Timeout OpenJarvis | 504 | Marquer résultat comme non confirmé ; pas de retry aveugle |
| Réponse OpenJarvis malformée | 502 | Échec explicite, aucune fausse réponse |
| Limitation fournisseur | 503 ou 429 selon classification | Respecter retry-after si disponible et borné |

Ne pas renvoyer au client les stack traces, messages contenant les URL internes, noms d'environnement, variables, clés ou corps d'erreur du fournisseur.

## 7. Budgets et limites initiales

Les valeurs suivantes sont des paramètres de pilote à valider par benchmark, pas des limites de production :
- `stream=false` ;
- `max_tokens=512` pour le premier test ;
- timeout de requête borné (proposition initiale : 30 secondes) ;
- taille totale du contexte bornée et tronquée selon une politique déterministe ;
- une seule tentative fournisseur par requête ;
- plafond de coût ARIA vérifié avant appel, puis consommation réelle enregistrée si disponible.

Le budget doit être calculé côté ARIA à partir du modèle autorisé et des tarifs configurés. Si les tarifs/usage sont inconnus, le service doit refuser le mode payant ou marquer le coût comme inconnu ; ne pas annoncer un plafond garanti à partir d'une estimation locale seule.

## 8. Traces du premier slice

Conserver uniquement :
- request_id opaque ;
- user_id pseudonymisé / hashé dans le système de télémétrie ;
- modèle/provider ;
- horodatage, latence et statut ;
- compteurs tokens et coût si fournis ;
- code d'erreur normalisé.

Ne pas persister par défaut le prompt, l'historique complet, le contenu de réponse ou les données personnelles. Si un échantillon de contenu est requis pour un test contrôlé, obtenir le consentement explicite et appliquer une rétention courte.

## 9. Tests contractuels requis

### Passerelle ARIA
- token utilisateur absent, invalide, expiré ou mauvais issuer/audience ;
- conversation appartenant à un autre utilisateur ;
- message système ou tool role fourni par le client ;
- dépassement taille, historique, tokens et budget ;
- consentement mémoire désactivé (aucun contexte mémoire injecté).

### Service OpenJarvis
- clé manquante/invalide → 401 ;
- clé valide → réponse valide ;
- `stream=false` et `tools=null` confirmés ;
- agent simple confirmé ;
- aucun appel mémoire et aucune écriture mémoire ;
- fournisseur indisponible, délai dépassé et JSON invalide ;
- logs sans clé ni contenu de conversation.

### End-to-end
- requête iPhone/PWA → ARIA → OpenJarvis → ARIA → client ;
- deux identités distinctes, aucune fuite de contexte ;
- coût/usage enregistré sans contenu sensible ;
- tests de non-régression de la PWA et des chemins de consentement.

## 10. Préconditions avant implémentation runtime

- [ ] Revue de ce contrat et confirmation du service d'hébergement.
- [ ] Audit transitif des dépendances et verrouillage de versions.
- [ ] Vérification de l'installation réelle de l'AuthMiddleware et de la config serveur.
- [ ] Authentification ARIA et readiness mémoire validées selon la pile de PR en cours.
- [ ] Service isolé avec clé interservice, TLS et règles réseau.
- [ ] Tests de contrat et limites de coût prêts avant le premier appel fournisseur.

**Conclusion :** ce contrat donne un chemin d'intégration concret sans coupler le client iPhone au framework Python. Il ne doit être implémenté qu'après revue et validation des préconditions de sécurité, d'hébergement et de coût.
