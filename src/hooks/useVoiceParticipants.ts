/* @refresh reset */
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VoiceParticipant {
  id: string;
  user_id: string;
  channel_id: string;
  muted: boolean;
  deafened: boolean;
  camera: boolean;
  streaming: boolean;
  joined_at: string;
  profile: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export function useVoiceParticipants(channelId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['voice-participants', channelId],
    queryFn: async (): Promise<VoiceParticipant[]> => {
      if (!channelId) return [];

      const { data, error } = await supabase
        .from('voice_states')
        .select(`
          *,
          profile:profiles!voice_states_user_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('channel_id', channelId);

      if (error) throw error;
      return (data || []).map(vs => ({
        ...vs,
        muted: vs.muted || false,
        deafened: vs.deafened || false,
        camera: vs.camera || false,
        streaming: vs.streaming || false,
        joined_at: vs.joined_at || new Date().toISOString(),
        profile: vs.profile as VoiceParticipant['profile'],
      }));
    },
    enabled: !!channelId,
    staleTime: 0,
  });

  // Real-time subscription
  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`voice-participants:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'voice_states',
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['voice-participants', channelId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, queryClient]);

  return query;
}
