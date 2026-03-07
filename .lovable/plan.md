

# Fix Thread Spine for Messages in Chat Area

## Problem
The thread spine (vertical line + L-curve) for threads attached to regular messages in the chat area is visually broken. Two issues:

1. **L-curve doesn't reach the ThreadSystemMessage** — The spine container starts at `left-[19px]` and the L-curve is `w-[22px]`, ending at 41px. But ThreadSystemMessage starts at `ml-[52px]`. There's an 11px gap.
2. **Vertical/horizontal connection may have a gap** depending on exact pixel alignment.

## Changes

### `src/components/chat/ChatArea.tsx`

**First message with author (lines 1408-1415):**
- Widen the L-curve from `w-[22px]` to `w-[33px]` so it reaches the ThreadSystemMessage at 52px
- Adjust vertical line height to connect seamlessly with the curve

**Grouped message (lines 1555-1561):**
- Same L-curve width fix: `w-[22px]` → `w-[33px]`
- Same vertical line height adjustment

### Files modified
- `src/components/chat/ChatArea.tsx` (lines 1408-1415, 1555-1561)

