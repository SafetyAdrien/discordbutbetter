

# Fix Thread Spine in Channel List

## Problem
The thread spine (vertical + horizontal L-shaped connector lines) in the channel list sidebar appears broken. The structure at lines 429-437 of `ChannelList.tsx` has a potential conflict: the parent `div` uses `items-center` which can interfere with `self-stretch` on the spine container, preventing the vertical line from reaching its full height.

Additionally, when there's only a single thread (`isSingle === true`), the vertical line is completely hidden — only the L-curve shows, which can look disconnected.

## Changes

### `src/components/layout/ChannelList.tsx`

**Line 429** — Parent container:
- Change `flex items-center` to `flex items-stretch` so the spine container can properly stretch to the full row height.

**Lines 430-437** — Spine container:
- Keep `self-stretch` (now effective with `items-stretch` parent).
- For single threads: show a short vertical line segment (top to 50%) so both lines are always visible, maintaining the L-shape connector.

```tsx
// Line 429: items-center → items-stretch
<div key={thread.id} className="flex items-stretch w-full px-2">
  <div className="flex-shrink-0 w-6 relative">
    {/* Vertical line — always show, height depends on position */}
    <div
      className="absolute left-[5px] top-0 border-l-2 border-muted-foreground/30"
      style={{ height: isLast || isSingle ? '50%' : '100%' }}
    />
    {/* L-shaped horizontal curve */}
    <div className="absolute left-[5px] top-1/2 -translate-y-1/2 w-[14px] h-[12px] border-l-2 border-b-2 border-muted-foreground/30 rounded-bl-lg" />
  </div>
```

Key fix: Always render the vertical line (removing the `!isSingle` condition), and use `items-stretch` on the parent so the spine container fills the row height.

### Files modified
- `src/components/layout/ChannelList.tsx` (lines 429-437)

