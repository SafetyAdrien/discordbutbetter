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
        (payload) => {
          if (mutationLockRef.current) return;
          
          // Avec REPLICA IDENTITY FULL, on a les données complètes
          const roleId = (payload.new as any)?.role_id || (payload.old as any)?.role_id;
          if (!roleId) return;
          
          // Invalider de manière agressive toutes les permissions
          queryClient.invalidateQueries({ 
            predicate: (query) => {
              const key = query.queryKey;
              return (
                key[0] === 'user-channel-permissions' ||
                key[0] === 'channel-permission' ||
                key[0] === 'user-permissions' ||
                (key[0] === 'roles' && key[1] === serverId) ||
                (key[0] === 'role-permissions' && key[1] === roleId)
              );
            }
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
          if (mutationLockRef.current) return;
          
          // Avec REPLICA IDENTITY FULL, on a le channel_id directement
          const channelId = (payload.new as any)?.channel_id || (payload.old as any)?.channel_id;
          
          // Invalider TOUTES les permissions - plus sûr pour le realtime
          queryClient.invalidateQueries({ 
            predicate: (query) => {
              const key = query.queryKey;
              
              // Si on a le channelId, invalider seulement ce canal
              if (channelId) {
                return (
                  (key[0] === 'channel-permission' && key[1] === channelId) ||
                  (key[0] === 'user-channel-permissions' && key[1] === channelId) ||
                  (key[0] === 'channel-permissions' && key[1] === channelId) ||
                  (key[0] === 'channel-permission-overrides' && key[1] === channelId)
                );
              }
              
              // Sinon, invalider toutes les permissions
              return (
                key[0] === 'channel-permission' ||
                key[0] === 'user-channel-permissions' ||
                key[0] === 'channel-permissions' ||
                key[0] === 'channel-permission-overrides'
              );
            }
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
          if (mutationLockRef.current) return;
          
          const categoryId = (payload.new as any)?.category_id || (payload.old as any)?.category_id;
          
          // Invalider les permissions de catégorie et tous les canaux (car ils peuvent hériter)
          queryClient.invalidateQueries({ 
            predicate: (query) => {
              const key = query.queryKey;
              
              if (categoryId) {
                return (
                  (key[0] === 'category-permission-overrides' && key[1] === categoryId) ||
                  (key[0] === 'category-permissions' && key[1] === categoryId) ||
                  // Invalider aussi toutes les permissions de canal car elles héritent de la catégorie
                  key[0] === 'user-channel-permissions' ||
                  key[0] === 'channel-permission'
                );
              }
              
              return (
                key[0] === 'category-permission-overrides' ||
                key[0] === 'category-permissions' ||
                key[0] === 'user-channel-permissions' ||
                key[0] === 'channel-permission'
              );
            }
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
          if (mutationLockRef.current) return;
          
          queryClient.invalidateQueries({ queryKey: ['roles', serverId] });
          // Invalider toutes les permissions utilisateur car les rôles ont changé
          queryClient.invalidateQueries({ 
            predicate: (query) => {
              const key = query.queryKey;
              return (
                key[0] === 'user-channel-permissions' ||
                key[0] === 'channel-permission' ||
                key[0] === 'user-permissions'
              );
            }
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
          if (mutationLockRef.current) return;
          
          // Quand un rôle est assigné/retiré, invalider toutes les permissions
          queryClient.invalidateQueries({ 
            predicate: (query) => {
              const key = query.queryKey;
              return (
                key[0] === 'user-channel-permissions' ||
                key[0] === 'channel-permission' ||
                key[0] === 'user-permissions' ||
                key[0] === 'member-roles'
              );
            }
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Permissions Realtime] Subscribed to server:', serverId);
        }
      });

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

// Hook global pour écouter les permissions sur TOUS les serveurs (pour les utilisateurs)
export function useGlobalPermissionsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
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
          const channelId = (payload.new as any)?.channel_id || (payload.old as any)?.channel_id;
          
          if (channelId) {
            // Invalider les permissions de ce canal spécifique
            queryClient.invalidateQueries({ 
              predicate: (query) => {
                const key = query.queryKey;
                return (
                  (key[0] === 'channel-permission' && key[1] === channelId) ||
                  (key[0] === 'user-channel-permissions' && key[1] === channelId)
                );
              }
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'category_permission_overrides',
        },
        () => {
          // Les catégories affectent tous les canaux enfants
          queryClient.invalidateQueries({ 
            predicate: (query) => {
              const key = query.queryKey;
              return (
                key[0] === 'channel-permission' ||
                key[0] === 'user-channel-permissions'
              );
            }
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
        () => {
          // Les permissions de rôle affectent tous les utilisateurs
          queryClient.invalidateQueries({ 
            predicate: (query) => {
              const key = query.queryKey;
              return (
                key[0] === 'channel-permission' ||
                key[0] === 'user-channel-permissions' ||
                key[0] === 'user-permissions'
              );
            }
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
        () => {
          // Les assignations de rôles affectent les permissions utilisateur
          queryClient.invalidateQueries({ 
            predicate: (query) => {
              const key = query.queryKey;
              return (
                key[0] === 'channel-permission' ||
                key[0] === 'user-channel-permissions' ||
                key[0] === 'user-permissions'
              );
            }
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Global Permissions Realtime] Subscribed');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
