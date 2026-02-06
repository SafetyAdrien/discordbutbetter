
# Optimisation du Drag-and-Drop et du Panneau Redimensionnable

## Analyse de l'existant

### 1. Systeme Drag-and-Drop actuel (`ChannelList.tsx`)
- Utilise `dnd-kit` avec `PointerSensor` (8px activation distance) et `KeyboardSensor`
- Transitions inline : `transform 200ms cubic-bezier(0.25, 1, 0.5, 1), opacity 150ms ease`
- Drop indicator Discord bleu (#5865f2) avec cercles aux extremites
- `DragOverlay` avec `backdrop-blur-sm` (couteux en performance)
- Pas de `TouchSensor` pour mobile
- Pas d'utilisation du hook `useDndSensors` existant

### 2. Panneau redimensionnable actuel
- Implementation manuelle avec `mousedown/mousemove/mouseup` events
- Largeur entre 240px-340px stockee en state local
- Handle de resize : `w-1 hover:bg-primary/50 cursor-col-resize`
- Pas de transition fluide lors du resize
- Pas de persistance de la largeur

### 3. Problemes identifies
- `backdrop-blur-sm` dans DragOverlay cause des repaints couteux
- Pas de `will-change` sur les elements dragues
- Resize handle peu visible et sans feedback visuel
- Touch non supporte pour le DnD
- Transitions non standardisees

---

## Plan d'optimisation

### 1. Optimiser les transitions DnD

**Fichier : `src/components/layout/ChannelList.tsx`**

Standardiser les transitions avec les tokens du design system :

| Actuel | Optimise |
|--------|----------|
| `transition: "transform 200ms..."` inline | Classes Tailwind `transition-transform duration-normal ease-snap` |
| `backdrop-blur-sm` dans overlay | `backdrop-optimized` (4px blur avec fallback) |
| Pas de `will-change` | Ajouter `will-change-transform` sur items dragges |

```tsx
// SortableCategory - ligne 246
const style = {
  transform: CSS.Transform.toString(transform),
  transition: undefined, // Laisser Tailwind gerer
};

// Classes CSS
className={cn(
  "relative transition-[transform,opacity] duration-normal ease-snap will-change-transform",
  isDragging && "opacity-30 scale-[0.98]"
)}
```

---

### 2. Ajouter TouchSensor pour mobile

**Fichier : `src/components/layout/ChannelList.tsx`**

Remplacer la configuration sensors par le hook optimise :

```tsx
// AVANT
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  }),
);

// APRES - Utiliser le hook existant qui inclut TouchSensor
import { useDndSensors } from '@/hooks/useDndSensors';

const sensors = useDndSensors({ activationDistance: 8, touchDelay: 200 });
```

---

### 3. Optimiser le DragOverlay

**Fichier : `src/components/layout/ChannelList.tsx`**

Remplacer `backdrop-blur-sm` par la classe optimisee et ajouter GPU hints :

```tsx
<DragOverlay
  dropAnimation={{
    duration: 200,
    easing: "cubic-bezier(0.25, 1, 0.5, 1)",
  }}
>
  {activeId && (
    <div
      className={cn(
        // Nouveau : utiliser backdrop-optimized au lieu de backdrop-blur-sm
        "bg-card/95 backdrop-optimized border border-[#5865f2]/50 rounded-md px-3 py-2",
        // GPU acceleration pour le suivi fluide
        "gpu-accelerated will-change-transform",
        "shadow-lg shadow-black/30",
        "scale-105 cursor-grabbing",
      )}
    >
      {/* ... contenu */}
    </div>
  )}
</DragOverlay>
```

---

### 4. Ameliorer le DropIndicator

**Fichier : `src/components/layout/ChannelList.tsx`**

Ajouter une animation d'apparition au drop indicator :

```tsx
const DropIndicator = React.forwardRef<...>(({ isVisible, position }, ref) => {
  if (!isVisible) return null;
  return (
    <div
      ref={ref}
      className={cn(
        // Position et dimensions
        "absolute -left-2 -right-2 h-[2px] z-50 pointer-events-none",
        "bg-[#5865f2]",
        // Circles at endpoints
        "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:-translate-x-[3px]",
        "before:w-[8px] before:h-[8px] before:rounded-full before:bg-[#5865f2]",
        "after:absolute after:right-0 after:top-1/2 after:-translate-y-1/2 after:translate-x-[3px]",
        "after:w-[8px] after:h-[8px] after:rounded-full after:bg-[#5865f2]",
        // Position before/after
        position === "before" ? "top-0 -translate-y-1/2" : "bottom-0 translate-y-1/2",
        // NOUVEAU: Animation d'apparition fluide
        "animate-appear",
      )}
    />
  );
});
```

---

### 5. Refactoriser le resize handle

**Fichier : `src/components/layout/ChannelList.tsx`**

Ameliorer le handle avec meilleur feedback visuel et transitions fluides :

```tsx
// Nouveau state pour tracking du resize
const [isHoveringResize, setIsHoveringResize] = useState(false);

// Handle ameliore
<div
  className={cn(
    "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-10",
    "transition-[width,background-color] duration-fast",
    // Au hover : plus large et visible
    isHoveringResize || isResizing.current
      ? "w-1.5 bg-primary/70"
      : "bg-transparent hover:bg-primary/30",
  )}
  onMouseEnter={() => setIsHoveringResize(true)}
  onMouseLeave={() => !isResizing.current && setIsHoveringResize(false)}
  onMouseDown={handleResizeMouseDown}
>
  {/* Indicateur de grip au centre */}
  <div className={cn(
    "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
    "w-1 h-8 rounded-full bg-primary/50",
    "transition-opacity duration-fast",
    isHoveringResize || isResizing.current ? "opacity-100" : "opacity-0"
  )} />
</div>
```

---

### 6. Ajouter transition fluide au resize

**Fichier : `src/components/layout/ChannelList.tsx`**

Ajouter transition sur le conteneur pendant le resize inactif :

```tsx
<div
  className={cn(
    "bg-card flex flex-col border-r border-border relative",
    // Transition fluide uniquement quand pas en resize actif
    !isResizing.current && "transition-[width] duration-slow ease-out"
  )}
  style={{
    width: `${sidebarWidth}px`,
    minWidth: "240px",
    maxWidth: "340px",
  }}
>
```

---

### 7. Optimiser les styles des items draggables

**Fichier : `src/index.css`**

Ajouter des classes utilitaires specifiques au DnD :

```css
@layer utilities {
  /* DnD optimized item */
  .dnd-item {
    @apply transition-[transform,opacity] duration-normal ease-snap will-change-transform;
  }
  
  .dnd-item-dragging {
    @apply opacity-30 scale-[0.98];
  }
  
  /* Resize cursor zone */
  .resize-handle {
    @apply transition-[width,background-color] duration-fast cursor-col-resize;
  }
}
```

---

## Resume des fichiers a modifier

| Fichier | Modifications |
|---------|---------------|
| `src/components/layout/ChannelList.tsx` | Utiliser `useDndSensors`, transitions Tailwind, `backdrop-optimized`, resize handle ameliore |
| `src/index.css` | Nouvelles classes `.dnd-item`, `.resize-handle` |

---

## Resultats attendus

- **Mobile** : Touch support complet via TouchSensor
- **Performance** : Moins de repaints grace a `will-change` et backdrop optimise
- **Fluidite** : Transitions standardisees avec tokens duration/easing
- **UX** : Resize handle plus visible avec feedback visuel
- **Accessibilite** : Navigation clavier preservee

---

## Notes techniques

### Transitions recommandees pour DnD
- Transform pendant le drag : `duration-normal` (200ms) + `ease-snap`
- Opacity du ghost : `duration-fast` (100ms)
- Drop animation : 200ms `cubic-bezier(0.25, 1, 0.5, 1)`

### GPU acceleration
- `will-change-transform` uniquement sur elements en mouvement
- `gpu-accelerated` sur DragOverlay pour suivi fluide
- Eviter backdrop-blur excessif sur elements animes
