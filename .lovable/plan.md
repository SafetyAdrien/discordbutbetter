
Objectif
- Corriger définitivement les 3 boutons de la colonne serveurs mobile (DM, Découvrir, Créer) pour qu’ils soient:
  1) parfaitement carrés,
  2) plus grands,
  3) visuellement identiques à la forme des icônes de serveurs (même arrondi, même proportions).

Constat technique (actuel)
- Le fichier concerné est `src/components/mobile/MobileServersView.tsx`.
- Les boutons DM/Découvrir/Créer utilisent `ICON_SIZE` (`w-[50px] h-[50px]`), mais l’apparence reste perçue comme “rectangulaire”.
- L’état actif DM applique `rounded-xl` (moins arrondi que le reste), ce qui casse l’uniformité visuelle.
- Les icônes serveur passent via `Avatar` (style légèrement différent des 3 boutons utilitaires).

Plan d’implémentation
1) Unifier la base visuelle des icônes de la sidebar mobile
- Créer une base de classes commune (constante) dédiée aux “icônes sidebar”, avec:
  - dimension explicite agrandie: `size-[56px]` (au lieu de 50),
  - verrou carré: `aspect-square`,
  - anti-déformation flex: `shrink-0`,
  - neutralisation padding natif: `p-0`,
  - arrondi homogène: `rounded-2xl`.
- Réutiliser cette base pour:
  - DM,
  - Découvrir,
  - Créer,
  - Avatar des serveurs (et overlay de drag), pour uniformité totale.

2) Corriger l’état actif DM pour ne plus donner l’effet “rectangle”
- Supprimer la divergence `rounded-xl` côté DM actif.
- Conserver le même arrondi que les autres (`rounded-2xl`) et garder le feedback visuel actif via couleur/ring (pas via forme différente).

3) Ajuster la lisibilité après agrandissement
- Ajuster la taille des glyphes internes (ex: de `w-5 h-5` vers `w-6 h-6`) pour garder des proportions cohérentes.
- Vérifier que les badges d’unread restent bien positionnés (`-top-1 -right-1`) avec la nouvelle taille.

4) Vérifier la colonne gauche mobile
- Garder `w-[72px]` si le rendu est propre avec `56px`.
- Si visuellement trop serré, passer la colonne à `w-[76px]` (ou `w-[80px]`) et ajuster les séparateurs (`w-8` -> `w-9/10`) pour rester harmonieux.

5) Validation visuelle ciblée
- Contrôles sur mobile:
  - DM, Découvrir, Créer sont bien carrés (même largeur/hauteur),
  - même arrondi que les icônes serveurs,
  - taille visiblement plus grande,
  - aucun débordement/collision avec indicateur actif ou badges,
  - aucun impact sur le drag & drop des serveurs.

Fichier impacté
- `src/components/mobile/MobileServersView.tsx` (uniquement).

Résultat attendu
- Les 3 boutons (DM, Découvrir, Créer) auront exactement la même géométrie que les icônes de serveurs, sans effet rectangulaire, avec une taille plus grande et une uniformité visuelle nette.
