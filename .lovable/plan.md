

## Problem

When a user joins a voice channel, there's a brief flash showing "Utilisateur" with a default avatar. This happens because:

1. `useVoiceState.joinChannel` inserts into `voice_states` in the database
2. The realtime INSERT handler in `useVoiceParticipants` (line 93-131) catches this and creates a placeholder entry with `display_name: 'Utilisateur'` and `avatar_url: null`
3. Only then does it fetch the real profile asynchronously

## Solution

Two changes to eliminate the flash:

### 1. `useVoiceState.ts` — Add optimistic update in `joinChannel.onMutate`

Before the DB insert, optimistically add the current user to the `['voice-participants', channelId]` cache with their real profile data (from `useAuth` + `useProfile` or the auth context). This way the participant appears instantly with correct name and avatar.

### 2. `useVoiceParticipants.ts` — Improve INSERT handler (line 93-131)

In the realtime INSERT handler, before falling back to placeholder profile:
- Check if the user's profile is already in React Query cache (`['profile', userId]` or `['members', serverId]`)
- If found, use it directly instead of the placeholder
- This handles the case where OTHER users join (not just the local user)

### Files to modify

- **`src/hooks/useVoiceState.ts`**: Add `onMutate` to `joinChannel` mutation that pre-populates the voice-participants cache with the current user's real profile
- **`src/hooks/useVoiceParticipants.ts`**: In the INSERT handler, attempt to resolve profile from existing React Query cache before using placeholder fallback

