import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export const useThreadUnreadCounts = (channelId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['thread-unread-counts', channelId, user?.id],
    placeholderData: () => {
      try {
        const cached = sessionStorage.getItem(`cache:thread-unread:${channelId}:${user?.id}`);
        return cached ? JSON.parse(cached) : undefined;
      } catch { return undefined; }
    },
    queryFn: async () => {
      if (!channelId || !user?.id) return {};

      const { data: threads, error: threadsError } = await supabase
        .from('threads')
        .select('id')
        .eq('channel_id', channelId)
        .eq('archived', false);

      if (threadsError) throw threadsError;
      if (!threads || threads.length === 0) return {};

      const threadIds = threads.map(t => t.id);

      const { data: readStates, error: readStatesError } = await supabase
        .from('thread_read_states')
        .select('thread_id, last_read_at')
        .eq('user_id', user.id)
        .in('thread_id', threadIds);

      if (readStatesError) throw readStatesError;

      const readStatesMap: Record<string, string> = {};
      readStates?.forEach(rs => {
        readStatesMap[rs.thread_id] = rs.last_read_at || '';
      });

      const unreadCounts: Record<string, number> = {};
      
      await Promise.all(threadIds.map(async (threadId) => {
        const lastReadAt = readStatesMap[threadId];
        
        let query = supabase
          .from('thread_messages')
          .select('*', { count: 'exact', head: true })
          .eq('thread_id', threadId)
          .neq('author_id', user.id);

        if (lastReadAt) {
          query = query.gt('created_at', lastReadAt);
        }

        const { count } = await query;
        if (count && count > 0) {
          unreadCounts[threadId] = count;
        }
      }));

      return unreadCounts;
    },
    enabled: !!channelId && !!user?.id,
  });

  // Persist to sessionStorage
  useEffect(() => {
    if (query.data && channelId && user?.id && !query.isPlaceholderData) {
      try { sessionStorage.setItem(`cache:thread-unread:${channelId}:${user.id}`, JSON.stringify(query.data)); } catch {}
    }
  }, [query.data, channelId, user?.id, query.isPlaceholderData]);

  // Subscribe to real-time thread message updates
  useEffect(() => {
    if (!channelId || !user?.id) return;

    const channel = supabase
      .channel(`thread-messages-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'thread_messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['thread-unread-counts', channelId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, user?.id, queryClient]);

  return query;
};

export const useMarkThreadAsRead = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ threadId, channelId }: { threadId: string; channelId: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('thread_read_states')
        .upsert({
          user_id: user.id,
          thread_id: threadId,
          last_read_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,thread_id',
        });

      if (error) throw error;
      return { threadId, channelId };
    },
    onMutate: async ({ threadId, channelId }) => {
      await queryClient.cancelQueries({ queryKey: ['thread-unread-counts', channelId, user?.id] });
      const previousCounts = queryClient.getQueryData<Record<string, number>>(['thread-unread-counts', channelId, user?.id]);
      
      queryClient.setQueryData<Record<string, number>>(['thread-unread-counts', channelId, user?.id], old => {
        if (!old) return {};
        const { [threadId]: _, ...rest } = old;
        return rest;
      });
      
      return { previousCounts, channelId };
    },
    onError: (_, { channelId }, context) => {
      if (context?.previousCounts) {
        queryClient.setQueryData(['thread-unread-counts', channelId, user?.id], context.previousCounts);
      }
    },
    onSettled: (_, __, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['thread-unread-counts', channelId] });
    },
  });
};
