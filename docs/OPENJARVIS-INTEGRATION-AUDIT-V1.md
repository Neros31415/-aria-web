# Audit d'intégration OpenJarvis — ARIA V1

**Date de l'audit initial :** 19 novembre 2026  
**Statut :** audit initial documenté ; intégration runtime non commencée  
**Dépôts examinés :**
- OpenJarvis : https://github.com/open-jarvis/OpenJarvis (branche `main`)
- ARIA : https://github.com/Neros31415/-aria-web (base `main`, SHA `7c5edb2736e0d7deea83c122d06098f6d27017b3`)
- Contrat ARIA Intelligence Engine : PR #61 (documentation, ouverte)

## 1. Décision exécutive

OpenJarvis est une référence technique pertinente pour le moteur d'intelligence d'ARIA, mais il ne doit pas être importé en bloc dans le dépôt web actuel.

**Décision proposée : intégration par service/adaptateur, pas portage direct du framework Python dans le Worker JavaScript.**

- ARIA conserve l'identité utilisateur, les sessions, les consentements, les permissions, les budgets, l'expérience iPhone/PWA et la relation produit.
- OpenJarvis fournit une implémentation candidate pour l'inférence, les agents, les outils, la mémoire de recherche et l'analyse des traces.
- Une frontière API versionnée isole ARIA du runtime OpenJarvis.
- Les données et permissions restent gouvernées par ARIA ; OpenJarvis ne devient jamais l'autorité d'identité ou de consentement.
- Aucun fournisseur, hébergeur supplémentaire, déploiement ou coût récurrent n'est choisi dans cet audit.

## 2. État réel des deux dépôts

### ARIA

Le dépôt `Neros31415/-aria-web` est actuellement une PWA V0.7 légère : `index.html`, `app.js`, `styles.css`, `sw.js` et manifest. Le README de `main` indique explicitement que :
- l'interface responsive, l'historique local, les notes de mémoire locales et le cache hors ligne de base existent ;
- aucun vrai modèle IA distant n'est connecté ;
- la recherche Web, l'authentification/backend, la synchronisation iPhone-PC et le contrôle système ne sont pas implémentés sur cette base.

Le `app.js` actuel répond localement par des messages statiques et conserve l'historique/mémoire dans `localStorage`. Il ne contient pas de client API moteur.

Le dépôt ne présente pas de `package.json` ni de `wrangler.toml` à sa racine sur `main). Il contient des scripts Node de Factory, mais cela ne constitue pas un runtime backend d'IA.

La PR #61 définit déjà les frontières logiques Model Provider, Model Router, Agent Runtime, Tool Registry, Memory Adapter et Trace Recorder. Elle est une proposition documentaire ouverte, pas une implémentation.

### OpenJarvis

Le dépôt `open-jarvis/OpenJarvis` est public, branche `main`, sous licence Apache-2.0. Le `pyproject.toml` déclare Python `>=3.11,<3.14`. Le projet est donc un framework Python et non une bibliothèque JavaScript directement importable dans le Worker ARIA.

Les primitives et modules examinés comprennent :
- `core/registry.py` : registres typés, découverte et instanciation de composants ;
- `core/events.py` : bus pub/sub en processus ;
- `engine/` : contrat d'inférence et adaptateurs de moteurs locaux/cloud ;
- `agents/` : contrat d'agent et agents simples, orchestrés et spécialisés ;
- `tools/` et `tools/storage/` : outils et backends de recherche/mémoire ;
- `traces/` : collecte, persistance SQLite et analyse ;
- `security/` : scanners, guardrails, capacités et journal d'audit ;
- `scheduler/` : tâches planifiées ;
- `learning/` : routage guidé par les traces, optimisation et recherche de configuration.

Le projet comporte aussi des extras optionnels nombreux (serveur, mémoire vectorielle, voix, agents externes, apprentissage, sandbox, etc.). Installer toutes les options augmenterait inutilement la surface de dépendances et les risques de compatibilité.

## 3. Compatibilité et principaux risques

| Sujet | Constat | Décision d'intégration |
|---|---|---|
| Langage/runtime | OpenJarvis est Python 3.11–3.13 ; ARIA web est JavaScript statique/Worker | Garder une frontière HTTP ; ne pas tenter d'import Python dans le Worker |
| Déploiement | Aucun backend Python OpenJarvis n'est présent dans ARIA main | Étudier un service Python séparé ; aucun déploiement avant validation |
| Identité | OpenJarvis possède ses propres contextes et mécanismes d'exécution | Identité ARIA vérifiée côté serveur, transmise sous forme de contexte signé/minimal |
| Mémoire | OpenJarvis propose plusieurs stockages ; ARIA a des migrations et consentements D1 en cours | D1/contrat mémoire ARIA reste la source de vérité ; pas de duplication mémoire initiale |
| Traces | TraceCollector/TraceStore peuvent persister requêtes, résultats et messages | Ne pas activer tels quels : minimisation, redaction, rétention et cloisonnement requis |
| EventBus | Bus synchrone en processus | Adapté à la coordination locale ; pas un bus distribué ni une file durable |
| Scheduler | Polling en thread de fond avec stockage local | Ne pas l'utiliser pour des tâches critiques multi-instance sans étude de durabilité/coordination |
| Sécurité outils | OpenJarvis fournit capabilities, rate limiting, scanners et sandbox | Bon modèle de défense en profondeur ; ne remplace pas l'autorisation ARIA |
| Learning | Routage et optimisation à partir des traces | Démarrer en observation/benchmark ; aucune auto-modification en production |
| Dépendances | Beaucoup d'extras et intégrations optionnelles | Installer le minimum nécessaire, verrouiller versions et auditer licences transitives |

### Risques spécifiques à traiter

1. **Fuite de données via les traces.** Le collecteur OpenJarvis peut enregistrer contenu de requête, résultat, messages et étapes. ARIA doit produire des traces minimisées et pseudonymisées, sans secret ni conversation complète par défaut.
2. **Confusion des autorités.** Les rôles, propriétaires, consentements et scopes ne doivent jamais être décidés par le modèle ou déduits du payload client.
3. **Double source de mémoire.** Deux systèmes de vérité rendraient la révocation, la suppression et les contrôles de révision incohérents.
4. **Dépendances lourdes.** Les extras FAISS/ColBERT, voix, training et agents externes ne sont pas nécessaires au premier vertical slice.
5. **Autonomie prématurée.** L'exécution de code, les outils d'écriture, les tâches persistantes et le Learning actif restent désactivés au démarrage.
6. **Licence.** Le dépôt principal est Apache-2.0 ; toute copie/adaptation de code devra conserver les notices et fournir la licence requise. Les licences des dépendances et modèles restent à auditer séparément.

## 4. Cartographie OpenJarvis → contrats ARIA

| OpenJarvis | Contrat ARIA existant / cible | Traitement |
|---|---|---|
| `InferenceEngine` | `ModelProvider` | Adapter derrière API |
| `EngineRegistry` / `ModelRegistry` | `Model Router` + catalogue | Réutiliser le concept, garder politique ARIA |
| `BaseAgent` / `AgentRegistry` | `Agent Runtime` | Adapter ; agent généraliste borné en premier |
| `BaseTool` / `ToolExecutor` | `Tool Registry` / exécuteurs | Plus tard, lecture seule en premier |
| `MemoryBackend` / stockage | `Memory Adapter` | Adaptateur éventuel, sans remplacer D1 |
| `EventBus` | événements internes ARIA | Inspirer le schéma d'événements ; ne pas supposer distribution |
| `TraceCollector` / `TraceStore` | `Trace Recorder` | Reprendre le modèle après minimisation |
| `TraceAnalyzer` / politiques Learning | analyse et amélioration de routage ARIA | Phase ultérieure, d'abord en mode mesure |
| `GuardrailsEngine` / capabilities | policy gate ARIA | Défense en profondeur, jamais autorité unique |
| `TaskScheduler` / Operative | missions et planificateur ARIA | À évaluer après le premier service stable |
| sandbox Docker/Podman | exécution isolée ARIA Factory/agents | À évaluer séparément ; jamais accès direct aux secrets |

## 5. Architecture d'intégration cible

```text
ARIA iPhone / PWA
       |
       v
ARIA API / Worker
  - identité vérifiée
  - consentement et permissions
  - quotas et budgets
  - validation du contrat
       |
       | HTTPS service-to-service
       v
ARIA Intelligence Adapter (API versionnée)
       |
       v
OpenJarvis Runtime (service Python isolé)
  - Engine / Model Registry
  - Agent Runtime
  - Tool Registry (désactivé au départ)
  - Context Builder
  - Trace / Telemetry minimisées
       |
       v
Fournisseur(s) de modèles autorisés
```

Le Worker ARIA reste le point d'entrée public. Le service OpenJarvis ne doit pas être directement exposé au client. L'adaptateur doit vérifier l'authenticité du Worker, les identifiants de requête, les limites de taille et les budgets. Les appels sortants du runtime doivent être limités aux fournisseurs explicitement autorisés.

Le premier incrément ne requiert ni outils d'écriture, ni mémoire OpenJarvis, ni scheduler, ni Learning actif.

## 6. Ordre de travail retenu

### Étape 1 — Audit initial (ce document)
- Dépôts, langage, licence, architecture, modules, état ARIA et compatibilité : effectué à un premier niveau.
- Audit approfondi des contrats, dépendances transitives, sécurité, traces et tests : à compléter avant choix de packages.

### Étape 2 — Cartographie contractuelle
- Aligner chaque primitive OpenJarvis sur les interfaces de la PR #61.
- Définir les DTO HTTP, erreurs, timeouts, annulation, streaming éventuel et version d'API.
- Définir les exigences de sécurité interservices et le contexte d'identité minimal.
- Établir un tableau de décision : réutiliser en dépendance, adapter, réimplémenter ou exclure.

### Étape 3 — Stabilisation des prérequis ARIA
- Préserver l'ordre réel des PR d'identité et de mémoire ; vérifier les bases et les migrations.
- La PR #63 (consentement par génération) est empilée sur #58 et annonce 74 tests Node + 11 tests SQLite réussis ; la migration 0005 est ajoutée mais non appliquée à D1.
- La PR #64 (Factory runner) est indépendante, créée depuis main et annonce 5/5 tests du validateur réussis.
- Les PR #54, #57, #63 et #64 restent ouvertes/brouillons lors de cet audit ; ne pas les fusionner isolément ni modifier leur historique.
- Aucun test HTTP staging à deux comptes, changement de binding, secret, migration distante ou déploiement n'est autorisé par ce document.

### Étape 4 — Premier vertical slice OpenJarvis
- Créer un adaptateur serveur minimal et un endpoint de santé.
- Connecter un seul moteur/fournisseur autorisé via le contrat ModelProvider.
- Acheminer une conversation sans outils ni mémoire persistante.
- Appliquer timeout, limite de tokens, budget, annulation, redaction des logs et erreurs explicites.
- Ajouter tests contractuels : succès, réponse malformée, timeout, fournisseur indisponible, quota dépassé et identité invalide.
- Garder les secrets côté service ; aucune clé fournisseur dans la PWA.

### Étape 5 — Extensions graduelles
1. traces minimisées ;
2. lecture mémoire ARIA après validation identité/consentement ;
3. outils en lecture seule ;
4. agent généraliste borné ;
5. missions persistantes et scheduler ;
6. outils d'écriture avec confirmations ;
7. Learning et optimisation sous benchmark et revue humaine.

## 7. Critères de sortie de l'audit avant le premier code runtime

- [ ] Cartographie complète des fichiers/classes nécessaires et de leurs versions.
- [ ] Inventaire des dépendances runtime minimales et licences transitives.
- [ ] Contrat HTTP OpenAPI/JSON Schema versionné.
- [ ] Modèle de sécurité service-to-service approuvé.
- [ ] Décision d'hébergement fondée sur coûts, contraintes et capacité opérationnelle.
- [ ] Plan de tests reproductibles et benchmark de référence.
- [ ] Confirmation que les PR identité/mémoire ARIA ne sont pas contournées.

## 8. Références examinées

- OpenJarvis README : https://github.com/open-jarvis/OpenJarvis
- Architecture : https://open-jarvis.github.io/OpenJarvis/architecture/overview/
- Design principles : https://open-jarvis.github.io/OpenJarvis/architecture/design-principles/
- Query flow : https://open-jarvis.github.io/OpenJarvis/architecture/query-flow/
- Agents : https://open-jarvis.github.io/OpenJarvis/architecture/agents/
- Learning : https://open-jarvis.github.io/OpenJarvis/architecture/learning/
- Licence : https://github.com/open-jarvis/OpenJarvis/blob/main/LICENSE
- ARIA Intelligence Engine : https://github.com/Neros31415/-aria-web/pull/61
- ARIA Factory runner : https://github.com/Neros31415/-aria-web/pull/64
- ARIA consent generation : https://github.com/Neros31415/-aria-web/pull/63

---

**Règle de vérité :** ce document est un audit initial et une proposition d'intégration. Il ne signifie pas qu'OpenJarvis est déjà installé, déployé ou connecté à ARIA. Toute étape d'implémentation devra être prouvée par commit, tests reproductibles et revue du diff.
