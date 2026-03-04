import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWebRTC } from '@/hooks/useWebRTC';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { soundEffects } from '@/utils/audio/SoundEffects';
import { audioProcessor, type NoiseSuppressonMode, type VADSensitivity } from '@/utils/webrtc/AudioProcessor';
import type { ScreenShareOptions } from '@/utils/webrtc/MediaManager';

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
  toggleScreenShare: (options?: ScreenShareOptions) => Promise<void>;
  // Remote streams
  remoteVideoStreams: Map<string, MediaStream>;
  remoteScreenStreams: Map<string, MediaStream>;
  // Connection stats
  connectionStats: import('@/utils/webrtc/PeerConnection').ConnectionStats | null;
  // Noise suppression
  noiseSuppression: NoiseSuppressonMode;
  setNoiseSuppression: (mode: NoiseSuppressonMode) => void;
  rnnoiseAvailable: boolean;
  // Mic volume
  micVolume: number;
  setMicVolume: (vol: number) => void;
  // VAD sensitivity
  vadSensitivity: import('@/utils/webrtc/AudioProcessor').VADSensitivity;
  setVadSensitivity: (s: import('@/utils/webrtc/AudioProcessor').VADSensitivity) => void;
  // Audio filters
  audioFilters: { deEsser: boolean; lowShelf: boolean; highPass: boolean };
  setAudioFilter: (filter: 'deEsser' | 'lowShelf' | 'highPass', enabled: boolean) => void;
}

const VoiceContext = createContext<VoiceContextType | null>(null);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const webrtc = useWebRTC();
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
  const [audioLevels, setAudioLevels] = useState<Map<string, number>>(new Map());
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  
  // Noise suppression state (persisted in localStorage)
  const [noiseSuppression, setNoiseSuppressionState] = useState<NoiseSuppressonMode>(() => {
    try {
      return (localStorage.getItem('voice-noise-suppression') as NoiseSuppressonMode) || 'high';
    } catch { return 'high'; }
  });

  // Mic volume (persisted)
  const [micVolume, setMicVolumeState] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('voice-mic-volume') || '100', 10);
    } catch { return 100; }
  });

  // VAD sensitivity (persisted)
  const [vadSensitivity, setVadSensitivityState] = useState<VADSensitivity>(() => {
    try {
      return (localStorage.getItem('voice-vad-sensitivity') as VADSensitivity) || 'high';
    } catch { return 'high'; }
  });

  // Audio filters (persisted)
  const [audioFilters, setAudioFilters] = useState(() => {
    try {
      const stored = localStorage.getItem('voice-audio-filters');
      return stored ? JSON.parse(stored) : { deEsser: true, lowShelf: true, highPass: true };
    } catch { return { deEsser: true, lowShelf: true, highPass: true }; }
  });

  const [voiceState, setVoiceState] = useState<VoiceState>({
    channelId: null,
    channelName: null,
    serverName: null,
    isMuted: false,
    isDeafened: false,
  });
  const wasMutedBeforeDeafenRef = useRef(false);

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

    // 2. Optimistic: remove self from ALL voice-participants caches (cross-channel cleanup)
    queryClient.setQueriesData(
      { queryKey: ['voice-participants'] },
      (old: any) => old?.filter((p: any) => p.user_id !== user.id) ?? old
    );

    // 3. Optimistic: add self to target channel cache immediately (with profile fetch)
    const profilePromise = supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', user.id)
      .single();

    // Add with fallback profile first for instant render
    queryClient.setQueryData(['voice-participants', channelId], (old: any) => {
      const existing = old || [];
      if (existing.some((p: any) => p.user_id === user.id)) return existing;
      return [...existing, {
        id: crypto.randomUUID(),
        user_id: user.id,
        channel_id: channelId,
        muted: prevState.isMuted,
        deafened: prevState.isDeafened,
        camera: false,
        streaming: false,
        joined_at: new Date().toISOString(),
        profile: { id: user.id, username: 'me', display_name: 'Moi', avatar_url: null },
      }];
    });

    // 4. Background: DB + WebRTC + profile hydration in parallel
    try {
      const [dbResult, , profileResult] = await Promise.all([
        supabase
          .from('voice_states')
          .delete()
          .eq('user_id', user.id)
          .then(() =>
            supabase
              .from('voice_states')
              .insert({
                user_id: user.id,
                channel_id: channelId,
                muted: prevState.isMuted,
                deafened: prevState.isDeafened,
              })
          ),
        webrtc.connect(channelId),
        profilePromise,
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

      // Hydrate profile in cache
      if (profileResult.data) {
        queryClient.setQueryData(['voice-participants', channelId], (old: any) =>
          old?.map((p: any) => p.user_id === user.id ? { ...p, profile: profileResult.data } : p)
        );
      }
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
    const prevChannelId = voiceState.channelId;

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

    // 2. Optimistic removal from participants cache (prevents ghost)
    if (prevChannelId) {
      queryClient.setQueryData(['voice-participants', prevChannelId], (old: any) =>
        old?.filter((p: any) => p.user_id !== user.id) ?? []
      );
    }

    // 3. Background cleanup
    webrtc.disconnect();
    await supabase
      .from('voice_states')
      .delete()
      .eq('user_id', user.id);

    queryClient.invalidateQueries({ queryKey: ['voice-state'] });
  }, [user, voiceState.channelName, voiceState.channelId, webrtc, queryClient]);

  const toggleMute = useCallback(async () => {
    if (!user) return;
    // Allow pre-mute when not connected
    if (!voiceState.channelId) {
      setVoiceState(prev => ({ ...prev, isMuted: !prev.isMuted }));
      !voiceState.isMuted ? soundEffects.playMute() : soundEffects.playUnmute();
      return;
    }

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
    if (!user) return;
    // Allow pre-deafen when not connected
    if (!voiceState.channelId) {
      const newDeafened = !voiceState.isDeafened;
      if (newDeafened) {
        wasMutedBeforeDeafenRef.current = voiceState.isMuted;
        setVoiceState(prev => ({ ...prev, isDeafened: true, isMuted: true }));
      } else {
        setVoiceState(prev => ({ ...prev, isDeafened: false, isMuted: wasMutedBeforeDeafenRef.current }));
      }
      newDeafened ? soundEffects.playDeafen() : soundEffects.playUndeafen();
      return;
    }

    const newDeafened = !voiceState.isDeafened;
    const updates: { deafened: boolean; muted?: boolean } = { deafened: newDeafened };
    let finalMuted = voiceState.isMuted;

    if (newDeafened) {
      // Deafening: remember if user was already muted, then force mute
      wasMutedBeforeDeafenRef.current = voiceState.isMuted;
      if (!voiceState.isMuted) {
        updates.muted = true;
        finalMuted = true;
      }
    } else {
      // Un-deafening: restore mute to pre-deafen state
      updates.muted = wasMutedBeforeDeafenRef.current;
      finalMuted = wasMutedBeforeDeafenRef.current;
    }

    // 1. Instant UI + audio
    setVoiceState(prev => ({
      ...prev,
      isDeafened: newDeafened,
      isMuted: finalMuted,
    }));
    webrtc.setDeafened(newDeafened);
    webrtc.setMuted(finalMuted);
    newDeafened ? soundEffects.playDeafen() : soundEffects.playUndeafen();

    // 2. Optimistic cache
    queryClient.setQueryData(['voice-participants', voiceState.channelId], (old: any) =>
      old?.map((p: any) => p.user_id === user.id
        ? { ...p, deafened: newDeafened, muted: finalMuted }
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
      const prevMuted = voiceState.isMuted;
      const prevDeafened = voiceState.isDeafened;
      setVoiceState(prev => ({
        ...prev,
        isDeafened: prevDeafened,
        isMuted: prevMuted,
      }));
      webrtc.setDeafened(prevDeafened);
      webrtc.setMuted(prevMuted);
      queryClient.setQueryData(['voice-participants', voiceState.channelId], (old: any) =>
        old?.map((p: any) => p.user_id === user.id
          ? { ...p, deafened: prevDeafened, muted: prevMuted }
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
  // Cleanup voice_states on tab close / component unmount
  const voiceStateRef = useRef(voiceState);
  const userRef = useRef(user);
  const sessionTokenRef = useRef<string | null>(null);
  useEffect(() => { voiceStateRef.current = voiceState; }, [voiceState]);
  useEffect(() => { userRef.current = user; }, [user]);

  // Keep session token cached for beforeunload (can't await in sync handler)
  useEffect(() => {
    const updateToken = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      sessionTokenRef.current = session?.access_token || null;
    };
    updateToken();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      sessionTokenRef.current = session?.access_token || null;
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentUser = userRef.current;
      const currentChannelId = voiceStateRef.current.channelId;
      if (!currentUser || !currentChannelId) return;

      const token = sessionTokenRef.current || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // Use fetch with keepalive to ensure the request completes even as the page closes
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/voice_states?user_id=eq.${currentUser.id}`, {
        method: 'DELETE',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        keepalive: true,
      }).catch(() => {});
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

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
  const toggleScreenShare = useCallback(async (options?: ScreenShareOptions) => {
    try {
      if (webrtc.isScreenSharing) {
        webrtc.stopScreenShare();
        toast.success('Partage d\'écran arrêté');
      } else {
        await webrtc.startScreenShare(options);
        toast.success('Partage d\'écran démarré');
      }
    } catch (error) {
      console.log('[VoiceContext] Screen share cancelled or failed');
    }
  }, [webrtc]);

  const setNoiseSuppression = useCallback((mode: NoiseSuppressonMode) => {
    setNoiseSuppressionState(mode);
    audioProcessor.setNoiseSuppression(mode);
    try { localStorage.setItem('voice-noise-suppression', mode); } catch {}
  }, []);

  const setMicVolume = useCallback((vol: number) => {
    setMicVolumeState(vol);
    audioProcessor.setInputGain(vol);
    try { localStorage.setItem('voice-mic-volume', String(vol)); } catch {}
  }, []);

  const setVadSensitivity = useCallback((s: VADSensitivity) => {
    setVadSensitivityState(s);
    audioProcessor.setVADSensitivity(s);
    try { localStorage.setItem('voice-vad-sensitivity', s); } catch {}
  }, []);

  const setAudioFilter = useCallback((filter: 'deEsser' | 'lowShelf' | 'highPass', enabled: boolean) => {
    setAudioFilters((prev: any) => {
      const next = { ...prev, [filter]: enabled };
      try { localStorage.setItem('voice-audio-filters', JSON.stringify(next)); } catch {}
      return next;
    });
    if (filter === 'deEsser') audioProcessor.setDeEsserEnabled(enabled);
    if (filter === 'lowShelf') audioProcessor.setLowShelfEnabled(enabled);
    if (filter === 'highPass') audioProcessor.setHighPassEnabled(enabled);
  }, []);

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
        // Noise suppression
        noiseSuppression,
        setNoiseSuppression,
        rnnoiseAvailable: audioProcessor.rnnoiseAvailable,
        // Mic volume
        micVolume,
        setMicVolume,
        // VAD
        vadSensitivity,
        setVadSensitivity,
        // Audio filters
        audioFilters,
        setAudioFilter,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
}

const defaultVoiceContext: VoiceContextType = {
  voiceState: { channelId: null, channelName: null, serverName: null, isMuted: false, isDeafened: false },
  joinChannel: async () => {},
  leaveChannel: async () => {},
  toggleMute: async () => {},
  toggleDeafen: async () => {},
  isConnected: false,
  speakingUsers: new Set(),
  audioLevels: new Map(),
  localAudioLevel: 0,
  microphoneError: false,
  hasMicrophoneAccess: false,
  retryMicrophone: async () => false,
  isPushToTalkMode: false,
  togglePushToTalkMode: () => {},
  setPushToTalkActive: () => {},
  isCameraActive: false,
  localCameraStream: null,
  toggleCamera: async () => {},
  isScreenSharing: false,
  localScreenStream: null,
  toggleScreenShare: async () => {},
  remoteVideoStreams: new Map(),
  remoteScreenStreams: new Map(),
  connectionStats: null,
  noiseSuppression: 'high',
  setNoiseSuppression: () => {},
  rnnoiseAvailable: false,
  micVolume: 100,
  setMicVolume: () => {},
  vadSensitivity: 'high',
  setVadSensitivity: () => {},
  audioFilters: { deEsser: true, lowShelf: true, highPass: true },
  setAudioFilter: () => {},
};

export function useVoice() {
  const context = useContext(VoiceContext);
  return context ?? defaultVoiceContext;
}