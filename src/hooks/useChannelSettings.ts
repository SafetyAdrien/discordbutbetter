import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';
import { useAuth } from '@/contexts/AuthContext';
import { ChannelType, CategoryWithChannels, OrphanChannel } from './useChannels';
import { toast } from 'sonner';

export interface ChannelDetails {
  id: string;
  name: string;
  description: string | null;
  type: ChannelType | null;
  server_id: string;
  category_id: string | null;
  position: number | null;
  slowmode_seconds: number;
  icon_url: string | null;
}

export function useChannelDetails(channelId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`channel-details-rt-${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channels', filter: `id=eq.${channelId}` },
        () => {
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['channel-details', channelId] });
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
    queryKey: ['channel-details', channelId],
    placeholderData: () => cacheGetSync(`channel-details:${channelId}`),
    queryFn: async (): Promise<ChannelDetails | null> => {
      if (!channelId) return null;

      const { data, error } = await supabase
        .from('channels')
        .select('id, name, description, type, server_id, category_id, position, slowmode_seconds, icon_url')
        .eq('id', channelId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!channelId && !!user,
  });

  useEffect(() => {
    if (query.data && channelId && !query.isPlaceholderData) {
      cacheSetAsync(`channel-details:${channelId}`, query.data);
    }
  }, [query.data, channelId, query.isPlaceholderData]);

  return query;
}

export function useUpdateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, serverId, name, description, type, slowmode_seconds, icon_url }: { 
      channelId: string; 
      serverId: string; 
      name: string; 
      description?: string | null;
      type?: 'text' | 'announcement';
      slowmode_seconds?: number;
      icon_url?: string | null;
    }) => {
      const updateData: { name: string; description?: string | null; type?: 'text' | 'announcement'; slowmode_seconds?: number; icon_url?: string | null } = { name };
      if (description !== undefined) updateData.description = description;
      if (type) updateData.type = type;
      if (slowmode_seconds !== undefined) updateData.slowmode_seconds = slowmode_seconds;
      if (icon_url !== undefined) updateData.icon_url = icon_url;

      const { error } = await supabase
        .from('channels')
        .update(updateData)
        .eq('id', channelId);

      if (error) throw error;
      return { channelId, serverId, name, description, type, slowmode_seconds, icon_url };
    },
    onMutate: async ({ channelId, serverId, name, description, type, icon_url }) => {
      await queryClient.cancelQueries({ queryKey: ['channel-details', channelId] });
      await queryClient.cancelQueries({ queryKey: ['channels', serverId] });
      await queryClient.cancelQueries({ queryKey: ['servers'] });
      
      const previousDetails = queryClient.getQueryData<ChannelDetails>(['channel-details', channelId]);
      const previousChannels = queryClient.getQueryData<{ categories: CategoryWithChannels[]; orphanChannels: OrphanChannel[] }>(['channels', serverId]);
      const previousServers = queryClient.getQueryData(['servers']);
      
      if (previousDetails) {
        queryClient.setQueryData(['channel-details', channelId], {
          ...previousDetails,
          name,
          description: description ?? previousDetails.description,
          type: type ?? previousDetails.type,
          ...(icon_url !== undefined && { icon_url }),
        });
      }
      
      if (previousChannels) {
      const updateChannel = (ch: any) => 
          ch.id === channelId 
            ? { ...ch, name, description: description ?? ch.description, type: type ?? ch.type, ...(icon_url !== undefined && { icon_url }) } 
            : ch;
        
        queryClient.setQueryData(['channels', serverId], {
          categories: previousChannels.categories.map(cat => ({
            ...cat,
            channels: cat.channels.map(updateChannel)
          })),
          orphanChannels: previousChannels.orphanChannels.map(updateChannel)
        });
      }
      
      if (previousServers) {
        queryClient.setQueryData(['servers'], (old: any) =>
          old?.map((server: any) =>
            server.id === serverId
              ? {
                  ...server,
                  categories: server.categories?.map((cat: any) => ({
                    ...cat,
                    channels: cat.channels?.map((ch: any) =>
                      ch.id === channelId ? { ...ch, name, type: type ?? ch.type } : ch
                    ) || []
                  })) || []
                }
              : server
          )
        );
      }
      
      return { previousDetails, previousChannels, previousServers, channelId, serverId };
    },
    onError: (_, { channelId, serverId }, context) => {
      if (context?.previousDetails) {
        queryClient.setQueryData(['channel-details', channelId], context.previousDetails);
      }
      if (context?.previousChannels) {
        queryClient.setQueryData(['channels', serverId], context.previousChannels);
      }
      if (context?.previousServers) {
        queryClient.setQueryData(['servers'], context.previousServers);
      }
      toast.error('Erreur lors de la mise à jour');
    },
    onSettled: (_, __, { channelId, serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['channel-details', channelId] });
      queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
    onSuccess: () => {
      toast.success('Salon mis à jour');
    },
  });
}
