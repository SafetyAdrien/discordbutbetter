import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ServerConnectionRule {
  id: string;
  server_id: string;
  provider: 'twitter' | 'instagram' | 'bluesky' | 'youtube';
  role_id: string;
  name: string;
  description: string | null;
  min_posts: number | null;
  min_followers: number | null;
  min_account_age_days: number | null;
  require_verified: boolean;
  created_at: string;
  updated_at: string;
}

const key = (serverId: string) => ['server-connection-rules', serverId];

export function useServerConnectionRules(serverId: string | undefined) {
  return useQuery({
    queryKey: key(serverId ?? ''),
    enabled: !!serverId,
    queryFn: async (): Promise<ServerConnectionRule[]> => {
      const { data, error } = await (supabase as any)
        .from('server_connection_rules')
        .select('*')
        .eq('server_id', serverId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as ServerConnectionRule[]) ?? [];
    },
  });
}

export function useUpsertConnectionRule(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: Partial<ServerConnectionRule> & { server_id: string; provider: string; role_id: string; name: string }) => {
      const payload: any = { ...rule };
      if (payload.id) {
        const { id, ...rest } = payload;
        const { error } = await (supabase as any).from('server_connection_rules').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('server_connection_rules').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(serverId) });
      toast.success('Règle enregistrée');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erreur'),
  });
}

export function useDeleteConnectionRule(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('server_connection_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(serverId) });
      toast.success('Règle supprimée');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erreur'),
  });
}
