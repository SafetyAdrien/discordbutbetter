import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { StageSession, StageParticipant, StageHandRequest, StageRole } from '@/types/stage';
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
  const { user, profile } = useAuth();

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
    onMutate: async ({ channelId, title }) => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['stage-session', channelId] });
      const previousSession = queryClient.getQueryData(['stage-session', channelId]);
      
      const tempSession: StageSession = {
        id: `temp-${Date.now()}`,
        channel_id: channelId,
        title: title || null,
        description: null,
        status: 'pre_live',
        started_by: user.id,
        started_at: null,
        ended_at: null,
        created_at: new Date().toISOString(),
      };
      
      queryClient.setQueryData(['stage-session', channelId], tempSession);
      
      return { previousSession, channelId };
    },
    onError: (_, { channelId }, context) => {
      if (context?.previousSession !== undefined) {
        queryClient.setQueryData(['stage-session', channelId], context.previousSession);
      }
      toast({ title: 'Erreur', description: 'Impossible de créer la session', variant: 'destructive' });
    },
    onSuccess: () => {
      toast({ title: 'Session créée' });
    },
    onSettled: (_, __, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['stage-session', channelId] });
    },
  });
}

// Go live
export function useGoLive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, channelId }: { sessionId: string; channelId: string }) => {
      const { error } = await supabase
        .from('stage_sessions')
        .update({ status: 'live', started_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) throw error;
      return { sessionId, channelId };
    },
    onMutate: async ({ sessionId, channelId }) => {
      await queryClient.cancelQueries({ queryKey: ['stage-session', channelId] });
      const previousSession = queryClient.getQueryData<StageSession | null>(['stage-session', channelId]);
      
      if (previousSession) {
        queryClient.setQueryData(['stage-session', channelId], {
          ...previousSession,
          status: 'live',
          started_at: new Date().toISOString(),
        });
      }
      
      return { previousSession, channelId };
    },
    onError: (_, { channelId }, context) => {
      if (context?.previousSession !== undefined) {
        queryClient.setQueryData(['stage-session', channelId], context.previousSession);
      }
    },
    onSuccess: () => {
      toast({ title: 'Session en direct !' });
    },
    onSettled: (_, __, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['stage-session', channelId] });
    },
  });
}

// End session
export function useEndStageSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, channelId }: { sessionId: string; channelId: string }) => {
      const { error } = await supabase
        .from('stage_sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) throw error;
      return { sessionId, channelId };
    },
    onMutate: async ({ sessionId, channelId }) => {
      await queryClient.cancelQueries({ queryKey: ['stage-session', channelId] });
      const previousSession = queryClient.getQueryData<StageSession | null>(['stage-session', channelId]);
      
      queryClient.setQueryData(['stage-session', channelId], null);
      
      return { previousSession, channelId };
    },
    onError: (_, { channelId }, context) => {
      if (context?.previousSession !== undefined) {
        queryClient.setQueryData(['stage-session', channelId], context.previousSession);
      }
    },
    onSuccess: () => {
      toast({ title: 'Session terminée' });
    },
    onSettled: (_, __, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['stage-session', channelId] });
    },
  });
}

// Join stage as audience
export function useJoinStage() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

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
      return sessionId;
    },
    onMutate: async (sessionId) => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['stage-participants', sessionId] });
      const previousParticipants = queryClient.getQueryData<StageParticipant[]>(['stage-participants', sessionId]);
      
      const tempParticipant: StageParticipant = {
        id: `temp-${Date.now()}`,
        session_id: sessionId,
        user_id: user.id,
        role: 'audience',
        is_muted: true,
        is_video_on: false,
        joined_at: new Date().toISOString(),
        profile: profile ? {
          id: user.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        } : undefined,
      };
      
      queryClient.setQueryData(['stage-participants', sessionId], (old: StageParticipant[] | undefined) =>
        old ? [...old, tempParticipant] : [tempParticipant]
      );
      
      return { previousParticipants, sessionId };
    },
    onError: (_, sessionId, context) => {
      if (context?.previousParticipants) {
        queryClient.setQueryData(['stage-participants', sessionId], context.previousParticipants);
      }
    },
    onSettled: (sessionId) => {
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: ['stage-participants', sessionId] });
      }
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
      return sessionId;
    },
    onMutate: async (sessionId) => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['stage-participants', sessionId] });
      const previousParticipants = queryClient.getQueryData<StageParticipant[]>(['stage-participants', sessionId]);
      
      queryClient.setQueryData(['stage-participants', sessionId], (old: StageParticipant[] | undefined) =>
        old?.filter(p => p.user_id !== user.id)
      );
      
      return { previousParticipants, sessionId };
    },
    onError: (_, sessionId, context) => {
      if (context?.previousParticipants) {
        queryClient.setQueryData(['stage-participants', sessionId], context.previousParticipants);
      }
    },
    onSettled: (sessionId) => {
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: ['stage-participants', sessionId] });
      }
    },
  });
}

// Raise hand
export function useRaiseHand() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

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
      return sessionId;
    },
    onMutate: async (sessionId) => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['stage-hand-requests', sessionId] });
      const previousRequests = queryClient.getQueryData<StageHandRequest[]>(['stage-hand-requests', sessionId]);
      
      const tempRequest: StageHandRequest = {
        id: `temp-${Date.now()}`,
        session_id: sessionId,
        user_id: user.id,
        status: 'pending',
        created_at: new Date().toISOString(),
        reviewed_by: null,
        reviewed_at: null,
        profile: profile ? {
          id: user.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        } : undefined,
      };
      
      queryClient.setQueryData(['stage-hand-requests', sessionId], (old: StageHandRequest[] | undefined) =>
        old ? [...old, tempRequest] : [tempRequest]
      );
      
      return { previousRequests, sessionId };
    },
    onError: (_, sessionId, context) => {
      if (context?.previousRequests) {
        queryClient.setQueryData(['stage-hand-requests', sessionId], context.previousRequests);
      }
    },
    onSuccess: () => {
      toast({ title: 'Main levée', description: 'En attente d\'approbation' });
    },
    onSettled: (sessionId) => {
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: ['stage-hand-requests', sessionId] });
      }
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
      return sessionId;
    },
    onMutate: async (sessionId) => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['stage-hand-requests', sessionId] });
      const previousRequests = queryClient.getQueryData<StageHandRequest[]>(['stage-hand-requests', sessionId]);
      
      queryClient.setQueryData(['stage-hand-requests', sessionId], (old: StageHandRequest[] | undefined) =>
        old?.filter(r => r.user_id !== user.id)
      );
      
      return { previousRequests, sessionId };
    },
    onError: (_, sessionId, context) => {
      if (context?.previousRequests) {
        queryClient.setQueryData(['stage-hand-requests', sessionId], context.previousRequests);
      }
    },
    onSettled: (sessionId) => {
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: ['stage-hand-requests', sessionId] });
      }
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
      
      return { requestId, sessionId, userId, approved };
    },
    onMutate: async ({ requestId, sessionId, userId, approved }) => {
      await queryClient.cancelQueries({ queryKey: ['stage-hand-requests', sessionId] });
      await queryClient.cancelQueries({ queryKey: ['stage-participants', sessionId] });
      
      const previousRequests = queryClient.getQueryData<StageHandRequest[]>(['stage-hand-requests', sessionId]);
      const previousParticipants = queryClient.getQueryData<StageParticipant[]>(['stage-participants', sessionId]);
      
      // Remove from pending requests
      queryClient.setQueryData(['stage-hand-requests', sessionId], (old: StageHandRequest[] | undefined) =>
        old?.filter(r => r.id !== requestId)
      );
      
      // If approved, update participant role
      if (approved) {
        queryClient.setQueryData(['stage-participants', sessionId], (old: StageParticipant[] | undefined) =>
          old?.map(p => p.user_id === userId ? { ...p, role: 'speaker' as StageRole, is_muted: false } : p)
        );
      }
      
      return { previousRequests, previousParticipants, sessionId };
    },
    onError: (_, { sessionId }, context) => {
      if (context?.previousRequests) {
        queryClient.setQueryData(['stage-hand-requests', sessionId], context.previousRequests);
      }
      if (context?.previousParticipants) {
        queryClient.setQueryData(['stage-participants', sessionId], context.previousParticipants);
      }
    },
    onSettled: (_, __, { sessionId }) => {
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
      return { sessionId, userId, role };
    },
    onMutate: async ({ sessionId, userId, role }) => {
      await queryClient.cancelQueries({ queryKey: ['stage-participants', sessionId] });
      const previousParticipants = queryClient.getQueryData<StageParticipant[]>(['stage-participants', sessionId]);
      
      queryClient.setQueryData(['stage-participants', sessionId], (old: StageParticipant[] | undefined) =>
        old?.map(p => p.user_id === userId ? { ...p, role, is_muted: role === 'audience' } : p)
      );
      
      return { previousParticipants, sessionId };
    },
    onError: (_, { sessionId }, context) => {
      if (context?.previousParticipants) {
        queryClient.setQueryData(['stage-participants', sessionId], context.previousParticipants);
      }
    },
    onSuccess: () => {
      toast({ title: 'Rôle modifié' });
    },
    onSettled: (_, __, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['stage-participants', sessionId] });
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
      return { sessionId, participantId, muted };
    },
    onMutate: async ({ sessionId, participantId, muted }) => {
      await queryClient.cancelQueries({ queryKey: ['stage-participants', sessionId] });
      const previousParticipants = queryClient.getQueryData<StageParticipant[]>(['stage-participants', sessionId]);
      
      queryClient.setQueryData(['stage-participants', sessionId], (old: StageParticipant[] | undefined) =>
        old?.map(p => p.id === participantId ? { ...p, is_muted: muted } : p)
      );
      
      return { previousParticipants, sessionId };
    },
    onError: (_, { sessionId }, context) => {
      if (context?.previousParticipants) {
        queryClient.setQueryData(['stage-participants', sessionId], context.previousParticipants);
      }
    },
    onSettled: (_, __, { sessionId }) => {
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
      return { sessionId, muted };
    },
    onMutate: async ({ sessionId, muted }) => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['stage-participants', sessionId] });
      const previousParticipants = queryClient.getQueryData<StageParticipant[]>(['stage-participants', sessionId]);
      
      queryClient.setQueryData(['stage-participants', sessionId], (old: StageParticipant[] | undefined) =>
        old?.map(p => p.user_id === user.id ? { ...p, is_muted: muted } : p)
      );
      
      return { previousParticipants, sessionId };
    },
    onError: (_, { sessionId }, context) => {
      if (context?.previousParticipants) {
        queryClient.setQueryData(['stage-participants', sessionId], context.previousParticipants);
      }
    },
    onSettled: (_, __, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['stage-participants', sessionId] });
    },
  });
}
