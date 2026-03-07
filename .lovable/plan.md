

# Fix Thread Spine — Match New Thread Layout

## Problem
The existing thread spine uses absolute positioning (`left-[19px]`) with `w-[33px]` L-curve and a separate `ml-[52px]` embed. The horizontal line overshoots into the thread container. The newly created threads (system message at line 1312) use a clean flex-based layout that works correctly.

## Solution
Replace the absolute-positioned spine + `ml-[52px]` embed with the same flex-based approach used by new threads (line 1312-1315):

```tsx
<div className="flex mt-1.5">
  <div className="flex-shrink-0 w-8 relative mr-1.5">
    <div className="absolute left-[6px] top-0 w-[20px] h-1/2 border-l-2 border-b-2 border-muted-foreground/30 rounded-bl-lg" />
  </div>
  <div className="flex-1 min-w-0">
    <ThreadSystemMessage ... />
  </div>
</div>
```

## Changes in `src/components/chat/ChatArea.tsx`

### 1. First message with author (lines 1408-1414 + 1542-1550)
- **Remove** the absolute spine overlay (lines 1408-1414)
- **Replace** the `ml-[52px]` thread embed (lines 1542-1550) with the flex-based spine+embed layout identical to line 1312

### 2. Grouped message (lines 1555-1561 + 1662-1670)
- **Remove** the absolute spine overlay (lines 1555-1561)
- **Replace** the `ml-[52px]` thread embed (lines 1662-1670) with the same flex-based spine+embed layout

This ensures all thread spines — new and existing — render identically.

