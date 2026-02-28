

# Agrandir les icones serveurs mobile

## Modification unique dans `src/components/mobile/MobileServersView.tsx`

- Passer `iconSize` de `w-10 h-10` (40px) a `w-[50px] h-[50px]` (50px, +10px)
- Augmenter les boutons Discover/Create de `w-10 h-10` a `w-[50px] h-[50px]`
- Ajuster le gap entre icones de `gap-1` a `gap-1.5` pour accompagner la taille plus grande
- Reduire le padding vertical des boutons serveur de `py-1` a `py-0.5` pour eviter trop d'espace vide

