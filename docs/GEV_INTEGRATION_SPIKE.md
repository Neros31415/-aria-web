# God's Eye View × ARIA — spike d'intégration technique

Date : 2026-10-18  
Statut : plan de spike, pas une intégration déjà exécutée.

## Décision technique

Évaluer God's Eye View (GEV) comme moteur de visualisation géospatiale isolé, intégré ensuite comme module de l'expérience ARIA. Ne pas copier le dépôt complet dans la PWA actuelle et ne pas remplacer le noyau conversationnel ARIA par GEV.

Références :
- Dépôt GEV : https://github.com/bilawalsidhu/gods-eye-view
- Contrat et état de la base ARIA : `README.md`, `app.js`, `index.html` sur `main`
- Cadrage produit : `docs/ARIA_PRODUCT_CAPABILITIES.md`

## Ce que l'audit du dépôt GEV confirme

- Application navigateur indépendante, JavaScript ES modules + Vite.
- Dépendance centrale de visualisation : CesiumJS.
- Architecture déjà divisée en modules d'application, d'interface, de données et de fournisseurs serveur.
- Scripts déclarés pour `build`, `test`, vérifications de frontières de modules et contrôles QA spécialisés.
- Version Node annoncée dans `package.json` : `>=24.14.0 <25 || >=26 <27`; l'environnement de build doit respecter cette contrainte.
- Les couches de données et fournisseurs sont hétérogènes : chacune exige une revue de licence, de disponibilité, de fréquence de mise à jour, de coûts éventuels et de règles d'utilisation.
- Le dépôt est publié sous MIT pour le code ; cette licence ne remplace pas les licences des données, tuiles, modèles et actifs tiers.

## Risques à lever avant d'importer du code

1. **Empreinte et performance** : Cesium, terrain et tuiles 3D peuvent être lourds sur iPhone. Il faut tester un appareil réel, pas seulement un navigateur desktop.
2. **Clés et coûts** : inventorier les fournisseurs, les clés publiques/privées, les quotas, les limites et les services payants. Aucun secret serveur ne doit se retrouver dans le bundle client.
3. **Données trompeuses** : chaque couche doit exposer source, heure de mise à jour, précision et éventuel statut simulé/estimé.
4. **Sécurité et confidentialité** : ne pas activer par défaut des capacités de surveillance intrusives. Respecter les règles des sources et la vie privée.
5. **Couplage** : ne pas laisser GEV posséder l'historique, la mémoire, les permissions ou le compte utilisateur d'ARIA.
6. **Licence** : faire un inventaire séparé des données et actifs tiers avant une distribution commerciale.

## Architecture cible proposée

- `ARIA Shell` : navigation, identité visuelle, conversation, paramètres et état utilisateur.
- `ARIA Core/API` : interprète les demandes et renvoie une intention structurée, par exemple `map.open`, `map.flyTo`, `layer.toggle`, `entity.select` ou `route.plan`.
- `Geo View Adapter` : couche d'intégration propre à ARIA ; traduit les intentions en actions de la carte sans exposer toute l'API GEV au modèle.
- `GEV View` : visualisation isolée dans un module/route ; ne peut pas accéder directement aux secrets, à la mémoire privée ou aux outils système.
- `Data providers` : services indépendants avec provenance, fraîcheur, limites de débit et gestion d'erreurs.
- `Route provider` : adaptateur séparé pour marche, voiture, vélo, transports en commun ou modes combinés ; ne pas le confondre avec les couches de suivi aérien/maritime.

L'IA ne doit pas générer arbitrairement du JavaScript exécutable. Elle doit sélectionner parmi des actions validées par un schéma, une liste d'outils autorisés et des contrôles de paramètres.

## Plan du spike, en petites étapes vérifiables

### Étape A — inventaire reproductible
- Épingler un commit GEV précis pour l'évaluation.
- Relever le poids des dépendances, les variables d'environnement, les fournisseurs et toutes les clés requises.
- Exécuter le diagnostic du dépôt, les tests unitaires et le build avec la version Node requise.
- Conserver les résultats et les éventuels échecs, sans les présenter comme validés si l'environnement manque.

### Étape B — preuve de rendu indépendante
- Démarrer la vue GEV telle quelle, sans connecter le backend ARIA.
- Vérifier globe, navigation caméra, redimensionnement et gestion d'erreurs.
- Tester sur iPhone Safari : chargement initial, interaction tactile, rotation, zoom, retour arrière, chauffe, mémoire et réseau mobile.
- Désactiver toute couche non nécessaire pour mesurer le coût du globe seul.

### Étape C — premier contrat ARIA → carte
Limiter la première intégration à trois actions validées :
- `map.open` : ouvrir la vue géospatiale ;
- `map.flyTo` : aller vers des coordonnées validées ou un lieu résolu par une source fiable ;
- `layer.toggle` : activer/désactiver une couche autorisée.

Chaque action reçoit des paramètres validés, retourne un résultat explicite et peut échouer sans bloquer le chat. Ajouter ensuite `entity.select`, puis les itinéraires et autres fonctions si les tests le justifient.

### Étape D — données
- Commencer par une couche publique à faible risque et documentée.
- Afficher source et dernière mise à jour dans l'interface.
- Gérer erreurs, indisponibilité, données périmées et quotas.
- N'ajouter les couches aéronefs, navires, satellites, météo, séismes ou trafic qu'après revue individuelle de la source.

### Étape E — intégration produit
- Exposer la vue dans une route/module ARIA sans dupliquer la navigation principale.
- Conserver la possibilité de désactiver le module géospatial.
- Ajouter tests de contrat pour les actions et tests responsive.
- N'activer par défaut qu'après validation de sécurité, performance, licences et coûts.

## Critères d'acceptation avant de déclarer le mapping intégré

- Le build et les tests de GEV passent dans un environnement compatible, ou les échecs sont documentés.
- La vue se charge et reste utilisable sur iPhone Safari réel.
- Le coût de chargement, la consommation mémoire et les limites connues sont documentés.
- Une commande ARIA validée modifie réellement la vue et renvoie un succès/échec vérifiable.
- Aucune clé secrète n'est incluse dans les fichiers livrés au navigateur.
- Les couches affichent la provenance et la fraîcheur des données.
- Les licences commerciales des données et actifs utilisés sont vérifiées.
- Le module peut être retiré sans casser le chat ou la PWA de base.

## Hors périmètre de cette étape

- Fusion complète du dépôt GEV dans `main`.
- Présenter les flux comme « temps réel » sans vérifier leurs fréquences et conditions.
- Brancher immédiatement toutes les sources et toutes les fonctions vocales.
- Affirmer que l'intégration fonctionne avant les tests sur iPhone.
- Remplacer la PWA ARIA existante par une deuxième application.

## Prochaine action concrète

Créer une branche de spike dédiée et y faire l'inventaire des dépendances et contrats avant tout code d'intégration. Garder cette note et les résultats de validation dans le dépôt ARIA afin que la décision reste traçable.
