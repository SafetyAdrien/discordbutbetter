import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePermissionsRealtime(serverId: string | null) {
  const queryClient = useQueryClient();
  const mutationLockRef = useRef(false);

  useEffect(() => {
    if (!serverId) return;

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
        async (payload) => {
          if (mutationLockRef.current) return;
          
          // Récupérer le serverId du rôle modifié
          const roleId = (payload.new as any)?.role_id || (payload.old as any)?.role_id;
          if (!roleId) return;
          
          // Vérifier si ce rôle appartient à notre serveur
          const { data: role } = await supabase
            .from('roles')
            .select('server_id')
            .eq('id', roleId)
            .single();
          
          if (role?.server_id === serverId) {
            // Invalider toutes les permissions utilisateur de ce serveur
            queryClient.invalidateQueries({ 
              predicate: (query) => 
                query.queryKey[0] === 'user-channel-permissions' ||
                query.queryKey[0] === 'channel-permission'
            });
            queryClient.invalidateQueries({ queryKey: ['roles', serverId] });
          }
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
        async (payload) => {
          if (mutationLockRef.current) return;
          
          const channelId = (payload.new as any)?.channel_id || (payload.old as any)?.channel_id;
          if (!channelId) return;
          
          // Vérifier si ce canal appartient à notre serveur
          const { data: channel } = await supabase
            .from('channels')
            .select('server_id')
            .eq('id', channelId)
            .single();
          
          if (channel?.server_id === serverId) {
            // Invalidate channel permission overrides
            queryClient.invalidateQueries({ queryKey: ['channel-permission-overrides', channelId] });
            queryClient.invalidateQueries({ queryKey: ['channel-permissions', channelId] });
            queryClient.invalidateQueries({ 
              predicate: (query) => 
                query.queryKey[0] === 'user-channel-permissions' && query.queryKey[1] === channelId
            });
            queryClient.invalidateQueries({ 
              predicate: (query) => 
                query.queryKey[0] === 'channel-permission' && query.queryKey[1] === channelId
            });
          }
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
        async (payload) => {
          if (mutationLockRef.current) return;
          
          const categoryId = (payload.new as any)?.category_id || (payload.old as any)?.category_id;
          if (!categoryId) return;
          
          // Vérifier si cette catégorie appartient à notre serveur
          const { data: category } = await supabase
            .from('categories')
            .select('server_id')
            .eq('id', categoryId)
            .single();
          
          if (category?.server_id === serverId) {
            // Invalidate category permission overrides
            queryClient.invalidateQueries({ queryKey: ['category-permission-overrides', categoryId] });
            queryClient.invalidateQueries({ queryKey: ['category-permissions', categoryId] });
            // Invalider aussi les permissions des canaux de cette catégorie
            queryClient.invalidateQueries({ 
              predicate: (query) => 
                query.queryKey[0] === 'user-channel-permissions' ||
                query.queryKey[0] === 'channel-permission'
            });
          }
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
          if (mutationLockRef.current) return;
          
          queryClient.invalidateQueries({ queryKey: ['roles', serverId] });
          // Invalider aussi les permissions utilisateur car les rôles ont changé
          queryClient.invalidateQueries({ 
            predicate: (query) => 
              query.queryKey[0] === 'user-channel-permissions' ||
              query.queryKey[0] === 'channel-permission'
          });
        }
      )
      .subscribe();

    return () => {
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
