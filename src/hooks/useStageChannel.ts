import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { StageSession, StageParticipant, StageHandRequest, StageRole, StageStatus } from '@/types/stage';
import { useEffect } from 'react';

// Fetch active session for a stage channel
export function useStageSession(channelId: string | null) {
  return useQuery({
    queryKey: ['stage-session', channelId],
    queryFn: async () => {
      if (!channelId) return null;
      
      const { data, error } = await supabase
        .from('stage_sessions')
        .select('*')
        .eq('channel_id', channelId)
        .in('status', ['pre_live', 'live'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as StageSession | null;
    },
    enabled: !!channelId,
  });
}

// Fetch participants for a session
export function useStageParticipants(sessionId: string | null) {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['stage-participants', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      
      const { data, error } = await supabase
        .from('stage_participants')
        .select(`
          *,
          profile:profiles!stage_participants_user_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('session_id', sessionId)
        .order('joined_at', { ascending: true });
      
      if (error) throw error;
      return (data || []) as StageParticipant[];
    },
    enabled: !!sessionId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`stage-participants-${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stage_participants',
        filter: `session_id=eq.${sessionId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['stage-participants', sessionId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, queryClient]);

  return query;
}

// Fetch hand requests for a session
export function useStageHandRequests(sessionId: string | null) {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['stage-hand-requests', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      
      const { data, error } = await supabase
        .from('stage_hand_requests')
        .select(`
          *,
          profile:profiles!stage_hand_requests_user_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('session_id', sessionId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return (data || []) as StageHandRequest[];
    },
    enabled: !!sessionId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`stage-hand-requests-${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stage_hand_requests',
        filter: `session_id=eq.${sessionId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['stage-hand-requests', sessionId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, queryClient]);

  return query;
}

// Start a new stage session
export function useStartStageSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ channelId, title }: { channelId: string; title?: string }) => {
      const { data, error } = await supabase
        .from('stage_sessions')
        .insert({
          channel_id: channelId,
          title,
          status: 'pre_live',
          started_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Join as moderator
      await supabase
        .from('stage_participants')
        .insert({
          session_id: data.id,
          user_id: user?.id,
          role: 'moderator',
          is_muted: false,
        });

      return data;
    },
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['stage-session', channelId] });
      toast({ title: 'Session créée' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de créer la session', variant: 'destructive' });
    },
  });
}

// Go live
export function useGoLive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('stage_sessions')
        .update({ status: 'live', started_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stage-session'] });
      toast({ title: 'Session en direct !' });
    },
  });
}

// End session
export function useEndStageSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('stage_sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stage-session'] });
      toast({ title: 'Session terminée' });
    },
  });
}

// Join stage as audience
export function useJoinStage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('stage_participants')
        .upsert({
          session_id: sessionId,
          user_id: user?.id,
          role: 'audience',
          is_muted: true,
        }, { onConflict: 'session_id,user_id' });

      if (error) throw error;
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['stage-participants', sessionId] });
    },
  });
}

// Leave stage
export function useLeaveStage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('stage_participants')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['stage-participants', sessionId] });
    },
  });
}

// Raise hand
export function useRaiseHand() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('stage_hand_requests')
        .upsert({
          session_id: sessionId,
          user_id: user?.id,
          status: 'pending',
        }, { onConflict: 'session_id,user_id' });

      if (error) throw error;
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['stage-hand-requests', sessionId] });
      toast({ title: 'Main levée', description: 'En attente d\'approbation' });
    },
  });
}

// Lower hand
export function useLowerHand() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('stage_hand_requests')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['stage-hand-requests', sessionId] });
    },
  });
}

// Approve/reject hand request (moderator)
export function useHandleHandRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ requestId, sessionId, userId, approved }: { 
      requestId: string; 
      sessionId: string; 
      userId: string; 
      approved: boolean;
    }) => {
      // Update request status
      const { error: requestError } = await supabase
        .from('stage_hand_requests')
        .update({
          status: approved ? 'approved' : 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      // If approved, promote to speaker
      if (approved) {
        const { error: promoteError } = await supabase
          .from('stage_participants')
          .update({ role: 'speaker', is_muted: false })
          .eq('session_id', sessionId)
          .eq('user_id', userId);

        if (promoteError) throw promoteError;
      }
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['stage-hand-requests', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['stage-participants', sessionId] });
    },
  });
}

// Change participant role (moderator)
export function useChangeParticipantRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, userId, role }: { sessionId: string; userId: string; role: StageRole }) => {
      const { error } = await supabase
        .from('stage_participants')
        .update({ role, is_muted: role === 'audience' })
        .eq('session_id', sessionId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['stage-participants', sessionId] });
      toast({ title: 'Rôle modifié' });
    },
  });
}

// Toggle participant mute (moderator)
export function useToggleParticipantMute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, participantId, muted }: { sessionId: string; participantId: string; muted: boolean }) => {
      const { error } = await supabase
        .from('stage_participants')
        .update({ is_muted: muted })
        .eq('id', participantId);

      if (error) throw error;
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['stage-participants', sessionId] });
    },
  });
}

// Update own mute state
export function useUpdateSelfMute() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ sessionId, muted }: { sessionId: string; muted: boolean }) => {
      const { error } = await supabase
        .from('stage_participants')
        .update({ is_muted: muted })
        .eq('session_id', sessionId)
        .eq('user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['stage-participants', sessionId] });
    },
  });
}
