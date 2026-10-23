# Addendum — capacité d'intégration native de GEV

Date : 2026-10-18

## Découverte vérifiée

Le fichier `src/app/embed.js` de God's Eye View documente un mode `?embed=1` qui masque l'interface complète et conserve le globe. Le parent peut envoyer un message `{ type: "gev:view", id, view }`; GEV répond `gev:ready` et `gev:view-applied`, avec le détail des étapes appliquées. Les vues sont validées via `createView` puis exécutées par les actions internes de GEV. Les tests `src/app/embed.test.mjs` couvrent notamment le mode embarqué, l'application des vues et les réponses au parent.

C'est une voie d'intégration plus légère à évaluer avant de fusionner le code Cesium dans le bundle ARIA.

## Décision mise à jour

**Premier spike recommandé : intégrer GEV en vue embarquée isolée, puis décider sur mesures s'il faut l'intégrer plus profondément.**

Cette option permet de conserver le noyau et le chat ARIA distincts de la visualisation, tout en testant un contrat de commande concret. Elle ne dispense pas de vérifier comment héberger le build et ses fournisseurs de données sur l'infrastructure canonique d'ARIA ; un simple hébergement statique pourrait ne pas suffire à tous les fournisseurs côté serveur de GEV.

## Contrat minimal côté ARIA

1. Charger uniquement une URL GEV connue et approuvée avec `?embed=1`.
2. Attendre `gev:ready` avant d'envoyer une commande.
3. Envoyer une vue structurée et validée par le schéma attendu par GEV ; ne pas transmettre du JavaScript généré par le modèle.
4. Corréler chaque commande avec un identifiant `id` et attendre `gev:view-applied`.
5. Vérifier systématiquement `event.source === iframe.contentWindow` **et** `event.origin` contre l'origine exacte attendue avant d'accepter un message.
6. Utiliser un `targetOrigin` exact lors de `postMessage`, jamais `*` pour les commandes de contrôle depuis ARIA.
7. Présenter à l'utilisateur les échecs ou étapes partielles retournés ; ne jamais afficher un succès si `ok: false`.
8. Garder le chat utilisable si le module géospatial échoue à charger.

## Conditions pour passer du spike au produit

- Déterminer si le déploiement canonique peut servir le build GEV et ses routes serveur sans introduire une seconde plateforme à maintenir.
- Tester sur Safari iOS les interactions tactiles, le rendu 3D, la mémoire, la chauffe et le retour au chat.
- Vérifier que la communication parent/enfant fonctionne avec les politiques CSP, les origines et les restrictions de frame réellement utilisées.
- Auditer les clés, quotas, licences des sources, coûts et fréquences de mise à jour.
- Commencer avec une vue caméra et une seule couche documentée ; élargir seulement après validation.

## Limite actuelle

L'audit du code et des tests a confirmé que le protocole d'embed existe dans le dépôt GEV. **Il n'a pas confirmé que GEV est déployé, embarqué ou connecté à ARIA.** Aucun test iPhone réel n'a été réalisé dans cette étape.
