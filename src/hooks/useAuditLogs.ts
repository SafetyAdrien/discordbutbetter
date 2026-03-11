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
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['audit-logs', serverId, filters],
    placeholderData: () => {
      try {
        const cached = sessionStorage.getItem(`cache:audit-logs:${serverId}`);
        return cached ? JSON.parse(cached) : undefined;
      } catch { return undefined; }
    },
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
        .limit(100);

      if (filters?.actionTypes && filters.actionTypes.length > 0) {
        q = q.in('action_type', filters.actionTypes);
      }

      const { data, error } = await q;

      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: !!serverId,
  });

  // Real-time subscription for new audit logs
  useEffect(() => {
    if (!serverId) return;

    const channel = supabase
      .channel(`audit-logs:${serverId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
          filter: `server_id=eq.${serverId}`,
        },
        () => {
          // Refetch to get the full log data with actor/target profiles
          queryClient.invalidateQueries({ queryKey: ['audit-logs', serverId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serverId, queryClient]);

  // Persist to sessionStorage
  useEffect(() => {
    if (query.data && serverId && !query.isPlaceholderData) {
      try { sessionStorage.setItem(`cache:audit-logs:${serverId}`, JSON.stringify(query.data)); } catch {}
    }
  }, [query.data, serverId, query.isPlaceholderData]);

  return query;
}
