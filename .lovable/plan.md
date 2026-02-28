

# Elargir la colonne serveurs pour rendre l'indicateur visible

## Probleme

L'indicateur actif (la petite barre blanche sur le cote gauche) est positionne a `left-0` a l'interieur du bouton, mais le bouton est centre dans une colonne de `w-[20%]`. L'indicateur se retrouve coupe ou invisible car il n'y a pas assez d'espace a gauche de l'icone.

## Corrections dans `src/components/mobile/MobileServersView.tsx`

### 1. Elargir legerement la colonne serveurs
Passer de `w-[20%]` a `w-[72px]` (largeur fixe). Cela donne 50px pour l'icone + ~11px a gauche pour l'indicateur + ~11px a droite pour le padding. Une largeur fixe est plus previsible qu'un pourcentage.

### 2. Ajuster l'alignement des icones
Remplacer `items-center` par un padding gauche (`pl-[10px]`) pour laisser l'espace necessaire a l'indicateur tout en gardant les icones bien positionnees.

### 3. Repositionner l'indicateur actif
L'indicateur reste a `left-0` dans le bouton mais comme le bouton n'est plus centre avec `items-center`, il sera visible dans l'espace de padding gauche.

## Resultat attendu

- La barre blanche d'activite/unread est visible sur le bord gauche
- Les icones serveurs restent bien alignees
- La liste de salons a droite s'adapte automatiquement via `flex-1`
- L'espacement global reste harmonieux

## Fichier modifie

`src/components/mobile/MobileServersView.tsx` -- largeur colonne + alignement
