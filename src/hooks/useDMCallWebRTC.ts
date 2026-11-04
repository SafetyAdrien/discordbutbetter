import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PeerConnection, SignalData, ConnectionStats, parseSignalData } from '@/utils/webrtc/PeerConnection';
import { mediaManager, type ScreenShareOptions } from '@/utils/webrtc/MediaManager';

interface UseDMCallWebRTCReturn {
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  audioLevel: number;
  remoteAudioStream: MediaStream | null;
  remoteVideoStream: MediaStream | null;
  localVideoStream: MediaStream | null;
  connectionStats: ConnectionStats | null;
  remoteMuted: boolean;
  remoteVideoOff: boolean;
  connect: (callId: string, remoteUserId: string, isInitiator: boolean) => Promise<void>;
  disconnect: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => Promise<void>;
  isScreenSharing: boolean;
  localScreenStream: MediaStream | null;
  remoteScreenStream: MediaStream | null;
  toggleScreenShare: (options?: ScreenShareOptions) => Promise<void>;
  setDeafened: (deafened: boolean) => void;
}

export function useDMCallWebRTC(): UseDMCallWebRTCReturn {
  const { user } = useAuth();
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [remoteAudioStream, setRemoteAudioStream] = useState<MediaStream | null>(null);
  const [remoteVideoStream, setRemoteVideoStream] = useState<MediaStream | null>(null);
  const [localVideoStream, setLocalVideoStream] = useState<MediaStream | null>(null);
  const [connectionStats, setConnectionStats] = useState<ConnectionStats | null>(null);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [remoteVideoOff, setRemoteVideoOff] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const [remoteScreenStream, setRemoteScreenStream] = useState<MediaStream | null>(null);

  const peerConnectionRef = useRef<PeerConnection | null>(null);
  const callIdRef = useRef<string | null>(null);
  const remoteUserIdRef = useRef<string | null>(null);
  const signalSubscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSignalsRef = useRef<SignalData[]>([]);
  const processingSignalIdsRef = useRef<Set<string>>(new Set());
  const processedSignalIdsRef = useRef<Set<string>>(new Set());
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));
  const iceRestartAtRef = useRef(0);
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkCallHealth = useCallback(async () => {
    const pc = peerConnectionRef.current;
    const remoteUserId = remoteUserIdRef.current;
    if (!pc) return;

    try {
      const stats = await pc.getStats();
      setConnectionStats(stats);
      if (stats.iceState === 'connected' || stats.iceState === 'completed') {
        iceRestartAtRef.current = 0;
        setIsReconnecting(false);
        setIsConnected(true);
        return;
      }

      if (stats.iceState === 'failed' || stats.iceState === 'disconnected') {
        setIsReconnecting(true);
      }
      if (
        (stats.iceState !== 'failed' && stats.iceState !== 'disconnected') ||
        !user?.id ||
        !remoteUserId ||
        user.id >= remoteUserId ||
        Date.now() - iceRestartAtRef.current < 8000
      ) return;

      iceRestartAtRef.current = Date.now();
      console.info('[DMCallWebRTC] ICE connection interrupted; attempting restart');
      await pc.restartIce();
    } catch (error) {
      console.error('[DMCallWebRTC] Call health check failed:', error);
    }
  }, [user?.id]);

  // Send signal via Supabase
  const sendSignal = useCallback(async (signal: SignalData) => {
    if (!user?.id || !callIdRef.current || !remoteUserIdRef.current) return;

    const { error } = await supabase.from('dm_call_signals').insert({
      call_id: callIdRef.current,
      from_user_id: user.id,
      to_user_id: remoteUserIdRef.current,
      signal_type: signal.type,
      signal_data: signal as unknown as Record<string, unknown>,
    } as never);

    if (error) {
      console.error('[DMCallWebRTC] Failed to send signal:', error);
    }
  }, [user?.id]);

  // Handle received signal
  const handleSignalReceived = useCallback(async (signal: SignalData) => {
    const pc = peerConnectionRef.current;
    
    if (!pc) {
      // Queue signals until connection is ready
      pendingSignalsRef.current.push(signal);
      return;
    }

    await pc.handleSignal(signal);
  }, []);

  const processCallSignal = useCallback(async (signal: {
    id: string;
    call_id: string;
    signal_data: unknown;
  }) => {
    if (signal.call_id !== callIdRef.current) return;
    if (
      processingSignalIdsRef.current.has(signal.id) ||
      processedSignalIdsRef.current.has(signal.id)
    ) return;
    processingSignalIdsRef.current.add(signal.id);
    try {
      if (
        typeof signal.signal_data !== 'object' ||
        signal.signal_data === null ||
        !('type' in signal.signal_data) ||
        !('data' in signal.signal_data)
      ) {
        console.error('[DMCallWebRTC] Discarding invalid call signal:', signal.id);
        return;
      }
      const parsedSignal = parseSignalData(signal.signal_data.type, signal.signal_data.data);
      if (!parsedSignal) {
        console.error('[DMCallWebRTC] Discarding invalid call signal:', signal.id);
        return;
      }
      await handleSignalReceived(parsedSignal);
      processedSignalIdsRef.current.add(signal.id);
      const { error } = await supabase.from('dm_call_signals').delete().eq('id', signal.id);
      if (error) console.error('[DMCallWebRTC] Failed to delete processed signal:', error);
    } catch (error) {
      console.error('[DMCallWebRTC] Failed to process call signal:', error);
    } finally {
      processingSignalIdsRef.current.delete(signal.id);
    }
  }, [handleSignalReceived]);

  const drainPendingCallSignals = useCallback(async () => {
    const callId = callIdRef.current;
    if (!callId || !user?.id) return;
    const { data, error } = await supabase
      .from('dm_call_signals')
      .select('id, call_id, signal_data')
      .eq('call_id', callId)
      .eq('to_user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(100);
    if (error) {
      console.error('[DMCallWebRTC] Failed to recover missed call signals:', error);
      return;
    }
    for (const signal of data ?? []) {
      await processCallSignal(signal);
    }
  }, [processCallSignal, user?.id]);

  useEffect(() => {
    const onOffline = () => {
      if (callIdRef.current) {
        setIsReconnecting(true);
        console.info('[DMCallWebRTC] Network offline during call');
      }
    };
    const onOnline = () => {
      if (!callIdRef.current) return;
      if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = setTimeout(() => {
        recoveryTimerRef.current = null;
        if (navigator.onLine) {
          void drainPendingCallSignals();
          void checkCallHealth();
        }
      }, 1200);
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
    };
  }, [checkCallHealth, drainPendingCallSignals]);

  // Process pending signals
  const processPendingSignals = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    for (const signal of pendingSignalsRef.current) {
      await pc.handleSignal(signal);
    }
    pendingSignalsRef.current = [];
    processingSignalIdsRef.current.clear();
    processedSignalIdsRef.current.clear();
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((remoteUserId: string): PeerConnection => {
    console.log('[DMCallWebRTC] Creating peer connection for:', remoteUserId);

    const pc = new PeerConnection(
      remoteUserId,
      sendSignal,
      (stream) => {
        console.log('[DMCallWebRTC] Received remote audio stream');
        setRemoteAudioStream(stream);
        // Play remote audio
        const audioEl = document.createElement('audio');
        audioEl.srcObject = stream;
        audioEl.autoplay = true;
        audioEl.id = `dm-call-audio-${remoteUserId}`;
        document.body.appendChild(audioEl);
      },
      (stream, type) => {
        console.log('[DMCallWebRTC] Received remote video stream, type:', type);
        if (type === 'camera') {
          setRemoteVideoStream(stream);
        } else {
          setRemoteScreenStream(stream);
        }
      },
      () => {
        console.log('[DMCallWebRTC] Peer disconnected');
        setIsConnected(false);
        setIsReconnecting(false);
        setRemoteVideoStream(null);
      },
      (type) => {
        console.log('[DMCallWebRTC] Remote video stream ended, type:', type);
        if (type === 'camera') {
          setRemoteVideoStream(null);
        } else {
          setRemoteScreenStream(null);
        }
      }
    );

    return pc;
  }, [sendSignal]);

  // Connect to call
  const connect = useCallback(async (callId: string, remoteUserId: string, isInitiator: boolean) => {
    if (!user?.id || isConnecting || isConnected) return;

    console.log('[DMCallWebRTC] Connecting to call:', callId, 'isInitiator:', isInitiator);
    setIsConnecting(true);
    setIsReconnecting(false);

    try {
      callIdRef.current = callId;
      remoteUserIdRef.current = remoteUserId;

      // Create peer connection early so signals can be handled
      const pc = createPeerConnection(remoteUserId);
      peerConnectionRef.current = pc;

      // Set up signal subscription (non-blocking creation)
      signalSubscriptionRef.current = supabase
        .channel(`dm-call-signals:${callId}-${instanceIdRef.current}`, { config: { private: true } })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'dm_call_signals',
            filter: `to_user_id=eq.${user.id}`,
          },
          async (payload) => {
            await processCallSignal(payload.new as { id: string; call_id: string; signal_data: SignalData });
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') void drainPendingCallSignals();
        });


      // Set up broadcast channel for mute/video state sync
      broadcastChannelRef.current = supabase
        .channel(`dm-call-state:${callId}-${instanceIdRef.current}`, { config: { private: true } })
        .on('broadcast', { event: 'mute-state' }, (payload) => {
          if (payload.payload?.userId !== user.id) {
            setRemoteMuted(!!payload.payload?.isMuted);
          }
        })
        .on('broadcast', { event: 'video-state' }, (payload) => {
          if (payload.payload?.userId !== user.id) {
            setRemoteVideoOff(!!payload.payload?.isVideoOff);
          }
        })
        .subscribe();

      // Parallelize: microphone init runs alongside signal subscription setup
      const micSuccess = await mediaManager.tryStartMicrophone();
      if (!micSuccess) {
        console.warn('[DMCallWebRTC] Could not access microphone');
      }

      // Add local audio stream once mic is ready
      const localStream = mediaManager.getLocalAudioStream();
      if (localStream) {
        pc.addAudioStream(localStream);
      }

      // Start audio level monitoring
      audioLevelIntervalRef.current = setInterval(() => {
        const level = mediaManager.getAudioLevel();
        setAudioLevel(level);
      }, 50);

      // Process any pending signals
      await processPendingSignals();

      // If initiator, create offer after a short delay
      if (isInitiator) {
        setTimeout(async () => {
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.createOffer();
          }
        }, 500);
      }

      // Start stats monitoring
      statsIntervalRef.current = setInterval(async () => {
        await checkCallHealth();
      }, 2000);

      setIsConnected(true);
      console.log('[DMCallWebRTC] Connected successfully');
    } catch (error) {
      console.error('[DMCallWebRTC] Failed to connect:', error);
      await disconnect();
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [user?.id, isConnecting, isConnected, createPeerConnection, handleSignalReceived, processPendingSignals, checkCallHealth, processCallSignal, drainPendingCallSignals]);

  // Disconnect
  const disconnect = useCallback(async () => {
    console.log('[DMCallWebRTC] Disconnecting');

    // Clear intervals
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    if (recoveryTimerRef.current) {
      clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Remove subscription
    if (signalSubscriptionRef.current) {
      await supabase.removeChannel(signalSubscriptionRef.current);
      signalSubscriptionRef.current = null;
    }

    // Remove broadcast channel
    if (broadcastChannelRef.current) {
      await supabase.removeChannel(broadcastChannelRef.current);
      broadcastChannelRef.current = null;
    }

    // Remove audio element
    const remoteUserId = remoteUserIdRef.current;
    if (remoteUserId) {
      const audioEl = document.getElementById(`dm-call-audio-${remoteUserId}`);
      if (audioEl) {
        audioEl.remove();
      }
    }

    // Cleanup signals
    if (callIdRef.current && user?.id) {
      await supabase
        .from('dm_call_signals')
        .delete()
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
        .eq('call_id', callIdRef.current);
    }

    // Stop local media
    mediaManager.cleanup();

    // Reset state
    callIdRef.current = null;
    remoteUserIdRef.current = null;
    pendingSignalsRef.current = [];
    iceRestartAtRef.current = 0;
    setIsConnected(false);
    setIsReconnecting(false);
    setRemoteAudioStream(null);
    setRemoteVideoStream(null);
    setLocalVideoStream(null);
    setConnectionStats(null);
    setAudioLevel(0);
    setIsMuted(false);
    setIsVideoOff(true);
    setRemoteMuted(false);
    setRemoteVideoOff(true);
    setIsScreenSharing(false);
    setLocalScreenStream(null);
    setRemoteScreenStream(null);

    console.log('[DMCallWebRTC] Disconnected');
  }, [user?.id]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    mediaManager.setMuted(newMuted);
    // Broadcast to remote participant
    broadcastChannelRef.current?.send({
      type: 'broadcast',
      event: 'mute-state',
      payload: { userId: user?.id, isMuted: newMuted },
    });
  }, [isMuted, user?.id]);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    const pc = peerConnectionRef.current;
    
    if (isVideoOff) {
      // Start camera
      try {
        const stream = await mediaManager.startCamera();
        setLocalVideoStream(stream);
        setIsVideoOff(false);
        broadcastChannelRef.current?.send({
          type: 'broadcast',
          event: 'video-state',
          payload: { userId: user?.id, isVideoOff: false },
        });
        if (pc) {
          pc.addVideoStream(stream, 'camera');
          await pc.renegotiate();
        }
      } catch (error) {
        console.error('[DMCallWebRTC] Failed to start camera:', error);
      }
    } else {
      // Stop camera
      mediaManager.stopCamera();
      setLocalVideoStream(null);
      setIsVideoOff(true);
      broadcastChannelRef.current?.send({
        type: 'broadcast',
        event: 'video-state',
        payload: { userId: user?.id, isVideoOff: true },
      });

      if (pc) {
        pc.removeVideoStream('camera');
        await pc.renegotiate();
      }
    }
  }, [isVideoOff]);

  // Partage d'ecran (selecteur "Passer en direct" : resolution, images par seconde...).
  const toggleScreenShare = useCallback(async (options?: ScreenShareOptions) => {
    const pc = peerConnectionRef.current;
    if (isScreenSharing) {
      mediaManager.stopScreenShare();
      setLocalScreenStream(null);
      setIsScreenSharing(false);
      if (pc) {
        pc.removeVideoStream('screen');
        await pc.renegotiate();
      }
      return;
    }
    try {
      mediaManager.setScreenShareEndedCallback(() => {
        setLocalScreenStream(null);
        setIsScreenSharing(false);
        const cur = peerConnectionRef.current;
        if (cur) {
          cur.removeVideoStream('screen');
          void cur.renegotiate();
        }
      });
      const stream = await mediaManager.startScreenShare(options);
      setLocalScreenStream(stream);
      setIsScreenSharing(true);
      if (pc) {
        const enc = mediaManager.getScreenShareEncodingOptions();
        if (enc) pc.setScreenShareEncoding(enc);
        pc.addVideoStream(stream, 'screen');
        await pc.renegotiate();
      }
    } catch (error) {
      console.error('[DMCallWebRTC] Failed to start screen share:', error);
    }
  }, [isScreenSharing]);

  const setDeafened = useCallback((deafened: boolean) => mediaManager.setDeafened(deafened), []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    isReconnecting,
    isMuted,
    isVideoOff,
    audioLevel,
    remoteAudioStream,
    remoteVideoStream,
    localVideoStream,
    connectionStats,
    remoteMuted,
    remoteVideoOff,
    connect,
    disconnect,
    toggleMute,
    toggleVideo,
    isScreenSharing,
    localScreenStream,
    remoteScreenStream,
    toggleScreenShare,
    setDeafened,
  };
}
