# ARIA — MATRICE DE TRAÇABILITÉ V1.0
## Exigences → systèmes → contrats → tests → preuves

**Date :** 3 novembre 2026  
**Statut :** Draft de travail — à compléter avec les sources canoniques et les arbitrages ouverts  
**Branche :** `architecture/master-architecture-v2-draft`  
**Références :** Master Specification V1.0 (branche documentaire), Experience Definition V1.0 validée, décisions D-001 à D-003, audit de cohérence du 3 novembre, Master Architecture V2.0 Draft et System Blueprint V1.1 Draft.  
**Périmètre :** traçabilité documentaire ; aucune implémentation ni validation runtime effectuée par ce document.

---

## 1. Règles de lecture

### Statuts
- **Décidé** : décision utilisateur explicitement validée.
- **Exigence connue** : exigence explicitement présente dans les sources consultées ; sa conformité technique peut rester non démontrée.
- **Cible** : comportement architectural attendu.
- **Ouvert** : arbitrage nécessaire.
- **Observé** : élément constaté dans le code ou dans une preuve documentaire datée.
- **Non démontré** : aucune preuve suffisante de bout en bout disponible.
- **Validé** : preuve reproductible dans l'environnement concerné ; aucun statut « validé » n'est attribué ici sans preuve nouvelle.

### Règles
1. Une exigence peut être décidée alors que son implémentation est absente.
2. Un fichier, une branche ou une PR ne constitue pas une preuve de livraison.
3. Une suite de tests passée ne prouve que le périmètre réellement couvert.
4. Toute preuve doit pointer vers un commit, une version, un environnement, une date et un résultat.
5. Les identifiants et contrats proposés dans cette matrice restent à versionner.
6. Les sources V2.0 originales complètes n'ayant pas été localisées, cette matrice n'est pas une comparaison exhaustive de ces documents.

---

## 2. Matrice principale

| ID | Exigence / résultat attendu | Source / statut | Système propriétaire | Contrat / interface | Test d'acceptation requis | Preuve actuelle / statut |
|---|---|---|---|---|---|---|
| TR-001 | Identité fondamentale d'ARIA stable ; expression et capacités évolutives sous contrôle | D-001 — **Décidé** | Identity Core, Experience, Governance | IdentityContext, ExperienceProfile, PolicyDecision | Vérifier qu'un changement de profil/capacité ne modifie ni identité fondamentale ni permissions | Décision documentée ; test/implémentation **non démontrés** |
| TR-002 | ARIA fonctionne comme partenaire autonome, pas uniquement réactif | D-003 — **Décidé** | Cognitive, Governance, Presence | InitiativePlan, PolicyDecision, AuditEvent | Déclencher une initiative autorisée, refuser une initiative hors périmètre et respecter fréquence/budget | Principe décidé ; seuils et preuves **ouverts** |
| TR-003 | Mémoire riche et multicouche | D-002 — **Décidé** | Memory Engine | MemoryObject, MemoryQuery, MemoryWrite | CRUD par catégorie, provenance, correction, export, suppression et récupération contextualisée | Principe décidé ; conformité complète **non démontrée** |
| TR-004 | Mémoire strictement isolée entre comptes et espaces | Master Specification / sécurité — **Exigence connue** | Identity Core, Memory, Governance | IdentityContext, MemoryQuery, PolicyDecision | Deux comptes distincts ne peuvent ni lire ni modifier les objets de l'autre ; tests négatifs IDOR | Master Spec signale absence de preuve E2E à deux comptes au 1er nov. ; **non démontré** |
| TR-005 | Consentement mémoire distinct des préférences d'expérience | Experience Definition / audit — **Exigence connue** | Experience, Governance, Memory | ConsentRecord, MemoryWrite | Parcours onboarding : choix séparés ; refus mémoire n'empêche pas les préférences non sensibles autorisées | Exigence conceptuelle connue ; test iPhone/Web **non démontré** |
| TR-006 | Provenance, correction, conservation, partage, export et suppression mémoire | D-002 — **Décidé / détails ouverts** | Memory, Governance | MemoryObject, RetentionPolicy, DataRightsRequest | Tests de cycle de vie incluant index, caches, données dérivées et sauvegardes selon politique | Spécification détaillée à produire ; **non démontré** |
| TR-007 | Voix comme canal principal ; texte complémentaire | Experience Definition — **Exigence connue** | Presence, Experience | PresenceState, AudioCapabilityReport | Parcours vocal complet sur appareils cibles ; texte de secours ; tests de permissions | Correctif vocal #56 en PR brouillon selon audit ; test iPhone physique non attesté |
| TR-008 | Interruption immédiate, pause et arrêt de l'écoute | Experience Definition — **Exigence connue** | Presence | TurnEvent, PresenceState | Interrompre TTS, arrêter capture, vérifier état UI/audio et absence de capture après arrêt | Comportement cible ; E2E matériel **non démontré** |
| TR-009 | États de présence reflètent l'état réel du micro, du réseau et de la parole | Experience Definition — **Exigence connue** | Presence, Experience | PresenceState, AudioCapabilityReport | Simuler permission refusée, micro indisponible, perte réseau, TTS interrompu ; vérifier états | **Non démontré** |
| TR-010 | HUD discret, borderless, chaleureux et contextuel | Experience Definition — **Exigence connue** | Experience | ExperienceDirective, ExperienceProfile | Tests visuels/accessibilité sur iPhone, Web et PC ; vérifier absence de surcharge | Concept validé ; couverture visuelle multi-client **à prouver** |
| TR-011 | Personnalité élégante, vive, complice ; ARIA tutoie l'utilisateur | Experience Definition / D-004 ouvert selon registre — **Exigence connue, détails ouverts** | Experience, Cognitive | PersonaProfile, ExperienceDirective | Évaluations conversationnelles multi-contextes ; cohérence sans altérer la précision | Direction connue ; protocole d'évaluation à définir |
| TR-012 | Identité et autorisations distinctes ; décision serveur à chaque action sensible | Master Specification / audit — **Exigence connue** | Identity Core, Governance | IdentityContext, PolicyDecision | Tests d'accès sans session, session expirée, rôle falsifié, scope invalide, compte croisé | Master Spec du 1 nov. signale garde-fou incomplet sur certaines routes ; **non démontré** |
| TR-013 | Refus sûr si configuration d'authentification/autorisation requise absente | Master Specification / sécurité — **Exigence connue** | Governance, Identity | PolicyDecision, AuthConfigStatus | Tests configuration manquante, mode legacy/session non autorisé, D1 indisponible | PR #54 prévue selon audit ; déploiement et test courant non attestés |
| TR-014 | Planification et orchestration cognitives sans exécution directe non contrôlée | Architecture cible — **Cible** | Cognitive, Capability, Governance | CognitivePlan, CapabilityTask, PolicyDecision | Vérifier que tout appel de capacité est autorisé et tracé ; aucune exécution directe depuis le modèle | Contrats à implémenter ; **non démontré** |
| TR-015 | Registre de capacités versionné et découvrable | Architecture cible — **Cible** | Capability | CapabilityManifest, CapabilityRegistry | Enregistrer, découvrir, retirer et résoudre versions incompatibles ; tests de permission | Pas de registre complet démontré sur main |
| TR-016 | Exécution isolée, quotas et réseau restreint | Architecture cible / sécurité — **Cible** | Capability, Governance | RuntimePolicy, CapabilityTask | Tests d'évasion sandbox, accès réseau, CPU/mémoire, timeout et exfiltration | Runtime général isolé **non démontré** |
| TR-017 | Tâches longues reprenables, idempotentes et annulables | Architecture cible — **Cible** | Capability, Cognitive | TaskEnvelope, TaskCheckpoint, CancelTask | Crash/reprise, retry, double livraison, annulation, expiration sans double effet | **Non démontré** |
| TR-018 | Résultats validés avant annonce de réussite | Architecture cible / exactitude — **Cible** | Capability, Cognitive, Experience | CapabilityResult, ValidationReport | Vérifier qu'un résultat sans preuve est présenté comme incomplet/échoué, jamais réussi | Règle documentaire ; test de bout en bout à créer |
| TR-019 | iPhone, Web et PC forment un écosystème cohérent, sans permissions supposées identiques | Experience Definition — **Exigence connue** | Experience, Presence, Capability, Identity | ClientCapabilityReport, SyncEnvelope | Matrice de tests par client ; permissions disponibles/indisponibles et comportement de repli | Synchronisation iPhone-PC non intégrée sur main selon audit |
| TR-020 | Synchronisation versionnée, résistante aux interruptions et sans écrasement silencieux | Architecture cible — **Cible** | Capability, Memory, Identity | SyncEnvelope, ConflictRecord | Coupure réseau, conflits simultanés, reprise, révocation et suppression propagée | **Non démontré** |
| TR-021 | Visualisations distinguent données réelles, simulées, rendus et modèles manipulables | Experience Definition — **Exigence connue** | Experience, Capability, Cognitive | VisualizationDescriptor, DataProvenance | Vérifier étiquetage, provenance, hypothèses et distinction simulation/mesure | Capacités avancées non démontrées sur main |
| TR-022 | Logo A triangulaire peut ouvrir une visualisation immersive et revenir sans perte de contexte | Experience Definition — **Exigence connue** | Experience, Presence | ImmersiveTransition, ContextCheckpoint | Tests entrée/sortie, interruption, retour et conservation du contexte | Intention d'expérience ; implémentation/test **non démontrés** |
| TR-023 | Initiatives autonomes limitées par permission, fréquence, risque et budget | D-003 — **Décidé sur le principe, détails ouverts** | Governance, Cognitive, Capability | AutonomyPolicy, PolicyDecision, BudgetState | Tests de seuil, répétition, coût, réversibilité, refus et révocation | Politique détaillée non arbitrée |
| TR-024 | Évolution du système isolée, testée, approuvée et réversible | Architecture cible / D-001 — **Cible** | Capability, Governance | ChangeProposal, ValidationReport, RollbackPlan | Modifier une branche isolée, exécuter tests, bloquer une modification des garde-fous, rollback | Processus à construire ; **non démontré** |
| TR-025 | Auditabilité sans fuite de secrets ni données privées inutiles | Master Specification / sécurité — **Exigence connue** | Governance, tous systèmes | AuditEvent | Tests de minimisation, redaction, intégrité, accès et rétention | Politique complète et vérification runtime à produire |
| TR-026 | Arrêt d'urgence et révocation des capacités | Architecture cible / sécurité — **Cible** | Governance, Capability, Presence | RevocationEvent, KillSwitchStatus | Révoquer une capacité en cours et vérifier arrêt/état utilisateur/audit | **Non démontré** |
| TR-027 | État livré séparé de l'architecture cible | Règle de preuve — **Exigence connue** | Tous systèmes / gouvernance documentaire | ImplementationStatus, EvidenceRecord | Chaque fonction possède commit, environnement, test, date et résultat | Main PWA V0.7 observée ; les systèmes complets ne sont pas livrés sur main selon audit |
| TR-028 | Concepts de vision étendue réservés hors périmètre immédiat par défaut | Décision de périmètre antérieure — **Cible de périmètre** | Architecture / Governance | ScopeDecision | Revue de chaque proposition nouvelle contre le périmètre ARIA approuvé | Réserve documentaire ; aucun développement requis dans ce lot |

---

## 3. Contrats à spécifier en priorité

| Priorité | Contrat | Producteur | Consommateur | Champs / invariants à définir |
|---|---|---|---|---|
| P0 | `IdentityContext` | Identity Core | Presence, Cognitive, Memory, Governance | Sujet vérifié, compte/espace, session, expiration, niveau d'assurance ; jamais depuis un champ client non fiable |
| P0 | `PolicyDecision` | Governance | Cognitive, Capability, Memory | Décision, scope, ressource, action, conditions, expiration, approbation et motif |
| P0 | `MemoryObject` / `MemoryQuery` | Memory | Cognitive / Experience selon droits | Catégorie, provenance, propriétaire, consentement, classification, rétention et droits |
| P1 | `PresenceState` / `TurnEvent` | Presence | Experience, Cognitive | États vocaux exacts, canal, interruption, horodatage et état réel des périphériques |
| P1 | `CognitivePlan` | Cognitive | Governance, Capability | Étapes, dépendances, critères de réussite, risques, effets de bord |
| P1 | `CapabilityManifest` | Capability | Cognitive, Governance | Schémas, version, permissions, ressources, dépendances, runtime, effets de bord |
| P1 | `CapabilityTask` / `CapabilityResult` | Cognitive / Capability | Capability / Cognitive | Idempotence, checkpoint, limites, résultat, preuves, artefacts |
| P1 | `ExperienceDirective` | Cognitive / Presence | Experience | Profil, canal, restitution, accessibilité et contexte |
| P2 | `SyncEnvelope` | Clients / services | Clients / services | Version, ordre, conflit, idempotence, chiffrement et révocation |
| P2 | `AuditEvent` | Tous systèmes | Governance / audit | Acteur, action, ressource, décision, résultat, corrélation, minimisation |

---

## 4. Suites de tests transversales

| Suite | Objectif | Exemples de scénarios | Gate de sortie |
|---|---|---|---|
| AUTH-ISO | Identité et isolation | Deux comptes, session expirée, IDOR, scopes falsifiés, D1 indisponible | Aucun accès inter-compte ; refus sûr |
| MEM-LIFECYCLE | Cycle de vie mémoire | Consentement, correction, export, suppression, index, cache, sauvegarde | Résultats conformes à la politique et auditables |
| VOICE-E2E | Présence vocale | Permissions, écoute, TTS, interruption, pause, reprise, réseau coupé | États exacts et interruption immédiate sur appareils cibles |
| CAP-CONTRACT | Contrats de capacité | Schémas invalides, version incompatible, permission manquante | Rejet déterministe et erreur structurée |
| RUNTIME-SEC | Isolation d'exécution | Évasion, réseau, filesystem, quotas, secrets, timeout | Aucun accès hors périmètre ; ressources bornées |
| TASK-RESUME | Durabilité | Crash, retry, double livraison, checkpoint, annulation | Pas de double effet de bord ; reprise contrôlée |
| SYNC-MULTI | Synchronisation | Hors ligne, conflit, révocation, suppression, changement d'appareil | Pas d'écrasement silencieux ; convergence explicite |
| UX-MULTI | Expérience multi-client | iPhone/Web/PC, accessibilité, HUD, état vocal | Cohérence sans supposer des permissions identiques |
| EVOLVE-GATE | Évolution contrôlée | Branche isolée, tests, changement sensible, rollback | Garde-fous non modifiables par le processus d'évolution |
| PROVENANCE | Fiabilité des résultats | Source absente, données simulées, modèle approximatif | Incertitudes et provenance visibles |

Aucune suite n'est déclarée passée par ce document.

---

## 5. État de preuve connu au 3 novembre 2026

| Élément | Constat | Statut |
|---|---|---|
| `main` | PWA prototype V0.7, historique et notes locales selon README/code inspectés | Observé |
| IA réelle et recherche Web sur `main` | Non connectées selon documentation inspectée | Non présentes sur main au contrôle |
| Authentification et mémoire persistante multi-comptes | Chantiers en branches/PR ; preuves E2E avec deux comptes non attestées dans Master Spec du 1er nov. | Non démontrées |
| Cloudflare staging | Worker version 26 et mode `session_kv` rapportés dans Master Spec du 1er nov. ; garde-fou incomplet sur certaines routes | Documenté, non revalidé runtime ici |
| Migrations D1 | Migrations 0001–0003 et tables documentées ; table de suivi absente selon audit | Documenté, à recontrôler |
| Voix | Correctif #56 en PR brouillon selon audit ; test iPhone physique non attesté | Non démontré E2E |
| Synchronisation iPhone-PC | Non intégrée sur main selon audit | Non présente sur main au contrôle |
| Sandbox et registre de capacités général | Pas démontrés sur main dans les éléments inspectés | Non démontrés |
| Sept systèmes directeurs | Architecture documentaire en cours de formalisation | Cible, pas implémentation |

Cette table est une photographie documentaire datée, pas un état runtime actualisé.

---

## 6. Blocages P0 et critères de sortie

### P0-A — Sources canoniques
- Localiser Vision stratégique V2.0 et Master Architecture V2.0 originales.
- Localiser/ajouter Experience Definition V1.0 sans modifier son contenu validé.
- Confirmer la hiérarchie documentaire et les statuts.

**Sortie :** registre de sources avec version, date, statut, propriétaire et relation normative.

### P0-B — Identité et autorisation
- Revalider l'état du Worker staging et de ses routes sans lire ni exposer de secrets.
- Exécuter les tests positifs et négatifs avec deux comptes canoniques.
- Tester session absente/expirée, mode interdit, permission manquante et panne D1.

**Sortie :** rapport HTTP reproductible lié au commit et à la version staging ; aucun accès inter-compte.

### P0-C — Mémoire
- Formaliser catégories, provenance, consentement, rétention, correction, partage, export et suppression.
- Définir les garanties sur index, caches et sauvegardes.

**Sortie :** schéma et tests de cycle de vie.

### P0-D — Contrats de confiance
- Définir IdentityContext et PolicyDecision.
- Définir le comportement en cas de contexte manquant ou de décision Governance indisponible.

**Sortie :** schémas versionnés et tests de contrat.

---

## 7. Gouvernance de la matrice

Chaque ligne doit être mise à jour lorsque :
- une source normative change ;
- une décision utilisateur est validée ou révoquée ;
- un contrat est versionné ;
- un test est exécuté ;
- une preuve de code ou de déploiement apparaît ;
- un risque ou une dépendance évolue.

Toute modification de statut « non démontré » vers « testé » ou « validé » doit fournir un lien vers le test, son résultat, le commit, l'environnement et la date. Une PR ouverte ne change pas le statut d'implémentation. Un déploiement ne change pas le statut de validation sans test adapté.

---

**Conclusion :** cette matrice transforme l'architecture en éléments vérifiables. Elle ne certifie pas l'état actuel d'ARIA ; elle définit ce qu'il faudra démontrer pour pouvoir le faire.

**ARIA — Beyond what exists.**
