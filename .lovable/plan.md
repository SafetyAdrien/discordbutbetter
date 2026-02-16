

# Fix: Channel duplication not appearing until restart

## Root cause

The `ChannelList` component renders channels from the `useServers` cache (key `['servers', userId]`), NOT from `useChannels` (key `['channels', serverId]`).

The current `useDuplicateChannel.onMutate` only updates `['channels', serverId]` -- which has zero effect on the sidebar rendering. The `['servers']` cache is never updated optimistically.

Additionally, the snapshot `previousServers = getQueryData(['servers'])` returns `undefined` because the actual cache key is `['servers', userId]` (with the user ID suffix). This means the rollback in `onError` also doesn't work.

## Fix (src/hooks/useChannels.ts)

Modify the `useDuplicateChannel` hook (lines 767-840) to:

1. **Set `mutationLockRef`** to prevent realtime interference during mutation
2. **Snapshot the servers cache** using the correct key pattern (`queryClient.getQueriesData({ queryKey: ['servers'] })`)
3. **Optimistically update the `['servers', ...]` cache** by inserting the temp channel into the correct category or orphanChannels array
4. **Fix `onError` rollback** to restore the servers cache using the correct key
5. **Reset `mutationLockRef`** in `onSettled`

### Detailed changes

**onMutate** (lines 767-823):
- Add `mutationLockRef.current = true`
- Use `getQueriesData({ queryKey: ['servers'] })` to find all server queries and snapshot them
- After updating `['channels', serverId]`, also update each `['servers', ...]` query by finding the matching server and inserting the temp channel into its categories or orphanChannels

**onSuccess** (lines 825-829):
- No changes needed (already invalidates both caches)

**onError** (lines 831-838):
- Restore servers cache using the snapshotted queries data (correct keys)

**Add onSettled**:
- Reset `mutationLockRef.current = false` after a short delay (matching pattern from other mutations)

| File | Modification |
|------|-------------|
| `src/hooks/useChannels.ts` | Rewrite onMutate/onError of useDuplicateChannel to also update ['servers'] cache with correct key matching; add mutationLock |

