

# Unify Thread Embed Container Across All Contexts

## Problem
Two different wrapper layouts for `ThreadSystemMessage`:
1. **System message** (line 1312): `flex` with `w-8` spine column + `flex-1 min-w-0` wrapper — makes the embed slightly wider
2. **Message thread** (lines 1537, 1650): simple `pl-[42px]` wrapper — compact, correct size

Plus the fallback button (line 1329-1338) still uses `w-full` instead of `w-fit`.

## Solution
Standardize the system message thread embed to use the same `pl-[42px]` layout as the message thread version, and fix the fallback button.

### Changes in `src/components/chat/ChatArea.tsx`

1. **System message thread embed** (~line 1312-1341): Replace the `flex` + `w-8` spine column layout with the same `pt-1.5 pl-[42px]` wrapper used elsewhere. The spine itself stays as the existing `left-[6px]` L-curve but repositioned to work within the simpler layout.

2. **Fallback button** (~line 1331): Change `w-full` to `w-fit max-w-full` to match `ThreadSystemMessage`.

