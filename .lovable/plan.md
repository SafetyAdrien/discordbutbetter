# Fix: Drag de salons entre catégories ouvertes

## Problème

Quand on glisse un salon depuis une catégorie ouverte vers une **position précise entre deux salons d'une autre catégorie ouverte**, le salon n'atterrit pas au bon endroit (souvent décalé d'un cran ou à l'extrémité de la liste).

## Cause racine

Dans `src/components/layout/ChannelList.tsx`, `handleDragOver` met à jour deux états React (`dropPosition`, `dropMode`) à chaque mouvement de la souris. `handleDragEnd` lit ensuite `dropPosition` pour calculer l'index d'insertion. Mais `handleDragEnd` est une fonction inline recréée à chaque rendu — elle capture le `dropPosition` du rendu courant, qui peut être périmé car React 18 batche les `setState` de `onDragOver` et `onDragEnd` dans le même cycle. Résultat : l'index lu vient du mouvement précédent.

Le chemin "même catégorie" et "drop sur header de catégorie" sont moins touchés (positions extrêmes ou index unique), mais le chemin **cross-catégorie entre salons** est sensible à l'off-by-one.

## Correctif

Remplacer les états React `dropPosition` et `dropMode` (lecture seule pour la logique) par des `useRef` mis à jour **synchroniquement** dans `handleDragOver`, et lus dans `handleDragEnd`. Garder un mini état React uniquement pour le rendu visuel (indicateur bleu / surbrillance "inside") afin de ne pas perdre le feedback UI.

### Détails techniques

Fichier : `src/components/layout/ChannelList.tsx`

1. Ajouter :
   - `const dropPositionRef = useRef<"before" | "after">("after");`
   - `const dropModeRef = useRef<"before" | "after" | "inside">("after");`
2. Dans `handleDragOver` (≈ lignes 1117-1178), à chaque branche qui appelle `setDropPosition(...)` / `setDropMode(...)`, écrire d'abord la valeur dans le `ref` correspondant, puis appeler le `setState` (conservé uniquement pour piloter les indicateurs visuels).
3. Dans `handleDragEnd` (≈ lignes 1179-1333), remplacer toutes les lectures de `dropPosition` et `dropMode` par `dropPositionRef.current` et `dropModeRef.current`. Cela couvre :
   - reorder catégories (ligne 1188+)
   - drop salon sur salon, même catégorie (ligne 1266+)
   - drop salon sur salon, catégorie différente (lignes 1288-1303) ← **chemin du bug**
   - drop salon sur header de catégorie (lignes 1309-1331)
4. Réinitialiser les refs dans `handleDragCancel` et au début de `handleDragStart` (valeur par défaut `"after"`).

### Hors périmètre

- La limitation "drop entre salons d'une catégorie **fermée** impossible" est conservée (comportement voulu, identique à Discord — seul le header reçoit le drop).
- Pas de changement aux mutations `useReorderChannels` ni au capteur tactile.
- Pas de refactor `useCallback` de `handleDragEnd` (le `ref` rend le sujet caduc).

## Vérification

- Glisser un salon de la catégorie A (ouverte) vers une position précise entre deux salons de la catégorie B (ouverte) → atterrit exactement à la position visée par l'indicateur bleu.
- Glisser au-dessus du premier salon de B → insertion en tête.
- Glisser sous le dernier salon de B → insertion en queue.
- Vérifier que le drop sur header (zones 15 % haut/bas + 70 % milieu) continue d'append/prepend/append correctement.
- Vérifier le reorder intra-catégorie (non régressé).
