/* @refresh reset */
import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ServerVoiceParticipant {
  id: string;
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
          id,
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
          id: vs.id,
          user_id: vs.user_id,
          display_name: vs.profile?.display_name || 'Utilisateur',
          avatar_url: vs.profile?.avatar_url || null,
        }));
    },
    enabled: !!serverId,
    staleTime: 30_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: false,
  });

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
            supabase
              .from('channels')
              .select('server_id')
              .eq('id', newRow.channel_id)
              .single()
              .then(({ data: ch }) => {
                if (ch?.server_id === serverId) {
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
                              id: newRow.id,
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
            const oldId = oldRow?.id;
            const oldUserId = oldRow?.user_id;

            if (!oldId && !oldUserId) {
              // Payload completely empty — force refetch
              queryClient.invalidateQueries({ queryKey: ['server-voice-participants', serverId] });
              return;
            }

            queryClient.setQueryData(
              ['server-voice-participants', serverId],
              (old: ServerVoiceParticipant[] | undefined) => {
                if (!old) return [];
                const filtered = old.filter(p => {
                  if (oldUserId && p.user_id === oldUserId) return false;
                  if (oldId && p.id === oldId) return false;
                  return true;
                });
                return filtered;
              }
            );
          } else {
            // UPDATE or unknown — resync
            queryClient.invalidateQueries({ queryKey: ['server-voice-participants', serverId] });
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
