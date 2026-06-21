import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useRef } from 'react';
import { soundEffects } from '@/utils/audio/SoundEffects';
import { isDirectMentionForUser } from '@/lib/mentions';

export interface ServerUnreadInfo {
  hasUnread: boolean;
  mentionCount: number;
}

export function useServerUnreadCounts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const optimisticMentionMessageIdsRef = useRef<Set<string>>(new Set());

  const cachedKey = user?.id ? `server-unread:${user.id}` : null;
  const cachedData = cachedKey ? cacheGetSync<Record<string, ServerUnreadInfo>>(cachedKey) : undefined;

  // Realtime — debounced
  useEffect(() => {
    if (!user) return;

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
      .channel('server-unread-messages')
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
              if (isMention && newMsg.id) optimisticMentionMessageIdsRef.current.add(newMsg.id);
              patchServer(serverId, {
                hasUnread: true,
                mentionCount: (current?.mentionCount || 0) + (isMention ? 1 : 0),
              });
            }
          }
          queryClient.invalidateQueries({ queryKey: ['server-unread-counts'] });
        }
      )
      .subscribe();

    const mentionsChannel = supabase
      .channel('server-unread-mentions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'channel_mentions', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const mention = payload.new as { channel_id?: string; message_id?: string };
          if (!mention.channel_id) return;
          const serverId = userChannelToServer?.get(mention.channel_id);
          if (userChannelToServer && !serverId) return;
          if (serverId) {
            if (mention.message_id && optimisticMentionMessageIdsRef.current.delete(mention.message_id)) return;
            const current = queryClient.getQueryData<Record<string, ServerUnreadInfo>>(['server-unread-counts', user.id])?.[serverId];
            patchServer(serverId, { mentionCount: (current?.mentionCount || 0) + 1 });
          }
          queryClient.invalidateQueries({ queryKey: ['server-unread-counts'] });
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
          queryClient.invalidateQueries({ queryKey: ['server-unread-counts'] });
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
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['server-unread-counts'] });
          }, 200);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(mentionsChannel);
      supabase.removeChannel(readChannel);
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

      // Per-channel read states (source of truth)
      const { data: channelReads } = allChannelIds.length > 0
        ? await supabase
            .from('channel_read_states')
            .select('channel_id, last_read_at')
            .eq('user_id', user.id)
            .in('channel_id', allChannelIds)
        : { data: [] as { channel_id: string; last_read_at: string }[] };

      const channelReadMap: Record<string, string> = {};
      channelReads?.forEach(r => {
        channelReadMap[r.channel_id] = r.last_read_at || new Date(0).toISOString();
      });

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

      // BATCHED: one query for all recent messages across user's channels,
      // bucket per channel against each channel's own last_read_at.
      const oldestRead = allChannelIds.reduce((oldest, cid) => {
        const ts = channelReadMap[cid] || new Date(0).toISOString();
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
        const cutoff = channelReadMap[msg.channel_id] || new Date(0).toISOString();
        if ((msg.created_at || '') > cutoff) {
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
