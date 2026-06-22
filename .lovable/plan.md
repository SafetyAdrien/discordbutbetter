# Migration drag-and-drop : @dnd-kit → react-dnd + react-dnd-accessible-backend

Remplacement intégral du système DnD par la stack utilisée par Discord :
- `react-dnd` (core)
- `react-dnd-html5-backend` (souris/touch HTML5)
- `react-dnd-accessible-backend` (clavier + lecteur d'écran, repo Discord)
- `react-dnd-multi-backend` + `dnd-multi-backend` (pour combiner les backends souris + accessibilité simultanément, comme recommandé par Discord)

## Périmètre (tout le système DnD du projet)

Fichiers actuellement basés sur @dnd-kit qui seront réécrits :

1. `src/hooks/useDndSensors.ts` — supprimé (remplacé par configuration `MultiBackend`)
2. `src/components/dnd/DndComponents.tsx` — réécrit en wrappers react-dnd (`DndProvider`, `useDrag`, `useDrop`, `Sortable`)
3. `src/components/layout/ServerList.tsx` — réordonnancement vertical des serveurs (desktop)
4. `src/components/layout/ChannelList.tsx` — réordonnancement salons + catégories
5. `src/components/server-settings/RoleManager.tsx` — réordonnancement rôles
6. `src/components/mobile/MobileServersView.tsx` — réordonnancement serveurs (mobile, long-press)

Hooks dépendants à vérifier/ajuster : `useServerOrder`, persistance ordre salons/rôles (logique métier inchangée, seulement la couche DnD change).

## Architecture cible

```text
main.tsx
  └─ <DndProvider backend={MultiBackend} options={HTML5ToAccessibleBackendTransition}>
        └─ <App />

HTML5ToAccessibleBackendTransition = {
  backends: [
    { id: 'html5',        backend: HTML5Backend,        transition: MouseTransition },
    { id: 'accessible',   backend: AccessibleBackend,
      preview: true,
      transition: createTransition('keydown', e => e.key === 'Tab' || e.key === ' ') }
  ]
}
```

Chaque item draggable :
```tsx
const [{ isDragging }, drag] = useDrag({
  type: 'SERVER',
  item: { id, index },
  collect: m => ({ isDragging: m.isDragging() }),
});
const [, drop] = useDrop({
  accept: 'SERVER',
  hover: (item, monitor) => reorder(item.index, index),
});
return <div ref={node => drag(drop(node))} aria-grabbed={isDragging} />;
```

## Accessibilité (modèle Discord)

`react-dnd-accessible-backend` ajoute automatiquement :
- `Tab` pour cibler un draggable, `Space` pour saisir/déposer, `Escape` pour annuler
- Annonces ARIA live (`announceMessages` configurable, en français)
- Focus visible sur la cible courante

Messages personnalisés (FR) :
```ts
announceMessages: {
  pickedUpItem: (item) => `${item?.name} saisi`,
  droppedItem:  (item, target) => `${item?.name} déposé sur ${target?.name}`,
  hoveredTarget:(item, target) => `${item?.name} survole ${target?.name}`,
  canceledDrag: (item) => `Déplacement de ${item?.name} annulé`,
}
```

## Mobile

`react-dnd-html5-backend` ne gère pas le touch nativement. Pour préserver le long-press → drag actuel sur mobile :
- Ajouter `react-dnd-touch-backend` dans le `MultiBackend` avec `TouchTransition` (`delayTouchStart: 400ms`, `enableMouseEvents: false`)
- Configuration finale = 3 backends : Mouse (HTML5) + Touch + Accessible (clavier)

## Étapes d'exécution

1. **Install** : `bun add react-dnd react-dnd-html5-backend react-dnd-touch-backend react-dnd-multi-backend dnd-multi-backend react-dnd-accessible-backend`
2. **Provider global** dans `src/main.tsx` (wrap `<App />` avec `DndProvider` configuré MultiBackend)
3. **Nouveau `DndComponents.tsx`** : exports `Sortable`, `SortableItem`, `DragHandle`, hooks `useSortableList(items, onReorder, type)` — API compatible avec l'usage existant pour minimiser les diffs
4. **Réécriture des 4 listes** (`ServerList`, `ChannelList`, `RoleManager`, `MobileServersView`) avec la nouvelle API
5. **Suppression** : `useDndSensors.ts`, désinstallation des 4 packages `@dnd-kit/*`
6. **Validation** :
   - Desktop : drag souris serveurs/salons/rôles
   - Mobile : long-press 400ms puis drag
   - Clavier : Tab + Space + flèches + Escape sur chaque liste
   - Annonces ARIA visibles via DevTools accessibility tree

## Points techniques

- `react-dnd-accessible-backend` est typé TypeScript ✓
- L'optimistic lock `mutationLockRef` (mémoire projet) et la latence 800ms restent appliqués dans les callbacks `onReorder` — la migration ne touche pas la persistance
- `dropAnimation` désactivé reste l'effet par défaut de react-dnd (pas d'animation native)
- IDs serveurs gardent `rounded-full` (mémoire projet), préservé car ce sont les styles, pas le DnD

## Hors périmètre

- `usePendingAttachments` (drag externe HTML5 natif pour fichiers) : conservé tel quel, ce n'est pas du tri intra-liste
- `useSwipeTabs` / `useSwipeToReply` : gestes tactiles indépendants du DnD, non concernés
