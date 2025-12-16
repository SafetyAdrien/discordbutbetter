import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

// Use the database type for permissions that exist
type DBPermission = Database['public']['Enums']['server_permission'];

// Extended permissions (includes new ones from migration)
export type ServerPermission = DBPermission | 'manage_emojis' | 'manage_stickers' | 'view_audit_log' | 'create_invites' | 'attach_files' | 'embed_links' | 'use_external_emojis' | 'mute_members';

export interface RoleWithPermissions {
  id: string;
  name: string;
  color: string | null;
  icon_url: string | null;
  position: number | null;
  is_default: boolean | null;
  hoist: boolean | null;
  server_id: string;
  permissions: ServerPermission[];
}

export const ALL_PERMISSIONS: { key: ServerPermission; label: string; description: string }[] = [
  { key: 'administrator', label: 'Administrateur', description: 'Tous les droits sur le serveur' },
  { key: 'manage_server', label: 'Gérer le serveur', description: 'Modifier les paramètres du serveur' },
  { key: 'manage_channels', label: 'Gérer les salons', description: 'Créer/modifier/supprimer des salons' },
  { key: 'manage_roles', label: 'Gérer les rôles', description: 'Créer/modifier/supprimer des rôles' },
  { key: 'manage_messages', label: 'Gérer les messages', description: 'Supprimer les messages des autres' },
  { key: 'manage_emojis', label: 'Gérer les emojis', description: 'Ajouter/supprimer des emojis custom' },
  { key: 'manage_stickers', label: 'Gérer les stickers', description: 'Ajouter/supprimer des stickers' },
  { key: 'kick_members', label: 'Expulser des membres', description: 'Expulser des membres du serveur' },
  { key: 'ban_members', label: 'Bannir des membres', description: 'Bannir des membres du serveur' },
  { key: 'mute_members', label: 'Rendre muet', description: 'Rendre muet des membres' },
  { key: 'view_audit_log', label: 'Voir le journal', description: 'Voir le journal d\'audit' },
  { key: 'create_invites', label: 'Créer des invitations', description: 'Créer des liens d\'invitation' },
  { key: 'send_messages', label: 'Envoyer des messages', description: 'Envoyer des messages dans les salons' },
  { key: 'read_messages', label: 'Lire les messages', description: 'Lire les messages des salons' },
  { key: 'attach_files', label: 'Joindre des fichiers', description: 'Envoyer des fichiers et images' },
  { key: 'embed_links', label: 'Intégrer des liens', description: 'Les liens affichent un aperçu' },
  { key: 'use_external_emojis', label: 'Emojis externes', description: 'Utiliser des emojis d\'autres serveurs' },
  { key: 'connect_voice', label: 'Se connecter en vocal', description: 'Rejoindre les salons vocaux' },
  { key: 'speak_voice', label: 'Parler en vocal', description: 'Parler dans les salons vocaux' },
  { key: 'mention_everyone', label: 'Mentionner @everyone', description: 'Mentionner tous les membres' },
];

export function useServerRoles(serverId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['roles', serverId],
    queryFn: async (): Promise<RoleWithPermissions[]> => {
      if (!serverId) return [];

      const { data: roles, error: rolesError } = await supabase
        .from('roles')
        .select('id, name, color, icon_url, position, is_default, hoist, server_id')
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
  });
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
      permissions,
    }: {
      roleId: string;
      serverId: string;
      name?: string;
      color?: string;
      iconUrl?: string | null;
      hoist?: boolean;
      permissions?: ServerPermission[];
    }) => {
      // Update role basic info
      if (name || color || iconUrl !== undefined || hoist !== undefined) {
        const updateData: { name?: string; color?: string; icon_url?: string | null; hoist?: boolean } = {};
        if (name) updateData.name = name;
        if (color) updateData.color = color;
        if (iconUrl !== undefined) updateData.icon_url = iconUrl;
        if (hoist !== undefined) updateData.hoist = hoist;
        
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
    mutationFn: async ({ memberId, roleId, serverId }: { 
      memberId: string; 
      roleId: string; 
      serverId: string;
    }) => {
      const { error } = await supabase
        .from('member_roles')
        .insert({ member_id: memberId, role_id: roleId });
      if (error) throw error;
    },
    onMutate: async ({ memberId, roleId, serverId }) => {
      await queryClient.cancelQueries({ queryKey: ['members', serverId] });
      const previousMembers = queryClient.getQueryData(['members', serverId]);
      
      queryClient.setQueryData(['members', serverId], (old: any[] | undefined) =>
        old?.map(m => m.id === memberId ? {
          ...m,
          roles: [...(m.roles || []), { id: roleId }],
        } : m)
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
      queryClient.invalidateQueries({ queryKey: ['members', serverId] });
      queryClient.invalidateQueries({ queryKey: ['role-member-counts', serverId] });
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
      queryClient.invalidateQueries({ queryKey: ['members', serverId] });
      queryClient.invalidateQueries({ queryKey: ['role-member-counts', serverId] });
    },
  });
}
