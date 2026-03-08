

# Increase SVG ThreadSpine Corner Radius

## Problem
The SVG ThreadSpine uses a `radius = 6` (6px) for its quadratic curve, while the CSS system message spine uses `rounded-bl-lg` (8px). The user wants them to match.

## Change

| File | Line | Change |
|------|------|--------|
| `src/components/threads/ThreadSpine.tsx` | 38 | `radius = 6` → `radius = 8` |

Single line change, no other files affected.

