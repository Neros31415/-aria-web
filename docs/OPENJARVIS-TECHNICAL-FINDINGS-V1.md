# OpenJarvis — constats techniques complémentaires pour ARIA

**Date :** 19 novembre 2026  
**Complément à :** `docs/OPENJARVIS-INTEGRATION-AUDIT-V1.md`  
**Portée :** lecture de code ciblée sur API, SDK, sécurité, mémoire, traces et Learning.

## 1. API disponible

OpenJarvis fournit un serveur FastAPI et des routes de chat compatibles avec le format OpenAI, dont `/v1/chat/completions` et la liste des modèles. Le SDK Python `Jarvis` / `JarvisSystem` compose les primitives côté serveur.

**Conséquence :** ARIA n'a pas besoin d'inventer un protocole de génération spécifique à OpenJarvis pour un premier essai. L'adaptateur ARIA peut appeler l'API compatible OpenAI, mais doit exposer son propre contrat versionné au client ARIA. Le endpoint OpenJarvis ne doit pas être directement exposé au navigateur.

À valider dans le prototype : format exact des erreurs, streaming SSE, annulation, usage tokens, health/readiness, limites de corps et comportement en cas de surcharge.

## 2. Sécurité : points forts et pièges

### Capacités utiles
- GuardrailsEngine peut scanner les entrées/sorties et fonctionner en mode avertissement, masquage ou blocage.
- CapabilityPolicy fournit des permissions fines par agent et ressource.
- AuditLogger persiste des événements de sécurité avec chaîne de hachage.
- Le runtime d'agent sait recevoir une policy, un rate limiter et un identifiant d'agent.

### Risque de configuration par défaut
Le code de `CapabilityPolicy` documente `default_deny=False` par défaut : en l'absence de politique explicite, les capacités sont accordées. C'est inacceptable comme configuration d'intégration ARIA.

**Exigence ARIA :** configurer explicitement le refus par défaut, accorder les seules capacités requises à l'agent concerné, et refaire l'autorisation dans la passerelle ARIA avant chaque opération. Une policy OpenJarvis ne remplace jamais l'autorisation multi-utilisateur d'ARIA.

Les scanners de secrets/PII ne constituent pas une protection contre toutes les injections de prompt, fuites inter-utilisateurs ou actions non autorisées. Les traiter comme défense en profondeur uniquement.

## 3. Mémoire et dépendances natives

Les backends de mémoire/retrieval sont exposés sous `openjarvis.tools.storage`. Le contrat `MemoryBackend` définit store/retrieve/delete/clear.

Le code consulté signale que certains backends Rust-backed nécessitent l'extension native `openjarvis_rust`, construite via maturin, avec Rust `>=1.88`. Il faut distinguer le backend SQLite/FTS5 simple des chemins qui requièrent l'extension native et vérifier le backend exact choisi avant de construire l'image de service.

**Exigence ARIA :** ne pas brancher le stockage mémoire OpenJarvis comme source de vérité au premier incrément. Le premier vertical slice reste conversation-only. L'indexation/recherche OpenJarvis sera évaluée ultérieurement sur une projection contrôlée des données autorisées, avec suppression, révocation et isolation par utilisateur démontrées.

## 4. Traces : données à minimiser

Le `TraceCollector` observe les événements d'inférence, d'outils et de mémoire, puis persiste une trace. Le code consulté peut conserver la requête, le résultat et les messages complets fournis par les métadonnées de l'agent.

**Exigence ARIA :** ne pas activer le collecteur tel quel sur des conversations personnelles. Définir un schéma ARIA de traces avec :
- identifiants opaques de requête, utilisateur et session ;
- horodatages, modèle/agent, latence, tokens et coûts agrégés ;
- noms d'outils et résultats de statut, sans secrets ;
- contenu conversationnel désactivé par défaut ;
- rétention, suppression, chiffrement et contrôle d'accès définis ;
- redaction avant persistance, pas uniquement avant affichage.

## 5. Scheduler et tâches persistantes

Le `TaskScheduler` examiné utilise un thread de polling en arrière-plan et un store. Ce mécanisme est utile dans un processus unique, mais ne prouve pas à lui seul l'exécution exactement-une-fois, le verrouillage distribué ou la reprise robuste après redémarrage/multiples réplicas.

**Exigence ARIA :** exclure le scheduler OpenJarvis du premier incrément. Les tâches persistantes viendront après définition du propriétaire, de l'état durable, des leases/locks, des retries idempotents, de la révocation et de l'observabilité.

## 6. Learning / amélioration automatique

Le système Learning comprend des politiques de routage fondées sur les traces et un système de recherche de configuration. Le chemin spec-search observé suit une boucle diagnostic → plan → exécution → benchmark gate, avec niveaux de risque.

**Exigence ARIA :** commencer en mode mesure uniquement. Toute proposition de modification de prompt, de politique ou de code doit être versionnée, benchmarkée, vérifiée, soumise à une revue et réversible. Aucun apprentissage ne doit modifier automatiquement le comportement de production pendant le premier pilote.

## 7. Décisions techniques consolidées

| Élément | Décision pour ARIA V1 |
|---|---|
| OpenJarvis API | Candidat pour le premier adaptateur serveur |
| FastAPI | Service Python isolé, sous réserve du choix d'hébergement |
| Auth | Authentification ARIA à la passerelle ; secret interservice séparé |
| Engine | Un fournisseur autorisé pour le premier test |
| Agent | SimpleAgent ou orchestration minimale ; aucun outil activé |
| Memory | Désactivée dans le premier slice |
| Tools | Désactivés dans le premier slice |
| Trace | Traces ARIA minimisées, pas de TraceCollector brut |
| Scheduler | Exclu du premier slice |
| Learning | Observation/benchmark uniquement |
| Capabilities | Refus par défaut obligatoire |
| Dépendances | Extra `server` et uniquement le backend nécessaire ; lockfile et audit transitif avant build |

## 8. Tests bloquants avant exposition du service

- [ ] requête sans identité ARIA valide refusée ;
- [ ] secret interservice absent/invalide refusé ;
- [ ] endpoint runtime non accessible publiquement sans passerelle ;
- [ ] aucun outil invoquable dans le premier slice ;
- [ ] aucun accès mémoire ni écriture persistante ;
- [ ] `default_deny=True` vérifié par test ;
- [ ] logs et traces sans prompt complet, token, clé ni PII non nécessaire ;
- [ ] timeout, annulation, quota et erreur fournisseur testés ;
- [ ] tests de charge et de limites de corps ;
- [ ] versions Python/dépendances et licences transitives verrouillées.

**Conclusion :** OpenJarvis possède déjà une API de génération exploitable et de bons composants de sécurité, mais ses valeurs par défaut et sa collecte de traces ne doivent pas être adoptées sans adaptation. Le chemin le plus court et le plus sûr est un adaptateur FastAPI isolé, conversation-only, sans mémoire ni outils, derrière l'autorité ARIA.
