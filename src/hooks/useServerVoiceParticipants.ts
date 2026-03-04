import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ServerVoiceParticipant {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

export function useServerVoiceParticipants(serverId: string | null) {
  return useQuery({
    queryKey: ['server-voice-participants', serverId],
    queryFn: async (): Promise<ServerVoiceParticipant[]> => {
      if (!serverId) return [];

      const { data, error } = await supabase
        .from('voice_states')
        .select(`
          user_id,
          channel:channels!voice_states_channel_id_fkey (
            server_id
          ),
          profile:profiles!voice_states_user_id_fkey (
            display_name,
            avatar_url
          )
        `)
        .eq('channels.server_id', serverId);

      if (error) throw error;

      // Filter out rows where channel join didn't match (different server)
      return (data || [])
        .filter((vs: any) => vs.channel !== null)
        .map((vs: any) => ({
          user_id: vs.user_id,
          display_name: vs.profile?.display_name || 'Utilisateur',
          avatar_url: vs.profile?.avatar_url || null,
        }));
    },
    enabled: !!serverId,
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: false,
  });
}
