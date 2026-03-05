/* @refresh reset */
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface VoiceState {
  channelId: string | null;
  channelName: string | null;
  serverName: string | null;
  isMuted: boolean;
  isDeafened: boolean;
}

const initialVoiceState: VoiceState = {
  channelId: null,
  channelName: null,
  serverName: null,
  isMuted: false,
  isDeafened: false,
};

export function useVoiceState() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [voiceState, setVoiceState] = useState<VoiceState>(initialVoiceState);

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
    staleTime: 0,
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
      setVoiceState(initialVoiceState);
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
    onMutate: async ({ channelId }) => {
      if (!user) return;

      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['voice-participants', channelId] });

      // Resolve profile from cache — try profile cache, then any members cache
      const profileCache = queryClient.getQueryData<any>(['profile', user.id]);
      const profile = profileCache ?? { id: user.id, username: user.email?.split('@')[0] || 'user', display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User', avatar_url: user.user_metadata?.avatar_url || null };

      // Optimistically add current user to voice participants cache
      queryClient.setQueryData(['voice-participants', channelId], (old: any[] | undefined) => {
        if (old?.some((p: any) => p.user_id === user.id)) return old;
        return [
          ...(old || []),
          {
            id: crypto.randomUUID(),
            user_id: user.id,
            channel_id: channelId,
            muted: voiceState.isMuted,
            deafened: voiceState.isDeafened,
            camera: false,
            streaming: false,
            joined_at: new Date().toISOString(),
            profile: {
              id: user.id,
              username: profile.username || 'user',
              display_name: profile.display_name || 'User',
              avatar_url: profile.avatar_url || null,
            },
          },
        ];
      });
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
    onError: (_err, { channelId }) => {
      // Rollback optimistic update
      queryClient.invalidateQueries({ queryKey: ['voice-participants', channelId] });
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
      setVoiceState(initialVoiceState);
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
