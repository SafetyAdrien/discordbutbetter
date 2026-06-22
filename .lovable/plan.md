## Plan

1. **Aligner le backend DnD sur le repo Discord**
   - Reprendre le comportement clé de `react-dnd-accessible-backend` : le preview interne doit être explicitement vidé au `drop` / `endDrag`.
   - Désactiver le preview SVG/DOM intégré du backend accessible (`preview: false`) pour éviter un second overlay fantôme en plus de notre `<DragOverlay>` React.

2. **Supprimer la cause probable du fantôme persistant**
   - Le repo Discord crée un clone DOM dans `DragPreviewer` et le nettoie via `clear()` dans `endDrag()`.
   - Si ce preview reste activé dans notre pipeline multi-backend, il peut rester visible indépendamment de notre overlay React.
   - Le fix sera donc appliqué directement dans `src/lib/dnd-shim/multi-backend.ts` : `preview: false` pour le backend accessible et retrait du `preview: true` côté touch si nécessaire.

3. **Rendre le cleanup global plus robuste**
   - Garder le masquage immédiat de notre overlay React au release/drop.
   - Ajouter une purge DOM de sécurité ciblée uniquement sur les containers de preview issus du backend Discord (`.drag-previewer`) après `drop`, `dragend`, `pointerup`, `mouseup`, `touchend`, `touchcancel`, `blur`.
   - Ne pas toucher aux vrais items de liste ni aux indicateurs de drop.

4. **Vérifier sur navigateur**
   - Reproduire un drag/drop de canal dans la liste.
   - Confirmer qu’après dépôt il ne reste aucun enfant `body` fixe/z-index overlay et aucun `.drag-previewer` visible.

## Fichiers concernés

- `src/lib/dnd-shim/multi-backend.ts`
- `src/lib/dnd-shim/drag-overlay.tsx` ou `src/lib/dnd-shim/context.tsx` uniquement si la purge globale doit être centralisée

## Résultat attendu

Après avoir glissé-déposé un canal, l’overlay React et tout preview DOM créé par le backend Discord disparaissent immédiatement.