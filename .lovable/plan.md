

# Fix: Category drag-and-drop freeze

## Root cause

After dropping a category, two things happen simultaneously:
1. dnd-kit's `dropAnimation` (200ms ease) animates the overlay back to the drop position
2. The optimistic update in `onMutate` immediately reorders the underlying list

The animation targets the **original** DOM position, but the items have already moved due to the optimistic reorder. This creates a visual "freeze" or jump — the overlay animates to a stale position while the list has already changed underneath.

Additionally, `onSettled` immediately calls `invalidateQueries` which triggers a refetch that can briefly flash stale data before the mutation lock releases.

## Fix (2 changes in 1 file)

### `src/components/layout/ChannelList.tsx`

1. **Disable `dropAnimation`** on the `DragOverlay` — set it to `null` so the overlay disappears instantly on drop, letting the optimistic reorder render cleanly without animation conflict.

2. **Wrap `reorderCategories.mutate()` in a `requestAnimationFrame`** — ensures the DnD state (`activeId`, `overId`) is fully cleared and React has committed the cleanup render before the optimistic cache update triggers a re-render with the new order.

### `src/hooks/useChannels.ts`

3. **Delay `invalidateQueries` in `useReorderCategories.onSettled`** — add a small delay (e.g. 800ms) before invalidating, so the optimistic data stays visible long enough and the refetch doesn't race with the UI settling. This matches the mutation lock timeout.

## Files modified
- `src/components/layout/ChannelList.tsx` — `dropAnimation: null` + `requestAnimationFrame` wrapper
- `src/hooks/useChannels.ts` — delayed invalidation in `useReorderCategories.onSettled`

