# God's Eye View — évaluation pour ARIA

Date de vérification : 2026-10-18

Dépôt analysé : https://github.com/bilawalsidhu/gods-eye-view

## Verdict

**Valeur élevée pour le module géospatial d'ARIA ; ne pas fusionner le dépôt entier dans la PWA actuelle.**

God's Eye View (GEV) est une application JavaScript/Vite autonome construite autour d'un globe 3D et de couches de données publiques : aéronefs, navires, satellites, séismes et caméras publiques, avec une interface de commande vocale optionnelle. Son code est sous licence MIT, mais les jeux de données, cartes, modèles et fournisseurs gardent leurs propres conditions. Ce n'est donc pas une licence globale sur toutes les données incluses.

## Correspondance avec ARIA

- **Très pertinent** : carte/globe 3D, visualisation de données géospatiales, couches activables, sélection d'objets, suivi visuel et ambiance HUD.
- **Potentiellement pertinent plus tard** : outils vocaux et MCP pour commander la vue.
- **Pas un remplacement du cerveau d'ARIA** : GEV est avant tout un client de visualisation. Il ne remplace ni le backend `aria-brain`, ni la mémoire personnelle, ni le système de missions d'ARIA.
- **Pas un remplacement direct de la carte d'itinéraires** : le suivi d'aéronefs/navires et les couches géospatiales ne prouvent pas que la planification routière vélo/voiture, le trafic routier et le recalcul d'itinéraire soient prêts pour notre usage. Il faudrait évaluer séparément les données, le routage et les licences.

## Compatibilité et coût

- Projet autonome basé sur Vite et JavaScript, avec une version de Node.js requise par le dépôt (24.14.x ou 26.x selon son `package.json`).
- Le README annonce un démarrage sans clé pour une vue cartographique de base. Certaines vues photoréalistes, recherches de lieux et fonctionnalités IA dépendent de fournisseurs ou de clés optionnelles ; leurs quotas, conditions et éventuels coûts doivent être vérifiés avant activation.
- Le modèle de sécurité de GEV vise un client local-first d'exploration et de démonstration, pas un service de production durci. Les secrets privés doivent rester côté serveur.
- La licence MIT porte sur le code, pas sur l'ensemble des sources de données ni sur les assets. Vérifier `DATA_SOURCES.md` et les conditions de chaque fournisseur avant de distribuer ou commercialiser une couche.

## Architecture recommandée

1. Garder `Neros31415/-aria-web` comme base canonique de l'interface et `aria-brain` comme point d'entrée backend tant que l'audit des branches n'a pas établi mieux.
2. Évaluer GEV d'abord comme prototype géospatial autonome, sans le copier dans `main` et sans créer une nouvelle dépendance runtime pour toute ARIA.
3. Définir une interface d'intégration minimale : ouverture d'une vue dédiée, paramètres de vue explicitement validés et retour d'événements structurés. Ne jamais transmettre de secret fournisseur dans une URL ou dans le client ARIA.
4. Si une intégration est retenue, isoler le module et ses permissions. Ne pas confondre les commandes de navigation de la carte avec des autorisations d'action sur des systèmes réels.
5. Exécuter le build et les tests du dépôt GEV dans un environnement de développement compatible avant de prendre une décision de portage. L'analyse de dépôt seule ne constitue pas une validation d'exécution.

## Respect de la vie privée et limites

Conserver l'usage sur les signaux publics et les infrastructures/systèmes. Ne pas ajouter de recherche de personnes nommées, de reconnaissance faciale ou de suivi individuel. Afficher la provenance, l'horodatage et les limites d'estimation des données. Une visualisation de donnée publique n'est pas nécessairement exacte, exhaustive ou en temps réel.

## Décision pour la prochaine étape

**Ne pas intégrer le dépôt entier maintenant.** La prochaine étape utile est une preuve de concept isolée qui démontre le globe et une seule couche de données publiques sans clé payante, puis mesure le coût de maintenance, la performance sur iPhone et la possibilité de l'intégrer proprement à l'interface ARIA. Aucune modification de l'application n'est incluse dans cette note.
