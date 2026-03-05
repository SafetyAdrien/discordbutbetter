

# Refonte DnD Catégories/Salons — Alignement sur le pattern ServerList

## Problèmes actuels du DnD ChannelList

1. **Drop indicators absolus** : positionnés en `absolute` dans chaque item, causent des décalages visuels et des chevauchements
2. **`dropAnimation` avec durée** : crée un délai de 200ms au drop, l'élément "flotte" avant de se placer
3. **Double sensor (Pointer + Touch)** : `useDndSensors` ajoute un `TouchSensor` qui crée des conflits avec le scroll et les context menus
4. **Pas de `wasDraggingRef`** : les clics accidentels déclenchent une navigation après un drag
5. **Transitions CSS manquantes** : `transition: undefined` dans les sortables = pas d'animation fluide pendant le drag

## Pattern cible (ServerList)

Le ServerList fonctionne parfaitement grâce à :
- **Indicateurs inline** (dans le flux DOM, pas absolus)
- **`dropAnimation={null}`** (placement instantané)
- **`PointerSensor` uniquement** avec `distance: 5`
- **`wasDraggingRef`** avec timeout de 100ms pour bloquer les clics post-drag
- **`restrictToVerticalAxis`** pour contraindre le mouvement

## Changements prévus

### Fichier unique : `src/components/layout/ChannelList.tsx`

1. **Remplacer les sensors** : supprimer `useDndSensors`, utiliser `PointerSensor` seul avec `distance: 5` (comme ServerList)

2. **Drop indicators inline** : remplacer le `DropIndicator` absolu par des `<div>` inline conditionnels dans `SortableCategory` et `SortableChannel`, exactement comme `SortableServerIcon` :
   ```
   {dropIndicator === 'before' && <div className="h-[2px] bg-[#5865f2] rounded-full mx-1 mb-0.5" />}
   {/* contenu */}
   {dropIndicator === 'after' && <div className="h-[2px] bg-[#5865f2] rounded-full mx-1 mt-0.5" />}
   ```

3. **`dropAnimation={null}`** : supprimer l'animation au drop pour un placement instantané

4. **Ajouter `wasDraggingRef`** : bloquer les clics pendant 100ms après un drag (empêche la sélection accidentelle de salon)

5. **Simplifier le DragOverlay** : rendu DOM simplifié sans backdrop-blur (cause des bugs de rendu pendant le drag)

6. **Supprimer le composant `DropIndicator` local** : plus utilisé, remplacé par les indicateurs inline

### Détail des modifications dans les composants

**`SortableCategory`** :
- Recevoir `dropIndicator: 'before' | 'after' | null` au lieu de `showDropIndicator + dropPosition`
- Afficher des `<div>` inline avant/après le contenu
- Supprimer la ref au `DropIndicator` absolu

**`SortableChannel`** :
- Même pattern : `dropIndicator` prop unique
- Indicateurs inline dans le flux DOM

**`handleDragStart`** : ajouter `wasDraggingRef.current = true`

**`handleDragEnd` / `handleDragCancel`** : ajouter `setTimeout(() => wasDraggingRef.current = false, 100)`

**`handleChannelClick`** : ajouter `if (wasDraggingRef.current) return;` en premier

### Fichiers modifiés
| Fichier | Nature |
|---|---|
| `src/components/layout/ChannelList.tsx` | Refonte DnD sensors, indicators, overlay, wasDraggingRef |

Aucun autre fichier modifié — tout est contenu dans ChannelList.tsx.

