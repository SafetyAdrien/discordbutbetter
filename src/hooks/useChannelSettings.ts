import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ChannelDetails {
  id: string;
  name: string;
  description: string | null;
  type: 'text' | 'voice' | 'announcement' | 'forum' | null;
  server_id: string;
  category_id: string | null;
  position: number | null;
}

export function useChannelDetails(channelId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['channel-details', channelId],
    queryFn: async (): Promise<ChannelDetails | null> => {
      if (!channelId) return null;

      const { data, error } = await supabase
        .from('channels')
        .select('id, name, description, type, server_id, category_id, position')
        .eq('id', channelId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!channelId && !!user,
  });
}

export function useUpdateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, name, description }: { channelId: string; name: string; description?: string }) => {
      const { error } = await supabase
        .from('channels')
        .update({ name, description })
        .eq('id', channelId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channel-details', variables.channelId] });
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

export function useDeleteChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelId: string) => {
      const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', channelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}
