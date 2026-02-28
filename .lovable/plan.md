
# Fix Status Panel Accessibility - Bridge the Gap

## Problem
The status submenu (Portal) is positioned 4px to the right of the profile popover. When the user moves their mouse from the status button to the submenu, they cross a gap where neither panel has hover -- triggering `onMouseLeave` and closing the menu before they can reach it.

## Solution
Add an invisible "bridge" element that extends from the left edge of the status submenu back toward the profile popover, covering the gap. This keeps the `onMouseEnter`/`onMouseLeave` chain unbroken.

### File: `src/components/profile/UserProfileCard.tsx`

1. **Add a transparent bridge div** inside the Portal status menu container, positioned to the left of the menu, covering the 4px gap (plus some padding for tolerance). This div will be absolutely positioned, extending ~12px to the left of the menu with full height, ensuring the mouse never "leaves" when traveling between panels.

2. **Wrap the status menu content** so the bridge and the visible menu share the same `onMouseEnter`/`onMouseLeave` handlers.

### Visual representation
```text
+------------------+    +----------------+
| Profile Popover  |####| Status Menu    |
|                  |####|  * En ligne    |
|  [Status row] -->|####|  * Inactif     |
|                  |####|  * Ne pas...   |
+------------------+    +----------------+
                    ^^^^
              invisible bridge div
              (transparent, covers the gap)
```

### Implementation detail
Inside the Portal `<div>`, add a sibling div before the menu content:
```tsx
<div
  className="fixed z-[100]"
  style={{ top: menuPosition.top, left: menuPosition.left }}
  onMouseEnter={() => setShowStatusMenu(true)}
  onMouseLeave={() => setShowStatusMenu(false)}
>
  {/* Invisible bridge to connect popover to this menu */}
  <div className="absolute top-0 -left-3 w-3 h-full" />
  {/* Actual menu content */}
  <div className="w-44 bg-popover border border-border rounded-lg shadow-xl p-1.5 animate-slide-in-right">
    ...
  </div>
</div>
```

No other files are affected. This is a single accessibility fix in `UserProfileCard.tsx`.
