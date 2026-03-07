

# Fix Thread Spine in Chat Messages

## Problem
The thread spines (vertical + L-shaped connector lines) for threads attached to messages in the chat area are broken after the theme changes — same issue as the channel list spine that was just fixed.

## Current State (3 locations in `ChatArea.tsx`)

1. **System message** (line 1312-1314): Only has the L-curve, no vertical line — looks fine.
2. **First message with author** (lines 1408-1414): Spine starts from avatar area, uses `w-0.5 bg-muted-foreground/30` for vertical line.
3. **Grouped message** (lines 1555-1561): Same approach.

Both #2 and #3 use `w-0.5 bg-` for the vertical line, which may not render consistently. The channel list fix switched to `border-l-2 border-muted-foreground/30` which works reliably.

## Changes

### `src/components/chat/ChatArea.tsx`

**Lines 1408-1414** — First message spine:
- Change vertical line from `w-0.5 bg-muted-foreground/30` to `border-l-2 border-muted-foreground/30` (matching the channel list fix)

**Lines 1555-1561** — Grouped message spine:
- Same change: `w-0.5 bg-muted-foreground/30` → `border-l-2 border-muted-foreground/30`

### `src/components/threads/ThreadSpine.tsx`
- Update to use the same border-based approach for consistency (even though currently unused, it should be correct if ever used).

### Files modified
- `src/components/chat/ChatArea.tsx` (lines 1408-1414, 1555-1561)
- `src/components/threads/ThreadSpine.tsx`

