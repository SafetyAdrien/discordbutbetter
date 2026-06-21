import { useMemo } from 'react';
import { useNotifications, type ServerNotification } from './useNotifications';
import { useDMNotifications, type DMNotificationItem } from './useDMNotifications';
import { useChannelMentionNotifications, type ChannelMentionNotificationItem } from './useChannelMentionNotifications';

export type NotifKind = 'mention' | 'reply' | 'system' | 'dm';

export interface UnifiedNotification {
  id: string;
  kind: NotifKind;
  createdAt: string;
  title: string;
  message: string;
  avatarUrl: string | null;
  fallback: string;
  isUnread: boolean;
  highlight: boolean; // favorite / mention / deletion request
  source: 'server_notification' | 'channel_mention' | 'dm';
  serverId: string | null;
  serverName: string | null;
  serverIconUrl: string | null;
  channelId: string | null;
  channelName: string | null;
  mentionId: string | null;
  conversationId: string | null;
  userId: string | null;
  unreadCount: number;
  mentionCount: number;
  raw: ServerNotification | DMNotificationItem | ChannelMentionNotificationItem;
}

function categorizeServer(n: ServerNotification): NotifKind {
  if (n.type === 'mention') return 'mention';
  if (n.type === 'reply' || n.type === 'thread_reply') return 'reply';
  return 'system';
}

export function useUnifiedNotifications() {
  const { data: serverNotifs = [], isLoading } = useNotifications();
  const dmNotifs = useDMNotifications();
  const { data: channelMentions = [], isLoading: isLoadingMentions } = useChannelMentionNotifications();

  const items = useMemo<UnifiedNotification[]>(() => {
    const fromServer: UnifiedNotification[] = serverNotifs.map((n) => {
      const kind = categorizeServer(n);
      return {
        id: `srv:${n.id}`,
        kind,
        createdAt: n.created_at,
        title: n.title,
        message: n.message,
        avatarUrl: n.sender?.avatar_url ?? null,
        fallback: (n.sender?.display_name ?? n.title ?? 'N').charAt(0).toUpperCase(),
        isUnread: n.status === 'pending',
        highlight: kind === 'mention' || n.type === 'server_deletion_request',
        source: 'server_notification',
        serverId: n.server_id ?? null,
        serverName: n.server?.name ?? null,
        serverIconUrl: n.server?.icon_url ?? null,
        channelId: null,
        channelName: null,
        mentionId: null,
        conversationId: null,
        userId: n.sender_id ?? null,
        unreadCount: 0,
        mentionCount: kind === 'mention' && n.status === 'pending' ? 1 : 0,
        raw: n,
      };
    });

    const fromChannelMentions: UnifiedNotification[] = channelMentions.map((m) => ({
      id: m.id,
      kind: 'mention',
      createdAt: m.createdAt,
      title: m.authorName,
      message: m.channelName ? `#${m.channelName} · ${m.content}` : m.content,
      avatarUrl: m.authorAvatarUrl,
      fallback: m.authorName.charAt(0).toUpperCase(),
      isUnread: true,
      highlight: true,
      source: 'channel_mention',
      serverId: m.serverId,
      serverName: m.serverName,
      serverIconUrl: m.serverIconUrl,
      channelId: m.channelId,
      channelName: m.channelName,
      mentionId: m.mentionId,
      conversationId: null,
      userId: m.authorId,
      unreadCount: 0,
      mentionCount: 1,
      raw: m,
    }));

    const fromDM: UnifiedNotification[] = dmNotifs.map((d) => ({
      id: d.id,
      kind: 'dm',
      createdAt: d.createdAt,
      title: d.displayName,
      message: d.preview,
      avatarUrl: d.avatarUrl,
      fallback: d.displayName.charAt(0).toUpperCase(),
      isUnread: d.unreadCount > 0,
      highlight: d.mentionCount > 0 || d.isFavorite,
      source: 'dm',
      serverId: null,
      serverName: null,
      serverIconUrl: null,
      channelId: null,
      channelName: null,
      mentionId: null,
      conversationId: d.conversationId,
      userId: d.userId,
      unreadCount: d.unreadCount,
      mentionCount: d.mentionCount,
      raw: d,
    }));

    return [...fromChannelMentions, ...fromServer, ...fromDM].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
    );
  }, [serverNotifs, channelMentions, dmNotifs]);

  return { items, isLoading: isLoading || isLoadingMentions };
}
