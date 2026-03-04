

# Fix: Tab sends the message instead of just inserting the mention

## Problem

When pressing Tab in the mention autocomplete, the mention is being sent as a message instead of just being inserted into the input. This happens because the `sendAfterMentionRef` can retain a stale `true` value from a previous Enter keypress that didn't complete (e.g., autocomplete closed without selection). When Tab later triggers a `value` change, the `useEffect` sees the stale flag and sends.

## Fix

### `src/components/chat/MessageInput.tsx` — `handleKeyDown` (around line 305)

Explicitly reset `sendAfterMentionRef.current = false` when Tab is pressed, ensuring any stale flag from a previous Enter is cleared:

```tsx
if (e.key === 'Tab' || (e.key === 'Enter' && count > 0)) {
  e.preventDefault();
  if (e.key === 'Enter') {
    sendAfterMentionRef.current = true;
  } else {
    sendAfterMentionRef.current = false; // <-- add this
  }
  // ... click logic
}
```

Also reset the flag when Escape closes the autocomplete (around line 319-322) and when `mentionState` is cleared naturally, to prevent any other stale flag scenarios:

```tsx
if (e.key === 'Escape') {
  e.preventDefault();
  sendAfterMentionRef.current = false; // <-- add this
  setMentionState(null);
  return;
}
```

Two lines added, no structural changes.

