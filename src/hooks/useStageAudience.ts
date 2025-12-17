import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

// Hook to get audience count for a stage channel (for ChannelList display)
export function useStageAudienceCount(channelId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['stage-audience-count', channelId],
    queryFn: async () => {
      if (!channelId) return { sessionId: null, count: 0, isLive: false };

      // Get active session for this channel
      const { data: session, error: sessionError } = await supabase
        .from('stage_sessions')
        .select('id, status')
        .eq('channel_id', channelId)
        .in('status', ['pre_live', 'live'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionError || !session) {
        return { sessionId: null, count: 0, isLive: false };
      }

      // Count participants
      const { count, error: countError } = await supabase
        .from('stage_participants')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', session.id);

      if (countError) {
        return { sessionId: session.id, count: 0, isLive: session.status === 'live' };
      }

      return { 
        sessionId: session.id, 
        count: count || 0, 
        isLive: session.status === 'live' 
      };
    },
    enabled: !!channelId,
    refetchInterval: false,
    staleTime: 5000,
  });

  // Realtime subscription for session changes
  useEffect(() => {
    if (!channelId) return;

    const sessionChannel = supabase
      .channel(`stage-session-count:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stage_sessions',
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['stage-audience-count', channelId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
    };
  }, [channelId, queryClient]);

  // Realtime subscription for participant changes (we need to listen on all participants and filter by session)
  useEffect(() => {
    if (!query.data?.sessionId) return;

    const participantsChannel = supabase
      .channel(`stage-participants-count:${query.data.sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stage_participants',
          filter: `session_id=eq.${query.data.sessionId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['stage-audience-count', channelId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(participantsChannel);
    };
  }, [query.data?.sessionId, channelId, queryClient]);

  return query;
}
