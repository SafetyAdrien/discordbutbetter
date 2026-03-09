

# Réduire la zone de sélection/hover du header serveur

## Problème
Le bouton du nom du serveur occupe toute la largeur (`flex-1`) et toute la hauteur (`h-full`) du header, rendant la zone de hover/clic trop large.

## Changement

**Fichier : `src/components/layout/ChannelList.tsx`** (lignes 1392-1409)

- Retirer `flex-1`, `h-full` et `rounded-tl-xl` du `<button>` pour qu'il ne prenne que la taille de son contenu.
- Ajouter un padding (`px-4 py-2`) et un `rounded-md` pour une zone compacte avec un léger espacement.
- Ajuster le conteneur `<div>` interne : retirer `px-4` (déplacé sur le bouton) et `flex-1`.
- Le bouton sera positionné dans le header avec un petit margin (`ml-2 mt-auto mb-2` ou similaire selon le cas banner/non-banner).

