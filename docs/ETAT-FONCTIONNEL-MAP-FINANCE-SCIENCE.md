# ARIA — État fonctionnel des scènes carte, finance et science

Date de travail : 22 octobre 2026  
Branche : `feat/aria-map-finance-science-integration`  
Statut : intégration en cours, non fusionnée et non déployée.

## Objectif
Relier les scènes contextuelles du HUD à des sources réelles plutôt que de présenter des écrans de démonstration comme des fonctionnalités opérationnelles. Cette livraison ne réduit pas le périmètre ARIA 1.0.

## Changements de cette branche
- Carte : charge Leaflet et les tuiles OpenStreetMap ; permet une recherche de lieu via Nominatim ; permet de calculer un itinéraire routier via OSRM, avec distance/durée annoncées par le service.
- Finance : intègre un graphique TradingView, avec symbole modifiable et périodes ; affiche une mise en garde claire qu'il ne s'agit pas d'un conseil financier.
- Science : recherche et affiche des médias du catalogue public NASA ; donne accès à la source NASA et ne prétend pas que cela constitue une simulation scientifique.
- HUD : les scènes sont ouvertes dans l'espace visuel contextuel existant ; styles responsives et commandes accessibles au clavier.
- Contrat d'intention : ajoute `finance` aux scènes autorisées dans le schéma structuré côté Worker et précise au modèle les capacités disponibles et les limites restantes.
- Tests : ajoute des assertions de contrat sur les endpoints utilisés, les divulgations et le câblage UI.

## Limites explicites
- Les services publics Nominatim/OSRM et les tuiles OpenStreetMap sont adaptés au prototype, pas garantis pour une exploitation commerciale à grande échelle. Il faudra sélectionner/configurer un fournisseur ou une infrastructure contractuelle, gérer les quotas, le cache et la disponibilité.
- TradingView est une intégration externe ; disponibilité, symboles, délai des cotations et droits dépendent de TradingView et des places concernées.
- Le catalogue NASA apporte une recherche de médias, pas de données instrumentales validées, d'analyse scientifique, de simulation physique ou de modèle 3D scientifique.
- La scène carte reste une carte 2D avec itinéraire routier ; relief 3D, itinéraires multimodaux, vues immersives et God’s Eye View restent à intégrer.
- Le modèle de moteur/mécanisme 3D reste à développer.
- Aucun test visuel iPhone, aucun test réseau réel et aucune validation de bout en bout n'ont encore été exécutés pour cette branche. Les tests statiques/CI doivent passer avant fusion.
- Aucune publication ni aucun déploiement n'est inclus.

## Critères de validation avant fusion
1. CI verte pour tous les tests du dépôt.
2. Revue du diff et des risques liés aux dépendances externes.
3. Vérification des états d'erreur hors ligne et de la fermeture d'une scène pendant un chargement asynchrone.
4. Test manuel de la carte, du calcul d'itinéraire, du graphique financier et de la recherche NASA sur mobile et desktop.
5. Vérification des conditions d'utilisation, quotas, confidentialité et disponibilité des fournisseurs avant production.
