import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Webhook {
  id: string;
  channel_id: string;
  name: string;
  avatar_url: string | null;
  token: string;
  created_by: string | null;
  created_at: string | null;
}

export function useChannelWebhooks(channelId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['webhooks', channelId],
    queryFn: async (): Promise<Webhook[]> => {
      if (!channelId) return [];

      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!channelId && !!user,
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      channelId,
      name,
      avatarUrl,
    }: {
      channelId: string;
      name: string;
      avatarUrl?: string;
    }) => {
      const { data, error } = await supabase
        .from('webhooks')
        .insert({
          channel_id: channelId,
          name,
          avatar_url: avatarUrl || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', variables.channelId] });
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ webhookId, channelId }: { webhookId: string; channelId: string }) => {
      const { error } = await supabase
        .from('webhooks')
        .delete()
        .eq('id', webhookId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', variables.channelId] });
    },
  });
}
