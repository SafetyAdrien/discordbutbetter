import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`webhooks-rt-${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'webhooks', filter: `channel_id=eq.${channelId}` },
        () => {
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['webhooks', channelId] });
          }, 300);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [channelId, queryClient]);

  const query = useQuery({
    queryKey: ['webhooks', channelId],
    placeholderData: () => {
      try {
        const cached = sessionStorage.getItem(`cache:webhooks:${channelId}`);
        return cached ? JSON.parse(cached) : undefined;
      } catch { return undefined; }
    },
    queryFn: async (): Promise<Webhook[]> => {
      if (!channelId) return [];

      const { data, error } = await supabase
        .rpc('get_channel_webhooks', { _channel_id: channelId });

      if (error) throw error;
      return data || [];
    },
    enabled: !!channelId && !!user,
  });

  useEffect(() => {
    if (query.data && channelId && !query.isPlaceholderData) {
      try { sessionStorage.setItem(`cache:webhooks:${channelId}`, JSON.stringify(query.data)); } catch {}
    }
  }, [query.data, channelId, query.isPlaceholderData]);

  return query;
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
    onMutate: async ({ channelId, name, avatarUrl }) => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['webhooks', channelId] });
      const previousWebhooks = queryClient.getQueryData(['webhooks', channelId]);
      
      const tempWebhook: Webhook = {
        id: `temp-${Date.now()}`,
        channel_id: channelId,
        name,
        avatar_url: avatarUrl || null,
        token: '********',
        created_by: user.id,
        created_at: new Date().toISOString(),
      };
      
      queryClient.setQueryData(['webhooks', channelId], (old: Webhook[] | undefined) =>
        old ? [...old, tempWebhook] : [tempWebhook]
      );
      
      return { previousWebhooks };
    },
    onError: (_, variables, context) => {
      if (context?.previousWebhooks) {
        queryClient.setQueryData(['webhooks', variables.channelId], context.previousWebhooks);
      }
      toast.error('Erreur lors de la création du webhook');
    },
    onSuccess: () => {
      toast.success('Webhook créé !');
    },
    onSettled: (_, __, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', channelId] });
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
    onMutate: async ({ webhookId, channelId }) => {
      await queryClient.cancelQueries({ queryKey: ['webhooks', channelId] });
      const previousWebhooks = queryClient.getQueryData(['webhooks', channelId]);
      
      queryClient.setQueryData(['webhooks', channelId], (old: Webhook[] | undefined) =>
        old?.filter(w => w.id !== webhookId)
      );
      
      return { previousWebhooks };
    },
    onError: (_, variables, context) => {
      if (context?.previousWebhooks) {
        queryClient.setQueryData(['webhooks', variables.channelId], context.previousWebhooks);
      }
      toast.error('Erreur lors de la suppression du webhook');
    },
    onSuccess: () => {
      toast.success('Webhook supprimé !');
    },
    onSettled: (_, __, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', channelId] });
    },
  });
}
