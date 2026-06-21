import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ChannelMentionNotificationItem {
  id: string;
  mentionId: string;
  channelId: string;
  serverId: string | null;
  channelName: string | null;
  serverName: string | null;
  serverIconUrl: string | null;
  authorId: string | null;
  authorName: string;
  authorAvatarUrl: string | null;
  content: string;
  createdAt: string;
}

export function useChannelMentionNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['channel-mention-notifications', user?.id],
    enabled: !!user,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<ChannelMentionNotificationItem[]> => {
      if (!user) return [];

      const { data: mentions, error: mentionError } = await supabase
        .from('channel_mentions')
        .select('id, channel_id, message_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (mentionError) throw mentionError;
      if (!mentions?.length) return [];

      const messageIds = [...new Set(mentions.map((m) => m.message_id).filter(Boolean))];
      const channelIds = [...new Set(mentions.map((m) => m.channel_id).filter(Boolean))];

      const [{ data: messages }, { data: channels }] = await Promise.all([
        messageIds.length
          ? supabase
              .from('messages')
              .select('id, content, created_at, author_id')
              .in('id', messageIds)
          : Promise.resolve({ data: [] as any[] }),
        channelIds.length
          ? supabase
              .from('channels')
              .select('id, name, server_id')
              .in('id', channelIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const messageMap = new Map((messages || []).map((m: any) => [m.id, m]));
      const channelMap = new Map((channels || []).map((c: any) => [c.id, c]));
      const authorIds = [...new Set((messages || []).map((m: any) => m.author_id).filter(Boolean))];
      const serverIds = [...new Set((channels || []).map((c: any) => c.server_id).filter(Boolean))];

      const [{ data: authors }, { data: servers }] = await Promise.all([
        authorIds.length
          ? supabase
              .from('profiles')
              .select('id, display_name, username, avatar_url')
              .in('id', authorIds)
          : Promise.resolve({ data: [] as any[] }),
        serverIds.length
          ? supabase
              .from('servers')
              .select('id, name, icon_url')
              .in('id', serverIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const authorMap = new Map((authors || []).map((a: any) => [a.id, a]));
      const serverMap = new Map((servers || []).map((s: any) => [s.id, s]));

      return mentions
        .map((mention: any) => {
          const message = messageMap.get(mention.message_id);
          const channel = channelMap.get(mention.channel_id);
          const server = channel?.server_id ? serverMap.get(channel.server_id) : null;
          const author = message?.author_id ? authorMap.get(message.author_id) : null;

          return {
            id: `mention:${mention.id}`,
            mentionId: mention.id,
            channelId: mention.channel_id,
            serverId: channel?.server_id ?? null,
            channelName: channel?.name ?? null,
            serverName: server?.name ?? null,
            serverIconUrl: server?.icon_url ?? null,
            authorId: message?.author_id ?? null,
            authorName: author?.display_name || author?.username || 'Utilisateur',
            authorAvatarUrl: author?.avatar_url ?? null,
            content: message?.content || 'Vous avez été mentionné·e',
            createdAt: message?.created_at || mention.created_at,
          } satisfies ChannelMentionNotificationItem;
        })
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`channel-mention-notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channel_mentions', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['channel-mention-notifications', user.id] });
          queryClient.invalidateQueries({ queryKey: ['server-unread-counts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
}