

# Unify Thread Embed Container Size

## Problem
Two different thread embed layouts exist:
1. **On regular messages** (line 1537): `pl-[42px]` padding, uses `ThreadSpine` SVG component
2. **On system "a créé un thread" messages** (line 1312): `flex` with `w-8` spine column + `mr-1.5`, uses CSS L-curve

The system message version produces a slightly more compact result. The user wants the system message's layout to be the universal model.

## Solution
Make the regular message thread embed use the same layout as the system message one — a `flex` container with the `w-8` spine column and `mr-1.5` gap, with the CSS L-curve (`left-[6px] w-[20px] h-1/2 border-l-2 border-b-2 rounded-bl-lg`).

## Changes in `src/components/chat/ChatArea.tsx`

### 1. Regular message with avatar (lines ~1536-1543)
Replace:
```tsx
<div className="pt-1.5 pl-[42px]">
  <ThreadSystemMessage ... />
</div>
```
With the same flex layout used in the system message block:
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

### 2. Grouped message thread embed (around line ~1655)
Apply the same flex layout pattern.

### 3. Remove ThreadSpine SVG usage
- Remove `<ThreadSpine startY={44} />` and `<ThreadSpine startY={0} />` from both message blocks since the spine is now handled by the CSS L-curve inside the flex layout.

### Files
- `src/components/chat/ChatArea.tsx` — 2 locations (showAuthor + grouped message thread embeds)

