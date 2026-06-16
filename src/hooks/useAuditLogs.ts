import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';

export interface AuditLog {
  id: string;
  server_id: string;
  action_type: string;
  actor_id: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  actor?: {
    id: string;
    display_name: string;
    username: string;
    avatar_url: string | null;
  };
  target?: {
    id: string;
    display_name: string;
    username: string;
    avatar_url: string | null;
  };
}

export type AuditCategory =
  | 'member'
  | 'role'
  | 'channel'
  | 'server'
  | 'invite'
  | 'webhook'
  | 'expression'
  | 'message';

export interface ActionTypeDef {
  value: string;
  label: string;
  color: string;
  category: AuditCategory;
}

export const ACTION_TYPES: readonly ActionTypeDef[] = [
  // Server
  { value: 'server_update', label: 'Serveur modifié', color: 'text-blue-500', category: 'server' },
  { value: 'secondary_owner_add', label: 'Second propriétaire ajouté', color: 'text-yellow-500', category: 'server' },
  { value: 'secondary_owner_remove', label: 'Second propriétaire retiré', color: 'text-orange-500', category: 'server' },
  { value: 'OWNERSHIP_TRANSFERRED', label: 'Propriété transférée', color: 'text-purple-500', category: 'server' },

  // Members
  { value: 'member_kick', label: 'Expulsion', color: 'text-yellow-500', category: 'member' },
  { value: 'kick', label: 'Expulsion', color: 'text-yellow-500', category: 'member' },
  { value: 'member_ban', label: 'Bannissement', color: 'text-destructive', category: 'member' },
  { value: 'ban', label: 'Bannissement', color: 'text-destructive', category: 'member' },
  { value: 'member_unban', label: 'Débannissement', color: 'text-green-500', category: 'member' },
  { value: 'unban', label: 'Débannissement', color: 'text-green-500', category: 'member' },
  { value: 'member_role_add', label: 'Rôle attribué', color: 'text-blue-500', category: 'member' },
  { value: 'member_role_remove', label: 'Rôle retiré', color: 'text-orange-500', category: 'member' },

  // Roles
  { value: 'role_create', label: 'Rôle créé', color: 'text-green-500', category: 'role' },
  { value: 'role_update', label: 'Rôle modifié', color: 'text-blue-500', category: 'role' },
  { value: 'role_delete', label: 'Rôle supprimé', color: 'text-destructive', category: 'role' },
  { value: 'role_permission_grant', label: 'Permission accordée', color: 'text-green-500', category: 'role' },
  { value: 'role_permission_revoke', label: 'Permission révoquée', color: 'text-orange-500', category: 'role' },

  // Channels
  { value: 'channel_create', label: 'Salon créé', color: 'text-green-500', category: 'channel' },
  { value: 'channel_update', label: 'Salon modifié', color: 'text-blue-500', category: 'channel' },
  { value: 'channel_delete', label: 'Salon supprimé', color: 'text-destructive', category: 'channel' },
  { value: 'category_create', label: 'Catégorie créée', color: 'text-green-500', category: 'channel' },
  { value: 'category_update', label: 'Catégorie modifiée', color: 'text-blue-500', category: 'channel' },
  { value: 'category_delete', label: 'Catégorie supprimée', color: 'text-destructive', category: 'channel' },
  { value: 'channel_overwrite_create', label: 'Override créé', color: 'text-green-500', category: 'channel' },
  { value: 'channel_overwrite_update', label: 'Override modifié', color: 'text-blue-500', category: 'channel' },
  { value: 'channel_overwrite_delete', label: 'Override supprimé', color: 'text-destructive', category: 'channel' },

  // Invites
  { value: 'invite_create', label: 'Invitation créée', color: 'text-green-500', category: 'invite' },
  { value: 'invite_delete', label: 'Invitation supprimée', color: 'text-destructive', category: 'invite' },

  // Webhooks
  { value: 'webhook_create', label: 'Webhook créé', color: 'text-green-500', category: 'webhook' },
  { value: 'webhook_update', label: 'Webhook modifié', color: 'text-blue-500', category: 'webhook' },
  { value: 'webhook_delete', label: 'Webhook supprimé', color: 'text-destructive', category: 'webhook' },

  // Expressions (emojis / stickers)
  { value: 'emoji_create', label: 'Emoji créé', color: 'text-green-500', category: 'expression' },
  { value: 'emoji_update', label: 'Emoji modifié', color: 'text-blue-500', category: 'expression' },
  { value: 'emoji_delete', label: 'Emoji supprimé', color: 'text-destructive', category: 'expression' },
  { value: 'sticker_create', label: 'Sticker créé', color: 'text-green-500', category: 'expression' },
  { value: 'sticker_update', label: 'Sticker modifié', color: 'text-blue-500', category: 'expression' },
  { value: 'sticker_delete', label: 'Sticker supprimé', color: 'text-destructive', category: 'expression' },

  // Messages
  { value: 'message_delete', label: 'Message supprimé', color: 'text-destructive', category: 'message' },
  { value: 'message_pin', label: 'Message épinglé', color: 'text-yellow-500', category: 'message' },
  { value: 'message_unpin', label: 'Message désépinglé', color: 'text-orange-500', category: 'message' },
  { value: 'thread_create', label: 'Fil créé', color: 'text-green-500', category: 'message' },
  { value: 'thread_delete', label: 'Fil supprimé', color: 'text-destructive', category: 'message' },
] as const;

export type ActionType = typeof ACTION_TYPES[number]['value'];

export const CATEGORY_LABELS: Record<AuditCategory, string> = {
  server: 'Serveur',
  member: 'Membres',
  role: 'Rôles',
  channel: 'Salons',
  invite: 'Invitations',
  webhook: 'Webhooks',
  expression: 'Emojis & Stickers',
  message: 'Messages',
};

export function useAuditLogs(serverId: string, filters?: { actionTypes?: string[] }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['audit-logs', serverId, filters],
    placeholderData: () => cacheGetSync(`audit-logs:${serverId}`),
    queryFn: async () => {
      let q = supabase
        .from('audit_logs')
        .select(`
          *,
          actor:profiles!audit_logs_actor_id_fkey(id, display_name, username, avatar_url),
          target:profiles!audit_logs_target_id_fkey(id, display_name, username, avatar_url)
        `)
        .eq('server_id', serverId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (filters?.actionTypes && filters.actionTypes.length > 0) {
        q = q.in('action_type', filters.actionTypes);
      }

      const { data, error } = await q;

      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: !!serverId,
  });

  useEffect(() => {
    if (!serverId) return;

    const channel = supabase
      .channel(`audit-logs:${serverId}`, { config: { private: true } })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
          filter: `server_id=eq.${serverId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['audit-logs', serverId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serverId, queryClient]);

  useEffect(() => {
    if (query.data && serverId && !query.isPlaceholderData) {
      cacheSetAsync(`audit-logs:${serverId}`, query.data);
    }
  }, [query.data, serverId, query.isPlaceholderData]);

  return query;
}
