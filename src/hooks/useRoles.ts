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
  position: number | null;
  is_default: boolean | null;
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
        .select('id, name, color, position, is_default, server_id')
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
    onSuccess: (_, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['roles', serverId] });
      toast.success('Rôle créé !');
    },
    onError: () => {
      toast.error('Erreur lors de la création du rôle');
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
      permissions,
    }: {
      roleId: string;
      serverId: string;
      name?: string;
      color?: string;
      permissions?: ServerPermission[];
    }) => {
      // Update role basic info
      if (name || color) {
        const { error } = await supabase
          .from('roles')
          .update({ name, color })
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
    onSuccess: (_, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['roles', serverId] });
      toast.success('Rôle mis à jour !');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour du rôle');
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
    onSuccess: (_, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['roles', serverId] });
      toast.success('Rôle supprimé !');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression du rôle');
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
    onSuccess: (_, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['roles', serverId] });
    },
  });
}
