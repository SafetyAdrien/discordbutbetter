

# Fix: Quick Settings Menu Not Working After Selection

## Problem

The dropdown menu (ChevronDown) in the channel list header uses an uncontrolled Radix `Popover`. When a user selects an item from the `ServerSettingsQuickMenu`, the `ServerSettingsModal` opens at `z-50`, but the Popover portal (also `z-50`) stays open on top, blocking all interactions with the settings modal underneath.

## Solution

Make the three dropdown Popover instances in `MobileChannelListView` **controlled** so they close when a menu item is selected, before opening the settings modal.

## Technical Changes

### File: `src/components/mobile/MobileChannelListView.tsx`

1. Add a new state variable `settingsPopoverOpen` (boolean, default `false`)
2. Update all three `<Popover>` instances (banner variant ~line 431, no-banner non-embedded ~line 476, embedded ~line 501) to use `open={settingsPopoverOpen}` and `onOpenChange={setSettingsPopoverOpen}`
3. In the `onSelect` callback of `ServerSettingsQuickMenu`, close the Popover first:
   ```
   onSelect={(tabId) => {
     setSettingsPopoverOpen(false);
     onOpenSettings?.(tabId);
   }}
   ```

This ensures the Popover closes before the full-screen settings modal renders, eliminating the z-index conflict.

