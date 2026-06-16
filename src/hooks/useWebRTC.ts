import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PeerConnection, SignalData, ConnectionStats } from '@/utils/webrtc/PeerConnection';
import { SignalingService } from '@/utils/webrtc/SignalingService';
import { mediaManager, ScreenShareOptions } from '@/utils/webrtc/MediaManager';

interface PeerInfo {
  peerId: string;
  connection: PeerConnection;
  isSpeaking: boolean;
  audioLevel: number;
}

// Reconnection configuration
const RECONNECT_MAX_ATTEMPTS = 3;
const RECONNECT_BASE_DELAY_MS = 1000;

export interface UseWebRTCReturn {
  isConnected: boolean;
  isConnecting: boolean;
  isMicrophoneActive: boolean;
  audioLevel: number;
  peers: Map<string, PeerInfo>;
  connect: (channelId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  setMuted: (muted: boolean) => void;
  setDeafened: (deafened: boolean) => void;
  microphoneError: boolean;
  hasMicrophoneAccess: boolean;
  retryMicrophone: () => Promise<boolean>;
  isPushToTalkMode: boolean;
  setPushToTalkMode: (enabled: boolean) => void;
  setPushToTalkActive: (active: boolean) => void;
  // Camera
  isCameraActive: boolean;
  localCameraStream: MediaStream | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  // Screen Share
  isScreenSharing: boolean;
  localScreenStream: MediaStream | null;
  startScreenShare: (options?: ScreenShareOptions) => Promise<void>;
  stopScreenShare: () => void;
  // Remote video/screen streams
  remoteVideoStreams: Map<string, MediaStream>;
  remoteScreenStreams: Map<string, MediaStream>;
  // Connection stats
  connectionStats: ConnectionStats | null;
  // Reconnection state
  isReconnecting: boolean;
  reconnectAttempts: number;
}

// Adaptive VAD state tracking
interface AdaptiveVADState {
  ambientLevel: number;
  samples: number[];
  threshold: number;
}

export function useWebRTC(): UseWebRTCReturn {
  const { user } = useAuth();
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMicrophoneActive, setIsMicrophoneActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [peers, setPeers] = useState<Map<string, PeerInfo>>(new Map());
  const [microphoneError, setMicrophoneError] = useState(false);
  const [hasMicrophoneAccess, setHasMicrophoneAccess] = useState(false);
  const [isPushToTalkMode, setIsPushToTalkMode] = useState(false);
  
  // Camera & Screen share state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localCameraStream, setLocalCameraStream] = useState<MediaStream | null>(null);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const [remoteVideoStreams, setRemoteVideoStreams] = useState<Map<string, MediaStream>>(new Map());
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<Map<string, MediaStream>>(new Map());
  const [connectionStats, setConnectionStats] = useState<ConnectionStats | null>(null);
  
  // Reconnection state
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const signalingServiceRef = useRef<SignalingService | null>(null);
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const channelIdRef = useRef<string | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const participantsSubscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Adaptive VAD state (persists across renders)
  const vadStateRef = useRef<Map<string, AdaptiveVADState>>(new Map());
  const AMBIENT_SAMPLE_SIZE = 60; // ~3 seconds of samples at 50ms

  // === MUTEX for connect/disconnect sequentiality ===
  const operationPromiseRef = useRef<Promise<void>>(Promise.resolve());
  const instanceIdRef = useRef(crypto.randomUUID());

  // === Signal queue: buffer signals arriving before peer is ready ===
  const signalQueueRef = useRef<Map<string, SignalData[]>>(new Map());

  // Set up remote stream callbacks
  useEffect(() => {
    mediaManager.setRemoteStreamCallbacks(
      (peerId, stream) => {
        setRemoteVideoStreams(prev => {
          const next = new Map(prev);
          if (stream) {
            next.set(peerId, stream);
          } else {
            next.delete(peerId);
          }
          return next;
        });
      },
      (peerId, stream) => {
        setRemoteScreenStreams(prev => {
          const next = new Map(prev);
          if (stream) {
            next.set(peerId, stream);
          } else {
            next.delete(peerId);
          }
          return next;
        });
      }
    );
  }, []);

  // Create a peer connection for a user
  const createPeerConnection = useCallback((peerId: string): PeerConnection => {
    console.log('[useWebRTC] Creating peer connection for:', peerId);

    const pc = new PeerConnection(
      peerId,
      async (signal) => {
        if (signalingServiceRef.current) {
          await signalingServiceRef.current.sendSignal(peerId, signal);
        }
      },
      (stream) => {
        console.log('[useWebRTC] Received audio stream from:', peerId);
        mediaManager.addRemoteAudioStream(peerId, stream);
        setPeers(prev => {
          const newPeers = new Map(prev);
          const existing = newPeers.get(peerId);
          if (existing) {
            newPeers.set(peerId, { ...existing, isSpeaking: false, audioLevel: 0 });
          } else {
            newPeers.set(peerId, { peerId, connection: pc, isSpeaking: false, audioLevel: 0 });
          }
          return newPeers;
        });
      },
      (stream, type) => {
        console.log('[useWebRTC] Received video stream from:', peerId, 'type:', type);
        mediaManager.addRemoteVideoStream(peerId, stream, type);
      },
      () => {
        console.log('[useWebRTC] Peer disconnected:', peerId);
        mediaManager.removeRemoteAudioStream(peerId);
        mediaManager.removeRemoteVideoStream(peerId, 'camera');
        mediaManager.removeRemoteVideoStream(peerId, 'screen');
        peersRef.current.delete(peerId);
        setPeers(prev => {
          const newPeers = new Map(prev);
          newPeers.delete(peerId);
          return newPeers;
        });
      }
    );

    peersRef.current.set(peerId, pc);
    return pc;
  }, []);

  // Drain queued signals for a peer after connection is set up
  const drainSignalQueue = useCallback(async (peerId: string, pc: PeerConnection) => {
    const queued = signalQueueRef.current.get(peerId);
    if (queued && queued.length > 0) {
      console.log('[useWebRTC] Draining', queued.length, 'queued signals for:', peerId);
      signalQueueRef.current.delete(peerId);
      for (const signal of queued) {
        await pc.handleSignal(signal);
      }
    }
  }, []);

  // Handle incoming signals with queue support
  const handleSignalReceived = useCallback(async (fromUserId: string, signal: SignalData) => {
    if (!user?.id || !channelIdRef.current) return;

    let peerConnection = peersRef.current.get(fromUserId);

    if (!peerConnection && signal.type === 'offer') {
      peerConnection = createPeerConnection(fromUserId);
      const localStream = mediaManager.getLocalAudioStream();
      if (localStream) {
        peerConnection.addAudioStream(localStream);
      }
      const cameraStream = mediaManager.getLocalCameraStream();
      if (cameraStream) {
        peerConnection.addVideoStream(cameraStream, 'camera');
      }
      const screenStream = mediaManager.getLocalScreenStream();
      if (screenStream) {
        peerConnection.addVideoStream(screenStream, 'screen');
      }
    }

    if (peerConnection) {
      await peerConnection.handleSignal(signal);
      // After handling this signal, drain any queued signals
      await drainSignalQueue(fromUserId, peerConnection);
    } else {
      // Queue signals that arrive before peer creation (ICE candidates, answers)
      console.log('[useWebRTC] Queuing signal', signal.type, 'from', fromUserId);
      const queue = signalQueueRef.current.get(fromUserId) || [];
      queue.push(signal);
      signalQueueRef.current.set(fromUserId, queue);
    }
  }, [user?.id, createPeerConnection, drainSignalQueue]);

  // Connect to existing participants with DETERMINISTIC offer initiation
  const connectToParticipants = useCallback(async (participants: Array<{ user_id: string }>) => {
    if (!user?.id) return;

    const localStream = mediaManager.getLocalAudioStream();

    for (const participant of participants) {
      if (participant.user_id === user.id) continue;
      if (peersRef.current.has(participant.user_id)) continue;

      // Deterministic: only the user with the LOWER id creates the offer
      // This eliminates "glare" (simultaneous offers from both sides)
      const shouldOffer = user.id < participant.user_id;

      console.log('[useWebRTC] Setting up peer:', participant.user_id, shouldOffer ? '(will offer)' : '(will wait)');

      const pc = createPeerConnection(participant.user_id);
      if (localStream) {
        pc.addAudioStream(localStream);
      }
      const cameraStream = mediaManager.getLocalCameraStream();
      if (cameraStream) {
        pc.addVideoStream(cameraStream, 'camera');
      }
      const screenStream = mediaManager.getLocalScreenStream();
      if (screenStream) {
        pc.addVideoStream(screenStream, 'screen');
      }

      if (shouldOffer) {
        await pc.createOffer();
      }
      // else: wait for the other side to send us an offer via signaling
    }
  }, [user?.id, createPeerConnection]);

  // Internal disconnect (no mutex, called within mutex)
  const disconnectInternal = useCallback(async () => {
    console.log('[useWebRTC] Disconnecting (internal)');

    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }

    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    setConnectionStats(null);

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    peersRef.current.forEach((pc, peerId) => {
      pc.close();
      mediaManager.removeRemoteAudioStream(peerId);
      mediaManager.removeRemoteVideoStream(peerId, 'camera');
      mediaManager.removeRemoteVideoStream(peerId, 'screen');
    });
    peersRef.current.clear();
    setPeers(new Map());

    // Clear signal queues
    signalQueueRef.current.clear();

    if (signalingServiceRef.current) {
      await signalingServiceRef.current.stop();
      signalingServiceRef.current = null;
    }

    if (participantsSubscriptionRef.current) {
      await supabase.removeChannel(participantsSubscriptionRef.current);
      participantsSubscriptionRef.current = null;
    }

    mediaManager.cleanup();
    setIsMicrophoneActive(false);
    setAudioLevel(0);
    setMicrophoneError(false);
    setHasMicrophoneAccess(false);
    setIsCameraActive(false);
    setIsScreenSharing(false);
    setLocalCameraStream(null);
    setLocalScreenStream(null);
    setRemoteVideoStreams(new Map());
    setRemoteScreenStreams(new Map());

    channelIdRef.current = null;
    setIsConnected(false);
    setIsConnecting(false);
    setIsReconnecting(false);
    setReconnectAttempts(0);

    console.log('[useWebRTC] Disconnected (internal)');
  }, []);

  // Connect to voice channel — uses mutex to prevent races
  const connect = useCallback(async (channelId: string) => {
    if (!user?.id) return;

    const op = operationPromiseRef.current.then(async () => {
      // If already connected to the same channel, skip
      if (channelIdRef.current === channelId && peersRef.current.size > 0) {
        console.log('[useWebRTC] Already connected to', channelId);
        return;
      }

      // If connected to a different channel, disconnect first
      if (channelIdRef.current) {
        console.log('[useWebRTC] Disconnecting from previous channel before reconnecting');
        await disconnectInternal();
      }

      console.log('[useWebRTC] Connecting to channel:', channelId);
      setIsConnecting(true);

      try {
        channelIdRef.current = channelId;
        const currentInstanceId = instanceIdRef.current;

        // Start signaling service
        signalingServiceRef.current = new SignalingService(channelId, user.id, handleSignalReceived);

        // Parallelize: microphone init, signaling start, and participant query
        const [micSuccess, , participantsResult] = await Promise.all([
          mediaManager.tryStartMicrophone(),
          signalingServiceRef.current.start(),
          supabase
            .from('voice_states')
            .select('user_id')
            .eq('channel_id', channelId)
            .neq('user_id', user.id),
        ]);

        // Abort if instance changed (rapid connect/disconnect)
        if (instanceIdRef.current !== currentInstanceId || channelIdRef.current !== channelId) {
          console.log('[useWebRTC] Instance changed during connect, aborting');
          return;
        }

        setHasMicrophoneAccess(micSuccess);
        setMicrophoneError(!micSuccess);
        
        if (micSuccess) {
          setIsMicrophoneActive(true);
        } else {
          console.warn('[useWebRTC] Joining in listen-only mode');
        }

        // Start audio level monitoring with spectral VAD
        audioLevelIntervalRef.current = setInterval(() => {
          const localVAD = mediaManager.getLocalVADState();
          setAudioLevel(localVAD.level);

          setPeers(prev => {
            const newPeers = new Map(prev);
            let hasChanges = false;

            for (const [peerId, peerInfo] of newPeers.entries()) {
              let vadState = vadStateRef.current.get(peerId);
              if (!vadState) {
                vadState = { ambientLevel: 0.05, samples: [], threshold: 0.08 };
                vadStateRef.current.set(peerId, vadState);
              }

              const rawLevel = mediaManager.getRemoteAudioLevel(peerId);
              vadState.samples.push(rawLevel);
              if (vadState.samples.length > AMBIENT_SAMPLE_SIZE) {
                vadState.samples.shift();
              }
              const sorted = [...vadState.samples].sort((a, b) => a - b);
              const percentileIndex = Math.floor(sorted.length * 0.2);
              vadState.ambientLevel = sorted[percentileIndex] || 0.05;

              const remoteVAD = mediaManager.getRemoteVADState(peerId, peerInfo.isSpeaking, vadState.ambientLevel);

              if (peerInfo.isSpeaking !== remoteVAD.isSpeaking || peerInfo.audioLevel !== remoteVAD.level) {
                newPeers.set(peerId, { ...peerInfo, isSpeaking: remoteVAD.isSpeaking, audioLevel: remoteVAD.level });
                hasChanges = true;
              }
            }

            return hasChanges ? newPeers : prev;
          });
        }, 50);

        // Start connection stats monitoring
        statsIntervalRef.current = setInterval(async () => {
          const firstPeer = peersRef.current.values().next().value;
          if (firstPeer) {
            try {
              const stats = await firstPeer.getStats();
              setConnectionStats(stats);
              
              if (stats.iceState === 'failed' || stats.iceState === 'disconnected') {
                console.log('[useWebRTC] Detected connection issue, attempting ICE restart');
                for (const [peerId, pc] of peersRef.current.entries()) {
                  try {
                    await pc.restartIce();
                    console.log('[useWebRTC] ICE restart initiated for peer:', peerId);
                  } catch (e) {
                    console.error('[useWebRTC] ICE restart failed for peer:', peerId, e);
                  }
                }
              }
            } catch (e) {
              // Ignore stats errors
            }
          }
        }, 2000);

        // Connect to existing participants
        const existingParticipants = participantsResult.data;
        if (existingParticipants && existingParticipants.length > 0) {
          await connectToParticipants(existingParticipants);
        }

        // Subscribe to new participants with instanceId isolation
        const subChannelName = `voice-participants-${channelId}-${instanceIdRef.current}`;
        participantsSubscriptionRef.current = supabase
          .channel(subChannelName, { config: { private: true } })
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'voice_states',
              filter: `channel_id=eq.${channelId}`,
            },
            async (payload) => {
              const newParticipant = payload.new as { user_id: string };
              if (newParticipant.user_id !== user.id) {
                await connectToParticipants([newParticipant]);
              }
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
              const leftParticipant = payload.old as { user_id: string };
              if (leftParticipant.user_id !== user.id) {
                const pc = peersRef.current.get(leftParticipant.user_id);
                if (pc) {
                  pc.close();
                  peersRef.current.delete(leftParticipant.user_id);
                  mediaManager.removeRemoteAudioStream(leftParticipant.user_id);
                  mediaManager.removeRemoteVideoStream(leftParticipant.user_id, 'camera');
                  mediaManager.removeRemoteVideoStream(leftParticipant.user_id, 'screen');
                  setPeers(prev => {
                    const newPeers = new Map(prev);
                    newPeers.delete(leftParticipant.user_id);
                    return newPeers;
                  });
                }
                // Clean up signal queue for departed peer
                signalQueueRef.current.delete(leftParticipant.user_id);
              }
            }
          )
          .subscribe();

        setIsConnected(true);
        console.log('[useWebRTC] Connected successfully');
      } catch (error) {
        console.error('[useWebRTC] Failed to connect:', error);
        await disconnectInternal();
        throw error;
      } finally {
        setIsConnecting(false);
      }
    });

    operationPromiseRef.current = op.catch(() => {}); // swallow to keep chain alive
    return op;
  }, [user?.id, handleSignalReceived, connectToParticipants, disconnectInternal]);

  // Disconnect — uses mutex
  const disconnect = useCallback(async () => {
    const op = operationPromiseRef.current.then(async () => {
      // Generate new instanceId to invalidate any in-flight operations
      instanceIdRef.current = crypto.randomUUID();
      await disconnectInternal();
    });

    operationPromiseRef.current = op.catch(() => {});
    return op;
  }, [disconnectInternal]);

  // Retry microphone access
  const retryMicrophone = useCallback(async (): Promise<boolean> => {
    const success = await mediaManager.tryStartMicrophone();
    setHasMicrophoneAccess(success);
    setMicrophoneError(!success);
    
    if (success) {
      setIsMicrophoneActive(true);
      
      const localStream = mediaManager.getLocalAudioStream();
      if (localStream) {
        for (const [, pc] of peersRef.current.entries()) {
          pc.addAudioStream(localStream);
          await pc.createOffer();
        }
      }
    }
    
    return success;
  }, []);

  // Set muted state
  const setMuted = useCallback((muted: boolean) => {
    mediaManager.setMuted(muted);
  }, []);

  // Set deafened state
  const setDeafened = useCallback((deafened: boolean) => {
    mediaManager.setDeafened(deafened);
  }, []);

  // Set push-to-talk mode
  const handleSetPushToTalkMode = useCallback((enabled: boolean) => {
    setIsPushToTalkMode(enabled);
    mediaManager.setPushToTalkMode(enabled);
  }, []);

  // Set push-to-talk active state
  const setPushToTalkActive = useCallback((active: boolean) => {
    mediaManager.setPushToTalkActive(active);
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await mediaManager.startCamera();
      setLocalCameraStream(stream);
      setIsCameraActive(true);

      for (const [, pc] of peersRef.current.entries()) {
        pc.addVideoStream(stream, 'camera');
        await pc.createOffer();
      }

      if (user?.id) {
        await supabase
          .from('voice_states')
          .update({ camera: true })
          .eq('user_id', user.id);
      }

      console.log('[useWebRTC] Camera started');
    } catch (error) {
      console.error('[useWebRTC] Failed to start camera:', error);
      throw error;
    }
  }, [user?.id]);

  // Stop camera
  const stopCamera = useCallback(async () => {
    mediaManager.stopCamera();
    setLocalCameraStream(null);
    setIsCameraActive(false);

    for (const [, pc] of peersRef.current.entries()) {
      pc.removeVideoStream('camera');
      await pc.renegotiate();
    }

    if (user?.id) {
      await supabase
        .from('voice_states')
        .update({ camera: false })
        .eq('user_id', user.id);
    }

    console.log('[useWebRTC] Camera stopped');
  }, [user?.id]);

  // Start screen share
  const startScreenShare = useCallback(async (options?: ScreenShareOptions) => {
    try {
      const stream = await mediaManager.startScreenShare(options);
      setLocalScreenStream(stream);
      setIsScreenSharing(true);

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      const encodingOpts = mediaManager.getScreenShareEncodingOptions();

      for (const [, pc] of peersRef.current.entries()) {
        if (encodingOpts) {
          pc.setScreenShareEncoding(encodingOpts);
        }
        pc.addVideoStream(stream, 'screen');
        await pc.createOffer();
      }

      if (user?.id) {
        await supabase
          .from('voice_states')
          .update({ streaming: true })
          .eq('user_id', user.id);
      }

      console.log('[useWebRTC] Screen share started');
    } catch (error) {
      console.error('[useWebRTC] Failed to start screen share:', error);
      throw error;
    }
  }, [user?.id]);

  // Stop screen share
  const stopScreenShare = useCallback(async () => {
    mediaManager.stopScreenShare();
    setLocalScreenStream(null);
    setIsScreenSharing(false);

    for (const [, pc] of peersRef.current.entries()) {
      pc.removeVideoStream('screen');
      await pc.renegotiate();
    }

    if (user?.id) {
      await supabase
        .from('voice_states')
        .update({ streaming: false })
        .eq('user_id', user.id);
    }

    console.log('[useWebRTC] Screen share stopped');
  }, [user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectInternal();
    };
  }, [disconnectInternal]);

  return {
    isConnected,
    isConnecting,
    isMicrophoneActive,
    audioLevel,
    peers,
    connect,
    disconnect,
    setMuted,
    setDeafened,
    microphoneError,
    hasMicrophoneAccess,
    retryMicrophone,
    isPushToTalkMode,
    setPushToTalkMode: handleSetPushToTalkMode,
    setPushToTalkActive,
    // Camera
    isCameraActive,
    localCameraStream,
    startCamera,
    stopCamera,
    // Screen Share
    isScreenSharing,
    localScreenStream,
    startScreenShare,
    stopScreenShare,
    // Remote streams
    remoteVideoStreams,
    remoteScreenStreams,
    // Connection stats
    connectionStats,
    // Reconnection state
    isReconnecting,
    reconnectAttempts,
  };
}
