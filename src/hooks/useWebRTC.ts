import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PeerConnection, SignalData } from '@/utils/webrtc/PeerConnection';
import { SignalingService } from '@/utils/webrtc/SignalingService';
import { audioManager } from '@/utils/webrtc/AudioManager';

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

  const signalingServiceRef = useRef<SignalingService | null>(null);
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const channelIdRef = useRef<string | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const participantsSubscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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
        console.log('[useWebRTC] Received stream from:', peerId);
        audioManager.addRemoteStream(peerId, stream);
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
      () => {
        console.log('[useWebRTC] Peer disconnected:', peerId);
        audioManager.removeRemoteStream(peerId);
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
      const localStream = audioManager.getLocalStream();
      if (localStream) {
        peerConnection.addStream(localStream);
      }
    }

    if (peerConnection) {
      await peerConnection.handleSignal(signal);
    }
  }, [user?.id, createPeerConnection]);

  // Connect to existing participants
  const connectToParticipants = useCallback(async (participants: Array<{ user_id: string }>) => {
    if (!user?.id) return;

    const localStream = audioManager.getLocalStream();

    for (const participant of participants) {
      if (participant.user_id === user.id) continue;
      if (peersRef.current.has(participant.user_id)) continue;

      console.log('[useWebRTC] Connecting to participant:', participant.user_id);

      const pc = createPeerConnection(participant.user_id);
      if (localStream) {
        pc.addStream(localStream);
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
      const micSuccess = await audioManager.tryStartMicrophone();
      setHasMicrophoneAccess(micSuccess);
      setMicrophoneError(!micSuccess);
      
      if (micSuccess) {
        setIsMicrophoneActive(true);
      } else {
        console.warn('[useWebRTC] Joining in listen-only mode');
      }

      // Start audio level monitoring
      audioLevelIntervalRef.current = setInterval(() => {
        const level = audioManager.getAudioLevel();
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
                audioManager.removeRemoteStream(leftParticipant.user_id);
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
      audioManager.removeRemoteStream(peerId);
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

    audioManager.cleanup();
    setIsMicrophoneActive(false);
    setAudioLevel(0);
    setMicrophoneError(false);
    setHasMicrophoneAccess(false);

    channelIdRef.current = null;
    setIsConnected(false);

    console.log('[useWebRTC] Disconnected');
  }, []);

  // Retry microphone access
  const retryMicrophone = useCallback(async (): Promise<boolean> => {
    const success = await audioManager.tryStartMicrophone();
    setHasMicrophoneAccess(success);
    setMicrophoneError(!success);
    
    if (success) {
      setIsMicrophoneActive(true);
      
      // Add stream to existing peer connections
      const localStream = audioManager.getLocalStream();
      if (localStream) {
        for (const [peerId, pc] of peersRef.current.entries()) {
          pc.addStream(localStream);
          await pc.createOffer();
        }
      }
    }
    
    return success;
  }, []);

  // Set muted state
  const setMuted = useCallback((muted: boolean) => {
    audioManager.setMuted(muted);
  }, []);

  // Set deafened state
  const setDeafened = useCallback((deafened: boolean) => {
    audioManager.setDeafened(deafened);
  }, []);

  // Set push-to-talk mode
  const handleSetPushToTalkMode = useCallback((enabled: boolean) => {
    setIsPushToTalkMode(enabled);
    audioManager.setPushToTalkMode(enabled);
  }, []);

  // Set push-to-talk active state
  const setPushToTalkActive = useCallback((active: boolean) => {
    audioManager.setPushToTalkActive(active);
  }, []);

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
  };
}
