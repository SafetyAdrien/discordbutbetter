

# Fix: Duplicated channel hidden by visibility filter

## Root cause

The `ChannelList` component filters every channel through `shouldShowChannel(channelId)`, which calls `useServerChannelPermissions`. This hook caches a `viewable` Set of channel IDs (via an RPC call, cached 30 seconds).

When a channel is duplicated, its new ID is NOT in the cached `viewable` Set. So `viewable.has(newChannelId)` returns `false`, and the channel is hidden -- even though it was correctly inserted into the `['servers', userId]` cache.

On restart, the permissions are re-fetched with the new channel ID included, and the channel appears.

## Fix

Two changes in `src/hooks/useChannels.ts`, inside `useDuplicateChannel`:

### 1. In `onMutate`: optimistically add the temp channel ID to the permissions cache

After updating the servers cache, also update `['server-channel-permissions', serverId, userId]` to add the temp channel ID to the `viewable` and `connectable` sets.

### 2. In `onSuccess`: invalidate the permissions cache

After invalidating `['channels']` and `['servers']`, also invalidate `['server-channel-permissions', serverId]` so the real channel ID gets fetched.

### 3. Hook needs `useAuth` for the user ID

Add `useAuth()` to get the user ID for the correct permissions cache key.

## Detailed changes

| File | Change |
|------|--------|
| `src/hooks/useChannels.ts` | Add `useAuth()` to `useDuplicateChannel`; in `onMutate`, update `['server-channel-permissions']` cache with temp channel ID in viewable/connectable sets; in `onSuccess`, add `invalidateQueries(['server-channel-permissions', serverId])` |

### Code sketch for onMutate addition (after servers cache update)

```text
// 3) Add temp channel to permissions cache so visibility filter passes
const permKey = ['server-channel-permissions', serverId, user?.id];
const prevPerms = queryClient.getQueryData(permKey);
if (prevPerms) {
  const newViewable = new Set(prevPerms.viewable);
  const newConnectable = new Set(prevPerms.connectable);
  newViewable.add(tempId);
  newConnectable.add(tempId);
  queryClient.setQueryData(permKey, {
    viewable: newViewable,
    connectable: newConnectable,
  });
}
```

### Code for onSuccess addition

```text
// Also refresh permissions so real channel ID becomes visible
queryClient.invalidateQueries({ queryKey: ['server-channel-permissions', sid] });
```

This ensures the duplicated channel passes the visibility filter immediately and remains visible after the real data is fetched.

