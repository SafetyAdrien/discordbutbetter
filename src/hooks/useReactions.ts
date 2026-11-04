import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { parseUuid } from '@/lib/validation';

export interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string | null;
}

export function useMessageReactions(messageIds: string[]) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));

  // Stable dependency for the subscription: re-subscribing on a new array
  // identity would thrash, but we must re-run when the actual id set changes.
  const idsKey = messageIds.filter((id) => !id.startsWith('temp-')).join(',');
  const persistedMessageIds = useMemo(() => (idsKey ? idsKey.split(',') : []), [idsKey]);
  const userId = user?.id;

  // Realtime subscription for reactions on these messages
  useEffect(() => {
    if (persistedMessageIds.length === 0) return;

    const channel = supabase
      .channel(`reactions-rt-${persistedMessageIds[0]}-${instanceIdRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reactions' },
        (payload) => {
          const record = (payload.new || payload.old) as { message_id?: string; user_id?: string } | undefined;
          if (!record?.message_id) return;
          // Only react to messages we're tracking
          if (!persistedMessageIds.includes(record.message_id)) return;
          // Skip own events (handled by optimistic updates)
          if (userId && record.user_id === userId) return;

          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['reactions'] });
          }, 300);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [persistedMessageIds, userId, queryClient]);

  return useQuery({
    queryKey: ['reactions', idsKey],
    queryFn: async () => {
      if (persistedMessageIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from('reactions')
        .select('*')
        .in('message_id', persistedMessageIds);
      
      if (error) throw error;
      
      const grouped: Record<string, Reaction[]> = {};
      data?.forEach(r => {
        if (!grouped[r.message_id]) grouped[r.message_id] = [];
        grouped[r.message_id].push(r);
      });
      return grouped;
    },
    enabled: persistedMessageIds.length > 0,
  });
}

export function useAddReaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!user) throw new Error('Not authenticated');
      const persistedMessageId = parseUuid(messageId, 'Message not saved yet');
      
      const { data, error } = await supabase
        .from('reactions')
        .insert({
          message_id: persistedMessageId,
          user_id: user.id,
          emoji,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ messageId, emoji }) => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['reactions'] });
      
      const previousReactions = queryClient.getQueriesData({ queryKey: ['reactions'] });
      
      queryClient.setQueriesData({ queryKey: ['reactions'] }, (old: Record<string, Reaction[]> | undefined) => {
        if (!old) return old;
        const newReaction: Reaction = {
          id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          message_id: messageId,
          user_id: user.id,
          emoji,
          created_at: new Date().toISOString(),
        };
        return {
          ...old,
          [messageId]: [...(old[messageId] || []), newReaction],
        };
      });
      
      return { previousReactions };
    },
    onError: (_, __, context) => {
      if (context?.previousReactions) {
        context.previousReactions.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Erreur lors de l\'ajout de la réaction');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions'] });
    },
  });
}

export function useRemoveReaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!user) throw new Error('Not authenticated');
      const persistedMessageId = parseUuid(messageId, 'Message not saved yet');
      
      const { error } = await supabase
        .from('reactions')
        .delete()
        .eq('message_id', persistedMessageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);

      if (error) throw error;
    },
    onMutate: async ({ messageId, emoji }) => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['reactions'] });
      
      const previousReactions = queryClient.getQueriesData({ queryKey: ['reactions'] });
      
      queryClient.setQueriesData({ queryKey: ['reactions'] }, (old: Record<string, Reaction[]> | undefined) => {
        if (!old) return old;
        return {
          ...old,
          [messageId]: (old[messageId] || []).filter(r => !(r.user_id === user.id && r.emoji === emoji)),
        };
      });
      
      return { previousReactions };
    },
    onError: (_, __, context) => {
      if (context?.previousReactions) {
        context.previousReactions.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Erreur lors de la suppression de la réaction');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions'] });
    },
  });
}

// Moderator: remove a specific user's reaction
export function useRemoveSpecificReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, userId, emoji }: { messageId: string; userId: string; emoji: string }) => {
      const persistedMessageId = parseUuid(messageId, 'Message not saved yet');
      const { error } = await supabase
        .from('reactions')
        .delete()
        .eq('message_id', persistedMessageId)
        .eq('user_id', userId)
        .eq('emoji', emoji);
      if (error) throw error;
    },
    onMutate: async ({ messageId, userId, emoji }) => {
      await queryClient.cancelQueries({ queryKey: ['reactions'] });
      const previousReactions = queryClient.getQueriesData({ queryKey: ['reactions'] });
      queryClient.setQueriesData({ queryKey: ['reactions'] }, (old: Record<string, Reaction[]> | undefined) => {
        if (!old) return old;
        return {
          ...old,
          [messageId]: (old[messageId] || []).filter(r => !(r.user_id === userId && r.emoji === emoji)),
        };
      });
      return { previousReactions };
    },
    onError: (_, __, context) => {
      if (context?.previousReactions) {
        context.previousReactions.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Erreur lors de la suppression de la réaction');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions'] });
    },
  });
}

// Moderator: clear all reactions on a message (optionally only one emoji)
export function useClearMessageReactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji?: string }) => {
      const persistedMessageId = parseUuid(messageId, 'Message not saved yet');
      let query = supabase.from('reactions').delete().eq('message_id', persistedMessageId);
      if (emoji) query = query.eq('emoji', emoji);
      const { error } = await query;
      if (error) throw error;
    },
    onMutate: async ({ messageId, emoji }) => {
      await queryClient.cancelQueries({ queryKey: ['reactions'] });
      const previousReactions = queryClient.getQueriesData({ queryKey: ['reactions'] });
      queryClient.setQueriesData({ queryKey: ['reactions'] }, (old: Record<string, Reaction[]> | undefined) => {
        if (!old) return old;
        return {
          ...old,
          [messageId]: emoji
            ? (old[messageId] || []).filter(r => r.emoji !== emoji)
            : [],
        };
      });
      return { previousReactions };
    },
    onError: (_, __, context) => {
      if (context?.previousReactions) {
        context.previousReactions.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Erreur lors de la suppression des réactions');
    },
    onSuccess: () => {
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions'] });
    },
  });
}

export function useToggleReaction() {
  const { user } = useAuth();
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, emoji, currentReactions }: { 
      messageId: string; 
      emoji: string; 
      currentReactions: Reaction[];
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const userHasReacted = currentReactions.some(
        r => r.user_id === user.id && r.emoji === emoji
      );
      
      if (userHasReacted) {
        await removeReaction.mutateAsync({ messageId, emoji });
      } else {
        await addReaction.mutateAsync({ messageId, emoji });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions'] });
    },
  });
}
