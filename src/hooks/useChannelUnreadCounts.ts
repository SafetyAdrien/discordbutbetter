import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useRef } from 'react';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';

export interface ChannelUnreadInfo {
  hasUnread: boolean;
  mentionCount: number;
}

export function useChannelUnreadCounts(serverId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const cachedKey = serverId && user?.id ? `channel-unread:${serverId}:${user.id}` : null;
  const cachedData = cachedKey ? cacheGetSync<Record<string, ChannelUnreadInfo>>(cachedKey) : undefined;

  // Realtime — single debounced invalidation
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

    const mentionsChannel = supabase
      .channel(`channel-mentions-${serverId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channel_mentions' },
        () => {
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['channel-unread-counts', serverId, user.id] });
          }, 800);
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel(`channel-messages-${serverId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const channelId = (payload.new as any)?.channel_id;
          if (serverChannelIds && channelId && !serverChannelIds.has(channelId)) return;

          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['channel-unread-counts', serverId, user.id] });
          }, 800);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(mentionsChannel);
      supabase.removeChannel(messagesChannel);
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

      // 2. Get read state for this server (single row)
      const { data: readState } = await supabase
        .from('server_read_states')
        .select('last_read_at')
        .eq('server_id', serverId)
        .eq('user_id', user.id)
        .maybeSingle();

      const lastReadAt = readState?.last_read_at || new Date(0).toISOString();

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

      // 4. BATCHED: get all unread message channel_ids in ONE query (no N+1)
      const { data: unreadMessages } = await supabase
        .from('messages')
        .select('channel_id')
        .in('channel_id', channelIds)
        .gt('created_at', lastReadAt)
        .neq('author_id', user.id)
        .limit(2000);

      const hasUnreadMap: Record<string, boolean> = {};
      unreadMessages?.forEach(m => {
        hasUnreadMap[m.channel_id] = true;
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
