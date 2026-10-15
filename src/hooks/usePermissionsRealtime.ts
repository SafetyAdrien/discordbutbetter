import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Shared lock: prevents Realtime invalidations while a local mutation is settling. */
export const permissionsMutationLockRef = { current: false };

/** Lock helper — sets lock and auto-releases after `ms`, then dispatches event. */
export function lockPermissionsMutation(ms = 50) {
  permissionsMutationLockRef.current = true;
  setTimeout(() => {
    permissionsMutationLockRef.current = false;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('permissions:lock-released'));
    }
  }, ms);
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
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));

  const pendingPostLockRef = useRef(false);
  const pendingSourceRef = useRef('');

  const doRefetch = useCallback((source: string) => {
    console.log(`[Permissions Realtime] 🔄 Refetching permissions (${source})`);

    // Double strategy: invalidate ALL (marks stale for inactive views) + refetch active (immediate UI)
    PERMISSION_KEYS.forEach(k => {
      queryClient.invalidateQueries({ queryKey: [k] });
      queryClient.refetchQueries({ queryKey: [k], type: 'active' });
    });

    // Mark members cache stale so future reads are fresh, but DO NOT actively
    // refetch — useMembers owns its own realtime subscription + targeted patching,
    // and an aggressive refetch here can briefly overwrite an optimistic role
    // toggle with a pre-write server snapshot (visible "jump" on click).
    queryClient.invalidateQueries({ queryKey: ['members'], refetchType: 'none' });
  }, [queryClient]);

  const debouncedRefetch = useCallback((source: string) => {
    // If mutation lock active, schedule for post-lock instead of dropping
    if (permissionsMutationLockRef.current) {
      pendingPostLockRef.current = true;
      pendingSourceRef.current = source;
      return;
    }

    // Trailing debounce: coalesce bursts of realtime events into a single refetch
    // to prevent UI "jumps" when many member_roles events arrive in quick succession.
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (permissionsMutationLockRef.current) {
        pendingPostLockRef.current = true;
        pendingSourceRef.current = source;
        return;
      }
      doRefetch(source);
    }, 350);
  }, [doRefetch]);

  // Event-driven post-lock refetch (no polling)
  useEffect(() => {
    const handler = () => {
      if (pendingPostLockRef.current && !permissionsMutationLockRef.current) {
        pendingPostLockRef.current = false;
        doRefetch(pendingSourceRef.current || 'post-lock');
      }
    };
    window.addEventListener('permissions:lock-released', handler);
    return () => window.removeEventListener('permissions:lock-released', handler);
  }, [doRefetch]);

  useEffect(() => {
    return () => clearTimeout(debounceTimerRef.current);
  }, []);

  // Channel 1: role_permissions
  useEffect(() => {
    if (!serverId) return;
    const channel = supabase
      .channel(`perms-role-permissions:${serverId}-${instanceIdRef.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'role_permissions' },
        () => debouncedRefetch('role_permissions'))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [serverId, debouncedRefetch]);

  // Channel 2: channel_permission_overrides
  useEffect(() => {
    if (!serverId) return;
    const channel = supabase
      .channel(`perms-channel-overrides:${serverId}-${instanceIdRef.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channel_permission_overrides' },
        () => debouncedRefetch('channel_permission_overrides'))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [serverId, debouncedRefetch]);

  // Channel 3: category_permission_overrides
  useEffect(() => {
    if (!serverId) return;
    const channel = supabase
      .channel(`perms-category-overrides:${serverId}-${instanceIdRef.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'category_permission_overrides' },
        () => debouncedRefetch('category_permission_overrides'))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [serverId, debouncedRefetch]);

  // Channel 4: roles
  useEffect(() => {
    if (!serverId) return;
    const channel = supabase
      .channel(`perms-roles:${serverId}-${instanceIdRef.current}`)
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
      .channel(`perms-member-roles:${serverId}-${instanceIdRef.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'member_roles' },
        () => debouncedRefetch('member_roles'))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [serverId, debouncedRefetch]);
}

// Keep for backward compatibility
export function useGlobalPermissionsRealtime() {}
