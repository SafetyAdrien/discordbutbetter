import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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

interface UseWebRTCReturn {
  isConnected: boolean;
  isConnecting: boolean;
  isMicrophoneActive: boolean;
  audioLevel: number;
  peers: Map<string, PeerInfo>;
  connect: (channelId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  setMuted: (muted: boolean) => void;
  setDeafened: (deafened: boolean) => void;
}

export function useWebRTC(): UseWebRTCReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMicrophoneActive, setIsMicrophoneActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [peers, setPeers] = useState<Map<string, PeerInfo>>(new Map());

  const signalingServiceRef = useRef<SignalingService | null>(null);
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const channelIdRef = useRef<string | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const participantsSubscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Handle incoming signals
  const handleSignalReceived = useCallback(async (fromUserId: string, signal: SignalData) => {
    if (!user?.id || !channelIdRef.current) return;

    let peerConnection = peersRef.current.get(fromUserId);

    // If this is an offer and we don't have a connection, create one
    if (!peerConnection && signal.type === 'offer') {
      peerConnection = createPeerConnection(fromUserId);
      
      // Add local stream
      const localStream = audioManager.getLocalStream();
      if (localStream) {
        peerConnection.addStream(localStream);
      }
    }

    if (peerConnection) {
      await peerConnection.handleSignal(signal);
    }
  }, [user?.id]);

  // Create a peer connection for a user
  const createPeerConnection = useCallback((peerId: string): PeerConnection => {
    console.log('[useWebRTC] Creating peer connection for:', peerId);

    const pc = new PeerConnection(
      peerId,
      // On signal - send through signaling service
      async (signal) => {
        if (signalingServiceRef.current) {
          await signalingServiceRef.current.sendSignal(peerId, signal);
        }
      },
      // On stream - add to audio manager
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
      // On disconnect
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

  // Connect to existing participants
  const connectToParticipants = useCallback(async (participants: Array<{ user_id: string }>) => {
    if (!user?.id) return;

    const localStream = audioManager.getLocalStream();
    if (!localStream) {
      console.error('[useWebRTC] No local stream available');
      return;
    }

    for (const participant of participants) {
      if (participant.user_id === user.id) continue;
      if (peersRef.current.has(participant.user_id)) continue;

      console.log('[useWebRTC] Connecting to participant:', participant.user_id);

      const pc = createPeerConnection(participant.user_id);
      pc.addStream(localStream);
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

      // Start microphone
      await audioManager.startMicrophone();
      setIsMicrophoneActive(true);

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

    // Stop audio level monitoring
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }

    // Close all peer connections
    peersRef.current.forEach((pc, peerId) => {
      pc.close();
      audioManager.removeRemoteStream(peerId);
    });
    peersRef.current.clear();
    setPeers(new Map());

    // Stop signaling service
    if (signalingServiceRef.current) {
      await signalingServiceRef.current.stop();
      signalingServiceRef.current = null;
    }

    // Unsubscribe from participants
    if (participantsSubscriptionRef.current) {
      await supabase.removeChannel(participantsSubscriptionRef.current);
      participantsSubscriptionRef.current = null;
    }

    // Stop microphone
    audioManager.cleanup();
    setIsMicrophoneActive(false);
    setAudioLevel(0);

    channelIdRef.current = null;
    setIsConnected(false);

    console.log('[useWebRTC] Disconnected');
  }, []);

  // Set muted state
  const setMuted = useCallback((muted: boolean) => {
    audioManager.setMuted(muted);
  }, []);

  // Set deafened state
  const setDeafened = useCallback((deafened: boolean) => {
    audioManager.setDeafened(deafened);
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
  };
}
