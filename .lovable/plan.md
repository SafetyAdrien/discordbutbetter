

# Fix Thread Embed Container Size

## Problem
The thread embed container (`ThreadSystemMessage`) currently uses `w-full`, stretching to fill all available width. The user wants a single consistent size: the container should be compact, with its max width ending at the timestamp — matching the screenshot reference.

## Solution
In `src/components/threads/ThreadSystemMessage.tsx`, change the button from `w-full` to `w-fit max-w-full` so it only takes up the space its content needs, and never stretches beyond the available area.

This single change applies universally to all thread embeds (system messages, author messages, grouped messages) since they all use the same `ThreadSystemMessage` component.

## Change

| File | Change |
|------|--------|
| `src/components/threads/ThreadSystemMessage.tsx` | Line 77: Replace `w-full` with `w-fit max-w-full` on the button element |

