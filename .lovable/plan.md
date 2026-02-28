

# Fix Status Panel Accessibility - Timeout-Based Approach

## Root Cause
The `onMouseLeave` handler on the wrapper `div` (line 174) fires as soon as the mouse leaves the status button. Since the Portal-rendered status menu is **outside** this div in the DOM, the bridge element inside the Portal cannot prevent the parent's `onMouseLeave` from closing the menu. The menu closes before the user can reach it.

## Solution
Replace the instant `onMouseLeave` close with a small timeout (~150ms). Both the wrapper div and the Portal menu will clear this timeout on `mouseEnter`, keeping the menu open during the transition between the two elements.

### File: `src/components/profile/UserProfileCard.tsx`

1. **Add a ref** for the close timeout: `const closeTimeoutRef = useRef<NodeJS.Timeout>()`
2. **Create helper functions**:
   - `startCloseTimer()`: sets a 150ms timeout to close the menu
   - `cancelCloseTimer()`: clears the timeout
3. **Update the wrapper div** (line 174): replace `onMouseLeave={() => setShowStatusMenu(false)}` with `onMouseLeave={startCloseTimer}`
4. **Update the status button** (line 177): add `onMouseEnter` that also calls `cancelCloseTimer` before `handleStatusHover`
5. **Update the Portal container** (lines 193-194): replace `onMouseEnter={() => setShowStatusMenu(true)}` with `onMouseEnter={cancelCloseTimer}` and `onMouseLeave={startCloseTimer}`
6. **Add cleanup**: clear timeout on unmount via `useEffect`

This way, when the mouse leaves the button, the menu doesn't close instantly -- it waits 150ms. If the mouse enters the Portal menu within that window, the timer is cancelled and the menu stays open.

