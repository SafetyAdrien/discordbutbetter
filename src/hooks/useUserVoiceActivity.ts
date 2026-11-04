import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVoice } from '@/contexts/VoiceContext';
import { useAuth } from '@/contexts/AuthContext';

/*
 * Activite vocale d'un utilisateur ("Dans un salon vocal") : salon, serveur et statut du salon. Pour soi-meme le
 * salon courant vient du contexte vocal (instantane) ; pour les autres, on lit voice_states puis le salon / serveur.
 */

export interface VoiceActivity {
  channelId: string;
  channelName: string;
  serverId: string | null;
  serverName: string | null;
  voiceStatus: string | null;
}

export function useUserVoiceActivity(userId: string | null | undefined) {
  const { user } = useAuth();
  const { voiceState } = useVoice();
  const mine = !!userId && userId === user?.id;
  const channelId = mine ? voiceState.channelId : undefined;

  return useQuery({
    queryKey: ['user-voice-activity', userId, mine ? channelId ?? null : 'remote'],
    enabled: !!userId,
    staleTime: 10_000,
    refetchInterval: mine ? false : 15_000,
    queryFn: async (): Promise<VoiceActivity | null> => {
      let cid: string | null = channelId ?? null;
      if (!mine) {
        const { data } = await supabase.from('voice_states').select('channel_id').eq('user_id', userId!).maybeSingle();
        cid = data?.channel_id ?? null;
      }
      if (!cid) return null;
      const { data: ch } = await supabase.from('channels').select('id,name,server_id,voice_status').eq('id', cid).maybeSingle();
      if (!ch) return null;
      let serverName: string | null = null;
      if (ch.server_id) {
        const { data: s } = await supabase.from('servers').select('name').eq('id', ch.server_id).maybeSingle();
        serverName = s?.name ?? null;
      }
      return { channelId: ch.id, channelName: ch.name, serverId: ch.server_id, serverName, voiceStatus: (ch as { voice_status?: string | null }).voice_status ?? null };
    },
  });
}
