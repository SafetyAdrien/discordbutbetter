import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/*
 * Salons prives d'un serveur : @everyone s'y voit refuser "voir le salon".
 * La liste des salons affiche alors la variante verrouillee de l'icone,
 * comme Discord. Partage la cle 'channel-permissions' pour etre invalide
 * avec les autres modifications de permissions.
 */
export function usePrivateChannelIds(serverId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['channel-permissions', 'private-ids', serverId],
    enabled: !!serverId && !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from('channel_permission_overrides')
        .select('channel_id, roles!inner(is_default, server_id)')
        .eq('permission', 'view_channel')
        .eq('type', 'deny')
        .eq('roles.is_default', true)
        .eq('roles.server_id', serverId!);
      if (error) return new Set();
      return new Set((data ?? []).map((r) => r.channel_id));
    },
  });
}
