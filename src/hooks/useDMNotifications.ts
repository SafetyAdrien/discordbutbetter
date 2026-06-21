import { useMemo } from 'react';
import { useDMConversations } from './useDMs';
import { useUnreadCounts } from './useUnreadCounts';
import { useDMMentionCounts } from './useDMMentionCounts';
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
  mentionCount: number;
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
  const { mentionCounts } = useDMMentionCounts();
  const { data: favoriteIds = [] } = useFavoriteFriendIds();
  const { data: frequent = [] } = useFrequentDMContacts();

  return useMemo<DMNotificationItem[]>(() => {
    const frequentMap = new Map(frequent.map((f) => [f.userId, f]));
    const favSet = new Set(favoriteIds);

    const items: DMNotificationItem[] = [];

    for (const conv of conversations) {
      const other = conv.participants[0];
      if (!conv.is_group && !other) continue;

      const unread = unreadCounts[conv.id] ?? 0;
      const mentions = mentionCounts[conv.id] ?? 0;
      const isFav = !conv.is_group && !!other && favSet.has(other.id);
      const freq = !conv.is_group && other ? frequentMap.get(other.id) : undefined;
      const isFrequent = !!freq && freq.countWeek >= 5;

      // Skip if nothing notable
      if (unread === 0 && mentions === 0 && !isFav && !isFrequent) continue;

      const created = conv.lastMessage?.created_at ?? conv.created_at ?? new Date().toISOString();
      const preview = conv.lastMessage?.content?.trim() || 'Nouvelle conversation';

      // Scoring: unread weight + boosts
      let score = mentions * 20 + unread * 10;
      if (isFav) score += 25;
      if (isFrequent) score += 10;
      if (freq) score += Math.min(freq.countDay * 2, 20);

      items.push({
        id: `dm:${conv.id}`,
        conversationId: conv.id,
        userId: conv.is_group ? null : other?.id ?? null,
        displayName: conv.is_group ? conv.name || 'Groupe' : other?.display_name || other?.username || 'Utilisateur',
        avatarUrl: conv.is_group ? conv.icon_url : other?.avatar_url ?? null,
        preview,
        createdAt: created,
        unreadCount: unread,
        mentionCount: mentions,
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
  }, [conversations, unreadCounts, mentionCounts, favoriteIds, frequent]);
}
