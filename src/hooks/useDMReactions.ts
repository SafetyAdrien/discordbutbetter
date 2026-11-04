import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { parseUuid } from '@/lib/validation';

export interface DMReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string | null;
}

export function useDMMessageReactions(messageIds: string[]) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));
  const idsKey = messageIds.filter((id) => !id.startsWith('temp-')).join(',');

  useEffect(() => {
    if (!idsKey) return;
    const persistedMessageIds = idsKey.split(',');
    const channel = supabase
      .channel(`dm-reactions-rt-${persistedMessageIds[0]}-${instanceIdRef.current}`, { config: { private: true } })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dm_message_reactions' },
        (payload) => {
          const record = (payload.new || payload.old) as { message_id?: string; user_id?: string } | undefined;
          if (!record?.message_id) return;
          if (!persistedMessageIds.includes(record.message_id)) return;
          if (user && record.user_id === user.id) return;
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['dm-reactions'] });
          }, 300);
        }
      )
      .subscribe();
    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [idsKey, user, queryClient]);

  const persistedMessageIds = useMemo(() => (idsKey ? idsKey.split(',') : []), [idsKey]);

  return useQuery({
    queryKey: ['dm-reactions', idsKey],
    queryFn: async () => {
      if (persistedMessageIds.length === 0) return {};
      const { data, error } = await supabase
        .from('dm_message_reactions')
        .select('*')
        .in('message_id', persistedMessageIds);
      if (error) throw error;
      const grouped: Record<string, DMReaction[]> = {};
      (data ?? []).forEach((r: DMReaction) => {
        if (!grouped[r.message_id]) grouped[r.message_id] = [];
        grouped[r.message_id].push(r);
      });
      return grouped;
    },
    enabled: persistedMessageIds.length > 0,
  });
}

export function useToggleDMReaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, emoji, currentReactions }: {
      messageId: string;
      emoji: string;
      currentReactions: DMReaction[];
    }) => {
      if (!user) throw new Error('Not authenticated');
      const persistedMessageId = parseUuid(messageId, 'Message not saved yet');
      const userHasReacted = currentReactions.some(
        r => r.user_id === user.id && r.emoji === emoji
      );

      if (userHasReacted) {
        const { error } = await supabase
          .from('dm_message_reactions')
          .delete()
          .eq('message_id', persistedMessageId)
          .eq('user_id', user.id)
          .eq('emoji', emoji);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('dm_message_reactions')
          .insert({ message_id: persistedMessageId, user_id: user.id, emoji });
        if (error) throw error;
      }
      return { messageId, emoji, removed: userHasReacted };
    },
    onMutate: async ({ messageId, emoji, currentReactions }) => {
      if (!user) return;
      await queryClient.cancelQueries({ queryKey: ['dm-reactions'] });
      const previous = queryClient.getQueriesData({ queryKey: ['dm-reactions'] });
      const userHasReacted = currentReactions.some(
        r => r.user_id === user.id && r.emoji === emoji
      );
      queryClient.setQueriesData({ queryKey: ['dm-reactions'] }, (old: Record<string, DMReaction[]> | undefined) => {
        if (!old) return old;
        const list = old[messageId] || [];
        const next = userHasReacted
          ? list.filter(r => !(r.user_id === user.id && r.emoji === emoji))
          : [...list, {
              id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
      queryClient.invalidateQueries({ queryKey: ['dm-reactions'] });
    },
  });
}
