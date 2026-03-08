

# Add Hover Padding to System Messages

## Problem
System messages (thread creation) lack the `message-hover` class and consistent padding (`pb-2`) that regular messages have. The hover background doesn't match.

## Change

| File | Line | Current | New |
|------|------|---------|-----|
| `ChatArea.tsx` | 1302 | `"py-1 px-4 my-0.5"` | `"group message-hover rounded-xl px-4 pb-2 pt-1 mb-1"` |

This applies the same hover background, border radius, and bottom padding used by regular messages (line 1384) to the system message wrapper.

