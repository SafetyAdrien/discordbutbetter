

# Convert All Non-User IDs to Snowflake Format

## Problem
When copying IDs (messages, polls, servers, threads), the app currently copies raw UUIDs. User IDs already use Snowflake format (in `UserProfileCard`). All other entity IDs should also display as 18-digit Snowflake IDs.

## Changes

Wrap every `handleCopyId` and inline copy-ID call with `uuidToSnowflake()`, excluding the user ID copy in `MemberList.tsx`.

| File | What | Change |
|------|------|--------|
| `ChatArea.tsx` | `handleCopyId` (line ~815) | `copyToClipboard(uuidToSnowflake(id), ...)` |
| `DMConversation.tsx` | `handleCopyId` (line ~169) | Same |
| `ServerList.tsx` | `handleCopyId` (line ~347) | Same |
| `ThreadView.tsx` | `handleCopyId` (line ~189) | Same |
| `AnnouncementChannel.tsx` | `handleCopyId` (line ~358) | Same |
| `VoiceChannelChat.tsx` | Inline copies (lines ~232, ~255) | Wrap `message.id` with `uuidToSnowflake` |
| `ChannelList.tsx` | Thread ID copy (line ~511) | Wrap `thread.id` with `uuidToSnowflake` |

Each file gets an `import { uuidToSnowflake } from '@/lib/snowflake'` if not already present.

**Excluded**: `MemberList.tsx` (`handleCopyId` for user IDs) — already handled separately via `UserProfileCard`.

