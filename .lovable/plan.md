

# Fix Thread Spine Alignment — Connect Vertical Line to L-Curve

## Problem
The vertical line runs at `left-[19px]` (avatar center) but the L-curve in the thread embed starts at `left-[6px]` within the spine column. They don't connect — there's a 13px horizontal gap between them.

## Fix

In `src/components/chat/ChatArea.tsx`, for both existing thread embeds (first message ~line 1539, grouped message ~line 1655):

- Change L-curve `left-[6px]` → `left-[19px]` to align with the vertical line
- Change `w-[20px]` → `w-[13px]` so the curve reaches the edge of the `w-8` (32px) column: 32 - 19 = 13px

The new thread system messages (line 1314) keep `left-[6px]` since they have no vertical spine from an avatar.

### Files modified
- `src/components/chat/ChatArea.tsx` (2 locations)

