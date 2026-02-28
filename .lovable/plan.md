
# Fix du drag-and-drop serveurs sur mobile

## Problemes identifies

1. **Conflit touch events** : Les `listeners` et `attributes` de dnd-kit sont places sur le `div` wrapper au lieu du `button`. Sur mobile, cela capture tous les evenements tactiles et empeche les taps normaux et le scroll de fonctionner.

2. **Pas de `touch-action` gere** : Le `useSortable` de dnd-kit applique `touch-action: none` par defaut, ce qui bloque le scroll natif de la colonne serveurs.

3. **Pas de `onDragOver` handler** : Sans cela, l'indicateur de drop ne se positionne pas correctement (avant/apres l'element survole). Le desktop utilise un `handleDragOver` avec tracking de position, le mobile n'en a pas.

4. **Pas de `onDragCancel`** : Si le drag est annule (doigt sorti de l'ecran), l'etat `activeDragId` reste bloque et empeche les taps suivants.

## Corrections dans `src/components/mobile/MobileServersView.tsx`

### 1. Deplacer listeners/attributes sur le bouton
Comme sur desktop (ServerList.tsx ligne 112-113), les props `{...attributes}` et `{...listeners}` doivent etre sur le `<button>` et non le `<div>` wrapper. Cela permet au bouton de gerer a la fois le tap (onClick) et le long-press (drag activation), sans bloquer le scroll du conteneur parent.

### 2. Ajouter `touch-action: manipulation` sur le wrapper
Forcer `touch-action: manipulation` sur le div wrapper pour permettre le scroll vertical tout en gardant le drag fonctionnel. Cela surcharge le `touch-action: none` par defaut de dnd-kit.

### 3. Ajouter un handler `onDragOver` et `onDragCancel`
- `onDragOver` : tracker l'element survole et calculer la position (before/after) avec un ref pour stabilite
- `onDragCancel` : reset l'etat drag proprement

### 4. Ameliorer l'indicateur de drop
Utiliser un systeme `overId` + `dropPosition` (before/after) comme le desktop, au lieu du simple `isOver` qui ne donne pas assez d'information visuelle.

### 5. Empecher le click apres un drag
Ajouter un flag `wasDragging` qui se reset apres un court delai pour eviter que le `onClick` du bouton se declenche apres un drag-and-drop.

## Resume des changements

| Element | Avant | Apres |
|---------|-------|-------|
| listeners/attributes | Sur le `div` wrapper | Sur le `<button>` |
| touch-action | none (defaut dnd-kit) | manipulation (scroll ok) |
| onDragOver | absent | tracker overId + dropPosition |
| onDragCancel | absent | reset activeDragId, overId |
| Drop indicator | `isOver` simple | position before/after avec ref |
| Protection click post-drag | basique | flag wasDragging avec timeout |

## Fichier modifie

`src/components/mobile/MobileServersView.tsx` -- toutes les corrections ci-dessus
