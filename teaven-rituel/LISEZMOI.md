# Teaven Rituel — mise à jour v6.5.0 (prête à déployer)

Ce dossier est **autonome** : le build télécharge l'app actuellement en production
(https://teaven-rituel.vercel.app), copie les binaires à l'identique (logo, icônes,
polices), applique les correctifs vérifiés, et passe le service worker en v6.5.0
pour que les tablettes se mettent à jour toutes seules.

## Contenu de la mise à jour
- Correctif : l'espace fonctionne dans l'édition d'un geste
- Glisser-déposer pour réordonner (mode édition + bouton « Réorganiser les gestes »)
- Onglet « Fiches » : process d'ouverture et de fermeture en frise horaire
- Rappel « à cette heure-ci » sur l'écran du rituel
- Historique : tableau « Ce qui saute le plus souvent » (30 jours)
- Emplacement photo de référence par geste (visible quand une photo est renseignée)
- Ergonomie : bouton + pour ajouter, bouton principal en mode édition, vibrations

## Déployer (depuis le Mac, ~1 minute)
```bash
cd <ce dossier>
npx vercel deploy --prod
```
Répondre : scope « Johan's projects », lier au projet existant **teaven-rituel**.
C'est tout — le build fait le reste et échoue proprement si quoi que ce soit ne
correspond pas (aucun risque de demi-mise à jour).

## Vérifier après déploiement
- https://teaven-rituel.vercel.app → l'onglet « Fiches » apparaît en bas
- Bouton « Réorganiser les gestes » sous la liste
- /sw.js contient `VERSION = "v6.5.0"`
