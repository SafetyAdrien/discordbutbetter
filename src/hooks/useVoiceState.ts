/* @refresh reset */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

export interface VoiceState {
  channelId: string | null;
  channelName: string | null;
  serverName: string | null;
  isMuted: boolean;
  isDeafened: boolean;
}

export function useVoiceState() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [voiceState, setVoiceState] = useState<VoiceState>({
    channelId: null,
    channelName: null,
    serverName: null,
    isMuted: false,
    isDeafened: false,
  });

  // Fetch current user's voice state
  const { data: currentVoiceState } = useQuery({
    queryKey: ['voice-state', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('voice_states')
        .select(`
          *,
          channel:channels!voice_states_channel_id_fkey (
            id,
            name,
            server:servers!channels_server_id_fkey (
              name
            )
          )
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Update local state when DB state changes
  useEffect(() => {
    if (currentVoiceState) {
      setVoiceState({
        channelId: currentVoiceState.channel_id,
        channelName: currentVoiceState.channel?.name || null,
        serverName: currentVoiceState.channel?.server?.name || null,
        isMuted: currentVoiceState.muted || false,
        isDeafened: currentVoiceState.deafened || false,
      });
    } else {
      setVoiceState({
        channelId: null,
        channelName: null,
        serverName: null,
        isMuted: false,
        isDeafened: false,
      });
    }
  }, [currentVoiceState]);

  // Join voice channel
  const joinChannel = useMutation({
    mutationFn: async ({ channelId, channelName, serverName }: { channelId: string; channelName: string; serverName: string }) => {
      if (!user) throw new Error('Not authenticated');

      // First, leave any existing voice channel
      await supabase
        .from('voice_states')
        .delete()
        .eq('user_id', user.id);

      // Join new channel
      const { error } = await supabase
        .from('voice_states')
        .insert({
          user_id: user.id,
          channel_id: channelId,
          muted: voiceState.isMuted,
          deafened: voiceState.isDeafened,
        });

      if (error) throw error;
      return { channelId, channelName, serverName };
    },
    onSuccess: ({ channelId, channelName, serverName }) => {
      setVoiceState(prev => ({
        ...prev,
        channelId,
        channelName,
        serverName,
      }));
      queryClient.invalidateQueries({ queryKey: ['voice-state'] });
      queryClient.invalidateQueries({ queryKey: ['voice-participants'] });
      toast.success(`Connecté à ${channelName}`);
    },
    onError: () => {
      toast.error('Impossible de rejoindre le canal vocal');
    },
  });

  // Leave voice channel
  const leaveChannel = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('voice_states')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      const prevChannelName = voiceState.channelName;
      setVoiceState({
        channelId: null,
        channelName: null,
        serverName: null,
        isMuted: false,
        isDeafened: false,
      });
      queryClient.invalidateQueries({ queryKey: ['voice-state'] });
      queryClient.invalidateQueries({ queryKey: ['voice-participants'] });
      toast.success(`Déconnecté de ${prevChannelName}`);
    },
  });

  // Toggle mute
  const toggleMute = useMutation({
    mutationFn: async () => {
      if (!user || !voiceState.channelId) throw new Error('Not in a voice channel');

      const newMuted = !voiceState.isMuted;
      const { error } = await supabase
        .from('voice_states')
        .update({ muted: newMuted })
        .eq('user_id', user.id);

      if (error) throw error;
      return newMuted;
    },
    onSuccess: (newMuted) => {
      setVoiceState(prev => ({ ...prev, isMuted: newMuted }));
      queryClient.invalidateQueries({ queryKey: ['voice-participants'] });
    },
  });

  // Toggle deafen
  const toggleDeafen = useMutation({
    mutationFn: async () => {
      if (!user || !voiceState.channelId) throw new Error('Not in a voice channel');

      const newDeafened = !voiceState.isDeafened;
      const updates: { deafened: boolean; muted?: boolean } = { deafened: newDeafened };
      
      // If deafening, also mute
      if (newDeafened && !voiceState.isMuted) {
        updates.muted = true;
      }

      const { error } = await supabase
        .from('voice_states')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;
      return { deafened: newDeafened, muted: updates.muted ?? voiceState.isMuted };
    },
    onSuccess: ({ deafened, muted }) => {
      setVoiceState(prev => ({ ...prev, isDeafened: deafened, isMuted: muted }));
      queryClient.invalidateQueries({ queryKey: ['voice-participants'] });
    },
  });

  return {
    voiceState,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleDeafen,
    isConnected: !!voiceState.channelId,
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
