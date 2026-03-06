

# Preload all messages during loading screen

## Problem

Currently, messages (server channels, DMs, threads) are only fetched on-demand when the user navigates to a channel/conversation. This causes a visible loading delay every time the user switches context.

## Approach

Add three new preload steps in `usePreloader.ts` that run in parallel after channels and DMs are loaded:

### Step 1: Server channel messages
After channels are loaded, collect all **text-type** channel IDs from cached channel data. For each channel, fetch the last 100 messages (same query shape as `useMessages`) and seed `['messages', channelId]` in the query cache.

### Step 2: DM messages
After DM conversations are loaded, fetch the last 100 messages for each conversation and seed `['dm-messages', conversationId]`.

### Step 3: Thread messages
Fetch all followed threads for each server (using same query as `useAllFollowedThreadsForServer`), then for each thread fetch messages and seed `['thread-messages', threadId]`.

## File: `src/hooks/usePreloader.ts`

### New state variables
```ts
const [serverMessagesLoaded, setServerMessagesLoaded] = useState(false);
const [dmMessagesLoaded, setDmMessagesLoaded] = useState(false);
const [threadMessagesLoaded, setThreadMessagesLoaded] = useState(false);
```

### New preload steps (after existing step 6)

**Step 7 — Server messages**: Iterate over all cached channel data, collect text/announcement channel IDs, batch-fetch 100 messages each with author join, seed cache.

**Step 8 — DM messages**: Use the already-cached `dm-conversations` list, fetch 100 messages per conversation with author join, seed cache.

**Step 9 — Thread messages**: For each server, query `thread_followers` → get thread IDs → fetch `thread_messages` with author join, seed cache.

All three steps run in parallel via `Promise.all`.

### Updated steps array
Add three new entries:
- `Messages serveur` → `serverMessagesLoaded`
- `Messages privés` → `dmMessagesLoaded`  
- `Messages threads` → `threadMessagesLoaded`

### Performance considerations
- All message fetches for different channels/conversations run concurrently within each step
- Each fetch is limited to 100 messages (matching existing hook behavior)
- Steps 7-9 run in parallel with each other since they have no interdependencies
- The existing `staleTime: 0` config means realtime subscriptions will still refresh data when channels are opened, but the initial render will use preloaded cache (no loading spinner)

