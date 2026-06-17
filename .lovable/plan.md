## 1. Bouton "Aller en bas" — seuil + animation

Fichier : `src/components/chat/ChatArea.tsx`

- **Condition d'affichage** (ligne ~514) : n'afficher le bouton que si le salon contient au moins **50 messages chargés** ET que la distance depuis le bas dépasse 150 px.
  ```ts
  setShowJumpToBottom(messages.length >= 50 && distanceFromBottom > 150);
  ```
  Ajouter `messages.length` aux dépendances de l'effet.
- **Animation** (ligne ~2125) : remplacer l'`animate-fade-in` actuel par une petite animation de glissement vers le haut + fondu, plus visible :
  - Ajouter une keyframe `slide-in-bottom` dans `tailwind.config.ts` (translateY(8px)+opacity 0 → 0+1, 220 ms ease-out) et la classe `animate-slide-in-bottom`.
  - Appliquer cette classe au conteneur du bouton.

Seuil retenu : **50 messages** (option mentionnée par l'utilisateur ; modifiable en une ligne si tu préfères 100).

## 2. Resserrer le nom de catégorie de ses salons enfants

Fichier : `src/components/layout/ChannelList.tsx`

- En-tête de catégorie (ligne 304) : passer le padding vertical de `py-1.5` à `pt-1.5 pb-0` pour réduire l'espace **sous** le nom de catégorie.
- Conteneur des salons enfants (ligne 359) : réduire la marge basse `mb-2` → `mb-1` pour garder l'espacement global cohérent entre catégories sans changer le haut de la catégorie suivante.

Résultat : le nom de catégorie est visuellement « collé » à ses salons, tout en gardant la respiration entre deux catégories.

## Détails techniques

- Aucun changement de logique métier ; uniquement présentation et un seuil d'affichage.
- Pas d'impact sur le scroll auto, le state `wasAtBottomRef` ou les hooks de messages.
- Nouvelle keyframe Tailwind isolée, pas de remplacement des animations existantes.
