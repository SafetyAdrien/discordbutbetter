

# Fix Missing Bottom Padding on Message Hover Background

## Problem
The message hover container has top padding (`pt-2`) but no bottom padding. When a thread embed sits at the bottom of a message, it's flush with the hover background's bottom edge — no breathing room.

## Changes

### `src/components/chat/ChatArea.tsx`

**Line 1373** — Add `pb-1` to the message wrapper so the hover background extends below the last child (thread embed or reactions):

```
"group message-hover rounded-xl px-4 mb-1 relative"
```
→
```
"group message-hover rounded-xl px-4 pb-1 mb-1 relative"
```

This applies to all messages (with or without threads), giving a consistent bottom cushion inside the hover area.

