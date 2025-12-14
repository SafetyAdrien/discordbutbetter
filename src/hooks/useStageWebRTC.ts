import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MediaManager } from '@/utils/webrtc/MediaManager';
import { SignalingService } from '@/utils/webrtc/SignalingService';
import { PeerConnection, SignalData } from '@/utils/webrtc/PeerConnection';

interface PeerInfo {
  peerId: string;
  connection: PeerConnection;
}

interface UseStageWebRTCProps {
  sessionId: string | null;
  isSpeaker: boolean;
  isMuted: boolean;
  isLive: boolean;
}

export function useStageWebRTC({ sessionId, isSpeaker, isMuted, isLive }: UseStageWebRTCProps) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  
  const signalingRef = useRef<SignalingService | null>(null);
  const peersRef = useRef<Map<string, PeerInfo>>(new Map());
  const mediaManagerRef = useRef<MediaManager | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Create peer connection with proper callbacks
  const createPeerConnection = useCallback((peerId: string): PeerConnection => {
    const onSignal = async (signal: SignalData) => {
      if (signalingRef.current) {
        await signalingRef.current.sendSignal(peerId, signal);
      }
    };
    
    const onAudioStream = (stream: MediaStream) => {
      console.log('[StageWebRTC] Received audio stream from:', peerId);
      setRemoteStreams(prev => new Map(prev).set(peerId, stream));
      
      // Play audio through MediaManager
      if (mediaManagerRef.current) {
        mediaManagerRef.current.addRemoteAudioStream(peerId, stream);
      }
    };
    
    const onVideoStream = (stream: MediaStream, type: 'camera' | 'screen') => {
      console.log('[StageWebRTC] Received video stream from:', peerId, type);
    };
    
    const onDisconnect = () => {
      console.log('[StageWebRTC] Peer disconnected:', peerId);
      peersRef.current.delete(peerId);
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(peerId);
        return newMap;
      });
      if (mediaManagerRef.current) {
        mediaManagerRef.current.removeRemoteAudioStream(peerId);
      }
    };
    
    return new PeerConnection(peerId, onSignal, onAudioStream, onVideoStream, onDisconnect);
  }, []);

  // Handle incoming signal
  const handleSignalReceived = useCallback(async (fromUserId: string, signalData: SignalData) => {
    let peerInfo = peersRef.current.get(fromUserId);
    
    if (!peerInfo) {
      const pc = createPeerConnection(fromUserId);
      peerInfo = { peerId: fromUserId, connection: pc };
      peersRef.current.set(fromUserId, peerInfo);
      
      // Add local stream if speaker
      if (isSpeaker && mediaManagerRef.current?.getLocalAudioStream()) {
        pc.addAudioStream(mediaManagerRef.current.getLocalAudioStream()!);
      }
    }
    
    await peerInfo.connection.handleSignal(signalData);
  }, [createPeerConnection, isSpeaker]);

  // Connect to stage session
  const connect = useCallback(async () => {
    if (!user?.id || !sessionId || isConnected) return;
    
    console.log('[StageWebRTC] Connecting to session:', sessionId, 'as speaker:', isSpeaker);
    sessionIdRef.current = sessionId;
    
    try {
      // Initialize MediaManager
      if (!mediaManagerRef.current) {
        mediaManagerRef.current = new MediaManager();
      }
      
      // Initialize audio only if speaker
      if (isSpeaker) {
        try {
          await mediaManagerRef.current.tryStartMicrophone();
          console.log('[StageWebRTC] Microphone initialized for speaker');
        } catch (error) {
          console.warn('[StageWebRTC] Could not initialize microphone:', error);
        }
      }
      
      // Setup signaling with callback
      signalingRef.current = new SignalingService(sessionId, user.id, handleSignalReceived);
      await signalingRef.current.start();
      
      // Get existing participants and connect to them
      const { data: participants } = await supabase
        .from('stage_participants')
        .select('user_id')
        .eq('session_id', sessionId)
        .neq('user_id', user.id);
      
      if (participants) {
        for (const participant of participants) {
          const pc = createPeerConnection(participant.user_id);
          peersRef.current.set(participant.user_id, { 
            peerId: participant.user_id, 
            connection: pc 
          });
          
          // Add local audio stream if speaker
          if (isSpeaker && mediaManagerRef.current?.getLocalAudioStream()) {
            pc.addAudioStream(mediaManagerRef.current.getLocalAudioStream()!);
          }
          
          // Initiate connection
          await pc.createOffer();
        }
      }
      
      // Start audio level monitoring for VAD
      audioLevelIntervalRef.current = setInterval(() => {
        // Monitor local audio level (for speaker)
        if (isSpeaker && mediaManagerRef.current && user?.id) {
          const level = mediaManagerRef.current.getAudioLevel();
          if (level > 0.05) {
            setSpeakingUsers(prev => {
              if (!prev.has(user.id)) {
                return new Set(prev).add(user.id);
              }
              return prev;
            });
          } else {
            setSpeakingUsers(prev => {
              if (prev.has(user.id)) {
                const newSet = new Set(prev);
                newSet.delete(user.id);
                return newSet;
              }
              return prev;
            });
          }
        }
        
        // Monitor remote audio levels
        if (mediaManagerRef.current) {
          peersRef.current.forEach((peer) => {
            const level = mediaManagerRef.current!.getRemoteAudioLevel(peer.peerId);
            if (level > 0.05) {
              setSpeakingUsers(prev => {
                if (!prev.has(peer.peerId)) {
                  return new Set(prev).add(peer.peerId);
                }
                return prev;
              });
            } else {
              setSpeakingUsers(prev => {
                if (prev.has(peer.peerId)) {
                  const newSet = new Set(prev);
                  newSet.delete(peer.peerId);
                  return newSet;
                }
                return prev;
              });
            }
          });
        }
      }, 100);
      
      setIsConnected(true);
    } catch (error) {
      console.error('[StageWebRTC] Connection error:', error);
    }
  }, [user?.id, sessionId, isConnected, isSpeaker, handleSignalReceived, createPeerConnection]);

  // Disconnect from stage
  const disconnect = useCallback(() => {
    console.log('[StageWebRTC] Disconnecting');
    
    // Stop audio level monitoring
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }
    
    // Close all peer connections
    peersRef.current.forEach(peer => {
      peer.connection.close();
    });
    peersRef.current.clear();
    
    // Stop signaling
    if (signalingRef.current) {
      signalingRef.current.stop();
      signalingRef.current = null;
    }
    
    // Clean up media
    if (mediaManagerRef.current) {
      mediaManagerRef.current.cleanup();
      mediaManagerRef.current = null;
    }
    
    setRemoteStreams(new Map());
    setSpeakingUsers(new Set());
    setIsConnected(false);
    sessionIdRef.current = null;
  }, []);

  // Update mute state
  useEffect(() => {
    if (mediaManagerRef.current && isSpeaker) {
      mediaManagerRef.current.setMuted(isMuted);
    }
  }, [isMuted, isSpeaker]);

  // Auto-connect when session is live and user is a participant
  useEffect(() => {
    if (sessionId && isLive && !isConnected) {
      connect();
    }
  }, [sessionId, isLive, isConnected, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, []);

  return {
    isConnected,
    speakingUsers,
    remoteStreams,
    connect,
    disconnect,
  };
}
