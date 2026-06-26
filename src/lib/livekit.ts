import { supabase } from '@/integrations/supabase/client';
import {
  Room,
  RoomEvent,
  RoomOptions,
  RoomConnectOptions,
  Track,
  VideoPresets,
  Participant,
  TrackPublication,
} from 'livekit-client';


export interface LiveKitTokenResponse {
  token: string;
  url: string;
}

export async function fetchLiveKitToken(
  room: string,
  identity?: string,
  options?: {
    name?: string;
    metadata?: Record<string, unknown>;
    adminRoom?: boolean;
  }
): Promise<LiveKitTokenResponse> {
  const { data, error } = await supabase.functions.invoke('livekit-token', {
    body: {
      room,
      identity,
      name: options?.name,
      metadata: options?.metadata,
      adminRoom: options?.adminRoom,
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to fetch LiveKit token');
  }

  if (!data?.token || !data?.url) {
    throw new Error('Invalid token response from backend');
  }

  return { token: data.token as string, url: data.url as string };
}

export function createLiveKitRoom(url: string, token: string, options?: Partial<RoomOptions>): Room {
  const roomOptions: RoomOptions = {
    adaptiveStream: true,
    dynacast: true,
    stopLocalTrackOnUnpublish: true,
    reconnectOptions: {
      maxRetries: 7,
      backoffTime: 1000,
      maxBackoffTime: 20000,
      alwaysRetry: true,
    },
    publishDefaults: {
      videoEncoding: {
        maxBitrate: 1_700_000,
        maxFramerate: 30,
      },
      dtx: true,
      red: true,
      videoCodec: 'vp8',
      simulcast: true,
    },
    videoCaptureDefaults: {
      resolution: VideoPresets.h540.resolution,
      facingMode: 'user',
    },
    audioCaptureDefaults: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
      channelCount: 1,
    },
    ...options,
  };

  const room = new Room(roomOptions);

  // Connect to the server
  const connectOptions: RoomConnectOptions = {
    autoSubscribe: true,
  };

  room
    .connect(url, token, connectOptions)
    .then(() => {
      console.log('[LiveKit] Connected to room:', room.name);
    })
    .catch((err) => {
      console.error('[LiveKit] Connection error:', err);
    });

  return room;
}

export async function connectToLiveKitRoom(
  roomName: string,
  identity?: string,
  options?: {
    name?: string;
    metadata?: Record<string, unknown>;
    adminRoom?: boolean;
    roomOptions?: Partial<RoomOptions>;
  }
): Promise<{ room: Room; tokenResponse: LiveKitTokenResponse }> {
  const tokenResponse = await fetchLiveKitToken(roomName, identity, {
    name: options?.name,
    metadata: options?.metadata,
    adminRoom: options?.adminRoom,
  });

  const room = createLiveKitRoom(tokenResponse.url, tokenResponse.token, options?.roomOptions);
  return { room, tokenResponse };
}

export function getAudioTracks(participant: Participant): (LocalTrackPublication | RemoteTrackPublication)[] {
  return Array.from(participant.trackPublications.values()).filter(
    (pub) => pub.track && (pub.source === Track.Source.Camera || pub.source === Track.Source.Microphone)
  );
}

export function getVideoTracks(participant: Participant): (LocalTrackPublication | RemoteTrackPublication)[] {
  return Array.from(participant.trackPublications.values()).filter(
    (pub) => pub.track && pub.source === Track.Source.Camera
  );
}

export function getScreenShareTracks(participant: Participant): (LocalTrackPublication | RemoteTrackPublication)[] {
  return Array.from(participant.trackPublications.values()).filter(
    (pub) => pub.track && pub.source === Track.Source.ScreenShare
  );
}

export type { Room, Participant, RemoteParticipant, LocalTrackPublication, RemoteTrackPublication };
