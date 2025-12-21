import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Unified permissions realtime hook with SEPARATE channels per table
 * to avoid Supabase "mismatch between server and client bindings" errors
 */
export function usePermissionsRealtime(serverId: string | null) {
  const queryClient = useQueryClient();
  const mutationLockRef = useRef(false);

  // Refetch function - shared by all channels
  const refetchAllPermissions = async (source: string) => {
    if (mutationLockRef.current) {
      console.log('[Permissions Realtime] Mutation lock active, skipping refetch');
      return;
    }

    console.log(`[Permissions Realtime] 🔄 Refetching permissions (${source})...`);
    
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['channel-permission'] }),
        queryClient.invalidateQueries({ queryKey: ['channel-permissions'] }),
        queryClient.invalidateQueries({ queryKey: ['user-channel-permissions'] }),
        queryClient.invalidateQueries({ queryKey: ['user-permissions'] }),
        queryClient.invalidateQueries({ queryKey: ['category-permissions'] }),
        queryClient.invalidateQueries({ queryKey: ['roles'] }),
        queryClient.invalidateQueries({ queryKey: ['role-permissions'] }),
        queryClient.invalidateQueries({ queryKey: ['member-roles'] }),
      ]);
      
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['channel-permission'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['channel-permissions'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['user-channel-permissions'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['user-permissions'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['category-permissions'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['roles'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['role-permissions'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['member-roles'], type: 'active' }),
      ]);
      
      console.log(`[Permissions Realtime] ✅ Refetch complete (${source})`);
    } catch (error) {
      console.error(`[Permissions Realtime] ❌ Refetch error (${source}):`, error);
    }
  };

  // Channel 1: role_permissions
  useEffect(() => {
    if (!serverId) return;

    const channel = supabase
      .channel(`perms-role-permissions:${serverId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'role_permissions' },
        () => refetchAllPermissions('role_permissions')
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serverId, queryClient]);

  // Channel 2: channel_permission_overrides
  useEffect(() => {
    if (!serverId) return;

    const channel = supabase
      .channel(`perms-channel-overrides:${serverId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channel_permission_overrides' },
        () => refetchAllPermissions('channel_permission_overrides')
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serverId, queryClient]);

  // Channel 3: category_permission_overrides
  useEffect(() => {
    if (!serverId) return;

    const channel = supabase
      .channel(`perms-category-overrides:${serverId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'category_permission_overrides' },
        () => refetchAllPermissions('category_permission_overrides')
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serverId, queryClient]);

  // Channel 4: roles
  useEffect(() => {
    if (!serverId) return;

    const channel = supabase
      .channel(`perms-roles:${serverId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'roles' },
        (payload) => {
          const roleServerId = (payload.new as any)?.server_id || (payload.old as any)?.server_id;
          if (roleServerId === serverId) {
            refetchAllPermissions('roles');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serverId, queryClient]);

  // Channel 5: member_roles
  useEffect(() => {
    if (!serverId) return;

    const channel = supabase
      .channel(`perms-member-roles:${serverId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'member_roles' },
        () => refetchAllPermissions('member_roles')
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serverId, queryClient]);

  return {
    lockMutations: () => { mutationLockRef.current = true; },
    unlockMutations: () => { 
      setTimeout(() => { mutationLockRef.current = false; }, 500); 
    },
  };
}

// Keep for backward compatibility - now just delegates to main hook logic
export function useGlobalPermissionsRealtime() {
  // Empty - global listening is now handled by usePermissionsRealtime with broader invalidation
}
