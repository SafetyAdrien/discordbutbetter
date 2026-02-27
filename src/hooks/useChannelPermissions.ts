import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';
import { lockPermissionsMutation } from './usePermissionsRealtime';

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
      return { channelId, roleId, permission, type };
    },
    onMutate: async ({ channelId, roleId, permission, type }) => {
      lockPermissionsMutation(600);
      await queryClient.cancelQueries({ queryKey: ['channel-permissions', channelId] });
      const previousOverrides = queryClient.getQueryData<ChannelPermissionOverride[]>(['channel-permissions', channelId]);
      
      const existingIndex = previousOverrides?.findIndex(
        o => o.role_id === roleId && o.permission === permission
      );
      
      const newOverride: ChannelPermissionOverride = {
        id: `temp-${Date.now()}`,
        channel_id: channelId,
        role_id: roleId,
        permission,
        type,
        sync_with_category: false,
      };
      
      queryClient.setQueryData<ChannelPermissionOverride[]>(['channel-permissions', channelId], old => {
        if (!old) return [newOverride];
        if (existingIndex !== undefined && existingIndex >= 0) {
          return old.map((o, i) => i === existingIndex ? newOverride : o);
        }
        return [...old, newOverride];
      });
      
      return { previousOverrides, channelId };
    },
    onError: (_, { channelId }, context) => {
      if (context?.previousOverrides) {
        queryClient.setQueryData(['channel-permissions', channelId], context.previousOverrides);
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channel-permissions', variables.channelId] });
      // Immediately refetch active permission queries for instant UI update
      queryClient.refetchQueries({ queryKey: ['user-channel-permissions'], type: 'active' });
      queryClient.refetchQueries({ queryKey: ['channel-permission'], type: 'active' });
      queryClient.refetchQueries({ queryKey: ['server-channel-permissions'], type: 'active' });
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
      return { channelId, roleId, permission };
    },
    onMutate: async ({ channelId, roleId, permission }) => {
      lockPermissionsMutation(600);
      await queryClient.cancelQueries({ queryKey: ['channel-permissions', channelId] });
      const previousOverrides = queryClient.getQueryData<ChannelPermissionOverride[]>(['channel-permissions', channelId]);
      
      queryClient.setQueryData<ChannelPermissionOverride[]>(['channel-permissions', channelId], old =>
        old?.filter(o => !(o.role_id === roleId && o.permission === permission))
      );
      
      return { previousOverrides, channelId };
    },
    onError: (_, { channelId }, context) => {
      if (context?.previousOverrides) {
        queryClient.setQueryData(['channel-permissions', channelId], context.previousOverrides);
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channel-permissions', variables.channelId] });
      queryClient.refetchQueries({ queryKey: ['user-channel-permissions'], type: 'active' });
      queryClient.refetchQueries({ queryKey: ['channel-permission'], type: 'active' });
      queryClient.refetchQueries({ queryKey: ['server-channel-permissions'], type: 'active' });
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
      return { channelId };
    },
    onMutate: async ({ channelId }) => {
      lockPermissionsMutation(600);
      await queryClient.cancelQueries({ queryKey: ['channel-permissions', channelId] });
      const previousOverrides = queryClient.getQueryData<ChannelPermissionOverride[]>(['channel-permissions', channelId]);
      
      queryClient.setQueryData(['channel-permissions', channelId], []);
      
      return { previousOverrides, channelId };
    },
    onError: (_, { channelId }, context) => {
      if (context?.previousOverrides) {
        queryClient.setQueryData(['channel-permissions', channelId], context.previousOverrides);
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channel-permissions', variables.channelId] });
      queryClient.refetchQueries({ queryKey: ['user-channel-permissions'], type: 'active' });
      queryClient.refetchQueries({ queryKey: ['channel-permission'], type: 'active' });
      queryClient.refetchQueries({ queryKey: ['server-channel-permissions'], type: 'active' });
    },
  });
}

// Réinitialiser les permissions d'un rôle spécifique sur un salon
export function useResetRoleChannelOverrides() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, roleId }: { channelId: string; roleId: string }) => {
      const { error } = await supabase
        .from('channel_permission_overrides')
        .delete()
        .eq('channel_id', channelId)
        .eq('role_id', roleId);

      if (error) throw error;
      return { channelId, roleId };
    },
    onMutate: async ({ channelId, roleId }) => {
      lockPermissionsMutation(600);
      await queryClient.cancelQueries({ queryKey: ['channel-permissions', channelId] });
      const previousOverrides = queryClient.getQueryData<ChannelPermissionOverride[]>(['channel-permissions', channelId]);
      
      queryClient.setQueryData<ChannelPermissionOverride[]>(['channel-permissions', channelId], old =>
        old?.filter(o => o.role_id !== roleId)
      );
      
      return { previousOverrides, channelId };
    },
    onError: (_, { channelId }, context) => {
      if (context?.previousOverrides) {
        queryClient.setQueryData(['channel-permissions', channelId], context.previousOverrides);
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channel-permissions', variables.channelId] });
      queryClient.refetchQueries({ queryKey: ['user-channel-permissions'], type: 'active' });
      queryClient.refetchQueries({ queryKey: ['channel-permission'], type: 'active' });
      queryClient.refetchQueries({ queryKey: ['server-channel-permissions'], type: 'active' });
    },
  });
}
