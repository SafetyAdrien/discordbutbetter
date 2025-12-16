import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface UserChannelSetting {
  id: string;
  user_id: string;
  channel_id: string | null;
  category_id: string | null;
  muted: boolean;
}

export function useUserChannelSettings(serverId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-channel-settings', serverId, user?.id],
    queryFn: async (): Promise<UserChannelSetting[]> => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('user_channel_settings')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!serverId,
  });
}

export function useMuteChannel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, muted }: { channelId: string; muted: boolean }) => {
      if (!user) throw new Error('Not authenticated');

      // Check if setting exists
      const { data: existing } = await supabase
        .from('user_channel_settings')
        .select('id')
        .eq('user_id', user.id)
        .eq('channel_id', channelId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_channel_settings')
          .update({ muted })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_channel_settings')
          .insert({ user_id: user.id, channel_id: channelId, muted });
        if (error) throw error;
      }
    },
    onSuccess: (_, { muted }) => {
      toast.success(muted ? 'Canal masqué' : 'Canal réactivé');
    },
    onError: () => {
      toast.error('Erreur lors de la modification');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user-channel-settings'] });
    },
  });
}

export function useMuteCategory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ categoryId, muted }: { categoryId: string; muted: boolean }) => {
      if (!user) throw new Error('Not authenticated');

      // Check if setting exists
      const { data: existing } = await supabase
        .from('user_channel_settings')
        .select('id')
        .eq('user_id', user.id)
        .eq('category_id', categoryId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_channel_settings')
          .update({ muted })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_channel_settings')
          .insert({ user_id: user.id, category_id: categoryId, muted });
        if (error) throw error;
      }
    },
    onSuccess: (_, { muted }) => {
      toast.success(muted ? 'Catégorie masquée' : 'Catégorie réactivée');
    },
    onError: () => {
      toast.error('Erreur lors de la modification');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user-channel-settings'] });
    },
  });
}