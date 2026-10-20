# ARIA — audit et avancement technique
Date : 20 octobre 2026
Dépôt : https://github.com/Neros31415/-aria-web
Base de référence : `main` — `546a51f73c37a823b083e2ed250b5a119c2a7931`
Branche de travail : `feat/aria-voice-first-onboarding`

## 1. Audit initial
- `main` est une PWA statique qui stocke l'historique et les notes dans `localStorage`; elle ne contacte pas de modèle IA.
- La branche HUD précédente contenait une orbe cliquable, un chat écrit permanent et des scènes 3D de démonstration.
- Le backend Cloudflare existant utilisait un jeton Bearer partagé, un stockage KV et un profil système codé en dur. Le profil codé en dur a été remplacé par une consigne générique.
- Le navigateur ne peut pas garantir l'écoute vocale continue en arrière-plan, notamment sur iOS. Il faut tester sur appareils réels.
- La suppression de données distantes doit être distinguée de l'effacement local et ne jamais être annoncée comme réussie sans confirmation serveur.

## 2. Changements présents dans cette branche
- Interface vocale prioritaire : l'orbe est purement visuel et le chat écrit permanent a été retiré.
- Onboarding oral et réglages de proactivité, longueur de réponse et humour.
- Transcription facultative, états visuels d'écoute/réflexion/parole et respect de `prefers-reduced-motion`.
- Appels du frontend vers `/chat` sur le Worker de staging.
- Jeton d'accès alpha saisi par le testeur, conservé dans `sessionStorage` seulement, jamais codé dans le frontend.
- Historique conversationnel conservé en mémoire vive de la page, limité aux derniers messages; il n'est pas écrit dans `localStorage`.
- Synchronisation du panneau mémoire avec le Worker via GET/PUT, suppression locale d'une note et synchronisation de cette suppression.
- Route DELETE protégée ajoutée au Worker de staging pour supprimer la mémoire d'un profil donné.
- Suppression du profil personnel codé en dur dans le Worker.
- Cache PWA mis à jour et tests automatisés ajoutés.

## 3. Vérifications
- Le Worker `aria-brain-staging` a été déployé le 20 octobre 2026; les bindings AI, KV et les secrets sont présents.
- Le namespace KV de staging a été vérifié : aucune clé `memory:v1:` n'était présente au moment de l'audit.
- Les tests GitHub Actions ont réussi sur les versions précédentes de cette branche. Le dernier changement de synchronisation mémoire et de purge complète est en cours de validation CI; consulter le run le plus récent avant de considérer cette révision comme validée.
- Aucun changement de frontend n'est fusionné dans `main`.

## 4. Limites et risques restants
1. L'accès au backend repose encore sur un jeton alpha partagé fourni au testeur. Ce mécanisme convient uniquement à un alpha contrôlé; une version publique doit utiliser une authentification individuelle et des jetons à durée limitée.
2. Le frontend de cette branche n'est pas déployé sur l'URL publique; l'expérience ne peut pas encore être testée par simple ouverture du site actuel.
3. Les API Web Speech varient selon les navigateurs. Les autorisations micro, le redémarrage après synthèse vocale, l'interruption utilisateur et l'arrière-plan doivent être testés sur iPhone et Android.
4. Le contrat de modèle et le vrai trajet `/chat` doivent être testés sur le Worker déployé avec un jeton alpha valide; un test unitaire ne prouve pas la disponibilité du fournisseur.
5. Les scènes globe, relief et moteur restent des visuels de démonstration, pas des visualisations 3D reliées à des données réelles.
6. La suppression distante nécessite l'identifiant de profil et un jeton valide. L'interface indique l'échec si le serveur ne confirme pas la suppression.

## 5. Prochaines étapes
1. Attendre et corriger la CI de la dernière révision.
2. Tester `/health` et `/chat` sur le Worker de staging sans exposer le secret dans le code public.
3. Tester le parcours complet sur iPhone : autorisation micro, onboarding, aller-retour vocal, erreur réseau, pause/reprise et mémoire.
4. Préparer un déploiement de prévisualisation séparé de `main`, puis effectuer un test alpha manuel.
5. Remplacer le jeton partagé par une authentification dédiée avant d'élargir les testeurs.
6. Intégrer ensuite des outils réels (recherche web, visualisations 3D) avec des contrats explicites et des états d'exécution honnêtes.
