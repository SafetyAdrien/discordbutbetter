/* @refresh reset */
import { useEffect, useRef, useState } from 'react';
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
  // Unique instance ID so each mount gets its own Realtime channel
  const instanceId = useRef(crypto.randomUUID()).current;
  const [isRealtimeActive, setIsRealtimeActive] = useState(true);

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
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    // Always poll as backup: fast when realtime is down, slow otherwise
    refetchInterval: isRealtimeActive ? 10_000 : 3_000,
  });

  // Real-time subscription with ISOLATED channel name per instance
  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`voice-p:${channelId}:${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'voice_states',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            // Direct cache patch — no refetch needed
            queryClient.setQueryData(['voice-participants', channelId], (old: VoiceParticipant[] | undefined) =>
              old?.map(p => p.user_id === payload.new.user_id
                ? { ...p, muted: payload.new.muted ?? p.muted, deafened: payload.new.deafened ?? p.deafened, camera: payload.new.camera ?? p.camera, streaming: payload.new.streaming ?? p.streaming }
                : p
              )
            );
          } else if (payload.eventType === 'DELETE') {
            // Remove participant instantly
            queryClient.setQueryData(['voice-participants', channelId], (old: VoiceParticipant[] | undefined) =>
              old?.filter(p => p.user_id !== payload.old.user_id && p.id !== payload.old.id)
            );
          } else if (payload.eventType === 'INSERT') {
            const newRow = payload.new as any;
            const newUserId = newRow.user_id;

            // 1. Optimistic instant add with fallback profile
            queryClient.setQueryData(['voice-participants', channelId], (old: VoiceParticipant[] | undefined) => {
              if (old?.some(p => p.user_id === newUserId)) return old;
              const participant: VoiceParticipant = {
                id: newRow.id || crypto.randomUUID(),
                user_id: newUserId,
                channel_id: channelId,
                muted: newRow.muted || false,
                deafened: newRow.deafened || false,
                camera: newRow.camera || false,
                streaming: newRow.streaming || false,
                joined_at: newRow.joined_at || new Date().toISOString(),
                profile: {
                  id: newUserId,
                  username: 'user',
                  display_name: 'Utilisateur',
                  avatar_url: null,
                },
              };
              return [...(old || []), participant];
            });

            // 2. Hydrate with real profile data
            supabase
              .from('profiles')
              .select('id, username, display_name, avatar_url')
              .eq('id', newUserId)
              .single()
              .then(({ data: profile }) => {
                if (profile) {
                  queryClient.setQueryData(['voice-participants', channelId], (old: VoiceParticipant[] | undefined) =>
                    old?.map(p => p.user_id === newUserId ? { ...p, profile } : p)
                  );
                }
              });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeActive(true);
          // Resync once on subscribe to catch anything missed
          queryClient.invalidateQueries({ queryKey: ['voice-participants', channelId] });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setIsRealtimeActive(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, instanceId, queryClient]);

  return query;
}
