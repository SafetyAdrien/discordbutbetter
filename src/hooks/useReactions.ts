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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions'] });
    },
    onError: () => {
      toast.error('Erreur lors de l\'ajout de la réaction');
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions'] });
    },
    onError: () => {
      toast.error('Erreur lors de la suppression de la réaction');
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions'] });
    },
  });
}
