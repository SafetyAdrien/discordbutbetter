import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { markReadGuard, recordReadAt } from '@/lib/readStateGuard';
import type { ChannelUnreadInfo } from '@/hooks/useChannelUnreadCounts';
import type { ServerUnreadInfo } from '@/hooks/useServerUnreadCounts';

/**
 * Marks a channel as read for the current user:
 *  - Upserts channel_read_states (per-channel last_read_at).
 *  - Clears the user's pending channel_mentions for that channel.
 *  - Optimistically updates the channel-unread and server-unread caches so
 *    badges disappear instantly without waiting for the realtime refetch.
 *  - Arms a read-guard so any realtime INSERT or refetch surfacing messages
 *    older than the read moment cannot resurrect the badge (race fix).
 */
export function useMarkChannelAsRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useCallback(
    async (channelId: string, serverId: string | null) => {
      if (!user || !channelId) return;

      // Arm the guard FIRST so any in-flight realtime/refetch is filtered.
      markReadGuard(channelId);
      // Register this read moment in the cross-device monotone registry so
      // older read events broadcast from other devices can't rewind it.
      recordReadAt(channelId, Date.now());

      // Optimistic cache update — channel-level
      if (serverId) {
        const key = ['channel-unread-counts', serverId, user.id];
        queryClient.setQueryData<Record<string, ChannelUnreadInfo>>(key, (old) => {
          if (!old) return old;
          if (!old[channelId]) return old;
          const { [channelId]: _, ...rest } = old;
          return rest;
        });

        // Optimistic cache update — server-level (recompute presence of this server)
        const serverKey = ['server-unread-counts', user.id];
        queryClient.setQueryData<Record<string, ServerUnreadInfo>>(serverKey, (old) => {
          if (!old || !old[serverId]) return old;
          const channelCache =
            queryClient.getQueryData<Record<string, ChannelUnreadInfo>>([
              'channel-unread-counts',
              serverId,
              user.id,
            ]) || {};
          const stillUnread = Object.keys(channelCache).length > 0;
          if (stillUnread) return old;
          const { [serverId]: _, ...rest } = old;
          return rest;
        });
      }

      try {
        await Promise.all([
          supabase
            .from('channel_read_states')
            .upsert(
              {
                user_id: user.id,
                channel_id: channelId,
                last_read_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,channel_id' }
            ),
          supabase
            .from('channel_mentions')
            .delete()
            .eq('user_id', user.id)
            .eq('channel_id', channelId),
        ]);
      } catch {
        // Swallow — optimistic patch already applied; cross-device sync will
        // reconcile on next mount via the read_states realtime channel.
      }
      // NOTE: intentionally no invalidateQueries here. The optimistic patch +
      // armed guard prevent the badge from re-appearing; a forced refetch
      // races against the upsert's replication lag and was the documented
      // root cause of the "never-clears" bug.
    },
    [user, queryClient]
  );
}

