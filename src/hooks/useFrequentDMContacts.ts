import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToggleFavoriteFriend, useFavoriteFriendIds } from './useFavoriteFriends';

export interface FrequentContact {
  userId: string;
  conversationId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  status: 'online' | 'idle' | 'dnd' | 'offline' | null;
  customStatus?: string | null;
  countDay: number;
  countWeek: number;
  countMonth: number;
  lastMessageAt: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;

/**
 * Returns 1-on-1 DM contacts ranked by message frequency over day/week/month windows.
 * Auto-favorites the top contacts (week window) using the friend_favorites table.
 */
export function useFrequentDMContacts() {
  const { user } = useAuth();
  const toggleFavorite = useToggleFavoriteFriend();
  const { data: favoriteIds = [] } = useFavoriteFriendIds();

  const query = useQuery({
    queryKey: ['frequent-dm-contacts', user?.id],
    queryFn: async (): Promise<FrequentContact[]> => {
      if (!user) return [];
      const sinceMonth = new Date(Date.now() - MONTH_MS).toISOString();

      // Get all 1-on-1 conversations the user participates in
      const { data: parts, error: partErr } = await supabase
        .from('dm_participants')
        .select('conversation_id')
        .eq('user_id', user.id);
      if (partErr) throw partErr;
      const convIds = (parts || []).map((p) => p.conversation_id);
      if (convIds.length === 0) return [];

      const { data: convs, error: convErr } = await supabase
        .from('dm_conversations')
        .select('id, is_group')
        .in('id', convIds)
        .eq('is_group', false);
      if (convErr) throw convErr;
      const oneOnOneIds = (convs || []).map((c) => c.id);
      if (oneOnOneIds.length === 0) return [];

      // Get messages from last 30 days for those conversations
      const { data: msgs, error: msgErr } = await supabase
        .from('dm_messages')
        .select('conversation_id, created_at, author_id')
        .in('conversation_id', oneOnOneIds)
        .gte('created_at', sinceMonth);
      if (msgErr) throw msgErr;

      // Get other participant for each 1-on-1
      const { data: otherParts, error: otherErr } = await supabase
        .from('dm_participants')
        .select('conversation_id, user_id, profile:profiles!dm_participants_user_id_fkey(id, username, display_name, avatar_url, status, custom_status)')
        .in('conversation_id', oneOnOneIds)
        .neq('user_id', user.id);
      if (otherErr) throw otherErr;

      const now = Date.now();
      const dayCutoff = now - DAY_MS;
      const weekCutoff = now - WEEK_MS;

      const stats = new Map<string, { day: number; week: number; month: number; last: number }>();
      (msgs || []).forEach((m: any) => {
        const t = new Date(m.created_at).getTime();
        const cur = stats.get(m.conversation_id) || { day: 0, week: 0, month: 0, last: 0 };
        cur.month += 1;
        if (t >= weekCutoff) cur.week += 1;
        if (t >= dayCutoff) cur.day += 1;
        if (t > cur.last) cur.last = t;
        stats.set(m.conversation_id, cur);
      });

      const contacts: FrequentContact[] = [];
      (otherParts || []).forEach((row: any) => {
        const p = row.profile;
        if (!p) return;
        const s = stats.get(row.conversation_id);
        if (!s || s.month === 0) return;
        contacts.push({
          userId: p.id,
          conversationId: row.conversation_id,
          displayName: p.display_name,
          username: p.username,
          avatarUrl: p.avatar_url,
          status: p.status,
          customStatus: p.custom_status,
          countDay: s.day,
          countWeek: s.week,
          countMonth: s.month,
          lastMessageAt: s.last ? new Date(s.last).toISOString() : null,
        });
      });

      // Sort by recent activity weight: day > week > month
      contacts.sort((a, b) => {
        if (b.countWeek !== a.countWeek) return b.countWeek - a.countWeek;
        if (b.countMonth !== a.countMonth) return b.countMonth - a.countMonth;
        return (b.lastMessageAt || '').localeCompare(a.lastMessageAt || '');
      });

      return contacts;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // Auto-favorite top 5 contacts (by week count) — runs once per query refresh
  useEffect(() => {
    if (!user || !query.data) return;
    const top = query.data.filter((c) => c.countWeek >= 3).slice(0, 5);
    top.forEach((c) => {
      if (!favoriteIds.includes(c.userId)) {
        toggleFavorite.mutate({ friendUserId: c.userId, isFavorite: false });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, user]);

  return query;
}
