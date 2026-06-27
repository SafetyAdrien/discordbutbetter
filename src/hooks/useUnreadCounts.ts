import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';
import { markReadGuard, isBeforeReadGuard, recordReadAt, getLastReadAt } from '@/lib/readStateGuard';
import { useAuth } from '@/contexts/AuthContext';

export interface UnreadCount {
  conversationId: string;
  count: number;
}

export function useUnreadCounts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));

  const query = useQuery({
    queryKey: ['unread-counts', user?.id],
    placeholderData: () => cacheGetSync(`unread-counts:${user?.id}`),
    queryFn: async (): Promise<Record<string, number>> => {
      if (!user) return {};

      // Get user's conversations
      const { data: participations, error: partError } = await supabase
        .from('dm_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (partError) throw partError;

      const conversationIds = participations?.map(p => p.conversation_id) || [];
      if (conversationIds.length === 0) return {};

      // Get read states
      const { data: readStates, error: readError } = await supabase
        .from('dm_read_states')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id)
        .in('conversation_id', conversationIds);

      if (readError) throw readError;

      // Create a map of read states
      const readStateMap: Record<string, string> = {};
      readStates?.forEach(rs => {
        readStateMap[rs.conversation_id] = rs.last_read_at || new Date(0).toISOString();
      });

      // Count unread messages per conversation
      const unreadCounts: Record<string, number> = {};

      await Promise.all(
        conversationIds.map(async (convId) => {
          const lastReadAt = readStateMap[convId] || new Date(0).toISOString();
          
          const { count, error } = await supabase
            .from('dm_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', convId)
            .gt('created_at', lastReadAt)
            .neq('author_id', user.id);

          if (!error && count && count > 0) {
            unreadCounts[convId] = count;
          }
        })
      );

      return unreadCounts;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Persist to sessionStorage
  useEffect(() => {
    if (query.data && user?.id && !query.isPlaceholderData) {
      cacheSetAsync(`unread-counts:${user.id}`, query.data);
    }
  }, [query.data, user?.id, query.isPlaceholderData]);

  useEffect(() => {
    if (!user) return;

    const patchUnread = (conversationId: string, delta: number) => {
      queryClient.setQueryData<Record<string, number>>(['unread-counts', user.id], (old = {}) => {
        const nextCount = Math.max(0, (old[conversationId] || 0) + delta);
        if (nextCount === 0) {
          const { [conversationId]: _, ...rest } = old;
          return rest;
        }
        return { ...old, [conversationId]: nextCount };
      });
    };

    // Catchup: when a channel (re)joins SUBSCRIBED after a disconnect, replay
    // any INSERTs we may have missed during the outage by refetching once.
    // The first SUBSCRIBED is a no-op (the queryFn already runs on mount).
    const wasSubscribedMessagesRef = { current: false };
    const wasSubscribedReadsRef = { current: false };
    const everSubscribedMessagesRef = { current: false };
    const everSubscribedReadsRef = { current: false };

    const messagesChannel = supabase
      .channel(`unread-counts-dm-messages-${user.id}-${instanceIdRef.current}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages' }, (payload) => {
        const msg = payload.new as { conversation_id?: string; author_id?: string; created_at?: string };
        if (!msg.conversation_id || msg.author_id === user.id) return;
        // Guard: skip messages older than the read moment to avoid resurrecting badges.
        if (isBeforeReadGuard(msg.conversation_id, msg.created_at)) return;
        patchUnread(msg.conversation_id, 1);
        // No invalidate — patch is authoritative; refetch races against replication lag.
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (everSubscribedMessagesRef.current && !wasSubscribedMessagesRef.current) {
            // Reconnect after a drop — rebuild counts from server.
            queryClient.invalidateQueries({ queryKey: ['unread-counts', user.id] });
          }
          wasSubscribedMessagesRef.current = true;
          everSubscribedMessagesRef.current = true;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          wasSubscribedMessagesRef.current = false;
        }
      });

    const readsChannel = supabase
      .channel(`unread-counts-dm-reads-${user.id}-${instanceIdRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dm_read_states', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = (payload.new || payload.old) as { conversation_id?: string; last_read_at?: string } | null;
          const conversationId = row?.conversation_id;
          if (!conversationId) return;
          // Cross-device arbitration: only apply if the event's last_read_at is
          // strictly newer than what we already know locally. Stale replays or
          // out-of-order deliveries from other devices are silently ignored.
          const incoming = row?.last_read_at ? Date.parse(row.last_read_at) : NaN;
          if (!Number.isFinite(incoming)) return;
          const known = getLastReadAt(conversationId) ?? 0;
          if (incoming <= known) return;
          recordReadAt(conversationId, incoming);
          queryClient.setQueryData<Record<string, number>>(['unread-counts', user.id], (old = {}) => {
            const { [conversationId]: _, ...rest } = old;
            return rest;
          });
          // Optimistic patch above is authoritative; intentionally no invalidate.
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (everSubscribedReadsRef.current && !wasSubscribedReadsRef.current) {
            queryClient.invalidateQueries({ queryKey: ['unread-counts', user.id] });
          }
          wasSubscribedReadsRef.current = true;
          everSubscribedReadsRef.current = true;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          wasSubscribedReadsRef.current = false;
        }
      });

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(readsChannel);
    };
  }, [user, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('dm_read_states')
        .upsert({
          user_id: user.id,
          conversation_id: conversationId,
          last_read_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,conversation_id',
        });

      if (error) throw error;
      return conversationId;
    },
    onMutate: async (conversationId) => {
      // Arm guard so any in-flight realtime INSERT/refetch with messages
      // older than this moment cannot resurrect the badge.
      markReadGuard(conversationId);
      // Register this read moment in the cross-device monotone registry so
      // older read events broadcast from other devices can't rewind it.
      recordReadAt(conversationId, Date.now());

      await queryClient.cancelQueries({ queryKey: ['unread-counts', user?.id] });
      const previousCounts = queryClient.getQueryData<Record<string, number>>(['unread-counts', user?.id]);

      queryClient.setQueryData<Record<string, number>>(['unread-counts', user?.id], old => {
        if (!old) return {};
        const { [conversationId]: _, ...rest } = old;
        return rest;
      });

      queryClient.setQueriesData<Record<string, number>>(
        { queryKey: ['dm-mention-counts'] },
        old => {
          if (!old) return old;
          const { [conversationId]: _, ...rest } = old;
          return rest;
        }
      );

      return { previousCounts };
    },
    onError: (_, __, context) => {
      if (context?.previousCounts) {
        queryClient.setQueryData(['unread-counts', user?.id], context.previousCounts);
      }
    },
    // NOTE: no onSettled invalidate — would race against replication lag and
    // resurrect the badge. The optimistic patch + guard are authoritative;
    // cross-device sync arrives via the dm_read_states realtime channel.
  });

  return {
    unreadCounts: query.data || {},
    isLoading: query.isLoading,
    markAsRead,
  };
}
