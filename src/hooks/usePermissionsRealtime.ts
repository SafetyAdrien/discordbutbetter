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

  const pendingPostLockRef = useRef(false);
  const pendingSourceRef = useRef('');

  const doRefetch = useCallback((source: string) => {
    console.log(`[Permissions Realtime] 🔄 Refetching permissions (${source})`);

    // Double strategy: invalidate ALL (marks stale for inactive views) + refetch active (immediate UI)
    PERMISSION_KEYS.forEach(k => {
      queryClient.invalidateQueries({ queryKey: [k] });
      queryClient.refetchQueries({ queryKey: [k], type: 'active' });
    });

    // Also ensure members cache is coherent (role changes affect computed permissions + badges)
    queryClient.invalidateQueries({ queryKey: ['members'] });
    queryClient.refetchQueries({ queryKey: ['members'], type: 'active' });
  }, [queryClient]);

  const debouncedRefetch = useCallback((source: string) => {
    // If mutation lock active, schedule for post-lock instead of dropping
    if (permissionsMutationLockRef.current) {
      pendingPostLockRef.current = true;
      pendingSourceRef.current = source;
      return;
    }

    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => doRefetch(source), 50);
  }, [doRefetch]);

  // Check for pending post-lock refetch
  useEffect(() => {
    const interval = setInterval(() => {
      if (pendingPostLockRef.current && !permissionsMutationLockRef.current) {
        pendingPostLockRef.current = false;
        doRefetch(pendingSourceRef.current || 'post-lock');
      }
    }, 200);
    return () => clearInterval(interval);
  }, [doRefetch]);

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
