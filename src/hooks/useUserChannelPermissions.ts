import { useQuery, useQueries } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';

type ServerPermission = Database['public']['Enums']['server_permission'];

// ── IndexedDB permission cache helpers ──
const PERM_CACHE_PREFIX = 'perm:';

function getPermissionCache(key: string): boolean | null {
  const raw = cacheGetSync<string>(PERM_CACHE_PREFIX + key);
  if (raw === undefined) return null;
  return raw === '1';
}

function setPermissionCache(key: string, value: boolean): void {
  cacheSetAsync(PERM_CACHE_PREFIX + key, value ? '1' : '0');
}

function getPermissionsObjectCache(channelId: string): UserChannelPermissions | null {
  return cacheGetSync<UserChannelPermissions>(PERM_CACHE_PREFIX + 'obj:' + channelId) ?? null;
}

function setPermissionsObjectCache(channelId: string, perms: UserChannelPermissions): void {
  cacheSetAsync(PERM_CACHE_PREFIX + 'obj:' + channelId, perms);
}

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

  const cacheKey = `${channelId}:${permission}`;
  const cached = channelId ? getPermissionCache(cacheKey) : null;

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

      const result = data ?? false;
      setPermissionCache(cacheKey, result);
      return result;
    },
    enabled: !!channelId && !!user?.id,
    staleTime: 0,
    gcTime: 300000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    initialData: cached !== null ? cached : undefined,
    initialDataUpdatedAt: cached !== null ? Date.now() : 0,
  });

  return {
    ...query,
    data: query.data ?? (query.isPending ? (cached ?? true) : false),
  };
}

// Hook pour vérifier PLUSIEURS permissions en parallèle (optimisé)
export function useMultipleChannelPermissions(channelId: string | null, permissions: ServerPermission[]) {
  const { user } = useAuth();

  const queries = useQueries({
    queries: permissions.map((permission) => {
      const cached = channelId ? getPermissionCache(`${channelId}:${permission}`) : null;
      return {
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

          const granted = data ?? false;
          if (channelId) setPermissionCache(`${channelId}:${permission}`, granted);
          return { permission, granted };
        },
        enabled: !!channelId && !!user?.id,
        staleTime: 0,
        gcTime: 300000,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        initialData: cached !== null ? { permission, granted: cached } : undefined,
        initialDataUpdatedAt: cached !== null ? Date.now() : 0,
      };
    }),
  });

  // Bypass loading state when all permissions are already cached
  const allCached = permissions.every(p =>
    channelId ? getPermissionCache(`${channelId}:${p}`) !== null : false
  );
  const isLoading = allCached ? false : queries.some(q => q.isLoading);
  const isPending = allCached ? false : queries.some(q => q.isPending);
  const isError = queries.some(q => q.isError);

  const permissionsMap = new Map<ServerPermission, boolean>();
  queries.forEach((query, index) => {
    const perm = permissions[index];
    const cached = channelId ? getPermissionCache(`${channelId}:${perm}`) : null;
    permissionsMap.set(perm, query.data?.granted ?? (isPending ? (cached ?? true) : false));
  });

  return {
    permissions: permissionsMap,
    isLoading,
    isError,
    can: (permission: ServerPermission) => {
      const cached = channelId ? getPermissionCache(`${channelId}:${permission}`) : null;
      return permissionsMap.get(permission) ?? (isPending ? (cached ?? true) : false);
    },
  };
}

// Hook pour vérifier la visibilité de PLUSIEURS canaux (pour ChannelList)
export function useChannelsVisibility(channelIds: string[]) {
  const { user } = useAuth();

  const queries = useQueries({
    queries: channelIds.map((channelId) => {
      const cached = getPermissionCache(`${channelId}:view_channel`);
      return {
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
            return { channelId, visible: true };
          }

          const visible = data ?? true;
          setPermissionCache(`${channelId}:view_channel`, visible);
          return { channelId, visible };
        },
        enabled: !!channelId && !!user?.id,
        staleTime: 0,
        gcTime: 300000,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        initialData: cached !== null ? { channelId, visible: cached } : undefined,
        initialDataUpdatedAt: cached !== null ? Date.now() : 0,
      };
    }),
  });

  const allCached = channelIds.every(id => getPermissionCache(`${id}:view_channel`) !== null);
  const isLoading = allCached ? false : queries.some(q => q.isLoading);
  const isPending = allCached ? false : queries.some(q => q.isPending);

  // Build a set of visible channel IDs
  const visibleChannelIds = new Set<string>();
  if (isPending && !allCached) {
    channelIds.forEach(id => visibleChannelIds.add(id));
  } else {
    queries.forEach((query, index) => {
      const id = channelIds[index];
      const cached = getPermissionCache(`${id}:view_channel`);
      const visible = query.data?.visible ?? (cached !== null ? cached : true);
      if (visible) visibleChannelIds.add(id);
    });
  }

  return {
    visibleChannelIds,
    isLoading,
    isVisible: (channelId: string) => {
      if (visibleChannelIds.has(channelId)) return true;
      if (isPending && !allCached) return true;
      return false;
    },
  };
}

// Helper to create default permissions object
function defaultPermissions(value: boolean): UserChannelPermissions {
  return {
    canReadMessages: value,
    canSendMessages: value,
    canManageMessages: value,
    canConnectVoice: value,
    canSpeakVoice: value,
    canMentionEveryone: value,
    canManageChannels: value,
    canManageRoles: value,
    isAdmin: value,
  };
}

// Hook pour récupérer toutes les permissions d'un utilisateur sur un salon
export function useUserChannelPermissions(channelId: string | null) {
  const { user } = useAuth();

  const cachedPerms = channelId ? getPermissionsObjectCache(channelId) : null;

  return useQuery({
    queryKey: ['user-channel-permissions', channelId, user?.id],
    queryFn: async (): Promise<UserChannelPermissions> => {
      if (!channelId || !user?.id) {
        return defaultPermissions(false);
      }

      const { data, error } = await supabase.rpc('get_user_channel_permissions', {
        _user_id: user.id,
        _channel_id: channelId,
      });

      if (error) {
        console.error('Error fetching user channel permissions:', error);
        return defaultPermissions(false);
      }

      const permMap = new Map<ServerPermission, boolean>();
      (data || []).forEach((row: { permission: ServerPermission; granted: boolean }) => {
        permMap.set(row.permission, row.granted);
      });

      const result: UserChannelPermissions = {
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

      setPermissionsObjectCache(channelId, result);
      return result;
    },
    enabled: !!channelId && !!user?.id,
    staleTime: 0,
    initialData: cachedPerms ?? undefined,
    initialDataUpdatedAt: cachedPerms ? Date.now() : 0,
    placeholderData: cachedPerms ?? defaultPermissions(true),
  });
}
