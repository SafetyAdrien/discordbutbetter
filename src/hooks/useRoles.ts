import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { membersMutationLockRef } from './useMembers';
import { lockPermissionsMutation } from './usePermissionsRealtime';

/** Refetch all active permission-related queries for immediate UI sync. */
function refetchPermissionCaches(queryClient: ReturnType<typeof useQueryClient>) {
  const keys = [
    'channel-permission',
    'user-channel-permissions',
    'server-channel-permissions',
    'category-permissions',
  ];
  keys.forEach(k => queryClient.refetchQueries({ queryKey: [k], type: 'active' }));
}

// Re-export from centralized permissions
import { ServerPermission, ALL_PERMISSIONS as PERMISSIONS_LIST } from '@/constants/permissions';
export type { ServerPermission };
export const ALL_PERMISSIONS = PERMISSIONS_LIST;

export interface RoleWithPermissions {
  id: string;
  name: string;
  color: string | null;
  icon_url: string | null;
  position: number | null;
  is_default: boolean | null;
  hoist: boolean | null;
  server_id: string;
  description: string | null;
  permissions: ServerPermission[];
}

export function useServerRoles(serverId: string | null) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['roles', serverId],
    placeholderData: () => cacheGetSync(`roles:${serverId}`),
    queryFn: async (): Promise<RoleWithPermissions[]> => {
      if (!serverId) return [];

      const { data: roles, error: rolesError } = await supabase
        .from('roles')
        .select('id, name, color, icon_url, position, is_default, hoist, server_id, description')
        .eq('server_id', serverId)
        .order('position', { ascending: false });

      if (rolesError) throw rolesError;

      // Get permissions for each role
      const roleIds = roles?.map(r => r.id) || [];
      const { data: permissions, error: permError } = await supabase
        .from('role_permissions')
        .select('role_id, permission')
        .in('role_id', roleIds);

      if (permError) throw permError;

      return roles?.map(role => ({
        ...role,
        permissions: permissions
          ?.filter(p => p.role_id === role.id)
          .map(p => p.permission as ServerPermission) || [],
      })) || [];
    },
    enabled: !!serverId && !!user,
    staleTime: 0,
  });

  // Persist to sessionStorage
  useEffect(() => {
    if (query.data && serverId && !query.isPlaceholderData) {
      try { sessionStorage.setItem(`cache:roles:${serverId}`, JSON.stringify(query.data)); } catch {}
    }
  }, [query.data, serverId, query.isPlaceholderData]);

  return query;
}

export function useCreateRole() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      serverId,
      name,
      color,
    }: {
      serverId: string;
      name: string;
      color?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Get max position
      const { data: existingRoles } = await supabase
        .from('roles')
        .select('position')
        .eq('server_id', serverId)
        .order('position', { ascending: false })
        .limit(1);

      const maxPosition = existingRoles?.[0]?.position ?? 0;

      const { data, error } = await supabase
        .from('roles')
        .insert({
          server_id: serverId,
          name,
          color: color || '#99AAB5',
          position: maxPosition + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ serverId, name, color }) => {
      await queryClient.cancelQueries({ queryKey: ['roles', serverId] });
      const previousRoles = queryClient.getQueryData(['roles', serverId]);
      
      const tempRole: RoleWithPermissions = {
        id: `temp-${Date.now()}`,
        name,
        color: color || '#99AAB5',
        icon_url: null,
        position: 999,
        is_default: false,
        hoist: false,
        server_id: serverId,
        description: null,
        permissions: [],
      };
      
      queryClient.setQueryData(['roles', serverId], (old: RoleWithPermissions[] | undefined) =>
        old ? [tempRole, ...old] : [tempRole]
      );
      
      return { previousRoles };
    },
    onError: (_, variables, context) => {
      if (context?.previousRoles) {
        queryClient.setQueryData(['roles', variables.serverId], context.previousRoles);
      }
      toast.error('Erreur lors de la création du rôle');
    },
    onSuccess: () => {
      toast.success('Rôle créé !');
    },
    onSettled: (_, __, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['roles', serverId] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roleId,
      serverId,
      name,
      color,
      iconUrl,
      hoist,
      description,
      permissions,
    }: {
      roleId: string;
      serverId: string;
      name?: string;
      color?: string;
      iconUrl?: string | null;
      hoist?: boolean;
      description?: string | null;
      permissions?: ServerPermission[];
    }) => {
      // Update role basic info
      if (name || color || iconUrl !== undefined || hoist !== undefined || description !== undefined) {
        const updateData: { name?: string; color?: string; icon_url?: string | null; hoist?: boolean; description?: string | null } = {};
        if (name) updateData.name = name;
        if (color) updateData.color = color;
        if (iconUrl !== undefined) updateData.icon_url = iconUrl;
        if (hoist !== undefined) updateData.hoist = hoist;
        if (description !== undefined) updateData.description = description;
        
        const { error } = await supabase
          .from('roles')
          .update(updateData)
          .eq('id', roleId);

        if (error) throw error;
      }

      // Update permissions if provided
      if (permissions) {
        // Delete existing permissions
        await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', roleId);

        // Insert new permissions (cast to any to handle new permissions not yet in types)
        if (permissions.length > 0) {
          const { error } = await supabase
            .from('role_permissions')
            .insert(permissions.map(p => ({ role_id: roleId, permission: p as any })));

          if (error) throw error;
        }
      }

      return { roleId, serverId };
    },
    onMutate: async ({ roleId, serverId, name, color, iconUrl, hoist, permissions }) => {
      await queryClient.cancelQueries({ queryKey: ['roles', serverId] });
      const previousRoles = queryClient.getQueryData(['roles', serverId]);
      
      queryClient.setQueryData(['roles', serverId], (old: RoleWithPermissions[] | undefined) =>
        old?.map(r => r.id === roleId ? {
          ...r,
          name: name ?? r.name,
          color: color ?? r.color,
          icon_url: iconUrl !== undefined ? iconUrl : r.icon_url,
          hoist: hoist !== undefined ? hoist : r.hoist,
          permissions: permissions ?? r.permissions,
        } : r)
      );
      
      return { previousRoles };
    },
    onError: (_, variables, context) => {
      if (context?.previousRoles) {
        queryClient.setQueryData(['roles', variables.serverId], context.previousRoles);
      }
      toast.error('Erreur lors de la mise à jour du rôle');
    },
    onSuccess: () => {
      toast.success('Rôle mis à jour !');
    },
    onSettled: (_, __, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['roles', serverId] });
      // When role permissions change, channel permissions must update too
      refetchPermissionCaches(queryClient);
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roleId, serverId }: { roleId: string; serverId: string }) => {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
      return { serverId };
    },
    onMutate: async ({ roleId, serverId }) => {
      await queryClient.cancelQueries({ queryKey: ['roles', serverId] });
      const previousRoles = queryClient.getQueryData(['roles', serverId]);
      
      queryClient.setQueryData(['roles', serverId], (old: RoleWithPermissions[] | undefined) =>
        old?.filter(r => r.id !== roleId)
      );
      
      return { previousRoles };
    },
    onError: (_, variables, context) => {
      if (context?.previousRoles) {
        queryClient.setQueryData(['roles', variables.serverId], context.previousRoles);
      }
      toast.error('Erreur lors de la suppression du rôle');
    },
    onSuccess: () => {
      toast.success('Rôle supprimé !');
    },
    onSettled: (_, __, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['roles', serverId] });
    },
  });
}

export function useReorderRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serverId, orderedIds }: { serverId: string; orderedIds: string[] }) => {
      // Update positions (higher index = higher in hierarchy)
      const updates = orderedIds.map((id, index) => 
        supabase.from('roles').update({ position: orderedIds.length - index }).eq('id', id)
      );
      await Promise.all(updates);
      return { serverId };
    },
    onMutate: async ({ serverId, orderedIds }) => {
      await queryClient.cancelQueries({ queryKey: ['roles', serverId] });
      const previousRoles = queryClient.getQueryData(['roles', serverId]);
      
      queryClient.setQueryData(['roles', serverId], (old: RoleWithPermissions[] | undefined) => {
        if (!old) return old;
        return orderedIds.map((id, index) => {
          const role = old.find(r => r.id === id);
          return role ? { ...role, position: orderedIds.length - index } : null;
        }).filter(Boolean) as RoleWithPermissions[];
      });
      
      return { previousRoles };
    },
    onError: (_, variables, context) => {
      if (context?.previousRoles) {
        queryClient.setQueryData(['roles', variables.serverId], context.previousRoles);
      }
    },
    onSettled: (_, __, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['roles', serverId] });
    },
  });
}

export function useDuplicateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roleId,
      serverId,
    }: {
      roleId: string;
      serverId: string;
    }) => {
      // 1. Get source role
      const { data: sourceRole, error: roleError } = await supabase
        .from('roles')
        .select('name, color, icon_url, position')
        .eq('id', roleId)
        .single();

      if (roleError) throw roleError;

      // 2. Get source permissions
      const { data: sourcePermissions } = await supabase
        .from('role_permissions')
        .select('permission')
        .eq('role_id', roleId);

      // 3. Create new role (keep exact same name)
      const { data: newRole, error: createError } = await supabase
        .from('roles')
        .insert({
          server_id: serverId,
          name: sourceRole.name,
          color: sourceRole.color,
          icon_url: sourceRole.icon_url,
          position: (sourceRole.position || 0) + 1,
        })
        .select()
        .single();

      if (createError) throw createError;

      // 4. Copy permissions
      if (sourcePermissions && sourcePermissions.length > 0) {
        await supabase
          .from('role_permissions')
          .insert(sourcePermissions.map(p => ({
            role_id: newRole.id,
            permission: p.permission,
          })));
      }

      return newRole;
    },
    onMutate: async ({ roleId, serverId }) => {
      await queryClient.cancelQueries({ queryKey: ['roles', serverId] });
      const previousRoles = queryClient.getQueryData<RoleWithPermissions[]>(['roles', serverId]);
      
      // Create optimistic duplicate role (keep exact same name)
      if (previousRoles) {
        const sourceRole = previousRoles.find(r => r.id === roleId);
        if (sourceRole) {
          const tempRole: RoleWithPermissions = {
            id: `temp-${Date.now()}`,
            name: sourceRole.name,
            color: sourceRole.color,
            icon_url: sourceRole.icon_url,
            position: (sourceRole.position || 0) + 1,
            is_default: false,
            hoist: sourceRole.hoist,
            server_id: serverId,
            description: sourceRole.description,
            permissions: [...sourceRole.permissions],
          };
          
          queryClient.setQueryData(['roles', serverId], [tempRole, ...previousRoles]);
        }
      }
      
      return { previousRoles };
    },
    onError: (_, variables, context) => {
      if (context?.previousRoles) {
        queryClient.setQueryData(['roles', variables.serverId], context.previousRoles);
      }
      toast.error('Erreur lors de la duplication du rôle');
    },
    onSuccess: (newRole) => {
      toast.success(`Rôle "${newRole.name}" créé !`);
    },
    onSettled: (_, __, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['roles', serverId] });
    },
  });
}

export function useRoleMemberCounts(serverId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['role-member-counts', serverId],
    queryFn: async (): Promise<Record<string, number>> => {
      if (!serverId) return {};

      const { data, error } = await supabase
        .from('member_roles')
        .select(`
          role_id,
          roles!inner(server_id)
        `)
        .eq('roles.server_id', serverId);

      if (error) throw error;

      // Count members per role
      const counts: Record<string, number> = {};
      data?.forEach((mr: any) => {
        counts[mr.role_id] = (counts[mr.role_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!serverId && !!user,
  });
}

// Hook to assign a role to a member
export function useAssignRoleToMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, roleId, serverId, role }: { 
      memberId: string; 
      roleId: string; 
      serverId: string;
      role?: RoleWithPermissions;
    }) => {
      // Ignore duplicates (23505) if the relation already exists
      const { error } = await supabase
        .from('member_roles')
        .upsert(
          { member_id: memberId, role_id: roleId },
          { onConflict: 'member_id,role_id', ignoreDuplicates: true }
        );
      if (error) throw error;
    },
    onMutate: async ({ memberId, roleId, serverId, role }) => {
      // Lock to prevent Realtime invalidations during mutation
      membersMutationLockRef.current = true;
      lockPermissionsMutation(600);
      
      await queryClient.cancelQueries({ queryKey: ['members', serverId] });
      const previousMembers = queryClient.getQueryData(['members', serverId]);
      
      // Include full role data for complete optimistic update (no flickering)
      const roleData = role ? {
        id: role.id,
        name: role.name,
        color: role.color,
        icon_url: role.icon_url,
        position: role.position,
        description: role.description,
      } : { id: roleId };
      
      queryClient.setQueryData(['members', serverId], (old: any[] | undefined) =>
        old?.map(m => {
          if (m.id !== memberId) return m;

          const existingRoles = m.roles || [];
          const alreadyHasRole = existingRoles.some((r: any) => r.id === roleId);

          return {
            ...m,
            roles: alreadyHasRole
              ? existingRoles
              : [...existingRoles, roleData].sort((a, b) => (b.position ?? 0) - (a.position ?? 0)),
          };
        })
      );
      
      return { previousMembers };
    },
    onError: (_, variables, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(['members', variables.serverId], context.previousMembers);
      }
      toast.error('Erreur lors de l\'attribution du rôle');
    },
    onSuccess: () => {
      toast.success('Rôle attribué !');
    },
    onSettled: (_, __, { serverId }) => {
      // Release lock after a delay to let optimistic update settle
      setTimeout(() => {
        membersMutationLockRef.current = false;
      }, 500);
      queryClient.invalidateQueries({ queryKey: ['role-member-counts', serverId] });
      // Role assignment changes effective permissions — refresh channel visibility
      refetchPermissionCaches(queryClient);
    },
  });
}

// Hook to remove a role from a member
export function useRemoveRoleFromMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, roleId, serverId }: { 
      memberId: string; 
      roleId: string; 
      serverId: string;
    }) => {
      const { error } = await supabase
        .from('member_roles')
        .delete()
        .eq('member_id', memberId)
        .eq('role_id', roleId);
      if (error) throw error;
    },
    onMutate: async ({ memberId, roleId, serverId }) => {
      // Lock to prevent Realtime invalidations during mutation
      membersMutationLockRef.current = true;
      lockPermissionsMutation(600);
      
      await queryClient.cancelQueries({ queryKey: ['members', serverId] });
      const previousMembers = queryClient.getQueryData(['members', serverId]);
      
      queryClient.setQueryData(['members', serverId], (old: any[] | undefined) =>
        old?.map(m => m.id === memberId ? {
          ...m,
          roles: (m.roles || []).filter((r: any) => r.id !== roleId),
        } : m)
      );
      
      return { previousMembers };
    },
    onError: (_, variables, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(['members', variables.serverId], context.previousMembers);
      }
      toast.error('Erreur lors du retrait du rôle');
    },
    onSuccess: () => {
      toast.success('Rôle retiré !');
    },
    onSettled: (_, __, { serverId }) => {
      setTimeout(() => {
        membersMutationLockRef.current = false;
      }, 500);
      queryClient.invalidateQueries({ queryKey: ['role-member-counts', serverId] });
      // Role removal changes effective permissions — refresh channel visibility
      refetchPermissionCaches(queryClient);
    },
  });
}
