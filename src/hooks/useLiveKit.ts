import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Room,
  RoomEvent,
  Participant,
  RemoteParticipant,
  Track,
  LocalTrack,
  TrackPublication,
  RoomOptions,
  DisconnectReason,
} from 'livekit-client';
import { connectToLiveKitRoom, LiveKitTokenResponse } from '@/lib/livekit';

export interface UseLiveKitOptions {
  name?: string;
  audio?: boolean;
  video?: boolean;
  screenShare?: boolean;
  metadata?: Record<string, unknown>;
  roomOptions?: Partial<RoomOptions>;
  onConnected?: (room: Room) => void;
  onDisconnected?: (reason?: DisconnectReason) => void;
  onError?: (error: Error) => void;
}

export interface UseLiveKitReturn {
  room: Room | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  participants: RemoteParticipant[];
  localParticipant: Participant | null;
  localAudioTrack: LocalTrack | undefined;
  localVideoTrack: LocalTrack | undefined;
  screenShareTrack: LocalTrack | undefined;
  toggleMute: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useLiveKit(roomName: string | null, options: UseLiveKitOptions = {}): UseLiveKitReturn {
  const { user } = useAuth();
  const identity = options.identity || user?.id || '';

  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [localAudioTrack, setLocalAudioTrack] = useState<LocalTrack | undefined>();
  const [localVideoTrack, setLocalVideoTrack] = useState<LocalTrack | undefined>();
  const [screenShareTrack, setScreenShareTrack] = useState<LocalTrack | undefined>();

  const roomRef = useRef<Room | null>(null);
  const optionsRef = useRef(options);
  const abortRef = useRef(false);

  optionsRef.current = options;

  const updateParticipants = useCallback((r: Room) => {
    setParticipants(Array.from(r.remoteParticipants.values()));
  }, []);

  const updateLocalTracks = useCallback((r: Room) => {
    const lp = r.localParticipant;
    setLocalAudioTrack(lp.getTrackPublication(Track.Source.Microphone)?.track as LocalTrack | undefined);
    setLocalVideoTrack(lp.getTrackPublication(Track.Source.Camera)?.track as LocalTrack | undefined);
    setScreenShareTrack(lp.getTrackPublication(Track.Source.ScreenShare)?.track as LocalTrack | undefined);
  }, []);

  const disconnect = useCallback(async () => {
    const r = roomRef.current;
    if (!r) return;
    roomRef.current = null;
    abortRef.current = true;
    setIsConnecting(false);
    setIsConnected(false);
    setParticipants([]);
    setLocalAudioTrack(undefined);
    setLocalVideoTrack(undefined);
    setScreenShareTrack(undefined);
    try {
      await r.disconnect(true);
    } catch (e) {
      console.error('[useLiveKit] Disconnect error:', e);
    } finally {
      setRoom(null);
    }
  }, []);

  const toggleMute = useCallback(async () => {
    const r = roomRef.current;
    if (!r || !isConnected) return;
    const pub = r.localParticipant.getTrackPublication(Track.Source.Microphone);
    if (pub) {
      await r.localParticipant.setMicrophoneEnabled(pub.isMuted);
    } else if (optionsRef.current.audio !== false) {
      await r.localParticipant.setMicrophoneEnabled(true);
    }
    updateLocalTracks(r);
  }, [isConnected, updateLocalTracks]);

  const toggleVideo = useCallback(async () => {
    const r = roomRef.current;
    if (!r || !isConnected) return;
    const pub = r.localParticipant.getTrackPublication(Track.Source.Camera);
    if (pub) {
      await r.localParticipant.setCameraEnabled(pub.isMuted);
    } else if (optionsRef.current.video !== false) {
      await r.localParticipant.setCameraEnabled(true);
    }
    updateLocalTracks(r);
  }, [isConnected, updateLocalTracks]);


  const toggleScreenShare = useCallback(async () => {
    const r = roomRef.current;
    if (!r || !isConnected) return;
    const pub = r.localParticipant.getTrackPublication(Track.Source.ScreenShare);
    if (pub) {
      await r.localParticipant.setScreenShareEnabled(false);
    } else {
      await r.localParticipant.setScreenShareEnabled(true);
    }
    updateLocalTracks(r);
  }, [isConnected, updateLocalTracks]);

  useEffect(() => {
    if (!roomName || !identity) return;

    let mounted = true;
    abortRef.current = false;
    setIsConnecting(true);
    setError(null);
    setIsConnected(false);

    connectToLiveKitRoom(roomName, identity, {
      name: options.name,
      metadata: options.metadata,
      adminRoom: options.adminRoom,
      roomOptions: options.roomOptions,
    })
      .then(async ({ room: r }) => {
        if (!mounted || abortRef.current) {
          await r.disconnect(true);
          return;
        }
        roomRef.current = r;
        setRoom(r);

        // Event listeners
        r.on(RoomEvent.Connected, () => {
          setIsConnected(true);
          setIsConnecting(false);
          updateParticipants(r);
          updateLocalTracks(r);
          optionsRef.current.onConnected?.(r);
        });

        r.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
          setIsConnected(false);
          setIsConnecting(false);
          optionsRef.current.onDisconnected?.(reason);
        });

        r.on(RoomEvent.Reconnecting, () => {
          setIsConnecting(true);
        });

        r.on(RoomEvent.Reconnected, () => {
          setIsConnecting(false);
          setIsConnected(true);
          updateParticipants(r);
        });

        r.on(RoomEvent.ParticipantConnected, () => updateParticipants(r));
        r.on(RoomEvent.ParticipantDisconnected, () => updateParticipants(r));
        r.on(RoomEvent.TrackSubscribed, () => updateParticipants(r));
        r.on(RoomEvent.TrackUnsubscribed, () => updateParticipants(r));
        r.on(RoomEvent.LocalTrackPublished, () => updateLocalTracks(r));
        r.on(RoomEvent.LocalTrackUnpublished, () => updateLocalTracks(r));
        r.on(RoomEvent.TrackMuted, () => {
          updateParticipants(r);
          updateLocalTracks(r);
        });
        r.on(RoomEvent.TrackUnmuted, () => {
          updateParticipants(r);
          updateLocalTracks(r);
        });

        // If already connected synchronously
        if (r.state === 'connected') {
          setIsConnected(true);
          setIsConnecting(false);
          updateParticipants(r);
          updateLocalTracks(r);
        }

        // Publish initial devices if requested
        if (options.audio !== false) {
          try {
            await r.localParticipant.setMicrophoneEnabled(true);
          } catch (e) {
            console.warn('[useLiveKit] Microphone enable failed:', e);
          }
        }
        if (options.video) {
          try {
            await r.localParticipant.setCameraEnabled(true);
          } catch (e) {
            console.warn('[useLiveKit] Camera enable failed:', e);
          }
        }
        updateLocalTracks(r);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error('[useLiveKit] Connection error:', err);
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setIsConnecting(false);
        optionsRef.current.onError?.(error);
      });

    return () => {
      mounted = false;
      disconnect();
    };
  }, [roomName, identity, options.name, options.adminRoom, options.metadata, disconnect, updateParticipants, updateLocalTracks]);

  const localParticipant = room?.localParticipant || null;

  return {
    room,
    isConnected,
    isConnecting,
    error,
    participants,
    localParticipant,
    localAudioTrack,
    localVideoTrack,
    screenShareTrack,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    disconnect,
  };
}
