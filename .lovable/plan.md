

# Fix: Tooltip Barely Visible

## Problem

The `TooltipContent` component uses `bg-popover` (HSL `218 20% 15%`), which is very close to the app's dark background color, making tooltips nearly invisible.

## Solution

Replace `bg-popover` with a hardcoded darker background color directly in the tooltip component. Discord-style tooltips use a near-black background (`#111214` / roughly `220 10% 7%`) that stands out clearly against all surfaces.

## Technical Changes

### File: `src/components/ui/tooltip.tsx`

Update the `className` in `TooltipContent`:
- Remove `bg-popover text-popover-foreground`
- Add `bg-[hsl(220,10%,7%)] text-white` for a high-contrast, near-black tooltip with white text
- Add `font-medium text-xs` to match Discord's tooltip styling (smaller, bolder text)

The result will be a clearly visible, compact tooltip that stands out against any surface in the app.

