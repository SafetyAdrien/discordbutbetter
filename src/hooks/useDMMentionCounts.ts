import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDMConversations } from './useDMs';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';
import { isDirectMentionForUser } from '@/lib/mentions';

/**
 * Per-conversation mention counts (Discord-style red bubble logic):
 * - 1-on-1 DM: every unread received message counts as a mention.
 * - Group DM: only explicit <@me> mentions (UUID or 18-digit Snowflake) count.
 */
export function useDMMentionCounts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: conversations = [] } = useDMConversations();
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));

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
        // Deterministic order — see useChannelUnreadCounts for the rationale.
        .order('created_at', { ascending: false })
        .limit(2000);

      const result: Record<string, number> = {};
      for (const msg of messages || []) {
        const cutoff = readMap[msg.conversation_id] || new Date(0).toISOString();
        if ((msg.created_at || '') <= cutoff) continue;
        const meta = convMeta[msg.conversation_id];
        if (!meta) continue;
        if (meta.isGroup) {
          if (!isDirectMentionForUser(msg.content, user.id)) continue;
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
    const patchConversation = (conversationId: string, delta: number) => {
      queryClient.setQueriesData<Record<string, number>>(
        { queryKey: ['dm-mention-counts'] },
        (old = {}) => {
          const nextCount = Math.max(0, (old[conversationId] || 0) + delta);
          if (nextCount === 0) {
            const { [conversationId]: _, ...rest } = old;
            return rest;
          }
          return { ...old, [conversationId]: nextCount };
        }
      );
    };
    const ch1 = supabase
      .channel(`dm-mention-counts-messages-${user.id}-${instanceIdRef.current}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages' }, (payload) => {
        const msg = payload.new as { conversation_id?: string; author_id?: string; content?: string | null };
        if (!msg.conversation_id || msg.author_id === user.id) return;
        const meta = convMeta[msg.conversation_id];
        if (!meta || !meta.isGroup || isDirectMentionForUser(msg.content, user.id)) {
          patchConversation(msg.conversation_id, 1);
        }
        queryClient.invalidateQueries({ queryKey: ['dm-mention-counts'] });
      })
      .subscribe();
    const ch2 = supabase
      .channel(`dm-mention-counts-reads-${user.id}-${instanceIdRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dm_read_states', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const conversationId = ((payload.new || payload.old) as { conversation_id?: string })?.conversation_id;
          if (conversationId) {
            queryClient.setQueriesData<Record<string, number>>(
              { queryKey: ['dm-mention-counts'] },
              (old = {}) => {
                const { [conversationId]: _, ...rest } = old;
                return rest;
              }
            );
          }
          queryClient.invalidateQueries({ queryKey: ['dm-mention-counts'] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [user, queryClient, convMeta]);

  const mentionCounts = useMemo(() => query.data || {}, [query.data]);
  const totalMentionCount = useMemo(
    () => Object.values(mentionCounts).reduce((s, n) => s + (n || 0), 0),
    [mentionCounts],
  );

  return { mentionCounts, totalMentionCount };
}
