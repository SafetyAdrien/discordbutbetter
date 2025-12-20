import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWebRTC } from '@/hooks/useWebRTC';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { soundEffects } from '@/utils/audio/SoundEffects';

export interface VoiceState {
  channelId: string | null;
  channelName: string | null;
  serverName: string | null;
  isMuted: boolean;
  isDeafened: boolean;
}

interface VoiceContextType {
  voiceState: VoiceState;
  joinChannel: (channelId: string, channelName: string, serverName: string) => Promise<void>;
  leaveChannel: () => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleDeafen: () => Promise<void>;
  isConnected: boolean;
  speakingUsers: Set<string>;
  localAudioLevel: number;
  microphoneError: boolean;
  hasMicrophoneAccess: boolean;
  retryMicrophone: () => Promise<boolean>;
  isPushToTalkMode: boolean;
  togglePushToTalkMode: () => void;
  setPushToTalkActive: (active: boolean) => void;
  // Camera
  isCameraActive: boolean;
  localCameraStream: MediaStream | null;
  toggleCamera: () => Promise<void>;
  // Screen Share
  isScreenSharing: boolean;
  localScreenStream: MediaStream | null;
  toggleScreenShare: () => Promise<void>;
  // Remote streams
  remoteVideoStreams: Map<string, MediaStream>;
  remoteScreenStreams: Map<string, MediaStream>;
  // Connection stats
  connectionStats: import('@/utils/webrtc/PeerConnection').ConnectionStats | null;
}

const VoiceContext = createContext<VoiceContextType | null>(null);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const webrtc = useWebRTC();
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
  const [localAudioLevel, setLocalAudioLevel] = useState(0);

  const [voiceState, setVoiceState] = useState<VoiceState>({
    channelId: null,
    channelName: null,
    serverName: null,
    isMuted: false,
    isDeafened: false,
  });

  // Fetch current user's voice state from DB
  const { data: dbVoiceState } = useQuery({
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

  // Sync local state with DB state on mount
  useEffect(() => {
    if (dbVoiceState) {
      setVoiceState({
        channelId: dbVoiceState.channel_id,
        channelName: dbVoiceState.channel?.name || null,
        serverName: dbVoiceState.channel?.server?.name || null,
        isMuted: dbVoiceState.muted || false,
        isDeafened: dbVoiceState.deafened || false,
      });

      // Reconnect WebRTC if we were in a channel
      if (dbVoiceState.channel_id && !webrtc.isConnected) {
        webrtc.connect(dbVoiceState.channel_id);
      }
    }
  }, [dbVoiceState]);

  // Update speaking users from WebRTC (VAD - Voice Activity Detection)
  useEffect(() => {
    const newSpeaking = new Set<string>();
    
    // Check if local user is speaking (audio level > threshold and not muted)
    if (webrtc.audioLevel > 0.05 && !voiceState.isMuted && user?.id) {
      newSpeaking.add(user.id);
    }
    
    // Check remote peers speaking status
    webrtc.peers.forEach((peer, peerId) => {
      if (peer.isSpeaking) {
        newSpeaking.add(peerId);
      }
    });
    
    setSpeakingUsers(newSpeaking);
    setLocalAudioLevel(webrtc.audioLevel);
  }, [webrtc.peers, webrtc.audioLevel, voiceState.isMuted, user?.id]);

  // Show toast when microphone access fails
  useEffect(() => {
    if (webrtc.microphoneError && voiceState.channelId) {
      toast.warning('Mode écoute seule', {
        description: 'Impossible d\'accéder au microphone. Vous pouvez écouter mais pas parler.',
        action: {
          label: 'Réessayer',
          onClick: () => webrtc.retryMicrophone(),
        },
        duration: 10000,
      });
    }
  }, [webrtc.microphoneError, voiceState.channelId]);

  // Subscribe to voice state changes for sound effects
  useEffect(() => {
    if (!voiceState.channelId) return;

    const channel = supabase
      .channel(`voice-events:${voiceState.channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'voice_states',
          filter: `channel_id=eq.${voiceState.channelId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new.user_id !== user?.id) {
            soundEffects.playUserJoin();
          } else if (payload.eventType === 'DELETE' && payload.old.user_id !== user?.id) {
            soundEffects.playUserLeave();
          }
          queryClient.invalidateQueries({ queryKey: ['voice-participants'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [voiceState.channelId, user?.id, queryClient]);

  const joinChannel = useCallback(async (channelId: string, channelName: string, serverName: string) => {
    if (!user) throw new Error('Not authenticated');

    // Optimistic update - Update local state IMMEDIATELY
    setVoiceState(prev => ({
      ...prev,
      channelId,
      channelName,
      serverName,
    }));

    // Optimistic update - Add self to participants cache immediately
    const optimisticParticipant = {
      id: `temp-${user.id}`,
      user_id: user.id,
      channel_id: channelId,
      muted: voiceState.isMuted,
      deafened: voiceState.isDeafened,
      camera: false,
      streaming: false,
      joined_at: new Date().toISOString(),
      profile: {
        id: user.id,
        username: user.email?.split('@')[0] || 'user',
        display_name: user.email?.split('@')[0] || 'User',
        avatar_url: null,
      },
    };

    queryClient.setQueryData(['voice-participants', channelId], (old: any[] | undefined) => {
      if (!old) return [optimisticParticipant];
      // Remove any existing entry for this user and add new one
      return [...old.filter(p => p.user_id !== user.id), optimisticParticipant];
    });

    // Start WebRTC connection in parallel with DB operations
    const webrtcPromise = webrtc.connect(channelId);

    // Leave any existing channel first
    await supabase
      .from('voice_states')
      .delete()
      .eq('user_id', user.id);

    // Join new channel in DB
    const { error, data } = await supabase
      .from('voice_states')
      .insert({
        user_id: user.id,
        channel_id: channelId,
        muted: voiceState.isMuted,
        deafened: voiceState.isDeafened,
      })
      .select(`
        *,
        profile:profiles!voice_states_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      // Rollback optimistic update on error
      setVoiceState(prev => ({
        ...prev,
        channelId: null,
        channelName: null,
        serverName: null,
      }));
      queryClient.setQueryData(['voice-participants', channelId], (old: any[] | undefined) => {
        if (!old) return [];
        return old.filter(p => p.user_id !== user.id);
      });
      toast.error('Impossible de rejoindre le canal vocal');
      throw error;
    }

    // Update cache with real data from DB
    if (data) {
      queryClient.setQueryData(['voice-participants', channelId], (old: any[] | undefined) => {
        if (!old) return [data];
        return [...old.filter(p => p.user_id !== user.id), {
          ...data,
          muted: data.muted || false,
          deafened: data.deafened || false,
          camera: data.camera || false,
          streaming: data.streaming || false,
          joined_at: data.joined_at || new Date().toISOString(),
        }];
      });
    }

    // Wait for WebRTC to finish connecting
    await webrtcPromise;

    queryClient.invalidateQueries({ queryKey: ['voice-state'] });

    soundEffects.playJoin();
    toast.success(`Connecté à ${channelName}`);
  }, [user, voiceState.isMuted, voiceState.isDeafened, webrtc, queryClient]);

  const leaveChannel = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');

    const prevChannelName = voiceState.channelName;

    // Disconnect WebRTC
    webrtc.disconnect();

    // Leave in DB
    const { error } = await supabase
      .from('voice_states')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;

    setVoiceState({
      channelId: null,
      channelName: null,
      serverName: null,
      isMuted: false,
      isDeafened: false,
    });

    queryClient.invalidateQueries({ queryKey: ['voice-state'] });
    queryClient.invalidateQueries({ queryKey: ['voice-participants'] });

    soundEffects.playLeave();
    toast.success(`Déconnecté de ${prevChannelName}`);
  }, [user, voiceState.channelName, webrtc, queryClient]);

  const toggleMute = useCallback(async () => {
    if (!user || !voiceState.channelId) throw new Error('Not in a voice channel');

    const newMuted = !voiceState.isMuted;

    const { error } = await supabase
      .from('voice_states')
      .update({ muted: newMuted })
      .eq('user_id', user.id);

    if (error) throw error;

    webrtc.setMuted(newMuted);
    setVoiceState(prev => ({ ...prev, isMuted: newMuted }));
    queryClient.invalidateQueries({ queryKey: ['voice-participants'] });

    if (newMuted) {
      soundEffects.playMute();
    } else {
      soundEffects.playUnmute();
    }
  }, [user, voiceState.channelId, voiceState.isMuted, webrtc, queryClient]);

  const toggleDeafen = useCallback(async () => {
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

    webrtc.setDeafened(newDeafened);
    if (updates.muted !== undefined) {
      webrtc.setMuted(updates.muted);
    }

    setVoiceState(prev => ({
      ...prev,
      isDeafened: newDeafened,
      isMuted: updates.muted ?? prev.isMuted,
    }));
    queryClient.invalidateQueries({ queryKey: ['voice-participants'] });

    if (newDeafened) {
      soundEffects.playDeafen();
    } else {
      soundEffects.playUndeafen();
    }
  }, [user, voiceState.channelId, voiceState.isDeafened, voiceState.isMuted, webrtc, queryClient]);

  const togglePushToTalkMode = useCallback(() => {
    webrtc.setPushToTalkMode(!webrtc.isPushToTalkMode);
  }, [webrtc]);

  const retryMicrophone = useCallback(async () => {
    const success = await webrtc.retryMicrophone();
    if (success) {
      toast.success('Microphone activé');
    } else {
      toast.error('Impossible d\'accéder au microphone');
    }
    return success;
  }, [webrtc]);

  // Toggle camera
  const toggleCamera = useCallback(async () => {
    try {
      if (webrtc.isCameraActive) {
        webrtc.stopCamera();
        toast.success('Caméra désactivée');
      } else {
        await webrtc.startCamera();
        toast.success('Caméra activée');
      }
    } catch (error) {
      toast.error('Impossible d\'accéder à la caméra');
    }
  }, [webrtc]);

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    try {
      if (webrtc.isScreenSharing) {
        webrtc.stopScreenShare();
        toast.success('Partage d\'écran arrêté');
      } else {
        await webrtc.startScreenShare();
        toast.success('Partage d\'écran démarré');
      }
    } catch (error) {
      // User cancelled the screen share dialog
      console.log('[VoiceContext] Screen share cancelled or failed');
    }
  }, [webrtc]);

  return (
    <VoiceContext.Provider
      value={{
        voiceState,
        joinChannel,
        leaveChannel,
        toggleMute,
        toggleDeafen,
        isConnected: !!voiceState.channelId,
        speakingUsers,
        localAudioLevel,
        microphoneError: webrtc.microphoneError,
        hasMicrophoneAccess: webrtc.hasMicrophoneAccess,
        retryMicrophone,
        isPushToTalkMode: webrtc.isPushToTalkMode,
        togglePushToTalkMode,
        setPushToTalkActive: webrtc.setPushToTalkActive,
        // Camera
        isCameraActive: webrtc.isCameraActive,
        localCameraStream: webrtc.localCameraStream,
        toggleCamera,
        // Screen Share
        isScreenSharing: webrtc.isScreenSharing,
        localScreenStream: webrtc.localScreenStream,
        toggleScreenShare,
        // Remote streams
        remoteVideoStreams: webrtc.remoteVideoStreams,
        remoteScreenStreams: webrtc.remoteScreenStreams,
        // Connection stats
        connectionStats: webrtc.connectionStats,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
}

// Hook for voice participants
export function useVoiceParticipants(channelId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['voice-participants', channelId],
    queryFn: async () => {
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
        profile: vs.profile as {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
        },
      }));
    },
    enabled: !!channelId,
  });

  // Real-time subscription with optimistic updates
  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`voice-participants:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'voice_states',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const newState = payload.new as any;
          // Fetch profile data for the new participant
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .eq('id', newState.user_id)
            .single();

          const newParticipant = {
            ...newState,
            muted: newState.muted || false,
            deafened: newState.deafened || false,
            camera: newState.camera || false,
            streaming: newState.streaming || false,
            joined_at: newState.joined_at || new Date().toISOString(),
            profile: profile || {
              id: newState.user_id,
              username: 'user',
              display_name: 'User',
              avatar_url: null,
            },
          };

          // Directly update cache instead of invalidating
          queryClient.setQueryData(['voice-participants', channelId], (old: any[] | undefined) => {
            if (!old) return [newParticipant];
            // Avoid duplicates
            if (old.some(p => p.user_id === newState.user_id)) {
              return old.map(p => p.user_id === newState.user_id ? newParticipant : p);
            }
            return [...old, newParticipant];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'voice_states',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const oldState = payload.old as any;
          // Directly remove from cache
          queryClient.setQueryData(['voice-participants', channelId], (old: any[] | undefined) => {
            if (!old) return [];
            return old.filter(p => p.id !== oldState.id && p.user_id !== oldState.user_id);
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'voice_states',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const updatedState = payload.new as any;
          // Update in cache
          queryClient.setQueryData(['voice-participants', channelId], (old: any[] | undefined) => {
            if (!old) return [];
            return old.map(p => {
              if (p.user_id === updatedState.user_id) {
                return {
                  ...p,
                  ...updatedState,
                  muted: updatedState.muted || false,
                  deafened: updatedState.deafened || false,
                  camera: updatedState.camera || false,
                  streaming: updatedState.streaming || false,
                };
              }
              return p;
            });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, queryClient]);

  return query;
}