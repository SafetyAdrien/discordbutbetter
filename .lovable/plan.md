

# Fix Status Panel Positioning Next to Profile Popover

## Problem
The status submenu (Portal) calculates its position from the status button's bounding rect, but the math doesn't reliably place it adjacent to the profile popover panel. It can appear disconnected or misaligned.

## Solution
Update the positioning logic in `handleStatusHover` so the Portal-based status menu appears flush to the right of the **popover container** (not just the button), properly vertically aligned.

### File: `src/components/profile/UserProfileCard.tsx`

1. **Add a ref on the PopoverContent wrapper** to get the popover panel's bounding rect
2. **Update `handleStatusHover`** to use the popover panel's right edge and vertical center for positioning, so the status menu appears directly beside the popover
3. **Adjust the `left` calculation** to use `popoverRect.right + 4` (right edge of the popover + small gap)
4. **Adjust the `top` calculation** to vertically align the status menu with the status button row within the popover

### Technical Detail

```typescript
// Add ref to PopoverContent wrapper
const popoverRef = useRef<HTMLDivElement>(null);

// Updated positioning logic
const handleStatusHover = () => {
  if (statusButtonRef.current && popoverRef.current) {
    const buttonRect = statusButtonRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();
    const menuHeight = 160;

    setMenuPosition({
      top: Math.max(10, buttonRect.top - menuHeight / 2 + buttonRect.height / 2),
      left: popoverRect.right + 4, // Flush to the right of the popover
    });
  }
  setShowStatusMenu(true);
};
```

No other files are affected. This is a positioning adjustment only -- the visual design of both panels stays the same.

