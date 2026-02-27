import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Unified permissions realtime hook with SEPARATE channels per table
 * and debounced invalidation to prevent excessive refetches.
 */
export function usePermissionsRealtime(serverId: string | null) {
  const queryClient = useQueryClient();
  const mutationLockRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounced invalidation — coalesces multiple rapid events into one batch
  const debouncedInvalidate = useCallback((source: string) => {
    if (mutationLockRef.current) return;

    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      console.log(`[Permissions Realtime] 🔄 Invalidating permissions (${source})`);

      // Single invalidateQueries pass — React Query will refetch only active queries
      const keys = [
        'channel-permission',
        'channel-permissions',
        'user-channel-permissions',
        'user-permissions',
        'category-permissions',
        'roles',
        'role-permissions',
        'member-roles',
        'server-channel-permissions',
      ];

      keys.forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
    }, 250);
  }, [queryClient]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => clearTimeout(debounceTimerRef.current);
  }, []);

  // Channel 1: role_permissions
  useEffect(() => {
    if (!serverId) return;
    const channel = supabase
      .channel(`perms-role-permissions:${serverId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'role_permissions' },
        () => debouncedInvalidate('role_permissions'))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [serverId, debouncedInvalidate]);

  // Channel 2: channel_permission_overrides
  useEffect(() => {
    if (!serverId) return;
    const channel = supabase
      .channel(`perms-channel-overrides:${serverId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channel_permission_overrides' },
        () => debouncedInvalidate('channel_permission_overrides'))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [serverId, debouncedInvalidate]);

  // Channel 3: category_permission_overrides
  useEffect(() => {
    if (!serverId) return;
    const channel = supabase
      .channel(`perms-category-overrides:${serverId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'category_permission_overrides' },
        () => debouncedInvalidate('category_permission_overrides'))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [serverId, debouncedInvalidate]);

  // Channel 4: roles
  useEffect(() => {
    if (!serverId) return;
    const channel = supabase
      .channel(`perms-roles:${serverId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roles' },
        (payload) => {
          const roleServerId = (payload.new as any)?.server_id || (payload.old as any)?.server_id;
          if (roleServerId === serverId) {
            debouncedInvalidate('roles');
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [serverId, debouncedInvalidate]);

  // Channel 5: member_roles
  useEffect(() => {
    if (!serverId) return;
    const channel = supabase
      .channel(`perms-member-roles:${serverId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'member_roles' },
        () => debouncedInvalidate('member_roles'))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [serverId, debouncedInvalidate]);

  return {
    lockMutations: () => { mutationLockRef.current = true; },
    unlockMutations: () => {
      setTimeout(() => { mutationLockRef.current = false; }, 500);
    },
  };
}

// Keep for backward compatibility
export function useGlobalPermissionsRealtime() {}
