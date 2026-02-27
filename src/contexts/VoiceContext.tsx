import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWebRTC } from '@/hooks/useWebRTC';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { soundEffects } from '@/utils/audio/SoundEffects';

// Re-export useVoiceParticipants from dedicated hook file
export { useVoiceParticipants } from '@/hooks/useVoiceParticipants';
export type { VoiceParticipant } from '@/hooks/useVoiceParticipants';

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
  audioLevels: Map<string, number>;
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
  const [audioLevels, setAudioLevels] = useState<Map<string, number>>(new Map());
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

  // Update speaking users and audio levels from WebRTC (VAD - Voice Activity Detection)
  useEffect(() => {
    const newSpeaking = new Set<string>();
    const newAudioLevels = new Map<string, number>();
    
    // Check if local user is speaking (audio level > threshold and not muted)
    if (webrtc.audioLevel > 0.05 && !voiceState.isMuted && user?.id) {
      newSpeaking.add(user.id);
    }
    if (user?.id) {
      newAudioLevels.set(user.id, webrtc.audioLevel);
    }
    
    // Check remote peers speaking status and audio levels
    webrtc.peers.forEach((peer, peerId) => {
      if (peer.isSpeaking) {
        newSpeaking.add(peerId);
      }
      newAudioLevels.set(peerId, peer.audioLevel);
    });
    
    setSpeakingUsers(newSpeaking);
    setAudioLevels(newAudioLevels);
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

  // Subscribe to voice state changes for sound effects only (cache updates handled by useVoiceParticipants)
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
          // No invalidateQueries here — useVoiceParticipants handles cache updates directly
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [voiceState.channelId, user?.id]);

  const joinChannel = useCallback(async (channelId: string, channelName: string, serverName: string) => {
    if (!user) throw new Error('Not authenticated');

    const prevState = { ...voiceState };

    // 1. Instant UI update + sound
    setVoiceState(prev => ({
      ...prev,
      channelId,
      channelName,
      serverName,
    }));
    soundEffects.playJoin();
    toast.success(`Connecté à ${channelName}`);

    // 2. Background: DB + WebRTC in parallel
    try {
      await supabase
        .from('voice_states')
        .delete()
        .eq('user_id', user.id);

      const [dbResult] = await Promise.all([
        supabase
          .from('voice_states')
          .insert({
            user_id: user.id,
            channel_id: channelId,
            muted: prevState.isMuted,
            deafened: prevState.isDeafened,
          }),
        webrtc.connect(channelId),
      ]);

      if (dbResult.error) {
        if (dbResult.error.code === '42501' || dbResult.error.message?.includes('violates row-level security')) {
          toast.error('Accès refusé', {
            description: 'Vous n\'avez pas la permission de rejoindre ce salon vocal.',
          });
        }
        throw dbResult.error;
      }

      queryClient.invalidateQueries({ queryKey: ['voice-state'] });
      queryClient.invalidateQueries({ queryKey: ['voice-participants'] });
    } catch (error) {
      // 3. Rollback on failure
      console.error('[VoiceContext] Join failed, rolling back:', error);
      setVoiceState(prevState);
      webrtc.disconnect();
      toast.error('Impossible de rejoindre le canal vocal');
    }
  }, [user, voiceState, webrtc, queryClient]);

  const leaveChannel = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');

    const prevChannelName = voiceState.channelName;

    // 1. Instant UI update + sound
    setVoiceState({
      channelId: null,
      channelName: null,
      serverName: null,
      isMuted: false,
      isDeafened: false,
    });
    soundEffects.playLeave();
    toast.success(`Déconnecté de ${prevChannelName}`);

    // 2. Background cleanup
    webrtc.disconnect();
    await supabase
      .from('voice_states')
      .delete()
      .eq('user_id', user.id);

    queryClient.invalidateQueries({ queryKey: ['voice-state'] });
    queryClient.invalidateQueries({ queryKey: ['voice-participants'] });
  }, [user, voiceState.channelName, webrtc, queryClient]);

  const toggleMute = useCallback(async () => {
    if (!user || !voiceState.channelId) throw new Error('Not in a voice channel');

    const newMuted = !voiceState.isMuted;

    // 1. Instant UI + audio
    setVoiceState(prev => ({ ...prev, isMuted: newMuted }));
    webrtc.setMuted(newMuted);
    newMuted ? soundEffects.playMute() : soundEffects.playUnmute();

    // 2. Optimistic cache update for participants list
    queryClient.setQueryData(['voice-participants', voiceState.channelId], (old: any) =>
      old?.map((p: any) => p.user_id === user.id ? { ...p, muted: newMuted } : p)
    );

    // 3. Background DB sync with rollback
    const { error } = await supabase
      .from('voice_states')
      .update({ muted: newMuted })
      .eq('user_id', user.id);

    if (error) {
      console.error('[VoiceContext] toggleMute rollback:', error);
      setVoiceState(prev => ({ ...prev, isMuted: !newMuted }));
      webrtc.setMuted(!newMuted);
      queryClient.setQueryData(['voice-participants', voiceState.channelId], (old: any) =>
        old?.map((p: any) => p.user_id === user.id ? { ...p, muted: !newMuted } : p)
      );
    }
  }, [user, voiceState.channelId, voiceState.isMuted, webrtc, queryClient]);

  const toggleDeafen = useCallback(async () => {
    if (!user || !voiceState.channelId) throw new Error('Not in a voice channel');

    const newDeafened = !voiceState.isDeafened;
    const newMuted = newDeafened && !voiceState.isMuted ? true : undefined;
    const updates: { deafened: boolean; muted?: boolean } = { deafened: newDeafened };
    if (newMuted !== undefined) updates.muted = newMuted;

    // 1. Instant UI + audio
    setVoiceState(prev => ({
      ...prev,
      isDeafened: newDeafened,
      isMuted: newMuted ?? prev.isMuted,
    }));
    webrtc.setDeafened(newDeafened);
    if (newMuted !== undefined) webrtc.setMuted(newMuted);
    newDeafened ? soundEffects.playDeafen() : soundEffects.playUndeafen();

    // 2. Optimistic cache
    queryClient.setQueryData(['voice-participants', voiceState.channelId], (old: any) =>
      old?.map((p: any) => p.user_id === user.id
        ? { ...p, deafened: newDeafened, ...(newMuted !== undefined ? { muted: newMuted } : {}) }
        : p
      )
    );

    // 3. Background DB sync with rollback
    const { error } = await supabase
      .from('voice_states')
      .update(updates)
      .eq('user_id', user.id);

    if (error) {
      console.error('[VoiceContext] toggleDeafen rollback:', error);
      setVoiceState(prev => ({
        ...prev,
        isDeafened: !newDeafened,
        isMuted: newMuted !== undefined ? !newMuted : prev.isMuted,
      }));
      webrtc.setDeafened(!newDeafened);
      if (newMuted !== undefined) webrtc.setMuted(!newMuted);
      queryClient.setQueryData(['voice-participants', voiceState.channelId], (old: any) =>
        old?.map((p: any) => p.user_id === user.id
          ? { ...p, deafened: !newDeafened, ...(newMuted !== undefined ? { muted: !newMuted } : {}) }
          : p
        )
      );
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
        audioLevels,
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