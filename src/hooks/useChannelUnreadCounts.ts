import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useRef } from 'react';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';
import { isDirectMentionForUser } from '@/lib/mentions';
import { isBeforeReadGuard } from '@/lib/readStateGuard';

export interface ChannelUnreadInfo {
  hasUnread: boolean;
  mentionCount: number;
}

export function useChannelUnreadCounts(serverId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const countedMentionMessageIdsRef = useRef<Set<string>>(new Set());

  const cachedKey = serverId && user?.id ? `channel-unread:${serverId}:${user.id}` : null;
  const cachedData = cachedKey ? cacheGetSync<Record<string, ChannelUnreadInfo>>(cachedKey) : undefined;

  // Realtime — direct cache patching for instant badges
  useEffect(() => {
    if (!user || !serverId) return;

    let serverChannelIds: Set<string> | null = null;
    supabase
      .from('channels')
      .select('id')
      .eq('server_id', serverId)
      .then(({ data }) => {
        serverChannelIds = new Set(data?.map(c => c.id) || []);
      });

    const patchChannel = (channelId: string, patch: Partial<ChannelUnreadInfo>) => {
      queryClient.setQueryData<Record<string, ChannelUnreadInfo>>(
        ['channel-unread-counts', serverId, user.id],
        (old = {}) => {
          const current = old[channelId] || { hasUnread: false, mentionCount: 0 };
          const next = { ...current, ...patch };
          if (!next.hasUnread && next.mentionCount <= 0) {
            const { [channelId]: _, ...rest } = old;
            return rest;
          }
          return { ...old, [channelId]: next };
        }
      );
    };

    // Catchup refs: invalidate on reconnect to recover events missed during outage.
    const wasMentionsRef = { current: false };
    const everMentionsRef = { current: false };
    const wasMessagesRef = { current: false };
    const everMessagesRef = { current: false };

    const triggerCatchup = () => {
      queryClient.invalidateQueries({ queryKey: ['channel-unread-counts', serverId, user.id] });
      queryClient.invalidateQueries({ queryKey: ['server-unread-counts'] });
    };

    const mentionsChannel = supabase
      .channel(`channel-mentions-${serverId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'channel_mentions', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const mention = payload.new as { channel_id?: string; message_id?: string };
          if (!mention.channel_id) return;
          if (serverChannelIds && !serverChannelIds.has(mention.channel_id)) return;
          // Guard against mentions belonging to a message we already marked read.
          if (isBeforeReadGuard(mention.channel_id, (payload.new as { created_at?: string })?.created_at)) return;
          if (mention.message_id) {
            if (countedMentionMessageIdsRef.current.has(mention.message_id)) return;
            countedMentionMessageIdsRef.current.add(mention.message_id);
          }
          patchChannel(mention.channel_id, {
            mentionCount: ((queryClient.getQueryData<Record<string, ChannelUnreadInfo>>(['channel-unread-counts', serverId, user.id]) || {})[mention.channel_id]?.mentionCount || 0) + 1,
          });
          // No invalidate — patch is authoritative.
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'channel_mentions', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const mention = payload.old as { channel_id?: string };
          if (!mention.channel_id) return;
          if (serverChannelIds && !serverChannelIds.has(mention.channel_id)) return;
          const current = (queryClient.getQueryData<Record<string, ChannelUnreadInfo>>(['channel-unread-counts', serverId, user.id]) || {})[mention.channel_id];
          patchChannel(mention.channel_id, { mentionCount: Math.max(0, (current?.mentionCount || 0) - 1) });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (everMentionsRef.current && !wasMentionsRef.current) triggerCatchup();
          wasMentionsRef.current = true;
          everMentionsRef.current = true;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          wasMentionsRef.current = false;
        }
      });

    const messagesChannel = supabase
      .channel(`channel-messages-${serverId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as { id?: string; channel_id?: string; author_id?: string | null; content?: string | null; created_at?: string | null };
          const channelId = newMsg?.channel_id;
          if (serverChannelIds && channelId && !serverChannelIds.has(channelId)) return;
          if (!channelId || newMsg.author_id === user.id) return;

          // Guard: ignore inserts older than (or equal to) the moment the user
          // marked this channel read. Prevents a delayed broadcast of a
          // pre-read message from resurrecting the unread badge.
          if (isBeforeReadGuard(channelId, newMsg.created_at)) return;

          const isMention = isDirectMentionForUser(newMsg.content, user.id);
          const current = (queryClient.getQueryData<Record<string, ChannelUnreadInfo>>(['channel-unread-counts', serverId, user.id]) || {})[channelId];
          const shouldCountMention = isMention && (!newMsg.id || !countedMentionMessageIdsRef.current.has(newMsg.id));
          if (shouldCountMention && newMsg.id) countedMentionMessageIdsRef.current.add(newMsg.id);
          patchChannel(channelId, {
            hasUnread: true,
            mentionCount: (current?.mentionCount || 0) + (shouldCountMention ? 1 : 0),
          });
          // NOTE: no invalidate — the patch is authoritative; a refetch would
          // race against channel_read_states replication lag.
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (everMessagesRef.current && !wasMessagesRef.current) triggerCatchup();
          wasMessagesRef.current = true;
          everMessagesRef.current = true;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          wasMessagesRef.current = false;
        }
      });

    return () => {
      supabase.removeChannel(mentionsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [user, serverId, queryClient]);

  // Realtime — listen to my own channel_read_states changes (cross-device sync)
  useEffect(() => {
    if (!user || !serverId) return;

    const wasReadsRef = { current: false };
    const everReadsRef = { current: false };

    const readChannel = supabase
      .channel(`channel-read-states-${serverId}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channel_read_states',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const channelId = ((payload.new || payload.old) as { channel_id?: string })?.channel_id;
          if (channelId) {
            queryClient.setQueryData<Record<string, ChannelUnreadInfo>>(
              ['channel-unread-counts', serverId, user.id],
              (old = {}) => {
                const { [channelId]: _, ...rest } = old;
                return rest;
              }
            );
          }
          // Optimistic patch above is authoritative for the local mutation;
          // cross-device updates rely on this realtime stream itself.
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (everReadsRef.current && !wasReadsRef.current) {
            // Reconnect after drop — pull fresh server state to rebuild badges.
            queryClient.invalidateQueries({ queryKey: ['channel-unread-counts', serverId, user.id] });
            queryClient.invalidateQueries({ queryKey: ['server-unread-counts'] });
          }
          wasReadsRef.current = true;
          everReadsRef.current = true;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          wasReadsRef.current = false;
        }
      });
    return () => {
      supabase.removeChannel(readChannel);
    };
  }, [user, serverId, queryClient]);

  const query = useQuery({
    queryKey: ['channel-unread-counts', serverId, user?.id],
    queryFn: async (): Promise<Record<string, ChannelUnreadInfo>> => {
      if (!user || !serverId) return {};

      // 1. Get channels for this server
      const { data: channels } = await supabase
        .from('channels')
        .select('id')
        .eq('server_id', serverId);

      if (!channels || channels.length === 0) return {};

      const channelIds = channels.map(c => c.id);

      // 2. Per-channel read states (source of truth)
      const { data: channelReads } = await supabase
        .from('channel_read_states')
        .select('channel_id, last_read_at')
        .eq('user_id', user.id)
        .in('channel_id', channelIds);

      const readMap: Record<string, string> = {};
      channelReads?.forEach(r => {
        readMap[r.channel_id] = r.last_read_at || new Date(0).toISOString();
      });

      // 3. Get mention counts in a SINGLE query
      const { data: mentions } = await supabase
        .from('channel_mentions')
        .select('channel_id')
        .eq('user_id', user.id)
        .in('channel_id', channelIds);

      const mentionCountsMap: Record<string, number> = {};
      mentions?.forEach(m => {
        mentionCountsMap[m.channel_id] = (mentionCountsMap[m.channel_id] || 0) + 1;
      });

      // 4. BATCHED: pull recent messages across all channels in one query,
      //    bucket per-channel against each channel's own last_read_at.
      const oldestRead = channelIds.reduce((oldest, cid) => {
        const ts = readMap[cid] || new Date(0).toISOString();
        return ts < oldest ? ts : oldest;
      }, new Date().toISOString());

      const { data: unreadMessages } = await supabase
        .from('messages')
        .select('channel_id, created_at')
        .in('channel_id', channelIds)
        .gt('created_at', oldestRead)
        .neq('author_id', user.id)
        .limit(2000);

      const hasUnreadMap: Record<string, boolean> = {};
      unreadMessages?.forEach(m => {
        const cutoff = readMap[m.channel_id] || new Date(0).toISOString();
        if ((m.created_at || '') > cutoff) {
          hasUnreadMap[m.channel_id] = true;
        }
      });

      const result: Record<string, ChannelUnreadInfo> = {};
      for (const channelId of channelIds) {
        const hasUnread = !!hasUnreadMap[channelId];
        const mentionCount = mentionCountsMap[channelId] || 0;
        if (hasUnread || mentionCount > 0) {
          result[channelId] = { hasUnread, mentionCount };
        }
      }

      return result;
    },
    enabled: !!user && !!serverId,
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

  return {
    channelUnreadInfo: query.data || {},
    isLoading: query.isLoading,
  };
}

// Hook to clear mentions when entering a channel
export function useClearChannelMentions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const clearMentions = async (channelId: string, serverId: string) => {
    if (!user) return;

    await supabase
      .from('channel_mentions')
      .delete()
      .eq('channel_id', channelId)
      .eq('user_id', user.id);

    queryClient.invalidateQueries({ queryKey: ['channel-unread-counts', serverId, user.id] });
    queryClient.invalidateQueries({ queryKey: ['server-unread-mentions'] });
  };

  return { clearMentions };
}
