import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PeerConnection, SignalData, ConnectionStats } from '@/utils/webrtc/PeerConnection';
import { SignalingService } from '@/utils/webrtc/SignalingService';
import { mediaManager, ScreenShareOptions } from '@/utils/webrtc/MediaManager';
import { audioProcessor } from '@/utils/webrtc/AudioProcessor';

interface PeerInfo {
  peerId: string;
  connection: PeerConnection;
  isSpeaking: boolean;
  audioLevel: number;
}

// Reconnection configuration
const ICE_RESTART_COOLDOWN_MS = 8000;

export interface UseWebRTCReturn {
  isConnected: boolean;
  isConnecting: boolean;
  isMicrophoneActive: boolean;
  audioLevel: number;
  localIsSpeaking: boolean;
  peers: Map<string, PeerInfo>;
  connect: (channelId: string, initial?: { muted: boolean; deafened: boolean }) => Promise<void>;
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
  // Fix #6 — device hot-swap
  switchInputDevice: (deviceId: string) => Promise<boolean>;
  setOutputSinkId: (deviceId: string) => Promise<void>;
}

// Adaptive VAD state tracking
interface AdaptiveVADState {
  ambientLevel: number;
  samples: number[];
  threshold: number;
}

export function useWebRTC(): UseWebRTCReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMicrophoneActive, setIsMicrophoneActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [localIsSpeaking, setLocalIsSpeaking] = useState(false);
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
  const iceRestartAtRef = useRef<Map<string, number>>(new Map());
  
  // Adaptive VAD state (persists across renders)
  const vadStateRef = useRef<Map<string, AdaptiveVADState>>(new Map());
  const AMBIENT_SAMPLE_SIZE = 60; // ~3 seconds of samples at 50ms

  // === MUTEX for connect/disconnect sequentiality ===
  const operationPromiseRef = useRef<Promise<void>>(Promise.resolve());
  const instanceIdRef = useRef(crypto.randomUUID());

  // === Signal queue: buffer signals arriving before peer is ready ===
  const signalQueueRef = useRef<Map<string, SignalData[]>>(new Map());

  // Refactored health check (Fix M) — usable by interval + visibilitychange
  const checkPeersHealth = useCallback(async () => {
    let hasConnectionIssue = false;
    for (const [peerId, pc] of peersRef.current.entries()) {
      try {
        const stats = await pc.getStats();
        setConnectionStats(stats);
        if (stats.iceState === 'connected' || stats.iceState === 'completed') {
          iceRestartAtRef.current.delete(peerId);
          continue;
        }
        if (stats.iceState !== 'failed' && stats.iceState !== 'disconnected') continue;

        hasConnectionIssue = true;
        // The lower user ID is the sole offerer for a peer pair, which avoids
        // glare when both clients notice the same network handoff.
        if (!user?.id || user.id >= peerId) continue;
        const now = Date.now();
        const lastRestartAt = iceRestartAtRef.current.get(peerId) ?? 0;
        if (now - lastRestartAt < ICE_RESTART_COOLDOWN_MS) continue;

        iceRestartAtRef.current.set(peerId, now);
        setIsReconnecting(true);
        setReconnectAttempts((attempts) => attempts + 1);
        console.info('[useWebRTC] ICE connection interrupted; restarting for peer:', peerId);
        await pc.restartIce();
      } catch (error) {
        console.error('[useWebRTC] Peer health check failed:', peerId, error);
      }
    }
    if (!hasConnectionIssue) {
      setIsReconnecting(false);
      setReconnectAttempts(0);
    }
  }, [user?.id]);

  // Fix M — on tab visibility restore, ensure signaling channel is alive + peers healthy
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible') return;
      if (!channelIdRef.current) return; // only when in a voice session
      const sig = signalingServiceRef.current;
      if (sig && !sig.isConnected) {
        console.info('[useWebRTC] Signaling channel stale after visibility restore, reconnecting');
        await sig.reconnect();
      }
      await checkPeersHealth();
    };

    const handleOffline = () => {
      if (channelIdRef.current) setIsReconnecting(true);
    };
    const handleOnline = () => {
      if (!channelIdRef.current) return;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(async () => {
        reconnectTimeoutRef.current = null;
        if (!navigator.onLine || !channelIdRef.current) return;
        const sig = signalingServiceRef.current;
        if (sig && !sig.isConnected) await sig.reconnect();
        await checkPeersHealth();
      }, 1200);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [checkPeersHealth]);


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
      },
      (type) => {
        console.log('[useWebRTC] Remote video stream ended for:', peerId, 'type:', type);
        mediaManager.removeRemoteVideoStream(peerId, type);
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
    setLocalIsSpeaking(false);
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
  const connect = useCallback(async (channelId: string, initial?: { muted: boolean; deafened: boolean }) => {
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

        // CRITICAL: push authoritative mute/deafen state from React Context into the
        // singleton mediaManager BEFORE any remote peer can attach an audio track.
        // This closes the race where stale singleton flags from a previous session
        // would persist (e.g. audio.muted = true forever after a disconnect/reconnect).
        if (initial) {
          mediaManager.setMuted(initial.muted);
          mediaManager.setDeafened(initial.deafened);
        }

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
          setLocalIsSpeaking(localVAD.isSpeaking);
          // Fix #2 — actually gate the transmitted signal based on VAD level.
          audioProcessor.applyNoiseGate(localVAD.level);




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
              // Only sample silence into the noise floor. Including speech
              // made the estimate track the speaker, which raised the
              // detection threshold until the peer vanished from their own
              // speaking indicator.
              if (!peerInfo.isSpeaking) {
                vadState.samples.push(rawLevel);
                if (vadState.samples.length > AMBIENT_SAMPLE_SIZE) {
                  vadState.samples.shift();
                }
                const sorted = [...vadState.samples].sort((a, b) => a - b);
                const percentileIndex = Math.floor(sorted.length * 0.2);
                vadState.ambientLevel = sorted[percentileIndex] || 0.05;
              }

              const remoteVAD = mediaManager.getRemoteVADState(peerId, peerInfo.isSpeaking, vadState.ambientLevel);

              if (peerInfo.isSpeaking !== remoteVAD.isSpeaking || peerInfo.audioLevel !== remoteVAD.level) {
                newPeers.set(peerId, { ...peerInfo, isSpeaking: remoteVAD.isSpeaking, audioLevel: remoteVAD.level });
                hasChanges = true;
              }
            }

            return hasChanges ? newPeers : prev;
          });
          // 25 ms (40 Hz) rather than 50 ms: the poll interval is the last
          // quantization step in the detection chain, so halving it directly
          // halves the worst-case wait between someone starting to speak and
          // their indicator lighting up.
        }, 25);

        // Start connection stats monitoring
        statsIntervalRef.current = setInterval(() => {
          checkPeersHealth();
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
  }, [user?.id, handleSignalReceived, connectToParticipants, disconnectInternal, checkPeersHealth]);

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

      if (user?.id && channelIdRef.current) {
        queryClient.setQueryData(['voice-participants', channelIdRef.current], (old: any[] | undefined) =>
          old?.map((p) => (p.user_id === user.id ? { ...p, camera: true } : p))
        );
      }

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
  }, [user?.id, queryClient]);

  // Stop camera
  const stopCamera = useCallback(async () => {
    mediaManager.stopCamera();
    setLocalCameraStream(null);
    setIsCameraActive(false);

    if (user?.id && channelIdRef.current) {
      queryClient.setQueryData(['voice-participants', channelIdRef.current], (old: any[] | undefined) =>
        old?.map((p) => (p.user_id === user.id ? { ...p, camera: false } : p))
      );
    }

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
  }, [user?.id, queryClient]);

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

  // Fix #6 — hot-swap the active input device on the existing peer connections.
  const switchInputDevice = useCallback(async (deviceId: string): Promise<boolean> => {
    const newTrack = await mediaManager.restartMicrophoneWith(deviceId);
    if (!newTrack) {
      setHasMicrophoneAccess(false);
      setMicrophoneError(true);
      return false;
    }
    setHasMicrophoneAccess(true);
    setMicrophoneError(false);
    setIsMicrophoneActive(true);
    for (const pc of peersRef.current.values()) {
      try { await pc.replaceAudioTrack(newTrack); }
      catch (e) { console.warn('[useWebRTC] replaceAudioTrack failed for a peer:', e); }
    }
    return true;
  }, []);

  // Fix #6 — switch the output sink (works on both native + Web Audio paths).
  const setOutputSinkId = useCallback(async (deviceId: string): Promise<void> => {
    await mediaManager.setOutputSinkId(deviceId);
  }, []);


  return {
    isConnected,
    isConnecting,
    isMicrophoneActive,
    audioLevel,
    localIsSpeaking,
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
    // Device hot-swap
    switchInputDevice,
    setOutputSinkId,
  };
}
