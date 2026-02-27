import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useRef } from 'react';
import { soundEffects } from '@/utils/audio/SoundEffects';

export interface ServerUnreadInfo {
  hasUnread: boolean;
  mentionCount: number;
}

export function useServerUnreadCounts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Subscribe to realtime message inserts — separate channels per table
  useEffect(() => {
    if (!user) return;

    const messagesChannel = supabase
      .channel('server-unread-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.new && (payload.new as { author_id: string }).author_id !== user.id) {
            soundEffects.playMessageNotification();
          }
          // Debounce to coalesce rapid messages
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['server-unread-counts'] });
          }, 500);
        }
      )
      .subscribe();

    const mentionsChannel = supabase
      .channel('server-unread-mentions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channel_mentions' },
        () => {
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['server-unread-counts'] });
          }, 500);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(mentionsChannel);
    };
  }, [user, queryClient]);

  const query = useQuery({
    queryKey: ['server-unread-counts', user?.id],
    queryFn: async (): Promise<Record<string, ServerUnreadInfo>> => {
      if (!user) return {};

      // Get user's servers
      const { data: memberships } = await supabase
        .from('server_members')
        .select('server_id')
        .eq('user_id', user.id);

      const serverIds = memberships?.map(m => m.server_id) || [];
      if (serverIds.length === 0) return {};

      // Get read states for each server
      const { data: readStates } = await supabase
        .from('server_read_states')
        .select('server_id, last_read_at')
        .eq('user_id', user.id)
        .in('server_id', serverIds);

      const readStateMap: Record<string, string> = {};
      readStates?.forEach(rs => {
        readStateMap[rs.server_id] = rs.last_read_at || new Date(0).toISOString();
      });

      // Get channels per server
      const { data: allChannels } = await supabase
        .from('channels')
        .select('id, server_id')
        .in('server_id', serverIds);

      const serverChannelsMap: Record<string, string[]> = {};
      allChannels?.forEach(c => {
        if (!serverChannelsMap[c.server_id]) {
          serverChannelsMap[c.server_id] = [];
        }
        serverChannelsMap[c.server_id].push(c.id);
      });

      // Get all mentions for user
      const allChannelIds = allChannels?.map(c => c.id) || [];
      const { data: mentions } = await supabase
        .from('channel_mentions')
        .select('channel_id')
        .eq('user_id', user.id)
        .in('channel_id', allChannelIds);

      // Map channel_id to server_id for mentions
      const channelToServer: Record<string, string> = {};
      allChannels?.forEach(c => {
        channelToServer[c.id] = c.server_id;
      });

      const serverMentionCounts: Record<string, number> = {};
      mentions?.forEach(m => {
        const serverId = channelToServer[m.channel_id];
        if (serverId) {
          serverMentionCounts[serverId] = (serverMentionCounts[serverId] || 0) + 1;
        }
      });

      // Count unread messages per server
      const result: Record<string, ServerUnreadInfo> = {};

      await Promise.all(
        serverIds.map(async (serverId) => {
          const lastReadAt = readStateMap[serverId] || new Date(0).toISOString();
          const channelIds = serverChannelsMap[serverId] || [];
          
          if (channelIds.length === 0) return;

          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .in('channel_id', channelIds)
            .gt('created_at', lastReadAt)
            .neq('author_id', user.id);

          const hasUnread = (count || 0) > 0;
          const mentionCount = serverMentionCounts[serverId] || 0;

          if (hasUnread || mentionCount > 0) {
            result[serverId] = { hasUnread, mentionCount };
          }
        })
      );

      return result;
    },
    enabled: !!user,
    refetchInterval: 60000, // Reduced from 30s to 60s — Realtime handles updates
  });

  const markAsRead = useMutation({
    mutationFn: async (serverId: string) => {
      if (!user) throw new Error('Not authenticated');
      await supabase
        .from('server_read_states')
        .upsert({
          user_id: user.id,
          server_id: serverId,
          last_read_at: new Date().toISOString(),
        }, { onConflict: 'user_id,server_id' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server-unread-counts'] });
    },
  });

  return {
    unreadInfo: query.data || {},
    isLoading: query.isLoading,
    markServerAsRead: markAsRead.mutate,
  };
}
