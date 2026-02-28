

# Corriger l'alignement de la liste de serveurs mobile

## Probleme

La colonne serveurs utilise `pl-[10px]` (padding gauche) au lieu d'un centrage, ce qui cause :
- Les icones ne sont pas centrees dans la colonne de 72px
- L'indicateur blanc (a `left-0` du bouton) commence a 10px du bord au lieu du bord reel
- Les boutons Decouvrir/Creer ne sont pas alignes avec les icones serveurs
- Le separateur n'est pas centre non plus

## Corrections dans `src/components/mobile/MobileServersView.tsx`

### 1. Centrer les elements dans la colonne
Remplacer `pl-[10px]` par `items-center` sur le conteneur de la colonne. Avec une colonne de 72px et des icones de 50px, cela donne ~11px de chaque cote -- assez d'espace pour l'indicateur blanc a gauche.

### 2. Repositionner l'indicateur blanc
Changer l'indicateur de `left-0` (relatif au bouton) a `left-0` relatif au conteneur de la colonne en utilisant un positionnement negatif (`-left-[11px]`) ou en le sortant du flux du bouton. Cela le place au bord gauche de la colonne, avec un espacement naturel par rapport a l'icone centree.

Concretement : passer de `left-0` a `-left-[11px]` sur l'indicateur pour qu'il soit au bord gauche de la colonne, avec ~7-8px d'espace entre l'indicateur (4px de large) et le bord de l'icone.

### 3. Centrer les boutons utilitaires
Les boutons Decouvrir et Creer sont deja en 50px, avec `items-center` sur le parent ils seront automatiquement centres.

### 4. Centrer le separateur
Le separateur avec `w-8` sera aussi centre grace a `items-center`.

## Resultat attendu

- Toutes les icones parfaitement centrees dans la colonne de 72px
- Indicateur blanc visible au bord gauche, avec un petit espace avant l'icone
- Boutons utilitaires alignes avec les icones serveurs
- Separateur centre

## Fichier modifie

`src/components/mobile/MobileServersView.tsx`

