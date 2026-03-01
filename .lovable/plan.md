

# New Channel Type: "Chaîne de liaison" (Link Channel)

## Overview

Add a new channel type `link` that stores an external URL. Clicking this channel won't navigate to a chat view -- instead it opens a warning modal about the external link, showing the full URL and letting the user choose to open it or cancel.

## Changes Required

### 1. Database Migration -- Add `link` to `channel_type` enum

Add a new value `link` to the existing `channel_type` PostgreSQL enum. The channel's `description` field will store the URL (no new columns needed).

```sql
ALTER TYPE public.channel_type ADD VALUE IF NOT EXISTS 'link';
```

### 2. Create a Link icon component

Create `src/components/icons/StreamlineLink.tsx` -- a simple link/chain icon matching the existing Streamline icon style.

### 3. Update `CreateChannelModal.tsx`

- Add `link` to the channel type list with a new icon and French label "Chaîne de liaison"
- When `link` is selected, replace the standard "Nom du salon" input with:
  - **Nom du salon** (label/name input)
  - **URL** (url input with validation: must start with `http://` or `https://`)
- On submit, save the URL in the channel's `description` field via the existing `useCreateChannel` mutation (which already supports passing description or we adapt it)

### 4. Update `useCreateChannel` hook

Extend the mutation to accept an optional `description` parameter so the link URL can be stored.

### 5. Update `ChannelList.tsx` -- Desktop

- Add `link` to the `channelIcons` map
- In `handleChannelClick`: if channel type is `link`, don't call `onChannelSelect`. Instead, open a new "External Link Warning" modal showing the URL (stored in `channel.description`)

### 6. Update `MobileChannelListView.tsx` -- Mobile

Same logic as desktop: intercept link channel clicks to show the warning modal instead of navigating.

### 7. Create `ExternalLinkWarningModal.tsx`

A new modal component (`src/components/modals/ExternalLinkWarningModal.tsx`) using `ResponsiveModal`:
- Title: "Lien externe"
- Warning text: "Tu es sur le point de visiter un site externe."
- Read-only input showing the full URL
- "Copier" button to copy URL
- "Ouvrir le lien" button (opens in new tab via `window.open`)
- "Annuler" button

### 8. Update supporting type maps

- `src/hooks/useChannels.ts`: Add `'link'` to the `ChannelType` union
- `src/types/app.ts`: Add `'link'` to the Channel type union
- `src/constants/permissions.ts`: Add `link: ['general']` to `CHANNEL_TYPE_CATEGORIES`
- `src/pages/Index.tsx`: Add `'link'` to the type cast

### Technical Details

- The URL is stored in `channels.description` (existing `text` column) -- no schema change beyond the enum
- URL validation: must match `https?://` pattern, validated client-side with a regex before submission
- The `ExternalLinkWarningModal` uses the existing `ResponsiveModal` wrapper for mobile/desktop consistency

