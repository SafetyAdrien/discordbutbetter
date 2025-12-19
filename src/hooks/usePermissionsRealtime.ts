import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePermissionsRealtime(serverId: string | null) {
  const queryClient = useQueryClient();
  const mutationLockRef = useRef(false);

  useEffect(() => {
    if (!serverId) return;

    console.log('[Permissions Realtime] Setting up subscription for server:', serverId);

    const refetchAllPermissions = async (source: string) => {
      console.log(`[Permissions Realtime] 🔄 Refetching all permissions (${source})...`);
      
      // Log current cache state before refetch
      const cachedQueries = queryClient.getQueryCache().findAll({ queryKey: ['channel-permission'] });
      console.log(`[Permissions Realtime] Found ${cachedQueries.length} cached channel-permission queries`);
      cachedQueries.forEach(q => {
        console.log(`[Permissions Realtime] - Query key: ${JSON.stringify(q.queryKey)}, state: ${q.state.status}`);
      });
      
      try {
        // Use invalidateQueries with exact: false to match partial keys, then refetch
        await queryClient.invalidateQueries({ queryKey: ['channel-permission'] });
        await queryClient.invalidateQueries({ queryKey: ['user-channel-permissions'] });
        
        // Force refetch all active queries
        await queryClient.refetchQueries({ 
          queryKey: ['channel-permission'],
          type: 'active'
        });
        await queryClient.refetchQueries({ 
          queryKey: ['user-channel-permissions'],
          type: 'active'
        });
        await queryClient.refetchQueries({ queryKey: ['user-permissions'], type: 'all' });
        await queryClient.refetchQueries({ queryKey: ['roles', serverId], type: 'all' });
        await queryClient.refetchQueries({ queryKey: ['role-permissions'], type: 'all' });
        await queryClient.refetchQueries({ queryKey: ['channel-permissions'], type: 'all' });
        await queryClient.refetchQueries({ queryKey: ['channel-permission-overrides'], type: 'all' });
        await queryClient.refetchQueries({ queryKey: ['category-permission-overrides'], type: 'all' });
        await queryClient.refetchQueries({ queryKey: ['category-permissions'], type: 'all' });
        await queryClient.refetchQueries({ queryKey: ['member-roles'], type: 'all' });
        
        console.log(`[Permissions Realtime] ✅ Refetch complete (${source})`);
      } catch (error) {
        console.error(`[Permissions Realtime] ❌ Refetch error (${source}):`, error);
      }
    };

    const channel = supabase
      .channel(`permissions-realtime:${serverId}`)
      // Écouter les changements sur role_permissions
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'role_permissions',
        },
        (payload) => {
          console.log('[Permissions Realtime] role_permissions event:', payload.eventType, payload);
          
          if (mutationLockRef.current) {
            console.log('[Permissions Realtime] Mutation lock active, skipping');
            return;
          }
          
          refetchAllPermissions('role_permissions');
        }
      )
      // Écouter les changements sur channel_permission_overrides
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channel_permission_overrides',
        },
        (payload) => {
          console.log('[Permissions Realtime] channel_permission_overrides event:', payload.eventType, payload);
          
          if (mutationLockRef.current) {
            console.log('[Permissions Realtime] Mutation lock active, skipping');
            return;
          }
          
          const channelId = (payload.new as any)?.channel_id || (payload.old as any)?.channel_id;
          console.log('[Permissions Realtime] Channel ID from payload:', channelId);
          
          refetchAllPermissions('channel_permission_overrides');
        }
      )
      // Écouter les changements sur category_permission_overrides
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'category_permission_overrides',
        },
        (payload) => {
          console.log('[Permissions Realtime] category_permission_overrides event:', payload.eventType, payload);
          
          if (mutationLockRef.current) {
            console.log('[Permissions Realtime] Mutation lock active, skipping');
            return;
          }
          
          refetchAllPermissions('category_permission_overrides');
        }
      )
      // Écouter les changements sur roles
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'roles',
          filter: `server_id=eq.${serverId}`,
        },
        (payload) => {
          console.log('[Permissions Realtime] roles event:', payload.eventType, payload);
          
          if (mutationLockRef.current) {
            console.log('[Permissions Realtime] Mutation lock active, skipping');
            return;
          }
          
          refetchAllPermissions('roles');
        }
      )
      // Écouter les changements sur member_roles (assignation de rôles)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'member_roles',
        },
        (payload) => {
          console.log('[Permissions Realtime] member_roles event:', payload.eventType, payload);
          
          if (mutationLockRef.current) {
            console.log('[Permissions Realtime] Mutation lock active, skipping');
            return;
          }
          
          refetchAllPermissions('member_roles');
        }
      )
      .subscribe((status, err) => {
        console.log('[Permissions Realtime] Subscription status:', status, err ? `Error: ${err}` : '');
        if (status === 'SUBSCRIBED') {
          console.log('[Permissions Realtime] ✅ Successfully subscribed to server:', serverId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Permissions Realtime] ❌ Channel error for server:', serverId, err);
        }
      });

    return () => {
      console.log('[Permissions Realtime] Cleaning up subscription for server:', serverId);
      supabase.removeChannel(channel);
    };
  }, [serverId, queryClient]);

  // Exposer le lock pour les mutations locales
  return {
    lockMutations: () => { mutationLockRef.current = true; },
    unlockMutations: () => { 
      setTimeout(() => { mutationLockRef.current = false; }, 500); 
    },
  };
}

// Hook global pour écouter les permissions sur TOUS les serveurs (pour les utilisateurs)
export function useGlobalPermissionsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('[Global Permissions Realtime] Setting up global subscription');

    const refetchAllPermissions = async (source: string) => {
      console.log(`[Global Permissions Realtime] 🔄 Refetching all permissions (${source})...`);
      
      try {
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['user-channel-permissions'], type: 'all' }),
          queryClient.refetchQueries({ queryKey: ['channel-permission'], type: 'all' }),
          queryClient.refetchQueries({ queryKey: ['user-permissions'], type: 'all' }),
          queryClient.refetchQueries({ queryKey: ['channel-permissions'], type: 'all' }),
          queryClient.refetchQueries({ queryKey: ['channel-permission-overrides'], type: 'all' }),
          queryClient.refetchQueries({ queryKey: ['category-permission-overrides'], type: 'all' }),
          queryClient.refetchQueries({ queryKey: ['category-permissions'], type: 'all' }),
        ]);
        console.log(`[Global Permissions Realtime] ✅ Refetch complete (${source})`);
      } catch (error) {
        console.error(`[Global Permissions Realtime] ❌ Refetch error (${source}):`, error);
      }
    };

    const channel = supabase
      .channel('global-permissions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channel_permission_overrides',
        },
        (payload) => {
          console.log('[Global Permissions Realtime] channel_permission_overrides event:', payload.eventType, payload);
          
          const channelId = (payload.new as any)?.channel_id || (payload.old as any)?.channel_id;
          console.log('[Global Permissions Realtime] Channel ID:', channelId);
          
          refetchAllPermissions('channel_permission_overrides');
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'category_permission_overrides',
        },
        (payload) => {
          console.log('[Global Permissions Realtime] category_permission_overrides event:', payload.eventType, payload);
          
          refetchAllPermissions('category_permission_overrides');
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'role_permissions',
        },
        (payload) => {
          console.log('[Global Permissions Realtime] role_permissions event:', payload.eventType, payload);
          
          refetchAllPermissions('role_permissions');
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'member_roles',
        },
        (payload) => {
          console.log('[Global Permissions Realtime] member_roles event:', payload.eventType, payload);
          
          refetchAllPermissions('member_roles');
        }
      )
      .subscribe((status, err) => {
        console.log('[Global Permissions Realtime] Subscription status:', status, err ? `Error: ${err}` : '');
        if (status === 'SUBSCRIBED') {
          console.log('[Global Permissions Realtime] ✅ Successfully subscribed');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Global Permissions Realtime] ❌ Channel error:', err);
        }
      });

    return () => {
      console.log('[Global Permissions Realtime] Cleaning up global subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
