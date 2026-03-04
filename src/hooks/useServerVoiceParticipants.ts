/* @refresh reset */
import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ServerVoiceParticipant {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

export function useServerVoiceParticipants(serverId: string | null) {
  const queryClient = useQueryClient();
  const instanceId = useRef(crypto.randomUUID()).current;

  const query = useQuery({
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

      return (data || [])
        .filter((vs: any) => vs.channel !== null)
        .map((vs: any) => ({
          user_id: vs.user_id,
          display_name: vs.profile?.display_name || 'Utilisateur',
          avatar_url: vs.profile?.avatar_url || null,
        }));
    },
    enabled: !!serverId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // Realtime subscription for instant updates
  useEffect(() => {
    if (!serverId) return;

    const channel = supabase
      .channel(`srv-voice:${serverId}:${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'voice_states',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRow = payload.new as any;
            // Fetch channel to check if it belongs to this server, then hydrate
            supabase
              .from('channels')
              .select('server_id')
              .eq('id', newRow.channel_id)
              .single()
              .then(({ data: ch }) => {
                if (ch?.server_id === serverId) {
                  // Fetch profile and add to cache
                  supabase
                    .from('profiles')
                    .select('display_name, avatar_url')
                    .eq('id', newRow.user_id)
                    .single()
                    .then(({ data: profile }) => {
                      queryClient.setQueryData(
                        ['server-voice-participants', serverId],
                        (old: ServerVoiceParticipant[] | undefined) => {
                          if (old?.some(p => p.user_id === newRow.user_id)) return old;
                          return [
                            ...(old || []),
                            {
                              user_id: newRow.user_id,
                              display_name: profile?.display_name || 'Utilisateur',
                              avatar_url: profile?.avatar_url || null,
                            },
                          ];
                        }
                      );
                    });
                }
              });
          } else if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as any;
            queryClient.setQueryData(
              ['server-voice-participants', serverId],
              (old: ServerVoiceParticipant[] | undefined) =>
                old?.filter(p => p.user_id !== oldRow.user_id) || []
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serverId, instanceId, queryClient]);

  return query;
}
