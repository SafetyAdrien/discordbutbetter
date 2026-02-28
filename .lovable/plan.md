

# Long-press drag-and-drop pour reordonner les serveurs sur mobile

## Objectif

Permettre aux utilisateurs de maintenir le doigt sur une icone de serveur dans la vue mobile pour activer le drag-and-drop et reorganiser l'ordre des serveurs, en reutilisant le systeme `useServerOrder` et dnd-kit deja en place sur desktop.

## Changements

### 1. `src/components/mobile/MobileServersView.tsx`

Integrer dnd-kit dans la colonne de serveurs mobile :

- Importer `DndContext`, `SortableContext`, `useSortable`, `DragOverlay`, `closestCenter`, `TouchSensor`, `arrayMove`, `restrictToVerticalAxis` de dnd-kit
- Importer `useServerOrder` pour acceder a `sortServers` et `reorderServers`
- Utiliser `TouchSensor` avec un delai de 200ms (long-press) et une tolerance de 10px, plus `PointerSensor` avec distance 5px comme fallback
- Wrapper la liste de serveurs dans `DndContext` + `SortableContext`
- Extraire chaque bouton serveur dans un sous-composant `SortableMobileServerIcon` utilisant le hook `useSortable`
- Ajouter un `DragOverlay` affichant l'icone du serveur en cours de deplacement (semi-transparent, legerement agrandi)
- Appliquer le tri des serveurs via `sortServers(servers)` avant le rendu
- Sur `onDragEnd`, calculer le nouvel ordre avec `arrayMove` et appeler `reorderServers`
- Ajouter un indicateur visuel de drop (ligne bleue `bg-primary` de 2px) au-dessus ou en dessous de l'element survole
- L'element en cours de drag passe en `opacity-30`

### 2. Comportement tactile

- **Long-press (200ms)** : active le mode drag via `TouchSensor` de dnd-kit (parametre `delay: 200, tolerance: 10`)
- **Tap court** : continue de selectionner le serveur normalement (le drag ne s'active pas)
- Pendant le drag, le scroll de la colonne reste fonctionnel pour les listes longues
- Le modificateur `restrictToVerticalAxis` empeche le deplacement horizontal

### 3. Indicateurs visuels pendant le drag

- Ligne bleue horizontale (2px, `bg-primary`) positionnee avant ou apres l'element survole
- L'icone originale est assombrie (`opacity-30`)
- Le `DragOverlay` montre une copie de l'icone avec `scale-110` et `shadow-lg`

## Fichier modifie

| Fichier | Modification |
|---------|-------------|
| `src/components/mobile/MobileServersView.tsx` | Ajout DndContext/SortableContext, TouchSensor long-press, DragOverlay, tri via useServerOrder |
