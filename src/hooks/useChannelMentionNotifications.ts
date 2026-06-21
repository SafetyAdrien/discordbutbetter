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

type MentionRow = { id: string; channel_id: string; message_id: string; created_at: string };
type MessageRow = { id: string; content: string | null; created_at: string | null; author_id: string | null };
type ChannelRow = { id: string; name: string | null; server_id: string | null };
type ProfileRow = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };
type ServerRow = { id: string; name: string | null; icon_url: string | null };

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
          : Promise.resolve({ data: [] as MessageRow[] }),
        channelIds.length
          ? supabase
              .from('channels')
              .select('id, name, server_id')
              .in('id', channelIds)
          : Promise.resolve({ data: [] as ChannelRow[] }),
      ]);

      const typedMessages = (messages || []) as MessageRow[];
      const typedChannels = (channels || []) as ChannelRow[];
      const messageMap = new Map(typedMessages.map((m) => [m.id, m]));
      const channelMap = new Map(typedChannels.map((c) => [c.id, c]));
      const authorIds = [...new Set(typedMessages.map((m) => m.author_id).filter((id): id is string => !!id))];
      const serverIds = [...new Set(typedChannels.map((c) => c.server_id).filter((id): id is string => !!id))];

      const [{ data: authors }, { data: servers }] = await Promise.all([
        authorIds.length
          ? supabase
              .from('profiles')
              .select('id, display_name, username, avatar_url')
              .in('id', authorIds)
          : Promise.resolve({ data: [] as ProfileRow[] }),
        serverIds.length
          ? supabase
              .from('servers')
              .select('id, name, icon_url')
              .in('id', serverIds)
          : Promise.resolve({ data: [] as ServerRow[] }),
      ]);

      const authorMap = new Map(((authors || []) as ProfileRow[]).map((a) => [a.id, a]));
      const serverMap = new Map(((servers || []) as ServerRow[]).map((s) => [s.id, s]));

      return ((mentions || []) as MentionRow[])
        .map((mention) => {
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