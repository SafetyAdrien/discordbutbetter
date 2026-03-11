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

  // Separate Realtime channels per table to avoid binding mismatches
  useEffect(() => {
    if (!user || !serverId) return;

    const mentionsChannel = supabase
      .channel(`channel-mentions-${serverId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channel_mentions' },
        () => {
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['channel-unread-counts', serverId, user.id] });
          }, 500);
        }
      )
      .subscribe();

    // Cache channel IDs for client-side filtering
    let serverChannelIds: Set<string> | null = null;
    supabase
      .from('channels')
      .select('id')
      .eq('server_id', serverId)
      .then(({ data }) => {
        serverChannelIds = new Set(data?.map(c => c.id) || []);
      });

    const messagesChannel = supabase
      .channel(`channel-messages-${serverId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          // Client-side filter: only invalidate if the message belongs to this server
          const channelId = (payload.new as any)?.channel_id;
          if (serverChannelIds && channelId && !serverChannelIds.has(channelId)) return;
          
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['channel-unread-counts', serverId, user.id] });
          }, 500);
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
    placeholderData: () => cacheGetSync(`channel-unread:${serverId}:${user?.id}`),
    queryFn: async (): Promise<Record<string, ChannelUnreadInfo>> => {
      if (!user || !serverId) return {};

      // Get channels for this server
      const { data: channels } = await supabase
        .from('channels')
        .select('id')
        .eq('server_id', serverId);

      if (!channels || channels.length === 0) return {};

      const channelIds = channels.map(c => c.id);

      // Get read state for this server
      const { data: readState } = await supabase
        .from('server_read_states')
        .select('last_read_at')
        .eq('server_id', serverId)
        .eq('user_id', user.id)
        .maybeSingle();

      const lastReadAt = readState?.last_read_at || new Date(0).toISOString();

      // Get mention counts per channel
      const { data: mentions } = await supabase
        .from('channel_mentions')
        .select('channel_id')
        .eq('user_id', user.id)
        .in('channel_id', channelIds);

      const mentionCountsMap: Record<string, number> = {};
      mentions?.forEach(m => {
        mentionCountsMap[m.channel_id] = (mentionCountsMap[m.channel_id] || 0) + 1;
      });

      // Check for unread messages per channel
      const result: Record<string, ChannelUnreadInfo> = {};

      await Promise.all(
        channelIds.map(async (channelId) => {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', channelId)
            .gt('created_at', lastReadAt)
            .neq('author_id', user.id);

          const hasUnread = (count || 0) > 0;
          const mentionCount = mentionCountsMap[channelId] || 0;

          if (hasUnread || mentionCount > 0) {
            result[channelId] = { hasUnread, mentionCount };
          }
        })
      );

      return result;
    },
    enabled: !!user && !!serverId,
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (query.data && serverId && user?.id && !query.isPlaceholderData) {
      cacheSetAsync(`channel-unread:${serverId}:${user.id}`, query.data);
    }
  }, [query.data, serverId, user?.id, query.isPlaceholderData]);

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
