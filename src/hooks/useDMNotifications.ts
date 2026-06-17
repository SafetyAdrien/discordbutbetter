import { useMemo } from 'react';
import { useDMConversations } from './useDMs';
import { useUnreadCounts } from './useUnreadCounts';
import { useFavoriteFriendIds } from './useFavoriteFriends';
import { useFrequentDMContacts } from './useFrequentDMContacts';

export interface DMNotificationItem {
  id: string;
  conversationId: string;
  userId: string | null;
  displayName: string;
  avatarUrl: string | null;
  preview: string;
  createdAt: string;
  unreadCount: number;
  isFavorite: boolean;
  isFrequent: boolean;
  score: number;
}

/**
 * Aggregates DM activity into a notification-shaped list:
 * - Only DMs with unread messages OR from favorites with recent activity
 * - Boost score for favorites and most-discussed conversations
 */
export function useDMNotifications() {
  const { data: conversations = [] } = useDMConversations();
  const { unreadCounts } = useUnreadCounts();
  const { data: favoriteIds = [] } = useFavoriteFriendIds();
  const { data: frequent = [] } = useFrequentDMContacts();

  return useMemo<DMNotificationItem[]>(() => {
    const frequentMap = new Map(frequent.map((f) => [f.userId, f]));
    const favSet = new Set(favoriteIds);

    const items: DMNotificationItem[] = [];

    for (const conv of conversations) {
      if (conv.is_group) continue;
      const other = conv.participants[0];
      if (!other) continue;

      const unread = unreadCounts[conv.id] ?? 0;
      const isFav = favSet.has(other.id);
      const freq = frequentMap.get(other.id);
      const isFrequent = !!freq && freq.countWeek >= 5;

      // Skip if nothing notable
      if (unread === 0 && !isFav && !isFrequent) continue;

      const created = conv.lastMessage?.created_at ?? conv.created_at ?? new Date().toISOString();
      const preview = conv.lastMessage?.content?.trim() || 'Nouvelle conversation';

      // Scoring: unread weight + boosts
      let score = unread * 10;
      if (isFav) score += 25;
      if (isFrequent) score += 10;
      if (freq) score += Math.min(freq.countDay * 2, 20);

      items.push({
        id: `dm:${conv.id}`,
        conversationId: conv.id,
        userId: other.id,
        displayName: other.display_name || other.username || 'Utilisateur',
        avatarUrl: other.avatar_url,
        preview,
        createdAt: created,
        unreadCount: unread,
        isFavorite: isFav,
        isFrequent,
        score,
      });
    }

    return items.sort((a, b) => {
      // Unread first, then by score, then by date
      if ((a.unreadCount > 0) !== (b.unreadCount > 0)) {
        return a.unreadCount > 0 ? -1 : 1;
      }
      if (b.score !== a.score) return b.score - a.score;
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    });
  }, [conversations, unreadCounts, favoriteIds, frequent]);
}
