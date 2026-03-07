

# Fix System Message Thread Container Size

## Problem
The system message thread embed (top in screenshot) is slightly wider than the regular message thread embed (bottom) because their parent wrappers use different padding:
- **System message**: outer wrapper uses `px-4` (16px each side)
- **Regular message**: outer wrapper uses `px-3 -mx-2` (extends into margins, different effective width)

This creates a visual mismatch even though both inner thread embeds use the same `pl-[42px]`.

## Solution
Change the system message outer wrapper padding from `py-1 px-4 my-0.5` to `py-1 px-3 -mx-2 my-0.5` to match the regular message wrapper's padding model. This ensures both thread embeds render at exactly the same size and position.

## Change

| File | Line | Change |
|------|------|--------|
| `src/components/chat/ChatArea.tsx` | 1292 | `px-4` → `px-3 -mx-2` |

No changes to the spine or ThreadSystemMessage component.

