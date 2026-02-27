import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Shared lock: prevents Realtime invalidations while a local mutation is settling. */
export const permissionsMutationLockRef = { current: false };

/** Lock helper — sets lock and auto-releases after `ms`. */
export function lockPermissionsMutation(ms = 600) {
  permissionsMutationLockRef.current = true;
  setTimeout(() => { permissionsMutationLockRef.current = false; }, ms);
}

/** All permission-related query keys that must stay in sync. */
const PERMISSION_KEYS = [
  'channel-permission',
  'channel-permissions',
  'user-channel-permissions',
  'user-permissions',
  'category-permissions',
  'roles',
  'role-permissions',
  'member-roles',
  'server-channel-permissions',
] as const;

/**
 * Unified permissions realtime hook with SEPARATE channels per table.
 * Uses `refetchQueries` (type: 'active') for immediate refetch instead of lazy invalidation.
 * Debounced at 150ms to coalesce rapid events.
 */
export function usePermissionsRealtime(serverId: string | null) {
  const queryClient = useQueryClient();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const debouncedRefetch = useCallback((source: string) => {
    if (permissionsMutationLockRef.current) return;

    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      console.log(`[Permissions Realtime] 🔄 Refetching permissions (${source})`);

      // refetchQueries with type: 'active' immediately refetches all active queries
      // matching these keys — much faster feedback than invalidateQueries.
      PERMISSION_KEYS.forEach(k =>
        queryClient.refetchQueries({ queryKey: [k], type: 'active' })
      );
    }, 150);
  }, [queryClient]);

  useEffect(() => {
    return () => clearTimeout(debounceTimerRef.current);
  }, []);

  // Channel 1: role_permissions
  useEffect(() => {
    if (!serverId) return;
    const channel = supabase
      .channel(`perms-role-permissions:${serverId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'role_permissions' },
        () => debouncedRefetch('role_permissions'))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [serverId, debouncedRefetch]);

  // Channel 2: channel_permission_overrides
  useEffect(() => {
    if (!serverId) return;
    const channel = supabase
      .channel(`perms-channel-overrides:${serverId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channel_permission_overrides' },
        () => debouncedRefetch('channel_permission_overrides'))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [serverId, debouncedRefetch]);

  // Channel 3: category_permission_overrides
  useEffect(() => {
    if (!serverId) return;
    const channel = supabase
      .channel(`perms-category-overrides:${serverId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'category_permission_overrides' },
        () => debouncedRefetch('category_permission_overrides'))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [serverId, debouncedRefetch]);

  // Channel 4: roles
  useEffect(() => {
    if (!serverId) return;
    const channel = supabase
      .channel(`perms-roles:${serverId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roles' },
        (payload) => {
          const roleServerId = (payload.new as any)?.server_id || (payload.old as any)?.server_id;
          if (roleServerId === serverId) {
            debouncedRefetch('roles');
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [serverId, debouncedRefetch]);

  // Channel 5: member_roles
  useEffect(() => {
    if (!serverId) return;
    const channel = supabase
      .channel(`perms-member-roles:${serverId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'member_roles' },
        () => debouncedRefetch('member_roles'))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [serverId, debouncedRefetch]);
}

// Keep for backward compatibility
export function useGlobalPermissionsRealtime() {}
