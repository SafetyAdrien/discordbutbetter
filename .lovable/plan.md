## Mobile Voice/Stage UI overhaul

### 1. Unified mobile channel header (voice + stage = text)

Currently voice uses its own `MobileVoiceHeader` (chevron-down + name + deafen + add) and stage uses the minimal `FullScreenWrapper`. Both need to look and behave like the text-channel header from `MobileChatView` (lines 185–272):

- Back arrow (left)
- Round icon bubble (voice icon for voice, stage icon for stage) + channel name + chevron-right + online count
- Tap on the title block opens a right-side `Sheet` (member list / channel details)
- Search action on the right (kept, opens global search scoped to the channel)

Implementation:
- Extract the header from `MobileChatView` into a shared `MobileChannelHeader` component (props: `channel`, `iconType`, `onBack`, `members`, `onlineCount`, `serverId`, `ownerId`, `onOpenDM`, extra right-side slot).
- `MobileChatView` consumes it (no visual change).
- `MobileVoiceChannelView` uses it instead of `MobileVoiceHeader` (delete the local header).
- For stage, replace `FullScreenWrapper` around `StageChannel` with a flex container that renders `MobileChannelHeader` + `StageChannel` (pass `hideHeader` if `StageChannel` has its own; otherwise keep its internal one suppressed via a wrapper div).

### 2. Pre-join voice screen (image 2)

Replace the current `VoiceEmptyState` rendering inside `MobileVoiceChannelView` when `!isConnected` with a new `MobileVoicePreJoin` component:

```
┌───────────────────────────────────────┐
│  [unified channel header]              │
│                                        │
│                                        │
│        No one's here yet!              │
│  When you are ready to talk,           │
│        just hop in.                    │
│                                        │
│                                        │
│  ╭──────────────────────────────────╮  │
│  │  [🎤]  [   Join Voice   ]  [💬]  │  │
│  ╰──────────────────────────────────╯  │
└───────────────────────────────────────┘
```

- Rounded dark container at the bottom with a small drag handle line on top.
- Left circular button: mic toggle (uses `voiceState.isMuted` + `toggleMute`; pre-join saves the desired state, applied on join).
- Center: large green pill "Join Voice" (calls `joinChannel`). Falls back to "Connexion…" while connecting; "Accès refusé" if `!canConnect`.
- Right circular button: chat — switches the user to the text view of the same channel (jumps to `chat` view with `channelType: 'text'` fallback, or opens an in-channel chat sheet if the voice channel has its own thread/messages). We will navigate via `setMobileView({ type: 'chat', ... })` triggered through an `onOpenChat` prop passed from `MobileLayout`.
- When there ARE existing participants but the local user is not connected, show participant tiles above the pill (reuse `VoiceParticipantGrid`) and keep the same bottom pill.

### 3. Channel details sheet (image 1)

Tapping the title in the unified header opens a right Sheet (already implemented for text). For voice/stage, the sheet content becomes a dedicated `VoiceChannelDetailsSheet`:

- Title (channel name) + subtitle (server name)
- "End-to-end encrypted" badge (static info row, matches existing E2EE styling already used elsewhere)
- Group card 1: **Channel Settings** row → opens existing `ChannelSettingsModal`
- Group card 2:
  - **Voice Settings** → opens existing user voice settings (reuse `useVoiceUserSettings` modal/sheet; if none exists, wire to account settings voice panel)
  - **Deafen** toggle → `toggleDeafen`
  - **Only Show Videos** toggle → new local UI state passed to `VoiceParticipantGrid` as `videoOnly` prop (filters out tiles whose `localCameraStream`/`remoteVideoStreams[userId]` is null)
- "X Member(s)" section header
- **Invite a friend** row → opens existing `CreateInviteModal`
- Member list (reuse `MemberList`)
- "For Developers" footer → existing "Copy ID" affordance (snowflake)

All toggles persist via existing hooks (`toggleDeafen`, local `videoOnly` state held in `VoiceContext` or lifted in `MobileVoiceChannelView`).

### Files

- new `src/components/mobile/MobileChannelHeader.tsx`
- new `src/components/mobile/MobileVoicePreJoin.tsx`
- new `src/components/mobile/VoiceChannelDetailsSheet.tsx`
- edit `src/components/mobile/MobileVoiceChannelView.tsx` (use new header + pre-join + details sheet, drop local `MobileVoiceHeader`)
- edit `src/components/mobile/MobileChatView.tsx` (swap inline header for `MobileChannelHeader`, no visual change)
- edit `src/components/mobile/MobileLayout.tsx` (stage case: render `MobileChannelHeader` instead of `FullScreenWrapper`; pass `onOpenChat` to voice view)
- edit `src/components/channels/voice/VoiceParticipantGrid.tsx` (accept optional `videoOnly` prop)

### Out of scope

- No changes to desktop layouts.
- No changes to voice signaling / WebRTC pipeline.
