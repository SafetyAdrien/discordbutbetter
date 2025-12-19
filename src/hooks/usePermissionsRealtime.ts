import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePermissionsRealtime(serverId: string | null) {
  const queryClient = useQueryClient();
  const mutationLockRef = useRef(false);

  useEffect(() => {
    if (!serverId) return;

    console.log('[Permissions Realtime] Setting up subscription for server:', serverId);

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
          
          console.log('[Permissions Realtime] Invalidating all permission queries (role_permissions)');
          
          // Invalider de manière agressive TOUTES les permissions
          queryClient.invalidateQueries({ 
            queryKey: ['user-channel-permissions'],
            refetchType: 'all'
          });
          queryClient.invalidateQueries({ 
            queryKey: ['channel-permission'],
            refetchType: 'all'
          });
          queryClient.invalidateQueries({ 
            queryKey: ['user-permissions'],
            refetchType: 'all'
          });
          queryClient.invalidateQueries({ 
            queryKey: ['roles', serverId],
            refetchType: 'all'
          });
          queryClient.invalidateQueries({ 
            queryKey: ['role-permissions'],
            refetchType: 'all'
          });
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
          console.log('[Permissions Realtime] Invalidating all permission queries (channel_permission_overrides)');
          
          // Invalider TOUTES les permissions de manière agressive
          queryClient.invalidateQueries({ 
            queryKey: ['channel-permission'],
            refetchType: 'all'
          });
          queryClient.invalidateQueries({ 
            queryKey: ['user-channel-permissions'],
            refetchType: 'all'
          });
          queryClient.invalidateQueries({ 
            queryKey: ['channel-permissions'],
            refetchType: 'all'
          });
          queryClient.invalidateQueries({ 
            queryKey: ['channel-permission-overrides'],
            refetchType: 'all'
          });
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
          
          console.log('[Permissions Realtime] Invalidating all permission queries (category_permission_overrides)');
          
          // Invalider les permissions de catégorie et tous les canaux
          queryClient.invalidateQueries({ 
            queryKey: ['category-permission-overrides'],
            refetchType: 'all'
          });
          queryClient.invalidateQueries({ 
            queryKey: ['category-permissions'],
            refetchType: 'all'
          });
          queryClient.invalidateQueries({ 
            queryKey: ['user-channel-permissions'],
            refetchType: 'all'
          });
          queryClient.invalidateQueries({ 
            queryKey: ['channel-permission'],
            refetchType: 'all'
          });
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
          
          console.log('[Permissions Realtime] Invalidating all permission queries (roles)');
          
          queryClient.invalidateQueries({ 
            queryKey: ['roles', serverId],
            refetchType: 'all'
          });
          queryClient.invalidateQueries({ 
            queryKey: ['user-channel-permissions'],
            refetchType: 'all'
          });
          queryClient.invalidateQueries({ 
            queryKey: ['channel-permission'],
            refetchType: 'all'
          });
          queryClient.invalidateQueries({ 
            queryKey: ['user-permissions'],
            refetchType: 'all'
          });
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
          
          console.log('[Permissions Realtime] Invalidating all permission queries (member_roles)');
          
          queryClient.invalidateQueries({ 
            queryKey: ['user-channel-permissions'],
            refetchType: 'all'
          });
          queryClient.invalidateQueries({ 
            queryKey: ['channel-permission'],
            refetchType: 'all'
          });
          queryClient.invalidateQueries({ 
            queryKey: ['user-permissions'],
            refetchType: 'all'
          });
          queryClient.invalidateQueries({ 
            queryKey: ['member-roles'],
            refetchType: 'all'
          });
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
          console.log('[Global Permissions Realtime] Invalidating permission queries');
          
          // Invalider de manière agressive
          queryClient.invalidateQueries({ 
            queryKey: ['channel-permission'],
            refetchType: 'all'
          });
          queryClient.invalidateQueries({ 
            queryKey: ['user-channel-permissions'],
            refetchType: 'all'
          });
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
          console.log('[Global Permissions Realtime] Invalidating permission queries');
          
          queryClient.invalidateQueries({ 
            queryKey: ['channel-permission'],
            refetchType: 'all'
          });
          queryClient.invalidateQueries({ 
            queryKey: ['user-channel-permissions'],
            refetchType: 'all'
          });
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
          console.log('[Global Permissions Realtime] Invalidating permission queries');
          
          queryClient.invalidateQueries({ 
            queryKey: ['channel-permission'],
            refetchType: 'all'
          });
          queryClient.invalidateQueries({ 
            queryKey: ['user-channel-permissions'],
            refetchType: 'all'
          });
          queryClient.invalidateQueries({ 
            queryKey: ['user-permissions'],
            refetchType: 'all'
          });
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
          console.log('[Global Permissions Realtime] Invalidating permission queries');
          
          queryClient.invalidateQueries({ 
            queryKey: ['channel-permission'],
            refetchType: 'all'
          });
          queryClient.invalidateQueries({ 
            queryKey: ['user-channel-permissions'],
            refetchType: 'all'
          });
          queryClient.invalidateQueries({ 
            queryKey: ['user-permissions'],
            refetchType: 'all'
          });
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
