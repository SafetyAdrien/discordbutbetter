import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ThreadReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string | null;
}

export function useThreadMessageReactions(messageIds: string[]) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const idsKey = messageIds.join(',');

  useEffect(() => {
    if (messageIds.length === 0) return;
    const channel = supabase
      .channel(`thread-reactions-rt-${messageIds[0]}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'thread_message_reactions' },
        (payload) => {
          const record = (payload.new || payload.old) as { message_id?: string; user_id?: string } | undefined;
          if (!record?.message_id) return;
          if (!messageIds.includes(record.message_id)) return;
          if (user && record.user_id === user.id) return;
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['thread-reactions'] });
          }, 300);
        }
      )
      .subscribe();
    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [idsKey, user?.id, queryClient]);

  return useQuery({
    queryKey: ['thread-reactions', messageIds],
    queryFn: async () => {
      if (messageIds.length === 0) return {};
      const { data, error } = await (supabase
        .from('thread_message_reactions') as any)
        .select('*')
        .in('message_id', messageIds);
      if (error) throw error;
      const grouped: Record<string, ThreadReaction[]> = {};
      (data ?? []).forEach((r: ThreadReaction) => {
        if (!grouped[r.message_id]) grouped[r.message_id] = [];
        grouped[r.message_id].push(r);
      });
      return grouped;
    },
    enabled: messageIds.length > 0,
  });
}

export function useToggleThreadReaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, emoji, currentReactions }: {
      messageId: string;
      emoji: string;
      currentReactions: ThreadReaction[];
    }) => {
      if (!user) throw new Error('Not authenticated');
      const userHasReacted = currentReactions.some(
        r => r.user_id === user.id && r.emoji === emoji
      );
      if (userHasReacted) {
        const { error } = await (supabase
          .from('thread_message_reactions') as any)
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', user.id)
          .eq('emoji', emoji);
        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from('thread_message_reactions') as any)
          .insert({ message_id: messageId, user_id: user.id, emoji });
        if (error) throw error;
      }
    },
    onMutate: async ({ messageId, emoji, currentReactions }) => {
      if (!user) return;
      await queryClient.cancelQueries({ queryKey: ['thread-reactions'] });
      const previous = queryClient.getQueriesData({ queryKey: ['thread-reactions'] });
      const userHasReacted = currentReactions.some(
        r => r.user_id === user.id && r.emoji === emoji
      );
      queryClient.setQueriesData({ queryKey: ['thread-reactions'] }, (old: Record<string, ThreadReaction[]> | undefined) => {
        if (!old) return old;
        const list = old[messageId] || [];
        const next = userHasReacted
          ? list.filter(r => !(r.user_id === user.id && r.emoji === emoji))
          : [...list, {
              id: `temp-${Date.now()}`,
              message_id: messageId,
              user_id: user.id,
              emoji,
              created_at: new Date().toISOString(),
            }];
        return { ...old, [messageId]: next };
      });
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        context.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
      }
      toast.error('Erreur lors de la réaction');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['thread-reactions'] });
    },
  });
}
