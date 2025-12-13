import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PeerConnection, SignalData } from '@/utils/webrtc/PeerConnection';
import { SignalingService } from '@/utils/webrtc/SignalingService';
import { mediaManager } from '@/utils/webrtc/MediaManager';

interface PeerInfo {
  peerId: string;
  connection: PeerConnection;
  isSpeaking: boolean;
}

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
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  // Remote video/screen streams
  remoteVideoStreams: Map<string, MediaStream>;
  remoteScreenStreams: Map<string, MediaStream>;
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

  const signalingServiceRef = useRef<SignalingService | null>(null);
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const channelIdRef = useRef<string | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const participantsSubscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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
            newPeers.set(peerId, { ...existing, isSpeaking: false });
          } else {
            newPeers.set(peerId, { peerId, connection: pc, isSpeaking: false });
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

  // Handle incoming signals
  const handleSignalReceived = useCallback(async (fromUserId: string, signal: SignalData) => {
    if (!user?.id || !channelIdRef.current) return;

    let peerConnection = peersRef.current.get(fromUserId);

    if (!peerConnection && signal.type === 'offer') {
      peerConnection = createPeerConnection(fromUserId);
      const localStream = mediaManager.getLocalAudioStream();
      if (localStream) {
        peerConnection.addAudioStream(localStream);
      }
      // Add camera/screen if active
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
    }
  }, [user?.id, createPeerConnection]);

  // Connect to existing participants
  const connectToParticipants = useCallback(async (participants: Array<{ user_id: string }>) => {
    if (!user?.id) return;

    const localStream = mediaManager.getLocalAudioStream();

    for (const participant of participants) {
      if (participant.user_id === user.id) continue;
      if (peersRef.current.has(participant.user_id)) continue;

      console.log('[useWebRTC] Connecting to participant:', participant.user_id);

      const pc = createPeerConnection(participant.user_id);
      if (localStream) {
        pc.addAudioStream(localStream);
      }
      // Add camera/screen if active
      const cameraStream = mediaManager.getLocalCameraStream();
      if (cameraStream) {
        pc.addVideoStream(cameraStream, 'camera');
      }
      const screenStream = mediaManager.getLocalScreenStream();
      if (screenStream) {
        pc.addVideoStream(screenStream, 'screen');
      }
      await pc.createOffer();
    }
  }, [user?.id, createPeerConnection]);

  // Connect to voice channel
  const connect = useCallback(async (channelId: string) => {
    if (!user?.id || isConnecting || isConnected) return;

    console.log('[useWebRTC] Connecting to channel:', channelId);
    setIsConnecting(true);

    try {
      channelIdRef.current = channelId;

      // Try to start microphone - don't fail if it doesn't work
      const micSuccess = await mediaManager.tryStartMicrophone();
      setHasMicrophoneAccess(micSuccess);
      setMicrophoneError(!micSuccess);
      
      if (micSuccess) {
        setIsMicrophoneActive(true);
      } else {
        console.warn('[useWebRTC] Joining in listen-only mode');
      }

      // Start audio level monitoring
      audioLevelIntervalRef.current = setInterval(() => {
        const level = mediaManager.getAudioLevel();
        setAudioLevel(level);
      }, 100);

      // Start signaling service
      signalingServiceRef.current = new SignalingService(channelId, user.id, handleSignalReceived);
      await signalingServiceRef.current.start();

      // Get current participants
      const { data: existingParticipants } = await supabase
        .from('voice_states')
        .select('user_id')
        .eq('channel_id', channelId)
        .neq('user_id', user.id);

      if (existingParticipants && existingParticipants.length > 0) {
        await connectToParticipants(existingParticipants);
      }

      // Subscribe to new participants
      participantsSubscriptionRef.current = supabase
        .channel(`voice-participants-${channelId}`)
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
            }
          }
        )
        .subscribe();

      setIsConnected(true);
      console.log('[useWebRTC] Connected successfully');
    } catch (error) {
      console.error('[useWebRTC] Failed to connect:', error);
      await disconnect();
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [user?.id, isConnecting, isConnected, handleSignalReceived, connectToParticipants]);

  // Disconnect from voice channel
  const disconnect = useCallback(async () => {
    console.log('[useWebRTC] Disconnecting');

    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }

    peersRef.current.forEach((pc, peerId) => {
      pc.close();
      mediaManager.removeRemoteAudioStream(peerId);
      mediaManager.removeRemoteVideoStream(peerId, 'camera');
      mediaManager.removeRemoteVideoStream(peerId, 'screen');
    });
    peersRef.current.clear();
    setPeers(new Map());

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

    console.log('[useWebRTC] Disconnected');
  }, []);

  // Retry microphone access
  const retryMicrophone = useCallback(async (): Promise<boolean> => {
    const success = await mediaManager.tryStartMicrophone();
    setHasMicrophoneAccess(success);
    setMicrophoneError(!success);
    
    if (success) {
      setIsMicrophoneActive(true);
      
      // Add stream to existing peer connections
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

      // Add to all peer connections
      for (const [, pc] of peersRef.current.entries()) {
        pc.addVideoStream(stream, 'camera');
        await pc.createOffer();
      }

      // Update DB
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

    // Remove from all peer connections and renegotiate
    for (const [, pc] of peersRef.current.entries()) {
      pc.removeVideoStream('camera');
      await pc.renegotiate();
    }

    // Update DB
    if (user?.id) {
      await supabase
        .from('voice_states')
        .update({ camera: false })
        .eq('user_id', user.id);
    }

    console.log('[useWebRTC] Camera stopped');
  }, [user?.id]);

  // Start screen share
  const startScreenShare = useCallback(async () => {
    try {
      const stream = await mediaManager.startScreenShare();
      setLocalScreenStream(stream);
      setIsScreenSharing(true);

      // Handle user stopping via browser UI
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      // Add to all peer connections
      for (const [, pc] of peersRef.current.entries()) {
        pc.addVideoStream(stream, 'screen');
        await pc.createOffer();
      }

      // Update DB
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

    // Remove from all peer connections and renegotiate
    for (const [, pc] of peersRef.current.entries()) {
      pc.removeVideoStream('screen');
      await pc.renegotiate();
    }

    // Update DB
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
      disconnect();
    };
  }, [disconnect]);

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
  };
}