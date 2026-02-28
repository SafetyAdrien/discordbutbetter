

# Fix: Le drag-and-drop des serveurs se cancel immediatement sur mobile

## Probleme identifie

En analysant le replay de session, le drag demarre bien (l'overlay apparait) mais est **immediatement annule**. La cause : le conteneur parent a `overflow-y-auto` pour le scroll, et le navigateur mobile intercepte les evenements tactiles pour le scroll natif **avant** que dnd-kit puisse les traiter pour le drag.

Le `useSortable` met `touch-action: none` via `attributes` sur le `<button>`, mais le `<div ref={setNodeRef}>` parent (le noeud de reference du sortable) n'a pas cette propriete. Le navigateur voit le touch sur le div, decide de scroller, et annule le drag.

## Correction dans `src/components/mobile/MobileServersView.tsx`

### 1. Ajouter `touch-action: none` sur le noeud sortable

Dans `SortableMobileServerIcon`, ajouter `touchAction: 'none'` dans l'objet `style` du `<div ref={setNodeRef}>`. C'est le noeud de reference de dnd-kit -- sans cette propriete, le navigateur mobile prend le controle du touch pour scroller et le drag est annule.

```tsx
const style: React.CSSProperties = {
  transform: CSS.Transform.toString(transform),
  transition,
  touchAction: 'none',  // Empeche le scroll natif d'intercepter le drag
};
```

### 2. Utiliser `dropAnimation: null` sur le DragOverlay

Ajouter `dropAnimation={null}` sur le `<DragOverlay>` pour eviter une animation de retour qui peut causer un flash visuel sur mobile.

### 3. Augmenter la tolerance du TouchSensor

Passer la tolerance de `10` a `15` pixels pour etre plus permissif avec les mouvements involontaires du doigt pendant le maintien de 200ms.

## Resume

| Changement | Raison |
|-----------|--------|
| `touchAction: 'none'` sur le div sortable | Empeche le navigateur de capturer le touch pour le scroll |
| `dropAnimation={null}` sur DragOverlay | Evite le flash de retour sur mobile |
| Tolerance TouchSensor 10 -> 15 | Plus permissif pour les micro-mouvements du doigt |

## Fichier modifie

`src/components/mobile/MobileServersView.tsx`

