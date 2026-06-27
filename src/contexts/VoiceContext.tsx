import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWebRTC } from '@/hooks/useWebRTC';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { soundEffects } from '@/utils/audio/SoundEffects';
import { audioProcessor, type NoiseSuppressonMode, type VADSensitivity } from '@/utils/webrtc/AudioProcessor';
import type { ScreenShareOptions } from '@/utils/webrtc/MediaManager';
import { mediaManager } from '@/utils/webrtc/MediaManager';

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
  // Output (headphones) volume
  outputVolume: number;
  setOutputVolume: (vol: number) => void;
  // Device selection (Fix #6)
  inputDeviceId: string;
  outputDeviceId: string;
  availableInputs: MediaDeviceInfo[];
  availableOutputs: MediaDeviceInfo[];
  setInputDeviceId: (id: string) => Promise<void>;
  setOutputDeviceId: (id: string) => Promise<void>;
  outputSinkSupported: boolean;
  outputSinkPartial: boolean;
  // Mic permission gate for device enumeration
  micPermission: 'granted' | 'denied' | 'prompt' | 'unknown';
  refreshDevices: () => Promise<void>;
  requestMicPermission: () => Promise<boolean>;
}

const VoiceContext = createContext<VoiceContextType | null>(null);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
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

  // Output (headphones) volume — persisted, applied to all remote audio
  const [outputVolume, setOutputVolumeState] = useState<number>(() => {
    try { return parseInt(localStorage.getItem('voice-output-volume') || '100', 10); }
    catch { return 100; }
  });


  // ---- Device selection state (Fix #6) ----
  const [inputDeviceId, setInputDeviceIdState] = useState<string>(() => mediaManager.getInputDeviceId());
  const [outputDeviceId, setOutputDeviceIdState] = useState<string>(() => mediaManager.getOutputDeviceId());
  const [availableInputs, setAvailableInputs] = useState<MediaDeviceInfo[]>([]);
  const [availableOutputs, setAvailableOutputs] = useState<MediaDeviceInfo[]>([]);
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const canRouteNative = typeof HTMLMediaElement !== 'undefined' &&
    'setSinkId' in HTMLMediaElement.prototype;
  const canRouteWebAudio = mediaManager.canRouteWebAudioToDevice();
  const outputSinkSupported = canRouteNative && canRouteWebAudio;
  const outputSinkPartial = (canRouteNative || canRouteWebAudio) && !outputSinkSupported;

  // ---- Device enumeration + permission detection ----
  const inputDeviceIdRef = useRef(inputDeviceId);
  const outputDeviceIdRef = useRef(outputDeviceId);
  inputDeviceIdRef.current = inputDeviceId;
  outputDeviceIdRef.current = outputDeviceId;

  const refreshDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const ins = list.filter(d => d.kind === 'audioinput');
      const outs = list.filter(d => d.kind === 'audiooutput');
      setAvailableInputs(ins);
      setAvailableOutputs(outs);

      // Heuristic: if every audioinput has an empty deviceId & label, the
      // browser hasn't unlocked devices (permission not granted yet).
      const looksLikePromptState = ins.length > 0 && ins.every(d => !d.deviceId && !d.label);
      setMicPermission(prev => {
        if (prev === 'granted' || prev === 'denied') return prev;
        return looksLikePromptState ? 'prompt' : (ins.some(d => d.deviceId && d.label) ? 'granted' : prev);
      });

      // Fallback: if a persisted id no longer exists, revert to 'default'.
      const curIn = inputDeviceIdRef.current;
      const curOut = outputDeviceIdRef.current;
      if (curIn !== 'default' && !ins.some(d => d.deviceId === curIn)) {
        mediaManager.setInputDeviceId('default');
        setInputDeviceIdState('default');
      }
      if (curOut !== 'default' && !outs.some(d => d.deviceId === curOut)) {
        await mediaManager.setOutputSinkId('default');
        setOutputDeviceIdState('default');
      }
    } catch (e) {
      console.warn('[VoiceContext] enumerateDevices failed:', e);
    }
  }, []);

  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Release immediately — we only wanted the permission grant.
      stream.getTracks().forEach(t => { try { t.stop(); } catch {} });
      setMicPermission('granted');
      // Await refresh so callers can flip UI only once the list is populated.
      await refreshDevices();
      return true;
    } catch (e) {
      console.warn('[VoiceContext] requestMicPermission denied/failed:', e);
      setMicPermission('denied');
      return false;
    }
  }, [refreshDevices]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;

    // Probe Permissions API (Chrome/Firefox). Safari may throw — fall back to heuristic.
    let permStatus: PermissionStatus | null = null;
    const onPermChange = () => {
      if (permStatus) {
        setMicPermission(permStatus.state as 'granted' | 'denied' | 'prompt');
        if (permStatus.state === 'granted') {
          void refreshDevices();
        }
      }
    };
    try {
      // @ts-expect-error — 'microphone' is valid but not in lib.dom types in all TS versions.
      navigator.permissions?.query({ name: 'microphone' }).then((status: PermissionStatus) => {
        permStatus = status;
        setMicPermission(status.state as 'granted' | 'denied' | 'prompt');
        status.addEventListener?.('change', onPermChange);
        if (status.state === 'granted') void refreshDevices();
      }).catch(() => {/* unsupported */});
    } catch {/* unsupported */}

    void refreshDevices();
    navigator.mediaDevices.addEventListener?.('devicechange', refreshDevices);
    return () => {
      navigator.mediaDevices.removeEventListener?.('devicechange', refreshDevices);
      permStatus?.removeEventListener?.('change', onPermChange);
    };
  }, [refreshDevices]);


  const [voiceState, setVoiceState] = useState<VoiceState>({
    channelId: null,
    channelName: null,
    serverName: null,
    isMuted: false,
    isDeafened: false,
  });
  const wasMutedBeforeDeafenRef = useRef(false);
  // Track whether we have an active local voice session (to prevent DB overwrites)
  const hasActiveLocalSessionRef = useRef(false);
  // Track whether initial hydration from DB has happened
  const hasHydratedRef = useRef(false);

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

  // Sync local state with DB state ONLY on initial mount / hydration
  // During active sessions, local state is the source of truth for muted/deafened
  useEffect(() => {
    if (!dbVoiceState) return;
    
    if (hasActiveLocalSessionRef.current) {
      // During active session, only sync channel info, NOT muted/deafened
      // (those are controlled locally via optimistic updates)
      return;
    }

    // Initial hydration only
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      setVoiceState({
        channelId: dbVoiceState.channel_id,
        channelName: dbVoiceState.channel?.name || null,
        serverName: dbVoiceState.channel?.server?.name || null,
        isMuted: dbVoiceState.muted || false,
        isDeafened: dbVoiceState.deafened || false,
      });

      // Reconnect WebRTC if we were in a channel
      if (dbVoiceState.channel_id && !webrtc.isConnected) {
        hasActiveLocalSessionRef.current = true;
        webrtc.setMuted(dbVoiceState.muted || false);
        webrtc.setDeafened(dbVoiceState.deafened || false);
        webrtc.connect(dbVoiceState.channel_id, {
          muted: dbVoiceState.muted || false,
          deafened: dbVoiceState.deafened || false,
        });
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
  const voiceEventsInstanceRef = useRef<string>('');
  useEffect(() => {
    if (!voiceState.channelId) return;

    // Generate a unique instance ID per subscription to avoid Realtime channel name collisions
    const instanceId = crypto.randomUUID();
    voiceEventsInstanceRef.current = instanceId;

    const channel = supabase
      .channel(`voice-events:${voiceState.channelId}-${instanceId}`, { config: { private: true } })
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
    // Mark active session
    hasActiveLocalSessionRef.current = true;

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
    // Also remove from ALL server-voice-participants caches (cross-server cleanup)
    queryClient.setQueriesData(
      { queryKey: ['server-voice-participants'] },
      (old: any) => old?.filter((p: any) => p.user_id !== user.id) ?? old
    );
    // Invalidate server-voice-participants so new server picks up the join
    queryClient.invalidateQueries({ queryKey: ['server-voice-participants'] });

    // 3. Build a real optimistic profile immediately (no generic fallback flash)
    const optimisticProfile = {
      id: user.id,
      username: profile?.username || user.email?.split('@')[0] || 'user',
      display_name:
        profile?.display_name ||
        user.user_metadata?.display_name ||
        user.email?.split('@')[0] ||
        'Moi',
      avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || null,
    };

    // Seed profile cache so realtime INSERT resolver can use it instantly
    queryClient.setQueryData(['profile', user.id], (old: any) => ({
      ...(old || {}),
      ...optimisticProfile,
    }));

    const profilePromise = supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', user.id)
      .single();

    // Add self immediately with actual profile data
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
        profile: optimisticProfile,
      }];
    });

    // 4. Sync pre-mute/deafen state to WebRTC before connecting
    if (prevState.isMuted) webrtc.setMuted(true);
    if (prevState.isDeafened) webrtc.setDeafened(true);

    // 5. Background: DB + WebRTC + profile hydration in parallel
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
        webrtc.connect(channelId, { muted: prevState.isMuted, deafened: prevState.isDeafened }),
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

      // Hydrate profile caches with server truth
      if (profileResult.data) {
        queryClient.setQueryData(['profile', user.id], (old: any) => ({
          ...(old || {}),
          ...profileResult.data,
        }));

        queryClient.setQueryData(['voice-participants', channelId], (old: any) =>
          old?.map((p: any) => p.user_id === user.id ? { ...p, profile: profileResult.data } : p)
        );
      }
    } catch (error) {
      // 3. Rollback on failure
      console.error('[VoiceContext] Join failed, rolling back:', error);
      setVoiceState(prevState);
      await webrtc.disconnect();
      toast.error('Impossible de rejoindre le canal vocal');
    }
  }, [user, profile, voiceState, webrtc, queryClient]);

  const leaveChannel = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');

    const prevChannelName = voiceState.channelName;
    const prevChannelId = voiceState.channelId;

    // 1. Instant UI update + sound
    // Clear active session flag
    hasActiveLocalSessionRef.current = false;
    hasHydratedRef.current = false;

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

    // 2b. Optimistic removal from ALL server-voice-participants caches
    queryClient.setQueriesData(
      { queryKey: ['server-voice-participants'] },
      (old: any) => old?.filter((p: any) => p.user_id !== user.id) ?? old
    );

    // 3. Background cleanup — AWAIT disconnect to ensure WebRTC is fully torn down
    await webrtc.disconnect();
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
      setVoiceState(prev => {
        const newMuted = !prev.isMuted;
        newMuted ? soundEffects.playMute() : soundEffects.playUnmute();
        webrtc.setMuted(newMuted); // Keep WebRTC aligned even before connect
        return { ...prev, isMuted: newMuted };
      });
      return;
    }

    // Use functional update to avoid stale closure
    let newMuted: boolean;
    setVoiceState(prev => {
      newMuted = !prev.isMuted;
      return { ...prev, isMuted: newMuted };
    });
    // We need the value outside setState too
    newMuted = !voiceState.isMuted;
    
    // Instant audio feedback
    webrtc.setMuted(newMuted);
    newMuted ? soundEffects.playMute() : soundEffects.playUnmute();

    // Optimistic cache update for participants list
    const channelId = voiceState.channelId;
    queryClient.setQueryData(['voice-participants', channelId], (old: any) =>
      old?.map((p: any) => p.user_id === user.id ? { ...p, muted: newMuted } : p)
    );

    // Background DB sync — NO rollback on failure (local state is truth)
    const { error } = await supabase
      .from('voice_states')
      .update({ muted: newMuted })
      .eq('user_id', user.id);

    if (error) {
      console.warn('[VoiceContext] toggleMute DB sync failed (local state preserved):', error.message);
      // Silently retry once after short delay
      setTimeout(async () => {
        await supabase.from('voice_states').update({ muted: newMuted }).eq('user_id', user.id);
      }, 1000);
    }
  }, [user, voiceState.channelId, voiceState.isMuted, webrtc, queryClient]);

  const toggleDeafen = useCallback(async () => {
    if (!user) return;
    
    // Allow pre-deafen when not connected
    if (!voiceState.channelId) {
      setVoiceState(prev => {
        const newDeafened = !prev.isDeafened;
        if (newDeafened) {
          wasMutedBeforeDeafenRef.current = prev.isMuted;
          webrtc.setDeafened(true);
          webrtc.setMuted(true);
          soundEffects.playDeafen();
          return { ...prev, isDeafened: true, isMuted: true };
        } else {
          const restoreMuted = wasMutedBeforeDeafenRef.current;
          webrtc.setDeafened(false);
          webrtc.setMuted(restoreMuted);
          soundEffects.playUndeafen();
          return { ...prev, isDeafened: false, isMuted: restoreMuted };
        }
      });
      return;
    }

    const newDeafened = !voiceState.isDeafened;
    const updates: { deafened: boolean; muted?: boolean } = { deafened: newDeafened };
    let finalMuted = voiceState.isMuted;

    if (newDeafened) {
      wasMutedBeforeDeafenRef.current = voiceState.isMuted;
      if (!voiceState.isMuted) {
        updates.muted = true;
        finalMuted = true;
      }
    } else {
      updates.muted = wasMutedBeforeDeafenRef.current;
      finalMuted = wasMutedBeforeDeafenRef.current;
    }

    // Instant UI + audio
    setVoiceState(prev => ({
      ...prev,
      isDeafened: newDeafened,
      isMuted: finalMuted,
    }));
    webrtc.setDeafened(newDeafened);
    webrtc.setMuted(finalMuted);
    newDeafened ? soundEffects.playDeafen() : soundEffects.playUndeafen();

    // Optimistic cache
    const channelId = voiceState.channelId;
    queryClient.setQueryData(['voice-participants', channelId], (old: any) =>
      old?.map((p: any) => p.user_id === user.id
        ? { ...p, deafened: newDeafened, muted: finalMuted }
        : p
      )
    );

    // Background DB sync — NO rollback (local state is truth)
    const { error } = await supabase
      .from('voice_states')
      .update(updates)
      .eq('user_id', user.id);

    if (error) {
      console.warn('[VoiceContext] toggleDeafen DB sync failed (local state preserved):', error.message);
      setTimeout(async () => {
        await supabase.from('voice_states').update(updates).eq('user_id', user.id);
      }, 1000);
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

  const setOutputVolume = useCallback((vol: number) => {
    setOutputVolumeState(vol);
    mediaManager.setMasterOutputVolume(vol);
  }, []);

  // Fix #6 — input device setter. Hot-swaps the active mic via useWebRTC
  // when connected; otherwise just persists the choice for the next session.
  const setInputDeviceId = useCallback(async (id: string) => {
    const next = id || 'default';
    setInputDeviceIdState(next);
    if (voiceState.channelId) {
      const ok = await webrtc.switchInputDevice(next);
      if (!ok) toast.error("Impossible d'utiliser ce périphérique d'entrée");
    } else {
      mediaManager.setInputDeviceId(next);
    }
  }, [voiceState.channelId, webrtc]);

  // Fix #6 — output device setter. Works without a live call.
  const setOutputDeviceId = useCallback(async (id: string) => {
    const next = id || 'default';
    setOutputDeviceIdState(next);
    try { await webrtc.setOutputSinkId(next); }
    catch (e) {
      console.warn('[VoiceContext] setOutputSinkId failed:', e);
      toast.error("Impossible d'utiliser ce périphérique de sortie");
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
        // Output volume
        outputVolume,
        setOutputVolume,
        // Device selection (Fix #6)
        inputDeviceId,
        outputDeviceId,
        availableInputs,
        availableOutputs,
        setInputDeviceId,
        setOutputDeviceId,
        outputSinkSupported,
        outputSinkPartial,
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
  outputVolume: 100,
  setOutputVolume: () => {},
  inputDeviceId: 'default',
  outputDeviceId: 'default',
  availableInputs: [],
  availableOutputs: [],
  setInputDeviceId: async () => {},
  setOutputDeviceId: async () => {},
  outputSinkSupported: false,
  outputSinkPartial: false,
};

export function useVoice() {
  const context = useContext(VoiceContext);
  return context ?? defaultVoiceContext;
}