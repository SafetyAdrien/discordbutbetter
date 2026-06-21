import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDMConversations } from './useDMs';
import { uuidToSnowflake } from '@/lib/snowflake';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';

/**
 * Per-conversation mention counts (Discord-style red bubble logic):
 * - 1-on-1 DM: every unread received message counts as a mention.
 * - Group DM: only explicit <@me> mentions (UUID or 18-digit Snowflake) count.
 */
export function useDMMentionCounts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: conversations = [] } = useDMConversations();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const cacheKey = user?.id ? `dm-mention-counts:${user.id}` : null;
  const cached = cacheKey ? cacheGetSync<Record<string, number>>(cacheKey) : undefined;

  const convMeta = useMemo(() => {
    const m: Record<string, { isGroup: boolean }> = {};
    for (const c of conversations) m[c.id] = { isGroup: !!c.is_group };
    return m;
  }, [conversations]);

  const convIds = useMemo(() => conversations.map((c) => c.id), [conversations]);

  const query = useQuery({
    queryKey: ['dm-mention-counts', user?.id, convIds.join(',')],
    enabled: !!user && convIds.length > 0,
    initialData: cached,
    initialDataUpdatedAt: cached ? Date.now() : 0,
    staleTime: cached ? 60_000 : 0,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Record<string, number>> => {
      if (!user || convIds.length === 0) return {};

      // Read states
      const { data: reads } = await supabase
        .from('dm_read_states')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id)
        .in('conversation_id', convIds);

      const readMap: Record<string, string> = {};
      reads?.forEach((r) => {
        readMap[r.conversation_id] = r.last_read_at || new Date(0).toISOString();
      });

      const oldest = convIds.reduce((acc, id) => {
        const ts = readMap[id] || new Date(0).toISOString();
        return ts < acc ? ts : acc;
      }, new Date().toISOString());

      // Single batched query for recent unread DM messages I didn't author.
      const { data: messages } = await supabase
        .from('dm_messages')
        .select('conversation_id, content, created_at')
        .in('conversation_id', convIds)
        .gt('created_at', oldest)
        .neq('author_id', user.id)
        .limit(2000);

      const mySnowflake = uuidToSnowflake(user.id);
      const myUuid = user.id;
      const mentionRe = new RegExp(`<@!?(${myUuid}|${mySnowflake})>`);

      const result: Record<string, number> = {};
      for (const msg of messages || []) {
        const cutoff = readMap[msg.conversation_id] || new Date(0).toISOString();
        if ((msg.created_at || '') <= cutoff) continue;
        const meta = convMeta[msg.conversation_id];
        if (!meta) continue;
        if (meta.isGroup) {
          if (!msg.content || !mentionRe.test(msg.content)) continue;
        }
        result[msg.conversation_id] = (result[msg.conversation_id] || 0) + 1;
      }
      return result;
    },
  });

  // Persist
  useEffect(() => {
    if (query.data && cacheKey && !query.isPlaceholderData) {
      cacheSetAsync(cacheKey, query.data);
    }
  }, [query.data, cacheKey, query.isPlaceholderData]);

  // Realtime: invalidate (debounced) on new dm_messages or my own read state changes.
  useEffect(() => {
    if (!user) return;
    const invalidate = () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['dm-mention-counts'] });
      }, 200);
    };
    const ch1 = supabase
      .channel('dm-mention-counts-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages' }, invalidate)
      .subscribe();
    const ch2 = supabase
      .channel(`dm-mention-counts-reads-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dm_read_states', filter: `user_id=eq.${user.id}` },
        invalidate,
      )
      .subscribe();
    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [user, queryClient]);

  const mentionCounts = query.data || {};
  const totalMentionCount = useMemo(
    () => Object.values(mentionCounts).reduce((s, n) => s + (n || 0), 0),
    [mentionCounts],
  );

  return { mentionCounts, totalMentionCount };
}
