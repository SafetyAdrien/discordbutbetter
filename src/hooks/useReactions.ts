import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string | null;
}

export function useMessageReactions(messageIds: string[]) {
  return useQuery({
    queryKey: ['reactions', messageIds],
    queryFn: async () => {
      if (messageIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from('reactions')
        .select('*')
        .in('message_id', messageIds);
      
      if (error) throw error;
      
      const grouped: Record<string, Reaction[]> = {};
      data?.forEach(r => {
        if (!grouped[r.message_id]) grouped[r.message_id] = [];
        grouped[r.message_id].push(r);
      });
      return grouped;
    },
    enabled: messageIds.length > 0,
  });
}

export function useAddReaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('reactions')
        .insert({
          message_id: messageId,
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
          id: `temp-${Date.now()}`,
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
      
      const { error } = await supabase
        .from('reactions')
        .delete()
        .eq('message_id', messageId)
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
