import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AnyChannel {
  id: string;
  name: string;
  type: string | null;
  server_id: string;
}

/** Salons de tous les serveurs de l'utilisateur (dialogue "Ajouter aux favoris", salons suggeres). */
export function useAllChannels(serverIds: string[], enabled = true) {
  return useQuery({
    queryKey: ['all-channels', serverIds.join(',')],
    enabled: enabled && serverIds.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<AnyChannel[]> => {
      const { data } = await supabase.from('channels').select('id, name, type, server_id').in('server_id', serverIds).order('position', { ascending: true });
      return (data ?? []) as AnyChannel[];
    },
  });
}
