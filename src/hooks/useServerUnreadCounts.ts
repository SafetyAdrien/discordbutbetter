import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';
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

  const cachedKey = user?.id ? `server-unread:${user.id}` : null;
  const cachedData = cachedKey ? cacheGetSync<Record<string, ServerUnreadInfo>>(cachedKey) : undefined;

  // Realtime — debounced
  useEffect(() => {
    if (!user) return;

    let userChannelIds: Set<string> | null = null;
    supabase
      .from('server_members')
      .select('server_id')
      .eq('user_id', user.id)
      .then(async ({ data: memberships }) => {
        if (!memberships?.length) return;
        const { data: channels } = await supabase
          .from('channels')
          .select('id')
          .in('server_id', memberships.map(m => m.server_id));
        userChannelIds = new Set(channels?.map(c => c.id) || []);
      });

    const messagesChannel = supabase
      .channel('server-unread-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as { author_id: string; channel_id: string };
          if (userChannelIds && !userChannelIds.has(newMsg.channel_id)) return;

          if (newMsg.author_id !== user.id) {
            soundEffects.playMessageNotification();
          }
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['server-unread-counts'] });
          }, 800);
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
          }, 800);
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

      const { data: memberships } = await supabase
        .from('server_members')
        .select('server_id')
        .eq('user_id', user.id);

      const serverIds = memberships?.map(m => m.server_id) || [];
      if (serverIds.length === 0) return {};

      // Read states (single query)
      const { data: readStates } = await supabase
        .from('server_read_states')
        .select('server_id, last_read_at')
        .eq('user_id', user.id)
        .in('server_id', serverIds);

      const readStateMap: Record<string, string> = {};
      readStates?.forEach(rs => {
        readStateMap[rs.server_id] = rs.last_read_at || new Date(0).toISOString();
      });

      // Channels per server (single query)
      const { data: allChannels } = await supabase
        .from('channels')
        .select('id, server_id')
        .in('server_id', serverIds);

      const channelToServer: Record<string, string> = {};
      allChannels?.forEach(c => {
        channelToServer[c.id] = c.server_id;
      });

      // Mentions (single query)
      const allChannelIds = allChannels?.map(c => c.id) || [];
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

      // BATCHED: one query for all unread messages across all user's channels
      // Use the OLDEST last_read_at as filter, then bucket per server using channel_id mapping
      const oldestRead = serverIds.reduce((oldest, sid) => {
        const ts = readStateMap[sid] || new Date(0).toISOString();
        return ts < oldest ? ts : oldest;
      }, new Date().toISOString());

      const { data: unreadMessages } = allChannelIds.length > 0
        ? await supabase
            .from('messages')
            .select('channel_id, created_at')
            .in('channel_id', allChannelIds)
            .gt('created_at', oldestRead)
            .neq('author_id', user.id)
            .limit(5000)
        : { data: [] as { channel_id: string; created_at: string }[] };

      const serverHasUnread: Record<string, boolean> = {};
      unreadMessages?.forEach(msg => {
        const serverId = channelToServer[msg.channel_id];
        if (!serverId) return;
        const lastRead = readStateMap[serverId] || new Date(0).toISOString();
        if ((msg.created_at || '') > lastRead) {
          serverHasUnread[serverId] = true;
        }
      });

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
