import { useQuery, useQueries } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type ServerPermission = Database['public']['Enums']['server_permission'];

export interface UserChannelPermissions {
  canReadMessages: boolean;
  canSendMessages: boolean;
  canManageMessages: boolean;
  canConnectVoice: boolean;
  canSpeakVoice: boolean;
  canMentionEveryone: boolean;
  canManageChannels: boolean;
  canManageRoles: boolean;
  isAdmin: boolean;
}

// Hook pour vérifier une permission spécifique sur un salon
export function useHasChannelPermission(channelId: string | null, permission: ServerPermission) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['channel-permission', channelId, permission, user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!channelId || !user?.id) return false;

      const { data, error } = await supabase.rpc('has_channel_permission', {
        _user_id: user.id,
        _channel_id: channelId,
        _permission: permission,
      });

      if (error) {
        console.error('Error checking channel permission:', error);
        return false;
      }

      return data ?? false;
    },
    enabled: !!channelId && !!user?.id,
    staleTime: 30000, // Cache 30s — realtime handles invalidation
    gcTime: 300000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // OPTIMISTIC: default to true during loading to prevent flash of disabled UI
  return {
    ...query,
    data: query.data ?? (query.isLoading ? true : false),
  };
}

// Hook pour vérifier PLUSIEURS permissions en parallèle (optimisé)
export function useMultipleChannelPermissions(channelId: string | null, permissions: ServerPermission[]) {
  const { user } = useAuth();

  const queries = useQueries({
    queries: permissions.map((permission) => ({
      queryKey: ['channel-permission', channelId, permission, user?.id],
      queryFn: async (): Promise<{ permission: ServerPermission; granted: boolean }> => {
        if (!channelId || !user?.id) return { permission, granted: false };

        const { data, error } = await supabase.rpc('has_channel_permission', {
          _user_id: user.id,
          _channel_id: channelId,
          _permission: permission,
        });

        if (error) {
          console.error(`Error checking ${permission}:`, error);
          return { permission, granted: false };
        }

        return { permission, granted: data ?? false };
      },
      enabled: !!channelId && !!user?.id,
      staleTime: 30000, // Cache 30s — realtime handles invalidation
      gcTime: 300000,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    })),
  });

  const isLoading = queries.some(q => q.isLoading);
  const isError = queries.some(q => q.isError);

  // Build a map of permission -> granted
  // OPTIMISTIC: default to TRUE during loading to prevent flash of disabled UI on refresh
  const permissionsMap = new Map<ServerPermission, boolean>();
  queries.forEach((query, index) => {
    const optimisticDefault = isLoading ? true : false;
    permissionsMap.set(permissions[index], query.data?.granted ?? optimisticDefault);
  });

  return {
    permissions: permissionsMap,
    isLoading,
    isError,
    // Helper function to check a specific permission
    can: (permission: ServerPermission) => permissionsMap.get(permission) ?? (isLoading ? true : false),
  };
}

// Hook pour vérifier la visibilité de PLUSIEURS canaux (pour ChannelList)
export function useChannelsVisibility(channelIds: string[]) {
  const { user } = useAuth();

  const queries = useQueries({
    queries: channelIds.map((channelId) => ({
      queryKey: ['channel-permission', channelId, 'view_channel', user?.id],
      queryFn: async (): Promise<{ channelId: string; visible: boolean }> => {
        if (!channelId || !user?.id) return { channelId, visible: true };

        const { data, error } = await supabase.rpc('has_channel_permission', {
          _user_id: user.id,
          _channel_id: channelId,
          _permission: 'view_channel' as ServerPermission,
        });

        if (error) {
          console.error(`Error checking view_channel for ${channelId}:`, error);
          // Default to visible on error to not lock users out
          return { channelId, visible: true };
        }

        return { channelId, visible: data ?? true };
      },
      enabled: !!channelId && !!user?.id,
      staleTime: 0,
      gcTime: 300000,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    })),
  });

  // Build a set of visible channel IDs
  const visibleChannelIds = new Set<string>();
  queries.forEach((query) => {
    if (query.data?.visible) {
      visibleChannelIds.add(query.data.channelId);
    }
  });

  const isLoading = queries.some(q => q.isLoading);

  return {
    visibleChannelIds,
    isLoading,
    isVisible: (channelId: string) => visibleChannelIds.has(channelId),
  };
}

// Hook pour récupérer toutes les permissions d'un utilisateur sur un salon
export function useUserChannelPermissions(channelId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-channel-permissions', channelId, user?.id],
    queryFn: async (): Promise<UserChannelPermissions> => {
      if (!channelId || !user?.id) {
        return {
          canReadMessages: false,
          canSendMessages: false,
          canManageMessages: false,
          canConnectVoice: false,
          canSpeakVoice: false,
          canMentionEveryone: false,
          canManageChannels: false,
          canManageRoles: false,
          isAdmin: false,
        };
      }

      const { data, error } = await supabase.rpc('get_user_channel_permissions', {
        _user_id: user.id,
        _channel_id: channelId,
      });

      if (error) {
        console.error('Error fetching user channel permissions:', error);
        return {
          canReadMessages: false,
          canSendMessages: false,
          canManageMessages: false,
          canConnectVoice: false,
          canSpeakVoice: false,
          canMentionEveryone: false,
          canManageChannels: false,
          canManageRoles: false,
          isAdmin: false,
        };
      }

      // Convertir le résultat en objet de permissions
      const permMap = new Map<ServerPermission, boolean>();
      (data || []).forEach((row: { permission: ServerPermission; granted: boolean }) => {
        permMap.set(row.permission, row.granted);
      });

      return {
        canReadMessages: permMap.get('read_messages') ?? false,
        canSendMessages: permMap.get('send_messages') ?? false,
        canManageMessages: permMap.get('manage_messages') ?? false,
        canConnectVoice: permMap.get('connect_voice') ?? false,
        canSpeakVoice: permMap.get('speak_voice') ?? false,
        canMentionEveryone: permMap.get('mention_everyone') ?? false,
        canManageChannels: permMap.get('manage_channels') ?? false,
        canManageRoles: permMap.get('manage_roles') ?? false,
        isAdmin: permMap.get('administrator') ?? false,
      };
    },
    enabled: !!channelId && !!user?.id,
    staleTime: 0, // Always refetch on invalidation for realtime updates
  });
}
