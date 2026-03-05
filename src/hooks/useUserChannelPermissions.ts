import { useQuery, useQueries } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type ServerPermission = Database['public']['Enums']['server_permission'];

// ── sessionStorage permission cache helpers ──
// Persists permission results so that on hard refresh (CTRL+F5),
// the last-known value is used instead of optimistic `true`.
const PERM_CACHE_PREFIX = 'perm:';

function getPermissionCache(key: string): boolean | null {
  try {
    const raw = sessionStorage.getItem(PERM_CACHE_PREFIX + key);
    if (raw === null) return null;
    return raw === '1';
  } catch {
    return null;
  }
}

function setPermissionCache(key: string, value: boolean): void {
  try {
    sessionStorage.setItem(PERM_CACHE_PREFIX + key, value ? '1' : '0');
  } catch {
    // quota exceeded or private browsing – ignore
  }
}

function getPermissionsObjectCache(channelId: string): UserChannelPermissions | null {
  try {
    const raw = sessionStorage.getItem(PERM_CACHE_PREFIX + 'obj:' + channelId);
    if (!raw) return null;
    return JSON.parse(raw) as UserChannelPermissions;
  } catch {
    return null;
  }
}

function setPermissionsObjectCache(channelId: string, perms: UserChannelPermissions): void {
  try {
    sessionStorage.setItem(PERM_CACHE_PREFIX + 'obj:' + channelId, JSON.stringify(perms));
  } catch {
    // ignore
  }
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
  const cached = getPermissionCache(cacheKey);

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
    staleTime: 30000,
    gcTime: 300000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Use sessionStorage cache as fallback during loading; only fall back to true if no cache exists
  return {
    ...query,
    data: query.data ?? (query.isPending ? (cached ?? true) : false),
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

        const granted = data ?? false;
        if (channelId) setPermissionCache(`${channelId}:${permission}`, granted);
        return { permission, granted };
      },
      enabled: !!channelId && !!user?.id,
      staleTime: 30000,
      gcTime: 300000,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    })),
  });

  // Bypass loading state when all permissions are already cached in sessionStorage
  const allCached = permissions.every(p =>
    channelId ? getPermissionCache(`${channelId}:${p}`) !== null : false
  );
  const isLoading = allCached ? false : queries.some(q => q.isLoading);
  const isPending = allCached ? false : queries.some(q => q.isPending);
  const isError = queries.some(q => q.isError);

  // Build a map of permission -> granted
  // Use sessionStorage cache during loading; fall back to true only if no cache
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
          return { channelId, visible: true };
        }

        return { channelId, visible: data ?? true };
      },
      enabled: !!channelId && !!user?.id,
      staleTime: 30000,
      gcTime: 300000,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    })),
  });

  const isLoading = queries.some(q => q.isLoading);
  const isPending = queries.some(q => q.isPending);

  // Build a set of visible channel IDs
  // OPTIMISTIC: while data hasn't arrived, assume ALL channels visible to prevent flash
  const visibleChannelIds = new Set<string>();
  if (isPending) {
    channelIds.forEach(id => visibleChannelIds.add(id));
  } else {
    queries.forEach((query) => {
      if (query.data?.visible) {
        visibleChannelIds.add(query.data.channelId);
      }
    });
  }

  return {
    visibleChannelIds,
    isLoading,
    isVisible: (channelId: string) => isPending ? true : visibleChannelIds.has(channelId),
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
    staleTime: 30000,
    // Use cached value from sessionStorage; fall back to all-true only on first-ever visit
    placeholderData: cachedPerms ?? defaultPermissions(true),
  });
}
