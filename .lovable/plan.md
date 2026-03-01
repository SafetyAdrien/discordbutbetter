

# Fix: Server Icon Tooltips Not Displaying Reliably

## Problem

In the `ServerList` component, each server icon is wrapped in both a `ContextMenu` and a `Tooltip`. The nesting of `ContextMenuTrigger > TooltipTrigger` can cause pointer event conflicts that dismiss the tooltip prematurely. Additionally, the tooltip content renders without a `Portal`, which means it could be clipped by the scroll container (`overflow-y-auto` on the parent div).

Session replay confirms: some server tooltips appear for seconds (working), while others flash for ~20ms (broken), suggesting an intermittent event conflict.

## Solution

Two changes in `src/components/layout/ServerList.tsx`:

1. **Wrap `TooltipContent` in `TooltipPortal`**: This ensures the tooltip renders at the document root, outside any scroll container or stacking context, preventing clipping.

2. **Swap the nesting order**: Change from `ContextMenuTrigger > TooltipTrigger` to `TooltipTrigger > ContextMenuTrigger`. This prevents the context menu's pointer event handling from prematurely dismissing the tooltip.

## Technical Changes

### File: `src/components/layout/ServerList.tsx`

**Import**: Add `TooltipPortal` to the existing tooltip import (line 4).

**SortableServerIcon** (lines 97-157): Restructure the nesting from:
```text
ContextMenu
  Tooltip
    ContextMenuTrigger asChild
      TooltipTrigger asChild
        button
    TooltipContent
  ContextMenuContent
```

To:
```text
Tooltip
  ContextMenu
    TooltipTrigger asChild
      ContextMenuTrigger asChild
        button
    ContextMenuContent
  TooltipPortal
    TooltipContent
```

This puts `Tooltip` as the outer wrapper so its pointer events take priority, and portals the content to avoid clipping.

**Home/DM button tooltip** (lines 441-444): Also wrap `TooltipContent` in `TooltipPortal` for consistency.

**Action buttons** (Create, Discover -- lines 492+): Same `TooltipPortal` wrap for consistency.

