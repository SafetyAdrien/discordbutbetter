import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PeerConnection, SignalData, ConnectionStats } from '@/utils/webrtc/PeerConnection';
import { mediaManager } from '@/utils/webrtc/MediaManager';

interface UseDMCallWebRTCReturn {
  isConnected: boolean;
  isConnecting: boolean;
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
}

export function useDMCallWebRTC(): UseDMCallWebRTCReturn {
  const { user } = useAuth();
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [remoteAudioStream, setRemoteAudioStream] = useState<MediaStream | null>(null);
  const [remoteVideoStream, setRemoteVideoStream] = useState<MediaStream | null>(null);
  const [localVideoStream, setLocalVideoStream] = useState<MediaStream | null>(null);
  const [connectionStats, setConnectionStats] = useState<ConnectionStats | null>(null);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [remoteVideoOff, setRemoteVideoOff] = useState(true);

  const peerConnectionRef = useRef<PeerConnection | null>(null);
  const callIdRef = useRef<string | null>(null);
  const remoteUserIdRef = useRef<string | null>(null);
  const signalSubscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSignalsRef = useRef<SignalData[]>([]);

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

  // Process pending signals
  const processPendingSignals = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    for (const signal of pendingSignalsRef.current) {
      await pc.handleSignal(signal);
    }
    pendingSignalsRef.current = [];
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
        }
      },
      () => {
        console.log('[DMCallWebRTC] Peer disconnected');
        setIsConnected(false);
      }
    );

    return pc;
  }, [sendSignal]);

  // Connect to call
  const connect = useCallback(async (callId: string, remoteUserId: string, isInitiator: boolean) => {
    if (!user?.id || isConnecting || isConnected) return;

    console.log('[DMCallWebRTC] Connecting to call:', callId, 'isInitiator:', isInitiator);
    setIsConnecting(true);

    try {
      callIdRef.current = callId;
      remoteUserIdRef.current = remoteUserId;

      // Create peer connection early so signals can be handled
      const pc = createPeerConnection(remoteUserId);
      peerConnectionRef.current = pc;

      // Set up signal subscription (non-blocking creation)
      signalSubscriptionRef.current = supabase
        .channel(`dm-call-signals:${callId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'dm_call_signals',
            filter: `to_user_id=eq.${user.id}`,
          },
          async (payload) => {
            const signal = (payload.new as { signal_data: SignalData }).signal_data;
            console.log('[DMCallWebRTC] Received signal:', signal.type);
            await handleSignalReceived(signal);

            // Delete processed signal
            await supabase
              .from('dm_call_signals')
              .delete()
              .eq('id', (payload.new as { id: string }).id);
          }
        )
        .subscribe();


      // Set up broadcast channel for mute/video state sync
      broadcastChannelRef.current = supabase
        .channel(`dm-call-state:${callId}`)
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
        if (peerConnectionRef.current) {
          try {
            const stats = await peerConnectionRef.current.getStats();
            setConnectionStats(stats);
          } catch (e) {
            // Ignore stats errors
          }
        }
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
  }, [user?.id, isConnecting, isConnected, createPeerConnection, handleSignalReceived, processPendingSignals]);

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
    setIsConnected(false);
    setRemoteAudioStream(null);
    setRemoteVideoStream(null);
    setLocalVideoStream(null);
    setConnectionStats(null);
    setAudioLevel(0);
    setIsMuted(false);
    setIsVideoOff(true);

    console.log('[DMCallWebRTC] Disconnected');
  }, [user?.id]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    mediaManager.setMuted(newMuted);
  }, [isMuted]);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    const pc = peerConnectionRef.current;
    
    if (isVideoOff) {
      // Start camera
      try {
        const stream = await mediaManager.startCamera();
        setLocalVideoStream(stream);
        setIsVideoOff(false);

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

      if (pc) {
        pc.removeVideoStream('camera');
        await pc.renegotiate();
      }
    }
  }, [isVideoOff]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    isMuted,
    isVideoOff,
    audioLevel,
    remoteAudioStream,
    remoteVideoStream,
    localVideoStream,
    connectionStats,
    connect,
    disconnect,
    toggleMute,
    toggleVideo,
  };
}
