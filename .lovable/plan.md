

# Add Spacing Between Thread Spine and Container

## Problem
In both thread embed contexts, the spine connector ends too close to the thread container. The user wants a small gap between the spine endpoint and the container in both cases.

## Changes

### 1. System message thread spine (CSS border) — `ChatArea.tsx` line 1312-1313
Increase `pl-[42px]` to `pl-[50px]` to add spacing. Adjust the CSS spine `w-[30px]` to `w-[34px]` so the horizontal branch extends a bit but still leaves a gap before the container.

### 2. Regular/grouped message thread embed — `ChatArea.tsx` lines 1533, 1646
Increase `pl-[42px]` to `pl-[50px]` to match.

### 3. SVG ThreadSpine — `ThreadSpine.tsx` line 39
Increase `endX` from `x + 14` (33) to `x + 18` (37) so the horizontal branch extends further but stops short of the new `pl-[50px]`, leaving a gap. The SVG already uses `strokeLinecap="round"` and `strokeLinejoin="round"` with a quadratic curve (`Q`), so it's already rounded like the CSS spine.

| File | Line(s) | Change |
|------|---------|--------|
| `ChatArea.tsx` | 1312 | `pl-[42px]` → `pl-[50px]` |
| `ChatArea.tsx` | 1313 | `w-[30px]` → `w-[34px]` |
| `ChatArea.tsx` | 1533 | `pl-[42px]` → `pl-[50px]` |
| `ChatArea.tsx` | 1646 | `pl-[42px]` → `pl-[50px]` |
| `ThreadSpine.tsx` | 39 | `endX = x + 14` → `endX = x + 18` |

No other files affected. Spine logic untouched beyond the endpoint extension.

