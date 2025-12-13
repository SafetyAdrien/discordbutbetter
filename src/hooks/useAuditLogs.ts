import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

export const ACTION_TYPES = [
  { value: 'kick', label: 'Expulsion', color: 'text-yellow-500' },
  { value: 'ban', label: 'Bannissement', color: 'text-destructive' },
  { value: 'unban', label: 'Débannissement', color: 'text-green-500' },
  { value: 'role_add', label: 'Rôle ajouté', color: 'text-blue-500' },
  { value: 'role_remove', label: 'Rôle retiré', color: 'text-orange-500' },
  { value: 'role_update', label: 'Rôle modifié', color: 'text-purple-500' },
  { value: 'secondary_owner_add', label: 'Second propriétaire ajouté', color: 'text-yellow-500' },
  { value: 'secondary_owner_remove', label: 'Second propriétaire retiré', color: 'text-orange-500' },
  { value: 'channel_create', label: 'Salon créé', color: 'text-green-500' },
  { value: 'channel_delete', label: 'Salon supprimé', color: 'text-destructive' },
  { value: 'channel_update', label: 'Salon modifié', color: 'text-blue-500' },
] as const;

export type ActionType = typeof ACTION_TYPES[number]['value'];

export function useAuditLogs(serverId: string, filters?: { actionTypes?: string[] }) {
  return useQuery({
    queryKey: ['audit-logs', serverId, filters],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          actor:profiles!audit_logs_actor_id_fkey(id, display_name, username, avatar_url),
          target:profiles!audit_logs_target_id_fkey(id, display_name, username, avatar_url)
        `)
        .eq('server_id', serverId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters?.actionTypes && filters.actionTypes.length > 0) {
        query = query.in('action_type', filters.actionTypes);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: !!serverId,
  });
}
