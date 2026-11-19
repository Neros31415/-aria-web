# ARIA — journal de continuité

## 2026-10-21 — Politique d’initiative conversationnelle

### Contexte vérifié
- Dépôt : https://github.com/Neros31415/-aria-web
- Branche de travail : `feat/aria-voice-first-onboarding`
- Pull request : https://github.com/Neros31415/-aria-web/pull/15 (brouillon, non fusionnée).
- Le Worker de la branche transmet déjà au modèle les préférences `discrete`, `balanced` et `proactive`, mais les attentes comportementales de chaque niveau n’étaient pas formalisées.
- Le contrat de réponse du Worker reste limité à `reply`, `action` et `scene`. Il n’expose pas encore de moteur d’exécution de missions ou d’outils généraux.

### Changement effectué
Dans `cloudflare/aria-brain-staging.mjs`, ajout d’instructions distinctes selon le niveau d’initiative :
- **Discrète** : suggérer une suite uniquement si elle est clairement utile, débloquante ou nécessaire pour éviter un risque.
- **Équilibrée** : proposer une seule prochaine étape concrète lorsqu’elle apporte une valeur réelle.
- **Proactive** : anticiper la prochaine étape liée à l’objectif et progresser dans la réponse sans demander automatiquement « veux-tu que je continue ? ».

Une consigne commune précise le suivi concret, les confirmations avant actions à risque, la liberté intellectuelle et le fait que ces instructions n’accordent aucun nouvel outil. Elle rappelle également que les limites du fournisseur du modèle restent applicables.

Dans `tests/aria-voice-first.test.mjs`, ajout d’un test d’intégration vérifiant que les trois niveaux et les garde-fous sont effectivement transmis dans les instructions du modèle.

### Validation observée
- Commit de test : `30bd17d86493d2e02bec2a96c202c93a12c4b3ec`.
- Les deux exécutions GitHub Actions observées sur ce commit ont réussi :
  - https://github.com/Neros31415/-aria-web/actions/runs/39603976137
  - https://github.com/Neros31415/-aria-web/actions/runs/39603985225
- Étapes réussies : vérification de syntaxe de `app.js`, `visualization-engine.js`, `cloudflare/aria-brain-staging.mjs`, puis `node --test tests/aria-voice-first.test.mjs`.
- Aucun changement sur `main), aucun déploiement Cloudflare et aucune modification de secrets dans cette tâche.

### Distinction entre vision et implémentation
**Présent après ce changement :** un contrat de comportement proactif transmis au modèle et un test vérifiant ce contrat.

**Toujours à construire :** missions persistantes, reprise après redémarrage, exécution autonome d’étapes autorisées, vérification des postconditions, journal d’actions, planificateur de tâches, surveillance proactive en arrière-plan, recherche Web et outils généraux. La consigne de prompt ne prouve pas que le modèle suivra toujours les instructions et ne contourne pas les limites techniques ou les règles du fournisseur.

### Prochaine étape prioritaire
1. Vérifier de nouveau la configuration et les endpoints du Worker de staging, sans afficher ni copier de secrets.
2. Compléter les tests HTTP d’authentification individuelle et d’isolation mémoire.
3. Concevoir puis implémenter une boucle de mission persistante et testable : état durable, reprise, limites de tentatives, blocages explicites, vérification du résultat et journal.
4. Tester le parcours complet sur iPhone Safari/PWA puis, lorsqu’un PC Windows est disponible, le packaging et les intégrations desktop.
