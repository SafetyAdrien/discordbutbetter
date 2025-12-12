import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PinnedMessage {
  id: string;
  message_id: string;
  channel_id: string;
  pinned_by: string | null;
  pinned_at: string | null;
  message?: {
    id: string;
    content: string;
    created_at: string | null;
    author?: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
    } | null;
  };
}

export function usePinnedMessages(channelId: string) {
  return useQuery({
    queryKey: ['pinned-messages', channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pinned_messages')
        .select(`
          *,
          message:messages(
            id, content, created_at,
            author:profiles(id, username, display_name, avatar_url)
          )
        `)
        .eq('channel_id', channelId)
        .order('pinned_at', { ascending: false });

      if (error) throw error;
      return data as PinnedMessage[];
    },
    enabled: !!channelId,
  });
}

export function usePinMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ messageId, channelId }: { messageId: string; channelId: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('pinned_messages')
        .insert({ 
          message_id: messageId, 
          channel_id: channelId, 
          pinned_by: user.id 
        });
      
      if (error) throw error;
    },
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['pinned-messages', channelId] });
      toast.success('Message épinglé');
    },
    onError: () => {
      toast.error('Erreur lors de l\'épinglage du message');
    },
  });
}

export function useUnpinMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ messageId, channelId }: { messageId: string; channelId: string }) => {
      const { error } = await supabase
        .from('pinned_messages')
        .delete()
        .eq('message_id', messageId);
      
      if (error) throw error;
    },
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['pinned-messages', channelId] });
      toast.success('Message désépinglé');
    },
    onError: () => {
      toast.error('Erreur lors du désépinglage du message');
    },
  });
}
