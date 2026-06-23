# Migration DnD complète : @dnd-kit → react-dnd + accessible-backend (modèle Discord)

Refonte intégrale de tout le glisser-déposer (Desktop + Mobile) sur le stack utilisé par Discord : `react-dnd` + `react-dnd-html5-backend` + `react-dnd-touch-backend` (via `react-dnd-multi-backend`) + `react-dnd-accessible-backend`.

## 1. Dépendances

Installer : `react-dnd`, `react-dnd-html5-backend`, `react-dnd-touch-backend`, `react-dnd-multi-backend`, `rdndmb-html5-to-touch`, `react-dnd-accessible-backend`, `@react-aria/live-announcer`.

Retirer : `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/modifiers`, `@dnd-kit/utilities`.

## 2. Provider racine (`src/App.tsx`)

Envelopper l'arbre dans un `DndProvider` configuré avec `MultiBackend` :

- `HTML5Backend` actif par défaut (souris desktop).
- Transition vers `TouchBackend` (`delayTouchStart: 200`, `enableMouseEvents: false`) au premier `touchstart` — long-press identique à Discord mobile.
- `AccessibleBackend` monté en parallèle dans le pipeline `MultiBackend` avec les annonces FR (focus, début, déplacement, dépose, annulation) diffusées via `@react-aria/live-announcer`.
- Activation clavier : Espace = saisir/déposer, Flèches = naviguer entre cibles, Échap = annuler.

## 3. Refonte de `src/components/dnd/DndComponents.tsx`

API conservée pour limiter la casse côté consommateurs :

- `DropIndicator` / `DragPlaceholder` : inchangés (présentation pure).
- `SortableItem` : nouveau wrapper combinant `useDrag` + `useDrop` (react-dnd), `type` passé en prop, calcul `before`/`after` via `monitor.getClientOffset()` + bounding rect.
- `DroppableZone` : basé sur `useDrop`, `ref` forwardé, classes pilotées par `collect` (`isOver` / `canDrop`).
- `DragOverlayItem`, `CategoryDragOverlay`, `ChannelDragOverlay`, `RoleDragOverlay` : rendus via un nouveau `<CustomDragLayer />` (basé sur `useDragLayer()`) monté une seule fois dans `App.tsx`, puisque react-dnd n'a pas d'équivalent direct du `<DragOverlay>` de dnd-kit.

## 4. Refonte de `src/hooks/useDndSensors.ts`

Le concept de « sensors » disparaît (géré par les backends) — le fichier devient un module utilitaire :

- Suppression de `useDndSensors`.
- Conservation de `calculateDropPosition`, `stripDndPrefix`, `isDragTypeMatch`, `reorderItems`, `moveItemBetweenArrays` (logique pure réutilisée par les nouveaux drop targets).
- Ajout des constantes : `DND_TYPES = { SERVER, CHANNEL, CATEGORY, ROLE }` (react-dnd exige un `type` par item).

## 5. Consommateurs migrés

Pour chacun, remplacement de `DndContext` / `SortableContext` / `useSortable` par `SortableItem` + `DroppableZone`. Les handlers métier, mutations Supabase, optimistic locks (`mutationLockRef`) et invalidations de cache restent strictement identiques :

- `src/components/layout/ServerList.tsx` — serveurs (type `SERVER`).
- `src/components/layout/ChannelList.tsx` — channels + catégories (`CHANNEL`, `CATEGORY`), déplacements inter-catégorie via `moveItemBetweenArrays`.
- `src/components/server-settings/RoleManager.tsx` — rôles (`ROLE`).
- `src/components/mobile/MobileServersView.tsx` — serveurs mobile, long-press 200 ms via `TouchBackend`.

## 6. Accessibilité (parité Discord)

- Annonces FR via `@react-aria/live-announcer` (`announce(msg, 'assertive')`).
- Instructions au focus d'un item draggable : « Appuyez sur Espace pour déplacer cet élément. »
- Focus restauré sur l'item après drop/cancel.
- Respect de `prefers-reduced-motion` (déjà géré par `useReducedMotion`).

## 7. Validation

- `bun add` / `bun remove` des packages.
- Build automatique : aucune référence résiduelle à `@dnd-kit`.
- Test manuel : réorganisation serveurs desktop, channels desktop, rôles desktop, serveurs mobile (long-press), parcours clavier complet sur un channel.
- Mise à jour de `mem://features/drag-and-drop-system-implementation` pour refléter la nouvelle stack.

## Détails techniques

Pipeline `MultiBackend` :
```ts
const HTML5toTouch = {
  backends: [
    { id: 'html5', backend: HTML5Backend, transition: MouseTransition },
    { id: 'touch', backend: TouchBackend, options: { delayTouchStart: 200, enableMouseEvents: false }, preview: true, transition: TouchTransition },
    { id: 'a11y', backend: AccessibleBackend, context: { window, document }, options: { /* annonces FR style Discord */ } },
  ],
};
```

Aucun changement de schéma DB, aucune nouvelle policy RLS — uniquement présentation + interaction.
