/* @refresh reset */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user, profile: authProfile } = useAuth();
  const queryClient = useQueryClient();
  // Unique instance ID so each mount gets its own Realtime channel
  const instanceId = useRef(crypto.randomUUID()).current;
  const [isRealtimeActive, setIsRealtimeActive] = useState(true);

  const resolveProfileFromCaches = useCallback((targetUserId: string): VoiceParticipant['profile'] | null => {
    const cachedProfile = queryClient.getQueryData<any>(['profile', targetUserId]);
    if (cachedProfile?.id) {
      return {
        id: cachedProfile.id,
        username: cachedProfile.username || 'user',
        display_name: cachedProfile.display_name || cachedProfile.username || 'User',
        avatar_url: cachedProfile.avatar_url ?? null,
      };
    }

    if (user?.id === targetUserId) {
      return {
        id: user.id,
        username: authProfile?.username || user.email?.split('@')[0] || 'user',
        display_name:
          authProfile?.display_name ||
          user.user_metadata?.display_name ||
          user.email?.split('@')[0] ||
          'Moi',
        avatar_url: authProfile?.avatar_url || user.user_metadata?.avatar_url || null,
      };
    }

    const membersCaches = queryClient.getQueriesData<any[]>({ queryKey: ['members'] });
    for (const [, members] of membersCaches) {
      if (!Array.isArray(members)) continue;
      const found = members.find((m: any) => m?.user?.id === targetUserId);
      if (!found?.user?.id) continue;

      const displayName = found.serverProfile?.display_name || found.user.display_name;
      if (!displayName) continue;

      return {
        id: found.user.id,
        username: found.user.username || 'user',
        display_name: displayName,
        avatar_url: found.serverProfile?.avatar_url ?? found.user.avatar_url ?? null,
      };
    }

    return null;
  }, [authProfile?.avatar_url, authProfile?.display_name, authProfile?.username, queryClient, user?.email, user?.id, user?.user_metadata]);

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
      return (data || []).map(vs => {
        const fallbackProfile =
          resolveProfileFromCaches(vs.user_id) || {
            id: vs.user_id,
            username: `user-${vs.user_id.slice(0, 6)}`,
            display_name:
              user?.id === vs.user_id
                ? authProfile?.display_name || user.user_metadata?.display_name || user.email?.split('@')[0] || 'Moi'
                : `user-${vs.user_id.slice(0, 6)}`,
            avatar_url:
              user?.id === vs.user_id
                ? authProfile?.avatar_url || user.user_metadata?.avatar_url || null
                : null,
          };

        return {
          ...vs,
          muted: vs.muted || false,
          deafened: vs.deafened || false,
          camera: vs.camera || false,
          streaming: vs.streaming || false,
          joined_at: vs.joined_at || new Date().toISOString(),
          profile: (vs.profile as VoiceParticipant['profile'] | null) || fallbackProfile,
        };
      });
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
      .channel(`voice-p:${channelId}:${instanceId}`, { config: { private: true } })
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

            const upsertParticipant = (profileData: VoiceParticipant['profile']) => {
              queryClient.setQueryData(['voice-participants', channelId], (old: VoiceParticipant[] | undefined) => {
                const existing = old?.find(p => p.user_id === newUserId);
                if (existing) {
                  // Merge real DB id into optimistic entry, keep existing profile if already richer
                  return old!.map(p => p.user_id === newUserId
                    ? { ...p, id: newRow.id || p.id, profile: p.profile || profileData }
                    : p
                  );
                }

                const participant: VoiceParticipant = {
                  id: newRow.id || crypto.randomUUID(),
                  user_id: newUserId,
                  channel_id: channelId,
                  muted: newRow.muted || false,
                  deafened: newRow.deafened || false,
                  camera: newRow.camera || false,
                  streaming: newRow.streaming || false,
                  joined_at: newRow.joined_at || new Date().toISOString(),
                  profile: profileData,
                };
                return [...(old || []), participant];
              });
            };

            const resolvedProfile = resolveProfileFromCaches(newUserId);
            if (resolvedProfile) {
              upsertParticipant(resolvedProfile);
              return;
            }

            // No placeholder flash: fetch profile first, then insert/merge participant
            supabase
              .from('profiles')
              .select('id, username, display_name, avatar_url')
              .eq('id', newUserId)
              .single()
              .then(({ data: profile }) => {
                const fetchedProfile: VoiceParticipant['profile'] = profile
                  ? {
                      id: profile.id,
                      username: profile.username,
                      display_name: profile.display_name,
                      avatar_url: profile.avatar_url,
                    }
                  : {
                      id: newUserId,
                      username: `user-${newUserId.slice(0, 6)}`,
                      display_name: `user-${newUserId.slice(0, 6)}`,
                      avatar_url: null,
                    };

                upsertParticipant(fetchedProfile);
              });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeActive(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setIsRealtimeActive(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, instanceId, queryClient, resolveProfileFromCaches]);

  return query;
}
