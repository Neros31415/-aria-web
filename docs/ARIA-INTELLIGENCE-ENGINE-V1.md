# ARIA Intelligence Engine V1
**Statut :** proposition d'architecture — à valider avant implémentation  
**Périmètre :** contrat interne du moteur d'intelligence, indépendant du client PWA/iOS et du fournisseur de modèle.  
**Référence produit :** Master Specification ARIA V1.0 (PR #49). Ce document ne modifie ni ne remplace cette spécification.

## 1. Objectif

Créer un noyau serveur qui transforme une demande en réponse ou en plan d'actions autorisées, puis vérifie et trace les résultats. Le moteur doit pouvoir changer de fournisseur de modèle sans modifier l'interface ARIA, et accueillir progressivement des agents et outils.

Ce document définit des frontières et des contrats. Il ne prétend pas que le runtime, les agents ou les outils sont déjà implémentés.

## 2. Principes non négociables

- Le client iPhone/PWA ne détient aucun secret fournisseur et ne décide jamais seul des permissions.
- Le modèle propose ; le runtime valide ; le moteur d'autorisation décide ; les outils exécutent ; le vérificateur contrôle.
- Une sortie du modèle n'est jamais une preuve d'exécution.
- Les contenus du Web, fichiers, outils et résultats de modèles sont des données non fiables.
- Toute action est limitée par l'identité authentifiée, le consentement, les permissions, les quotas et le niveau de risque.
- Les actions sensibles, financières, publiques, destructrices ou irréversibles nécessitent une confirmation explicite.
- Le moteur doit fonctionner sans agent spécialisé : une réponse simple ne déclenche pas une orchestration inutile.
- Les traces sont minimisées : pas de secrets, jetons, ni conversations complètes par défaut.

## 3. Architecture logique

```text
ARIA Client (iOS / PWA / PC)
        |
        v
API Gateway — identité, validation, quotas
        |
        v
Conversation Orchestrator
        |---- Context Builder ---- Memory Adapter
        |---- Model Router ------- Model Provider Adapters
        |---- Agent Runtime ------ Agent Registry
        |                           |
        |                           v
        |                       Tool Registry
        |                           |
        |                       Policy / Permission Gate
        |                           |
        |                       Tool Executors
        |
        v
Result Verifier — Trace Recorder — Response Composer
        |
        v
ARIA Client
```

Les composants sont des modules logiques. Ils peuvent être déployés dans un ou plusieurs services selon les contraintes Cloudflare et les besoins futurs. Aucun déploiement ou choix d'hébergement supplémentaire n'est impliqué par ce schéma.

## 4. Contrats internes

### 4.1 Model Provider

Interface minimale :

```ts
type ModelRequest = {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  responseFormat?: { type: "json_schema"; schema: unknown };
  tools?: ToolDescriptor[];
  maxOutputTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
};

type ModelResponse = {
  content: string;
  toolCalls?: Array<{ id: string; name: string; arguments: unknown }>;
  usage?: { inputTokens?: number; outputTokens?: number };
  provider: string;
  model: string;
  finishReason: string;
};

interface ModelProvider {
  generate(request: ModelRequest): Promise<ModelResponse>;
  health(): Promise<{ available: boolean }>;
}
```

Un adaptateur par fournisseur traduit ce contrat vers son API. Le routeur choisit un fournisseur selon disponibilité, capacité, coût estimé, latence, région et politique de données. Il ne doit pas basculer vers un fournisseur non autorisé pour le type de données traité.

### 4.2 Model Router

Entrée : requête, contraintes de données, politique de coût et capacités requises.  
Sortie : fournisseur/modèle sélectionné ou erreur explicite.

Exigences :
- configuration externe au code métier ;
- liste d'autorisation des modèles ;
- plafonds de tokens et budget par requête/session ;
- timeout, annulation, retry borné et protection contre les doubles exécutions ;
- télémétrie agrégée sans contenu sensible ;
- fallback uniquement vers un modèle compatible avec les mêmes règles de confidentialité.

### 4.3 Tool Registry

Chaque outil déclare au minimum :

```ts
type ToolDescriptor = {
  name: string;
  description: string;
  inputSchema: unknown;
  outputSchema: unknown;
  permission: string;
  risk: "read" | "reversible_write" | "sensitive_write";
  requiresConfirmation: boolean;
  idempotent: boolean;
  timeoutMs: number;
};
```

Le registre expose les outils autorisés au runtime. Le modèle ne peut ni enregistrer un outil, ni changer ses permissions, ni appeler directement un exécuteur. Les arguments sont validés contre le schéma avant exécution.

### 4.4 Agent Runtime

Un agent est une stratégie versionnée utilisant le même Model Router et le même Tool Registry. Un agent ne possède pas de privilèges implicites.

Contrat conceptuel :
- `run(input, context, budget, signal)` ;
- résultat structuré : réponse, plan, demandes d'outil, blocage ou demande de confirmation ;
- limites obligatoires : nombre de tours, durée, tokens, appels d'outils et coût ;
- arrêt immédiat sur annulation, révocation ou dépassement de budget.

L'orchestrateur commence avec un agent généraliste. Les agents Research, Developer, Analyst, Personal et Operator sont des spécialisations futures, pas des livrables présumés.

### 4.5 Memory Adapter

Interface découplée du stockage :

- `read(query, scope, policy)`
- `write(item, scope, expectedRevision, consent)`
- `delete(id, scope, consent)`
- `health()`

Le scope est dérivé côté serveur de l'identité vérifiée. Le client ne peut pas choisir l'identifiant propriétaire. Toute lecture/écriture distante vérifie le consentement et les permissions. Les écritures concurrentes utilisent une révision attendue et renvoient un conflit explicite. L'implémentation actuelle de mémoire et ses migrations restent gouvernées par les PR existantes ; ce document ne les remplace pas.

### 4.6 Trace Recorder

Événements structurés minimaux :
- requête reçue (identifiant opaque, horodatage, type) ;
- modèle sélectionné et consommation agrégée ;
- agent/étape exécutée ;
- outil demandé, autorisation, exécution et résultat ;
- confirmation demandée/accordée/refusée ;
- vérification finale et statut.

Statuts de tâche : `planned`, `running`, `succeeded`, `failed`, `blocked`, `unverified`, `cancelled`. Une action n'est `succeeded` qu'après preuve issue de l'exécuteur ou d'une vérification indépendante adaptée.

## 5. Cycle d'exécution

1. Authentifier l'utilisateur et établir son scope côté serveur.
2. Valider taille, format, quotas, consentements et permissions.
3. Construire le contexte à partir des seules sources autorisées.
4. Classifier l'intention et déterminer si une réponse directe suffit.
5. Si nécessaire, demander au modèle un plan ou un appel d'outil structuré.
6. Valider chaque appel d'outil : schéma, identité, permission, risque, confirmation, budget et idempotence.
7. Exécuter l'outil dans un adaptateur contrôlé.
8. Vérifier le résultat et enregistrer la trace minimale.
9. Reprendre l'orchestration dans les limites prévues, ou arrêter proprement.
10. Composer une réponse qui distingue résultat vérifié, échec, blocage et incertitude.

## 6. Sécurité et autonomie

- Politique d'autorisation appliquée côté serveur à chaque appel.
- Aucun accès arbitraire au réseau, au shell, aux fichiers ou aux comptes.
- Les outils d'écriture sont désactivés par défaut tant que leur permission et leur procédure de confirmation ne sont pas définies.
- Les outils sensibles utilisent des clés d'idempotence et des délais d'expiration.
- Les injections d'instructions provenant de sources externes ne peuvent pas modifier le rôle système ni les permissions.
- La révocation de session/consentement interrompt les opérations futures et invalide le contexte concerné.
- Toute action non vérifiable est rapportée comme telle, jamais comme réussie.

## 7. Compatibilité avec le dépôt actuel

État de référence observé :
- `main` est une PWA V0.7 locale ; son README déclare explicitement qu'aucun vrai modèle IA, backend intégré ou authentification n'y est connecté.
- Les PR d'identité, de mémoire et de staging sont ouvertes et empilées. Les PR #54, #57 et #58 décrivent des dépendances et des validations qui ne doivent pas être contournées.
- Le Worker candidat de la PR #58 est une intégration de chat structurée, pas encore le runtime multi-agents décrit ici.
- Les validations CI déclarées dans les PR ne prouvent pas un test HTTP réel, un déploiement ou un test iPhone physique.

En conséquence, cette architecture est une cible d'intégration. Elle ne doit pas être codée en parallèle en ignorant les contrats d'authentification, de consentement et de mémoire déjà en cours de stabilisation.

## 8.1. Précondition identité et mémoire — état observé le 19 novembre 2026

La pile de PR actuellement ouverte forme une dépendance explicite :

1. PR #54 — impose le mode d'identité individuelle et refuse les modes de compatibilité lorsque `ARIA_REQUIRE_INDIVIDUAL_AUTH=true`.
2. PR #57 — fait dépendre le test HTTP staging de deux comptes du signal de readiness strict (identité individuelle, autorisation D1 et mémoire persistante).
3. PR #58 — ajoute la révision optimiste des documents mémoire, le conflit HTTP 409 et l'audit du consentement ; sa base est la branche de la PR #57.
4. PR #56 — correction vocale séparée, basée sur une autre branche d'interface ; à intégrer indépendamment après vérification de ses dépendances.

Les PR #54, #57 et #58 sont empilées ; elles ne doivent pas être fusionnées comme trois changements indépendants. Leur statut GitHub indique actuellement qu'elles sont fusionnables sur leur base respective, mais leurs branches sont en retard de plusieurs commits sur `main`. Cela ne constitue pas une preuve que leur ensemble est prêt pour la production.

La PR #54 documente un décalage de staging : le Worker observé utilisait encore `session_kv` alors que le garde-fou exigeait l'identité individuelle. Le comportement attendu est un refus fermé et un état de readiness non prêt, pas un retour silencieux au mode historique. Ne modifier aucun secret, binding, migration ou déploiement pour masquer ce blocage.

**Gate obligatoire avant le premier moteur IA connecté à la mémoire :**
- réconcilier la pile sur une base à jour sans perdre les changements de `main` ;
- exécuter les tests unitaires Worker et les tests SQL/migrations ;
- valider le Worker staging avec deux comptes canoniques réellement distincts ;
- vérifier isolation lecture/écriture, consentement désactivé, révocation, concurrence et réponse 409 ;
- confirmer les migrations réellement appliquées à D1 et l'état de readiness ;
- seulement ensuite connecter le Context Builder au Memory Adapter.

## 8. Séquencement d'implémentation proposé

**Étape A — Préconditions**
- établir le graphe réel des branches/PR et leur ordre de fusion ;
- stabiliser identité serveur, consentement et isolation mémoire ;
- définir le contrat API entre client et Worker ;
- choisir le runtime JavaScript/TypeScript compatible avec l'environnement de déploiement réel.

**Étape B — Vertical slice sans outils d'écriture**
- ModelProvider + un adaptateur réel ;
- ModelRouter avec budget et timeout ;
- Context Builder limité à la conversation et aux données autorisées ;
- réponse structurée et gestion d'erreurs ;
- tests contractuels et traces minimales.

**Étape C — Outils en lecture seule**
- Tool Registry ;
- un outil de lecture à faible risque ;
- validation des arguments et vérification du résultat ;
- tests d'autorisation et d'injection.

**Étape D — Agents et mémoire**
- agent généraliste borné ;
- récupération mémoire selon consentement et scope ;
- reprise de tâche et limites de boucle ;
- agents spécialisés uniquement lorsqu'un cas d'usage le justifie.

**Étape E — Écritures et autonomie progressive**
- outils réversibles d'abord ;
- confirmation explicite pour actions sensibles ;
- idempotence, audit et rollback ;
- tests de sécurité et tests de bout en bout avant toute activation.

## 9. Critères d'acceptation du premier incrément

Le premier incrément ne sera considéré comme terminé que si :
- un fournisseur peut être remplacé sans modifier le contrat du client ;
- les secrets restent côté serveur ;
- l'identité et le scope sont dérivés et validés côté serveur ;
- les limites de coût, durée et tokens sont appliquées ;
- les erreurs fournisseur sont explicites et ne créent pas de faux succès ;
- les tests couvrent réponses valides, JSON invalide, timeout, annulation, quota et fournisseur indisponible ;
- aucune action d'outil n'est possible dans cette première tranche ;
- les tests et le diff sont attachés à une PR dédiée.

## 10. Décisions encore ouvertes

À trancher après vérification des contraintes de déploiement, sans les présumer :
- format exact de l'API client/Worker et versionnement ;
- runtime et langage définitifs (JavaScript ou TypeScript compilé) ;
- fournisseur(s) initiaux et règles de routage ;
- stockage des traces et durée de rétention ;
- modèle de budget et quotas par offre ;
- stratégie de reprise des missions longues.

**Règle :** aucune fonctionnalité décrite ici ne doit être annoncée comme implémentée tant qu'un commit, des tests reproductibles et, le cas échéant, une validation de service ne l'établissent pas.
