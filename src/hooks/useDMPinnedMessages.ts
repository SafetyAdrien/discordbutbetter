import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface DMPinnedMessage {
  id: string;
  message_id: string;
  conversation_id: string;
  pinned_by: string | null;
  pinned_at: string;
  message: {
    id: string;
    content: string;
    created_at: string;
    author: {
      id: string;
      display_name: string;
      username: string;
      avatar_url: string | null;
    } | null;
  };
}

export function useDMPinnedMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['dm-pinned-messages', conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('dm_pinned_messages')
        .select(`
          id,
          message_id,
          conversation_id,
          pinned_by,
          pinned_at,
          message:dm_messages!message_id (
            id,
            content,
            created_at,
            author:profiles!dm_messages_author_id_fkey (
              id,
              display_name,
              username,
              avatar_url
            )
          )
        `)
        .eq('conversation_id', conversationId)
        .order('pinned_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((item: any) => ({
        ...item,
        message: item.message,
      })) as DMPinnedMessage[];
    },
  });
}

export function usePinDMMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('dm_pinned_messages')
        .insert({
          message_id: messageId,
          conversation_id: conversationId,
          pinned_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dm-pinned-messages', variables.conversationId] });
      toast.success('Message épinglé');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Ce message est déjà épinglé');
      } else {
        toast.error("Impossible d'épingler le message");
      }
    },
  });
}

export function useUnpinDMMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      const { error } = await supabase
        .from('dm_pinned_messages')
        .delete()
        .eq('message_id', messageId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dm-pinned-messages', variables.conversationId] });
      toast.success('Message désépinglé');
    },
    onError: () => {
      toast.error('Impossible de désépingler le message');
    },
  });
}
