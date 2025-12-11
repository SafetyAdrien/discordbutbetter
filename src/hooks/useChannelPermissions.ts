import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type ServerPermission = Database['public']['Enums']['server_permission'];

export interface ChannelPermissionOverride {
  id: string;
  channel_id: string;
  role_id: string | null;
  permission: ServerPermission;
  type: 'allow' | 'deny';
  sync_with_category: boolean | null;
}

export function useChannelPermissionOverrides(channelId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['channel-permissions', channelId],
    queryFn: async (): Promise<ChannelPermissionOverride[]> => {
      if (!channelId) return [];

      const { data, error } = await supabase
        .from('channel_permission_overrides')
        .select('*')
        .eq('channel_id', channelId);

      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        type: d.type as 'allow' | 'deny'
      }));
    },
    enabled: !!channelId && !!user,
  });
}

export function useSetPermissionOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channelId,
      roleId,
      permission,
      type,
    }: {
      channelId: string;
      roleId: string;
      permission: ServerPermission;
      type: 'allow' | 'deny';
    }) => {
      const { error } = await supabase
        .from('channel_permission_overrides')
        .upsert(
          {
            channel_id: channelId,
            role_id: roleId,
            permission,
            type,
            sync_with_category: false,
          },
          { onConflict: 'channel_id,role_id,permission' }
        );

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channel-permissions', variables.channelId] });
    },
  });
}

export function useRemovePermissionOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channelId,
      roleId,
      permission,
    }: {
      channelId: string;
      roleId: string;
      permission: ServerPermission;
    }) => {
      const { error } = await supabase
        .from('channel_permission_overrides')
        .delete()
        .eq('channel_id', channelId)
        .eq('role_id', roleId)
        .eq('permission', permission);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channel-permissions', variables.channelId] });
    },
  });
}

export function useSyncWithCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId }: { channelId: string }) => {
      // Remove all overrides for this channel (sync with category)
      const { error } = await supabase
        .from('channel_permission_overrides')
        .delete()
        .eq('channel_id', channelId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channel-permissions', variables.channelId] });
    },
  });
}
