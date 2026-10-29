# ARIA — Complément fonctionnel au cahier des charges V1.2
## Capacités utiles à intégrer dès maintenant — version de travail

**Statut :** exigences proposées, à valider et à implémenter progressivement.  
**Périmètre :** ARIA Web et ses futures interfaces compatibles.  
**Règle de gouvernance :** ce document complète le cahier des charges V1.2 ; il ne vaut ni preuve d'implémentation ni autorisation de fusionner dans `main` ou de déployer.

---

## 1. Objectif

Intégrer à ARIA les capacités issues de la vision long terme qui sont utiles et techniquement abordables dans un périmètre progressif, sans détourner la feuille de route immédiate vers les concepts de recherche les plus ambitieux.

ARIA doit progressivement pouvoir comprendre une intention, retrouver le contexte utile, planifier une tâche, utiliser les outils autorisés, vérifier les résultats et reprendre le travail plus tard. Elle doit rester contrôlable, explicable dans ses actions et indépendante d'un fournisseur de modèle particulier.

## 2. Exigences fonctionnelles prioritaires

### F-INT-01 — Compréhension de l'intention et planification
- Transformer une demande en objectif, contraintes, critères de réussite et étapes proposées.
- Détecter les ambiguïtés importantes et poser une question lorsqu'une supposition pourrait changer le résultat ou le risque.
- Choisir parmi les capacités disponibles uniquement après avoir vérifié leur disponibilité et leurs permissions.
- Pour les tâches simples, répondre directement ; pour les tâches complexes, présenter ou enregistrer un plan adapté.
- Ne pas présenter un plan comme une action accomplie.

**Critères d'acceptation**
1. Des scénarios de test couvrent les demandes simples, multi-étapes, ambiguës et impossibles.
2. Les étapes et critères de réussite sont structurés et peuvent être repris.
3. Une capacité indisponible ou non autorisée est signalée sans prétendre avoir été utilisée.

### F-MEM-01 — Mémoire contextuelle contrôlée
- Relier les souvenirs autorisés aux projets, tâches, décisions et préférences concernés.
- Distinguer les faits explicitement fournis, les inférences et les informations incertaines.
- Respecter le consentement mémoire et les fonctions de consultation, correction et suppression.
- Ne pas inclure de souvenir dans un contexte de modèle lorsque le consentement correspondant est désactivé.
- Isoler les données par identité authentifiée côté serveur ; ne jamais faire confiance à une identité fournie uniquement par le client.

**Critères d'acceptation**
1. Tests d'isolation démontrant qu'un utilisateur ne peut pas lire ou modifier la mémoire d'un autre.
2. Tests couvrant consentement désactivé, correction, suppression et erreur du stockage distant.
3. L'interface signale clairement si une opération de mémoire a échoué ou si son résultat est incertain.

### F-ACT-01 — Exécution et vérification des actions
- Utiliser une boucle traçable : comprendre → planifier → vérifier les permissions → exécuter → contrôler le résultat → rendre compte.
- Définir un contrat d'entrée et de sortie pour chaque outil.
- Vérifier les résultats au moyen de preuves adaptées : résultat d'outil, état persistant, test automatisé ou confirmation externe.
- Distinguer les états « prévu », « en cours », « réussi », « échoué », « bloqué » et « résultat non vérifié ».
- Ne jamais affirmer qu'une action a réussi sans preuve suffisante.
- Permettre l'annulation ou le retour arrière lorsque la capacité technique le permet ; signaler les opérations irréversibles avant leur exécution.

**Critères d'acceptation**
1. Les tests incluent réussite, échec, délai dépassé, réponse malformée et interruption.
2. Un échec d'outil n'est jamais rapporté comme un succès.
3. Les actions sensibles sont bloquées ou soumises à confirmation selon leur niveau de risque.

### F-CONT-01 — Continuité et reprise des tâches
- Enregistrer un état de tâche structuré : objectif, plan, étape courante, résultats vérifiés, erreurs, dépendances, prochaine action et autorisations requises.
- Permettre une reprise après fermeture de session ou interruption, lorsque le stockage et les services sont disponibles.
- Vérifier que les prérequis sont toujours valides avant de reprendre une action.
- Ne pas relancer automatiquement une action non idempotente si son exécution précédente est incertaine.
- Distinguer la conservation de l'état d'une tâche de la capacité réelle à l'exécuter sur un appareil donné.

**Critères d'acceptation**
1. Un scénario de test ferme puis rouvre la session et reprend la tâche sans perdre son état.
2. Une tâche dont les dépendances ont changé est revalidée avant reprise.
3. Une opération à résultat incertain demande une vérification au lieu d'être exécutée aveuglément.

### F-SKILL-01 — Procédures et compétences réutilisables
- Permettre de transformer une procédure validée en compétence versionnée comprenant description, entrées, sorties, permissions, dépendances et tests.
- Exécuter une compétence dans les limites de ses permissions déclarées.
- Garder un historique des versions et permettre le retour à une version précédente.
- Ne pas autoriser une compétence à augmenter elle-même ses permissions ou à modifier les règles de sécurité.
- Ne pas présenter la réutilisation de procédures comme un réentraînement automatique du modèle.

**Critères d'acceptation**
1. Chaque compétence publiée possède des tests reproductibles et une version identifiable.
2. Les changements de version peuvent être comparés et annulés.
3. Une compétence non validée ne devient pas silencieusement une capacité de confiance.

### F-PRO-01 — Proactivité et gestion de l'attention
- Repérer les blocages, échéances et événements pertinents uniquement à partir de sources autorisées.
- Évaluer la pertinence, l'urgence, la confiance, l'impact et le coût d'interruption avant de notifier l'utilisateur.
- Prévoir des règles de fréquence, des périodes de silence et un mécanisme de désactivation.
- Préférer une préparation silencieuse à une notification lorsque l'intervention n'est pas urgente.
- Ne pas simuler une surveillance continue lorsque les tâches planifiées ou les intégrations ne sont pas réellement actives.

**Critères d'acceptation**
1. Les notifications respectent les préférences de silence et les limites de fréquence.
2. Une information insuffisamment vérifiée est présentée comme une hypothèse.
3. L'utilisateur peut consulter, désactiver ou modifier les règles de proactivité.

### F-DEC-01 — Mémoire des décisions et de leurs raisons
- Enregistrer, lorsque cela est utile et autorisé, la décision, son contexte, les options envisagées, les contraintes, les hypothèses et les raisons retenues.
- Marquer clairement les décisions confirmées, les hypothèses et les options rejetées.
- Permettre de réexaminer une décision lorsque ses contraintes ou hypothèses changent.
- Ne pas présenter une décision passée comme une instruction irrévocable.

**Critères d'acceptation**
1. Une décision peut être retrouvée avec son contexte et son statut.
2. Une modification des contraintes peut déclencher une proposition de réévaluation, sans changer la décision sans autorisation.
3. L'utilisateur peut corriger ou supprimer les données associées selon les règles de mémoire.

## 3. Exigences transversales d'architecture

### ARCH-01 — Modularité
Séparer au minimum les responsabilités de compréhension/planification, mémoire, orchestration des actions, vérification, gestion des permissions et interface. Les modules communiquent via des contrats documentés et testables.

### ARCH-02 — Indépendance vis-à-vis du fournisseur IA
Le modèle doit être interchangeable derrière une interface interne stable. La mémoire, les permissions, les tâches et l'historique ne doivent pas dépendre du format propriétaire d'un seul fournisseur. Les capacités spécifiques à un fournisseur doivent être déclarées explicitement.

### SEC-01 — Autonomie contrôlée
- Les permissions sont appliquées côté serveur et au niveau de chaque outil.
- Les niveaux d'autorisation sont distincts : lecture, préparation, exécution réversible, action sensible.
- Les actions destructrices, financières, publiques ou affectant des comptes/données réelles exigent une confirmation explicite adaptée.
- L'IA ne peut ni s'octroyer des rôles, ni modifier ses permissions, ni désactiver les contrôles.
- Les entrées issues de documents, pages Web et outils sont traitées comme des données non fiables, pas comme des instructions privilégiées.

### OBS-01 — Traçabilité et preuve
Journaliser les événements techniques nécessaires au diagnostic et à l'audit, avec minimisation des données, contrôle d'accès et politique de conservation à définir. Ne pas exposer les conversations privées à un administrateur général par défaut. Les secrets, jetons et contenus sensibles ne doivent pas être inscrits dans les journaux.

### UX-01 — Cohérence avec l'expérience ARIA
- Conserver l'interaction principalement vocale et le HUD discret, conformément aux exigences existantes.
- Afficher les plans, confirmations, erreurs et preuves uniquement lorsque cela apporte une valeur utile.
- Garder un accès explicite aux permissions, à la mémoire et à l'historique des actions.
- L'interface ne doit pas suggérer qu'une fonction fonctionne si le service correspondant n'est pas connecté et validé.

## 4. Périmètre différé

Les éléments suivants restent des pistes futures, et ne sont pas des exigences d'implémentation immédiate : simulation générale de mondes parallèles, modèle universel du monde réel, moteur causal général, génération autonome d'environnements complexes et auto-amélioration générale. Un prototype limité pourra être proposé ultérieurement si un cas d'usage concret, des données et des critères de validation sont disponibles.

## 5. Ordre de mise en œuvre proposé

- **P0 — Sécurité et vérification :** permissions côté serveur, contrats d'outils, états d'action exacts, journalisation minimale et tests d'échec.
- **P1 — Continuité utile :** mémoire contextuelle isolée, état persistant des tâches et mémoire des décisions.
- **P2 — Compréhension et compétences :** planification structurée, gestion des ambiguïtés et procédures versionnées.
- **P3 — Proactivité :** règles d'attention, déclencheurs explicites et notifications contrôlées.
- **P4 — Extensions :** expérimentation limitée de simulation ou de modélisation après validation des fondations.

Cet ordre complète la feuille de route V1.2 et ne remplace pas les priorités déjà établies pour la sécurité, l'authentification, la conformité et la validation du parcours vocal.

## 6. Statut et vérification

Chaque exigence doit recevoir l'un des statuts suivants :
- **À faire**
- **En cours**
- **Implémentée**
- **Testée**
- **Déployée et vérifiée**

Un statut supérieur ne peut être attribué que sur la base d'une preuve adaptée. La présence d'une exigence dans ce document ne signifie pas qu'elle est implémentée. Les tests CI ne prouvent pas à eux seuls le fonctionnement du fournisseur IA, le déploiement, ni le comportement réel sur iPhone.

## 7. Critères de validation de cette annexe

- [ ] Les sept exigences fonctionnelles sont documentées avec des critères d'acceptation.
- [ ] Les exigences de modularité, d'indépendance du modèle et de contrôle de l'autonomie sont explicites.
- [ ] Les fonctions avancées différées sont distinguées des objectifs immédiats.
- [ ] Les exigences n'affirment pas que les fonctions sont déjà implémentées.
- [ ] Aucun changement n'est fait à `main` et aucun déploiement n'est déclenché par cette annexe.


---

## 8. Vision cible ARIA V1.3 — exigences fonctionnelles étendues

Ces exigences décrivent une cible et ne signifient pas que les fonctions sont déjà disponibles.

- **F-ENV-01 — Découverte de l'environnement :** interroger les connecteurs autorisés pour identifier capacités, état, permissions, limites et fraîcheur. Tester connecteur absent, permission refusée, état périmé et panne.
- **F-HOME-01 — Domotique :** lire/piloter les appareils compatibles, vérifier l'état après action, refuser les appareils non autorisés et tester d'abord en environnement contrôlé.
- **F-ADMIN-01 — Administration :** organiser documents et échéances, préparer les démarches, fournir la provenance et détecter pièces manquantes. Distinguer un brouillon d'une soumission réellement envoyée.
- **F-FIN-01 — Finances/portefeuille :** commencer en lecture seule, fournir des calculs reproductibles, données horodatées, risques et frais. Toute transaction exige confirmation explicite juste avant exécution ; aucun rendement garanti.
- **F-3D-01 — Modélisation/simulation :** orchestrer les moteurs existants, formaliser contraintes et unités, comparer les versions et distinguer rendu visuel, calcul de solveur et validation indépendante. Revue qualifiée pour les usages critiques.
- **F-COMM-01 — Appels :** intégrer uniquement un fournisseur compatible et autorisé ; contrôler consentement, motif, données partagées, annulation et solution de repli.
- **F-AUTO-01 — Autonomie :** définir les niveaux de risque et budgets ; replanifier après imprévu ; demander validation au-delà des seuils ; tester panne, interruption, résultat incertain et doublon.
- **F-PROJECT-01 — Projets :** persister objectifs, tâches, dépendances, échéances, risques, décisions, critères de réussite et prochaine action ; tester reprise et replanification.
- **F-IMM-01 — Espace immersif :** conserver voix prioritaire et HUD discret ; permettre une transition vers cartes/3D/simulations et un retour sans perte de contexte ; avatar facultatif.

### ARCH-03 — Contrat commun des connecteurs
Chaque connecteur expose capacités, schémas d'entrée/sortie, permissions, coûts, limites, risques, délais, idempotence, stratégie d'annulation et preuve de résultat. Il doit être remplaçable sans réécrire le noyau de planification.

### SEC-02 — Confirmation selon le risque
- Niveau A : lecture et organisation réversible dans le périmètre consenti.
- Niveau B : action réversible sur un appareil ou document selon les règles définies.
- Niveau C : action externe, publication, communication, dépense, changement d'accès ou partage de données : confirmation explicite au moment de l'action.
- Niveau D : transaction, signature, suppression irréversible, décision réglementée ou action présentant un risque physique : confirmation renforcée, contrôle supplémentaire ou intervention d'une personne qualifiée.
Ces niveaux doivent être validés par domaine et ne contournent jamais la loi ni les permissions des fournisseurs.

### Ordre d'implémentation
1. Identité, permissions, isolation mémoire, contrats d'outils et vérification.
2. Tâches persistantes, planification, reprise et replanification.
3. Connecteurs testables pour appareils/domotique, fichiers/démarches et finances en lecture seule.
4. Visualisation 3D puis solveurs spécialisés.
5. Autonomie élargie après preuves de fiabilité et revue de sécurité.
