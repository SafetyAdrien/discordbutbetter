import { useMemo } from 'react';
import { useNotifications, type ServerNotification } from './useNotifications';
import { useDMNotifications, type DMNotificationItem } from './useDMNotifications';

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
  serverId: string | null;
  serverName: string | null;
  serverIconUrl: string | null;
  conversationId: string | null;
  userId: string | null;
  unreadCount: number;
  raw: ServerNotification | DMNotificationItem;
}

function categorizeServer(n: ServerNotification): NotifKind {
  if (n.type === 'mention') return 'mention';
  if (n.type === 'reply' || n.type === 'thread_reply') return 'reply';
  return 'system';
}

export function useUnifiedNotifications() {
  const { data: serverNotifs = [], isLoading } = useNotifications();
  const dmNotifs = useDMNotifications();

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
        serverId: n.server_id ?? null,
        serverName: n.server?.name ?? null,
        serverIconUrl: n.server?.icon_url ?? null,
        conversationId: null,
        unreadCount: 0,
        raw: n,
      };
    });

    const fromDM: UnifiedNotification[] = dmNotifs.map((d) => ({
      id: d.id,
      kind: 'dm',
      createdAt: d.createdAt,
      title: d.displayName,
      message: d.preview,
      avatarUrl: d.avatarUrl,
      fallback: d.displayName.charAt(0).toUpperCase(),
      isUnread: d.unreadCount > 0,
      highlight: d.isFavorite,
      serverId: null,
      serverName: null,
      serverIconUrl: null,
      conversationId: d.conversationId,
      unreadCount: d.unreadCount,
      raw: d,
    }));

    return [...fromServer, ...fromDM].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
    );
  }, [serverNotifs, dmNotifs]);

  return { items, isLoading };
}
