import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface DMCall {
  id: string;
  conversation_id: string;
  initiator_id: string;
  status: 'ringing' | 'active' | 'ended' | 'declined';
  call_type: 'voice' | 'video';
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  initiator?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export function useDMCalls(conversationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get active call for this conversation
  const { data: activeCall, isLoading } = useQuery({
    queryKey: ['dm-call', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;

      const { data, error } = await supabase
        .from('dm_calls')
        .select(`
          *,
          initiator:profiles!dm_calls_initiator_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .in('status', ['ringing', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as DMCall | null;
    },
    enabled: !!conversationId && !!user,
    refetchInterval: 5000,
  });

  // Subscribe to call changes
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`dm-calls:${conversationId}`, { config: { private: true } })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dm_calls',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['dm-call', conversationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  // Start a call
  const startCall = useMutation({
    mutationFn: async ({ callType }: { callType: 'voice' | 'video' }) => {
      if (!user || !conversationId) throw new Error('Missing required data');

      const { data, error } = await supabase
        .from('dm_calls')
        .insert({
          conversation_id: conversationId,
          initiator_id: user.id,
          call_type: callType,
          status: 'ringing',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-call', conversationId] });
      toast.success('Appel en cours...');
    },
    onError: () => {
      toast.error('Impossible de lancer l\'appel');
    },
  });

  // Accept a call
  const acceptCall = useMutation({
    mutationFn: async (callId: string) => {
      const { error } = await supabase
        .from('dm_calls')
        .update({ 
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .eq('id', callId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-call', conversationId] });
    },
    onError: () => {
      toast.error('Impossible d\'accepter l\'appel');
    },
  });

  // Decline a call
  const declineCall = useMutation({
    mutationFn: async (callId: string) => {
      const { error } = await supabase
        .from('dm_calls')
        .update({ 
          status: 'declined',
          ended_at: new Date().toISOString(),
        })
        .eq('id', callId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-call', conversationId] });
    },
  });

  // End a call
  const endCall = useMutation({
    mutationFn: async (callId: string) => {
      const { error } = await supabase
        .from('dm_calls')
        .update({ 
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('id', callId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-call', conversationId] });
      toast.success('Appel terminé');
    },
  });

  return {
    activeCall,
    isLoading,
    startCall,
    acceptCall,
    declineCall,
    endCall,
  };
}

// Hook for incoming calls across all conversations
export function useIncomingCalls() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: incomingCalls = [] } = useQuery({
    queryKey: ['incoming-calls', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get conversations where user is participant
      const { data: participations } = await supabase
        .from('dm_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (!participations || participations.length === 0) return [];

      const conversationIds = participations.map(p => p.conversation_id);

      // Get ringing calls in those conversations where user is not the initiator
      const { data, error } = await supabase
        .from('dm_calls')
        .select(`
          *,
          initiator:profiles!dm_calls_initiator_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .in('conversation_id', conversationIds)
        .eq('status', 'ringing')
        .neq('initiator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DMCall[];
    },
    enabled: !!user,
    refetchInterval: 3000,
  });

  // Subscribe to new calls
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('incoming-calls')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dm_calls',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['incoming-calls', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dm_calls',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['incoming-calls', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return { incomingCalls };
}
