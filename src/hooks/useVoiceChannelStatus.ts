import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/*
 * Statuts de salons vocaux d'un serveur ({ channelId: "🫠 Test" }). Tant que la migration
 * voice_channel_status n'est pas appliquee, la requete echoue en silence : aucun statut.
 */
export function useVoiceChannelStatuses(serverId: string | null | undefined) {
  const qc = useQueryClient();
  const key = ['voice-status', serverId];
  const { data = {} } = useQuery({
    queryKey: key,
    enabled: !!serverId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('channels').select('id, voice_status').eq('server_id', serverId!).eq('type', 'voice');
      if (error || !data) return {} as Record<string, string>;
      return Object.fromEntries(data.filter((c) => c.voice_status).map((c) => [c.id, c.voice_status as string]));
    },
  });

  useEffect(() => {
    if (!serverId) return;
    const ch = supabase
      .channel(`voice-status-${serverId}-${Math.random().toString(36).slice(2, 7)}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'channels', filter: `server_id=eq.${serverId}` }, () => {
        void qc.invalidateQueries({ queryKey: ['voice-status', serverId] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [serverId, qc]);

  return data as Record<string, string>;
}

export function useSetVoiceChannelStatus(serverId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ channelId, status }: { channelId: string; status: string }) => {
      const { error } = await supabase.rpc('set_voice_channel_status', { p_channel_id: channelId, p_status: status });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['voice-status', serverId] }),
    onError: (e: Error) => toast.error(e.message || 'Impossible de définir le statut'),
  });
}
