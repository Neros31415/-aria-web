# ARIA — doctrine produit et capacités transversales

Date : 2026-10-18  
Statut : cadrage produit proposé pour guider les prochaines implémentations.

## Principe directeur

ARIA doit répondre aux besoins réels de son utilisateur tout en transformant chaque besoin récurrent en une capacité générique, réutilisable et potentiellement commercialisable. Les besoins personnels servent à tester le produit ; ils ne définissent pas ses limites.

Ne pas déduire un cas d'usage trop étroit à partir d'un exemple. Une demande d'itinéraire ne signifie pas « itinéraire cycliste » : le mode de déplacement doit être compris depuis la demande ou demandé en clarification si nécessaire.

## Piliers du produit

### 1. Assistant intelligent
- Compréhension du langage naturel et du contexte de la conversation.
- Recherche et synthèse d'informations, avec sources et niveau de confiance lorsque pertinent.
- Mémoire explicite, contrôlable et supprimable par l'utilisateur.
- Utilisation d'outils selon des permissions claires ; ne jamais prétendre qu'une action a réussi sans confirmation technique.

### 2. Cartographie et visualisation 3D
- Globe 3D et navigation du niveau mondial vers les zones locales lorsque les données le permettent.
- Couches de données activables, sélection d'objets, légendes, filtres temporels et explication des données affichées.
- Visualisation géospatiale intégrée au HUD d'ARIA, pilotable en langage naturel.
- Affichage honnête de la fraîcheur, de la précision, de la couverture et de la provenance des données.
- Conception responsive : iPhone en priorité pour la première validation, puis écrans plus larges.

### 3. Mobilité et itinéraires
Le besoin est transversal : marche, voiture, vélo, transports en commun, modes combinés et déplacements de voyage peuvent être pertinents selon la demande. La disponibilité réelle dépendra des fournisseurs et de la couverture géographique.

Séparer clairement :
- le moteur de calcul d'itinéraires et ses données ;
- l'interface de carte 2D/3D ;
- l'assistant qui interprète la demande et explique les options.

Ne pas inventer des rues, des horaires, des durées ou des itinéraires. Signaler les contraintes, les données manquantes et les limites du fournisseur.

### 4. Données du monde réel
Les couches possibles comprennent notamment les aéronefs, navires, satellites, séismes, météo et événements géolocalisés, selon l'accès aux sources. Chaque couche doit préciser sa source, sa fréquence de mise à jour, ses limites et ses conditions d'utilisation. Une animation 3D n'est pas une preuve que la donnée est réellement en direct.

### 5. Capacités professionnelles
À évaluer selon la demande et la valeur démontrée : veille, analyse territoriale, logistique, visualisation de données, suivi d'indicateurs et aide à la décision. Les fonctionnalités sensibles doivent intégrer les contraintes légales, la confidentialité et la prévention des usages abusifs.

## Architecture produit

- **Noyau ARIA** : conversation, contexte, mémoire, permissions, gestion des erreurs et orchestration des outils.
- **Modules spécialisés** : cartographie 3D, recherche web, mobilité, données temps réel, analyse et automatisation.
- **Adaptateurs de données** : intégrations interchangeables, sans lier l'interface à un fournisseur unique.
- **Interface HUD** : une expérience cohérente ; les modules ne doivent pas devenir des applications concurrentes indépendantes.
- **Backend** : secrets côté serveur, authentification réelle, isolation des données par utilisateur, limites de débit et journalisation minimale.

God's Eye View est évalué comme une base possible pour le module géospatial, pas comme le produit ARIA complet. Avant intégration : vérifier la compilation, les licences des données et actifs, les clés requises, les performances mobiles et les interfaces d'intégration. Ne pas importer tout le dépôt sans preuve de valeur.

## Filtre de priorisation

Pour chaque fonctionnalité, documenter :
1. Besoin utilisateur et scénario concret.
2. Capacité générique réutilisable.
3. Publics concernés et alternatives concurrentes.
4. Valeur d'usage et potentiel commercial.
5. Coût d'intégration, dépendances et frais récurrents.
6. Risques de confidentialité, sécurité, licences et fiabilité.
7. Critères d'acceptation vérifiables et test automatisé si possible.

Prioriser une petite capacité réellement testable plutôt qu'une démonstration spectaculaire non connectée.

## Règles de qualité

- Ne jamais présenter une maquette comme une fonctionnalité opérationnelle.
- Ne jamais annoncer une intégration ou un déploiement sans vérification.
- Toute fonctionnalité dépendante d'une source externe doit prévoir les erreurs, l'indisponibilité et les limites de couverture.
- Préserver une base produit canonique et faire les travaux risqués dans des branches et PR isolées.
- Vérifier les changements par tests ciblés et revue du diff avant fusion.
