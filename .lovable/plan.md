
## Objectif
Aligner le drag & drop de `src/components/layout/ChannelList.tsx` sur la spec Discord fournie, **tout en conservant la réorganisation live** déjà en place (mémoire projet : optimistic + `mutationLockRef`).

## Décisions de portée
- Live reorder **conservé** : on garde le comportement actuel où les éléments se déplacent sous le curseur. Seul l'indicateur bleu signale la position de drop.
- Tous les changements restent dans `ChannelList.tsx` (+ quelques tokens dans `src/index.css`). Pas de nouvelle route, pas de mock data, pas de refactor backend.
- Activation : on garde `useDndSensors` (déjà configuré) ; on vérifie qu'il expose distance 4px **ou** delay ~150ms. Sinon on ajuste dans `src/hooks/useDndSensors.ts`.

## Changements

### 1. Ghost / DragOverlay (lignes ~1850-1869)
Remplacer l'overlay text-only actuel par une **copie fidèle de l'élément** :
- Catégorie en drag → rendre un `SortableCategory` visuel (chevron + nom majuscules 12px gris).
- Salon en drag → rendre une rangée avec icône (#, voice, megaphone, etc.) + nom.
- Style : `opacity: 0.85`, `box-shadow: 1px 2px 8px rgba(0,0,0,0.3)`, `cursor: grabbing`, fond `#2B2D31`, `border-radius: 4px`, padding identique à l'élément réel.
- `dropAnimation={null}` conservé (collage au curseur sans transition).

### 2. Drop indicator (lignes 130-158)
- Remplacer `animate-fade-in` par une transition CSS dédiée **opacity 0 → 1 en 80ms** (créer `.dnd-drop-indicator` dans `index.css`).
- Couleur figée `#5865F2` (déjà ok).
- Pour les **catégories entières** : variante plus épaisse / pleine largeur (prop `variant: "category" | "channel"`). Légèrement plus haute (3px) et sans cercles aux extrémités, pour distinguer du drop entre salons.

### 3. Placeholder (élément en cours de drag)
Actuellement `.dnd-item-dragging` = `opacity: 0.3`. Spec demande un espace vide qui maintient la hauteur :
- Conserver la hauteur (déjà OK via `useSortable`/`SortableContext`).
- Passer à `opacity: 0` + fond `rgba(88, 101, 242, 0.08)` léger (teinte accent) sur l'item source, pour matcher "fond légèrement teinté".

### 4. Transition de drop (150ms ease)
- Sur les éléments sortables (hors item en drag), appliquer `transition: transform 150ms ease` pour adoucir la réorganisation au drop. Ne pas appliquer sur le ghost.

### 5. Palette
Vérifier/ajouter les tokens dans `index.css` si besoin (la plupart existent déjà via le thème sombre). Forcer dans la sidebar : `#2B2D31` bg, `#35373C` hover, `#404249` actif, `#F2F3F5` texte primaire, `#949BA4` texte secondaire, `#5865F2` accent. Probablement déjà conformes — diff minimal.

### 6. Activation / garde-clics
- Confirmer dans `useDndSensors` : `PointerSensor` avec `activationConstraint: { distance: 4 }` ou `delay: 150, tolerance: 5`.
- Confirmer que les listeners sont posés sur la zone "drag handle" et **non** sur les boutons icônes paramètres (déjà le cas via `stopPropagation` sur boutons gear/+). Auditer rapidement et corriger si un bouton manque `onPointerDown` stop.

### 7. Accessibilité clavier (optionnel)
Hors scope par défaut (gros chantier). À mentionner mais **non implémenté** dans cette passe sauf demande explicite.

## Détails techniques
- `DragOverlay` reçoit un composant `<DragGhost activeId={...} server={...} />` qui matérialise un rendu fidèle (catégorie ou salon) avec les mêmes icônes que `ChannelList` (`getChannelIcon`).
- `.dnd-drop-indicator { opacity: 0; transition: opacity 80ms linear; } .dnd-drop-indicator.visible { opacity: 1; }`.
- `.dnd-item-dragging { opacity: 0; background: rgba(88,101,242,0.08); }`.
- Pas de modification du hook `useChannels` ni du store — uniquement présentation.

## Fichiers touchés
- `src/components/layout/ChannelList.tsx` — DragOverlay refait, DropIndicator (variant), placeholder style.
- `src/index.css` — `.dnd-drop-indicator`, `.dnd-item-dragging`, transition reorder 150ms.
- `src/hooks/useDndSensors.ts` — uniquement si l'activation 4px/150ms manque.

## Hors scope
- Pas de nouveau composant standalone, pas de route démo.
- Pas de support clavier Ctrl+D / flèches (peut être ajouté ensuite).
- Aucune logique métier ou DB modifiée.
