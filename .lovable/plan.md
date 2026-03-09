

# Réduire la zone de sélection/hover du nom du serveur

## Problème
Le bouton du nom du serveur (`PopoverTrigger`) occupe tout l'espace disponible (`flex-1 h-full`) dans le header, ce qui rend la zone cliquable/hover trop large.

## Changement

**Fichier : `src/components/layout/ChannelList.tsx`** (lignes 1392-1409)

Transformer le bouton pour qu'il ne prenne que la taille de son contenu au lieu de remplir tout le header :

- Retirer `flex-1 h-full` du bouton — il ne doit plus s'étendre sur toute la hauteur/largeur
- Ajouter un padding (`py-1.5 px-2 ml-2`) et un `rounded-lg` pour créer une zone hover compacte autour du texte
- Retirer le `px-4` du div interne (le padding sera sur le bouton)
- Garder un petit `gap` avec le bouton paramètres via la structure flex existante

Résultat : la zone hover/clic entoure uniquement le nom du serveur + le nombre de membres, sans toucher au bouton paramètres.

