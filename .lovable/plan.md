

# Extend Thread Spine Vertical Line to Avatar

## Problem
The thread spine's vertical line currently only exists within the thread embed area (the small `w-8` flex column). It needs to extend upward through the message content to visually connect with the author's profile picture (avatar), like Discord does.

## Solution
For both "first message with author" and "grouped message" thread embeds, add an absolute-positioned vertical line that starts from the bottom of the avatar and runs down through the message content to meet the L-curve.

The avatar is inside the message's flex layout at the left. The vertical line should be placed on the parent `relative` container, running from the avatar's bottom (~44px from top) down to the thread embed's L-curve.

### Changes in `src/components/chat/ChatArea.tsx`

**First message with author (lines 1533-1546):**
Add an absolute vertical line on the parent `relative` div (line 1406) that goes from the avatar bottom to the thread embed, plus adjust the L-curve to connect:

```tsx
{/* When thread exists, add vertical spine from avatar down */}
{threadsByMessageId.has(message.id) && (
  <div className="absolute left-[19px] top-[44px] bottom-0 border-l-2 border-muted-foreground/30" />
)}
```

Place this inside the `relative` div (line 1406), before the flex content. The `left-[19px]` aligns with the avatar center (40px avatar / 2 = 20px, minus 1px for border). `top-[44px]` starts just below the avatar (40px + 4px margin).

The L-curve in the thread embed section should then connect: adjust `left-[6px]` to align with the vertical line relative to the embed's flex column.

**Grouped message (lines 1649-1662):**
Same approach — add vertical line from the timestamp area down.

### Files modified
- `src/components/chat/ChatArea.tsx`

