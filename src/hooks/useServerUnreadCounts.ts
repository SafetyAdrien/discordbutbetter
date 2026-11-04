import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useRef } from 'react';
import { soundEffects } from '@/utils/audio/SoundEffects';
import { isDirectMentionForUser } from '@/lib/mentions';
import { acquireSharedRealtimeEffect } from '@/lib/realtimeDiagnostics';

export interface ServerUnreadInfo {
  hasUnread: boolean;
  mentionCount: number;
}

export function useServerUnreadCounts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const countedMentionMessageIdsRef = useRef<Set<string>>(new Set());

  const cachedKey = user?.id ? `server-unread:${user.id}` : null;
  const cachedData = cachedKey ? cacheGetSync<Record<string, ServerUnreadInfo>>(cachedKey) : undefined;

  // Realtime — direct cache patching for instant badges
  useEffect(() => {
    if (!user) return;
    return acquireSharedRealtimeEffect(`server-unread:${user.id}`, () => {

    let userChannelToServer: Map<string, string> | null = null;
    supabase
      .from('server_members')
      .select('server_id')
      .eq('user_id', user.id)
      .then(async ({ data: memberships }) => {
        if (!memberships?.length) return;
        const { data: channels } = await supabase
          .from('channels')
          .select('id, server_id')
          .in('server_id', memberships.map(m => m.server_id));
        userChannelToServer = new Map((channels || []).map(c => [c.id, c.server_id]));
      });

    const patchServer = (serverId: string, patch: Partial<ServerUnreadInfo>) => {
      queryClient.setQueryData<Record<string, ServerUnreadInfo>>(
        ['server-unread-counts', user.id],
        (old = {}) => {
          const current = old[serverId] || { hasUnread: false, mentionCount: 0 };
          const next = { ...current, ...patch };
          if (!next.hasUnread && next.mentionCount <= 0) {
            const { [serverId]: _, ...rest } = old;
            return rest;
          }
          return { ...old, [serverId]: next };
        }
      );
    };

    const messagesChannel = supabase
      .channel(`server-unread-messages-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as { id?: string; author_id: string; channel_id: string; content?: string | null };
          const serverId = userChannelToServer?.get(newMsg.channel_id);
          if (userChannelToServer && !serverId) return;

          if (newMsg.author_id !== user.id) {
            soundEffects.playMessageNotification();
            if (serverId) {
              const current = queryClient.getQueryData<Record<string, ServerUnreadInfo>>(['server-unread-counts', user.id])?.[serverId];
              const isMention = isDirectMentionForUser(newMsg.content, user.id);
              const shouldCountMention = isMention && (!newMsg.id || !countedMentionMessageIdsRef.current.has(newMsg.id));
              if (shouldCountMention && newMsg.id) countedMentionMessageIdsRef.current.add(newMsg.id);
              patchServer(serverId, {
                hasUnread: true,
                mentionCount: (current?.mentionCount || 0) + (shouldCountMention ? 1 : 0),
              });
            }
          }
          // NOTE: no invalidate — the optimistic patch above is authoritative.
          // Refetching here would race against channel_read_states replication
          // lag and risk resurrecting a freshly-cleared badge.
        }
      )
      .subscribe();

    const mentionsChannel = supabase
      .channel(`server-unread-mentions-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'channel_mentions', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const mention = payload.new as { channel_id?: string; message_id?: string };
          if (!mention.channel_id) return;
          const serverId = userChannelToServer?.get(mention.channel_id);
          if (userChannelToServer && !serverId) return;
          if (serverId) {
            if (mention.message_id) {
              if (countedMentionMessageIdsRef.current.has(mention.message_id)) return;
              countedMentionMessageIdsRef.current.add(mention.message_id);
            }
            const current = queryClient.getQueryData<Record<string, ServerUnreadInfo>>(['server-unread-counts', user.id])?.[serverId];
            patchServer(serverId, { mentionCount: (current?.mentionCount || 0) + 1 });
          }
          // No invalidate — patch is authoritative.
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'channel_mentions', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const mention = payload.old as { channel_id?: string };
          if (!mention.channel_id) return;
          const serverId = userChannelToServer?.get(mention.channel_id);
          if (userChannelToServer && !serverId) return;
          if (serverId) {
            const current = queryClient.getQueryData<Record<string, ServerUnreadInfo>>(['server-unread-counts', user.id])?.[serverId];
            patchServer(serverId, { mentionCount: Math.max(0, (current?.mentionCount || 0) - 1) });
          }
          // No invalidate — patch is authoritative.
        }
      )
      .subscribe();

    // Listen to my own channel_read_states changes so server badges clear
    // immediately after marking any channel read (incl. from another device).
    const readChannel = supabase
      .channel(`server-unread-reads-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channel_read_states',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['server-unread-counts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(mentionsChannel);
      supabase.removeChannel(readChannel);
    };
    });
  }, [user, queryClient]);

  const query = useQuery({
    queryKey: ['server-unread-counts', user?.id],
    queryFn: async (): Promise<Record<string, ServerUnreadInfo>> => {
      if (!user) return {};

      const { data: memberships } = await supabase
        .from('server_members')
        .select('server_id')
        .eq('user_id', user.id);

      const serverIds = memberships?.map(m => m.server_id) || [];
      if (serverIds.length === 0) return {};

      // Channels per server (single query)
      const { data: allChannels } = await supabase
        .from('channels')
        .select('id, server_id')
        .in('server_id', serverIds);

      const channelToServer: Record<string, string> = {};
      allChannels?.forEach(c => {
        channelToServer[c.id] = c.server_id;
      });

      const allChannelIds = allChannels?.map(c => c.id) || [];

      // Mentions (single query)
      const { data: mentions } = allChannelIds.length > 0
        ? await supabase
            .from('channel_mentions')
            .select('channel_id')
            .eq('user_id', user.id)
            .in('channel_id', allChannelIds)
        : { data: [] as { channel_id: string }[] };

      const serverMentionCounts: Record<string, number> = {};
      mentions?.forEach(m => {
        const serverId = channelToServer[m.channel_id];
        if (serverId) {
          serverMentionCounts[serverId] = (serverMentionCounts[serverId] || 0) + 1;
        }
      });

      // Per-channel unread evaluation done server-side (EXISTS per channel),
      // no global cutoff, no LIMIT truncation.
      const serverHasUnread: Record<string, boolean> = {};
      if (allChannelIds.length > 0) {
        const { data: unreadRows } = await supabase.rpc('get_unread_channel_ids', {
          _user_id: user.id,
          _channel_ids: allChannelIds,
        });
        (unreadRows as { channel_id: string }[] | null)?.forEach(row => {
          const serverId = channelToServer[row.channel_id];
          if (serverId) serverHasUnread[serverId] = true;
        });
      }

      const result: Record<string, ServerUnreadInfo> = {};
      for (const serverId of serverIds) {
        const hasUnread = !!serverHasUnread[serverId];
        const mentionCount = serverMentionCounts[serverId] || 0;
        if (hasUnread || mentionCount > 0) {
          result[serverId] = { hasUnread, mentionCount };
        }
      }

      return result;
    },
    enabled: !!user,
    initialData: cachedData,
    initialDataUpdatedAt: cachedData ? Date.now() : 0,
    staleTime: cachedData ? 2 * 60 * 1000 : 0,
    refetchOnMount: cachedData ? false : true,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  useEffect(() => {
    if (query.data && cachedKey && !query.isPlaceholderData) {
      cacheSetAsync(cachedKey, query.data);
    }
  }, [query.data, cachedKey, query.isPlaceholderData]);

  const markAsRead = useMutation({
    mutationFn: async (serverId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Fetch every channel of the server and mark each as read in
      // channel_read_states — the actual source of truth read by the badge
      // query. Writing to server_read_states alone had no visible effect.
      const { data: channels } = await supabase
        .from('channels')
        .select('id')
        .eq('server_id', serverId);
      const channelIds = channels?.map(c => c.id) || [];
      if (channelIds.length === 0) return;

      const now = new Date().toISOString();
      const upserts = channelIds.map(channel_id => ({
        user_id: user.id,
        channel_id,
        last_read_at: now,
      }));

      await Promise.all([
        supabase
          .from('channel_read_states')
          .upsert(upserts, { onConflict: 'user_id,channel_id' }),
        supabase
          .from('channel_mentions')
          .delete()
          .eq('user_id', user.id)
          .in('channel_id', channelIds),
      ]);
    },
    onMutate: async (serverId: string) => {
      // Optimistic patch — clear the server badge immediately so the icon
      // resets without waiting on the network round-trip.
      if (!user) return;
      queryClient.setQueryData<Record<string, ServerUnreadInfo>>(
        ['server-unread-counts', user.id],
        (old = {}) => {
          if (!(serverId in old)) return old;
          const { [serverId]: _, ...rest } = old;
          return rest;
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server-unread-counts'] });
      queryClient.invalidateQueries({ queryKey: ['channel-unread-counts'] });
    },
  });

  return {
    unreadInfo: query.data || {},
    isLoading: query.isLoading,
    markServerAsRead: markAsRead.mutate,
  };
}
