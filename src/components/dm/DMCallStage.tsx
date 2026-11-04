import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useVoice } from '@/contexts/VoiceContext';
import { useDMCallWebRTC } from '@/hooks/useDMCallWebRTC';
import { useRingtone } from '@/hooks/useRingtone';
import { useVoiceViewPrefs } from '@/hooks/useVoiceViewPrefs';
import type { DMCall } from '@/hooks/useDMCalls';
import {
  DM_CALL_ACTION_EVENT,
  dismissRing,
  joinCallSession,
  leaveCallSession,
  setCallMedia,
  useDMCallSession,
  type DMCallAction,
} from '@/lib/dmCallSession';
import { UserAvatarImage } from '@/components/ui/user-avatar-image';
import { VoiceActionBar } from '@/components/channels/voice/VoiceActionBar';
import { ScreenShareQualityModal } from '@/components/channels/voice/ScreenShareQualityModal';
import { CameraPreviewDialog, HideSelfCameraDialog, readAlwaysPreview } from './CallDialogs';
import { DiscordMicOff as MicOff } from '@/components/icons/DiscordMicOff';
import { Phone, Video, X } from '@/components/icons/discord/lucide';
import type { ScreenShareOptions } from '@/utils/webrtc/MediaManager';

/*
 * Scene d'un appel de MP (video de reference), sous l'en-tete noir :
 *  - sonnerie (je suis appele) : les deux avatars et trois boutons (video, vocal, refuser) ;
 *  - appel en cours sans moi : l'avatar de l'appelant et deux boutons verts "rejoindre" (video, vocal) ;
 *  - appel rejoint : les deux avatars (anneau vert quand on parle, pastille rouge si micro coupe), partages d'ecran et cameras en
 *    tuiles, barre de commandes (micro, camera, partage, activites, soundboard, plus) et bouton raccrocher rouge.
 */

interface Person {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
}

interface Props {
  call: DMCall;
  conversationId: string;
  peer: Person | null;
  peerName: string;
  /** Rejoint l'appel cote serveur (statut actif) : l'appelant l'est deja. */
  onJoin: (withVideo: boolean) => Promise<void> | void;
  onEnd: () => void;
}

const GREEN = 'flex h-12 w-[63px] items-center justify-center rounded-xl bg-[#248046] text-white transition-colors hover:bg-[#1a6334] active:bg-[#14532b]';

function Avatar({ person, speaking, muted, size = 85 }: { person: Person | null; speaking?: boolean; muted?: boolean; size?: number }) {
  return (
    <span className="relative inline-block shrink-0">
      <span className={cn('block rounded-full transition-shadow duration-150', speaking ? 'shadow-[0_0_0_3px_#23a55a]' : 'shadow-[0_0_0_2px_rgba(255,255,255,0.28)]')} style={{ width: size, height: size }}>
        <UserAvatarImage src={person?.avatar_url} alt="" className="h-full w-full" fallbackClassName="text-3xl" fallback={(person?.display_name ?? '?').charAt(0).toUpperCase()} ownerId={person?.id} />
      </span>
      {muted && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-[26px] w-[26px] items-center justify-center rounded-full border-[3px] border-black bg-[#da373c] text-white">
          <MicOff className="h-3.5 w-3.5" />
        </span>
      )}
    </span>
  );
}

function VideoTile({ stream, label, live, quality, mirrored }: { stream: MediaStream; label: string; live?: boolean; quality?: string; mirrored?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <div className="relative aspect-video h-full max-h-[240px] min-w-0 overflow-hidden rounded-lg bg-[#0a090c]">
      <video ref={ref} autoPlay playsInline muted className={cn('h-full w-full object-contain', mirrored && '-scale-x-100')} />
      {live && (
        <span className="absolute right-2 top-2 flex items-center gap-1 rounded-[4px] bg-black/60 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-4 text-white">
          {quality}
          <span className="rounded-[3px] bg-[#da373c] px-1">Direct</span>
        </span>
      )}
      <span translate="no" className="absolute bottom-2 left-2 rounded-[4px] bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white">{label}</span>
    </div>
  );
}

export function DMCallStage({ call, conversationId, peer, peerName, onJoin, onEnd }: Props) {
  const { user, profile } = useAuth();
  const session = useDMCallSession();
  const rtc = useDMCallWebRTC();
  const voice = useVoice();
  const prefs = useVoiceViewPrefs();
  const [deafened, setDeafenedState] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [hideSelfOpen, setHideSelfOpen] = useState(false);

  const joined = session.joined?.callId === call.id;
  const mine = call.initiator_id === user?.id;
  const dismissed = session.dismissed.includes(call.id);
  const ringingForMe = call.status === 'ringing' && !mine && !joined && !dismissed;
  const mode: 'ring' | 'join' | 'joined' = joined ? 'joined' : ringingForMe ? 'ring' : 'join';

  useRingtone(ringingForMe || (joined && mine && call.status === 'ringing'), mine);

  // Connexion media : dans l'appel, des que les deux cotes sont la (statut actif).
  const { isConnected, isConnecting, connect, disconnect } = rtc;
  useEffect(() => {
    if (joined && call.status === 'active' && peer && !isConnected && !isConnecting) void connect(call.id, peer.id, mine).catch(() => undefined);
  }, [joined, call.status, call.id, peer, isConnected, isConnecting, connect, mine]);

  // Sortie de la scene (autre conversation, appel termine) : coupe mon cote et libere la session.
  const callId = call.id;
  useEffect(
    () => () => {
      void disconnect();
      leaveCallSession(callId);
    },
    [callId, disconnect],
  );

  // L'etat de mes peripheriques alimente le panneau "Vocal connecte" de la barre laterale.
  useEffect(() => {
    if (joined) setCallMedia({ muted: rtc.isMuted, camera: !rtc.isVideoOff, screen: rtc.isScreenSharing, deafened });
  }, [joined, rtc.isMuted, rtc.isVideoOff, rtc.isScreenSharing, deafened]);

  const hangUp = useCallback(() => {
    void disconnect();
    leaveCallSession(callId);
    onEnd();
  }, [disconnect, callId, onEnd]);

  const join = async (withVideo: boolean) => {
    await onJoin(withVideo);
    joinCallSession(callId, conversationId, peerName);
    if (withVideo) setPreviewOpen(readAlwaysPreview());
    if (withVideo && !readAlwaysPreview()) void rtc.toggleVideo();
  };

  const toggleDeafen = useCallback(() => {
    setDeafenedState((d) => {
      rtc.setDeafened(!d);
      if (!d && !rtc.isMuted) rtc.toggleMute();
      return !d;
    });
  }, [rtc]);

  const [shareOpen, setShareOpen] = useState(false);
  const toggleScreen = useCallback(
    (options?: ScreenShareOptions) => {
      void rtc.toggleScreenShare(options);
    },
    [rtc],
  );

  const toggleCamera = useCallback(() => {
    if (rtc.isVideoOff && readAlwaysPreview()) setPreviewOpen(true);
    else void rtc.toggleVideo();
  }, [rtc]);

  // Actions du panneau de la barre laterale.
  const actionsRef = useRef({ hangUp, toggleDeafen, toggleCamera, rtc });
  actionsRef.current = { hangUp, toggleDeafen, toggleCamera, rtc };
  useEffect(() => {
    if (!joined) return;
    const on = (e: Event) => {
      const a = (e as CustomEvent<DMCallAction>).detail;
      const cur = actionsRef.current;
      if (a === 'hangup') cur.hangUp();
      else if (a === 'mute') cur.rtc.toggleMute();
      else if (a === 'deafen') cur.toggleDeafen();
      else if (a === 'camera') cur.toggleCamera();
      else if (a === 'screen') {
        if (cur.rtc.isScreenSharing) void cur.rtc.toggleScreenShare();
        else setShareOpen(true);
      }
    };
    window.addEventListener(DM_CALL_ACTION_EVENT, on);
    return () => window.removeEventListener(DM_CALL_ACTION_EVENT, on);
  }, [joined]);

  const me: Person | null = useMemo(() => (user && profile ? { id: user.id, display_name: profile.display_name, username: profile.username, avatar_url: profile.avatar_url } : null), [user, profile]);
  const caller = mine ? me : peer;
  const ordered = useMemo(() => [me, peer].filter(Boolean).sort((a, b) => (a!.id < b!.id ? -1 : 1)) as Person[], [me, peer]);

  const screens = [
    rtc.localScreenStream ? { key: 'ls', stream: rtc.localScreenStream, label: me?.display_name ?? '', mirrored: false } : null,
    rtc.remoteScreenStream ? { key: 'rs', stream: rtc.remoteScreenStream, label: peer?.display_name ?? '', mirrored: false } : null,
  ].filter(Boolean) as { key: string; stream: MediaStream; label: string; mirrored: boolean }[];
  const cams = [
    rtc.localVideoStream && prefs.showSelf ? { key: 'lc', stream: rtc.localVideoStream, label: me?.display_name ?? '', mirrored: true } : null,
    rtc.remoteVideoStream ? { key: 'rc', stream: rtc.remoteVideoStream, label: peer?.display_name ?? '', mirrored: false } : null,
  ].filter(Boolean) as { key: string; stream: MediaStream; label: string; mirrored: boolean }[];
  const hasVideo = screens.length + cams.length > 0;

  return (
    <div className={cn('relative flex flex-col items-center bg-black', mode === 'joined' ? (hasVideo ? 'h-[330px]' : 'h-[184px]') : mode === 'join' ? 'h-[372px]' : 'h-[184px]')}>
      {mode === 'join' ? (
        <div className="flex flex-1 items-center justify-center">
          <Avatar person={caller} size={76} />
        </div>
      ) : hasVideo ? (
        <div className="flex min-h-0 w-full flex-1 items-center justify-center gap-2 px-4 pt-3">
          {[...screens, ...cams].map((t) => (
            <VideoTile key={t.key} stream={t.stream} label={t.label} mirrored={t.mirrored} live={t.key.endsWith('s')} quality="1080P 30FPS" />
          ))}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center gap-2 pt-1">
          {ordered.map((p) => {
            const self = p.id === user?.id;
            return <Avatar key={p.id} person={p} speaking={self && mode === 'joined' && rtc.audioLevel > 0.05 && !rtc.isMuted} muted={mode === 'joined' && (self ? rtc.isMuted : rtc.remoteMuted)} />;
          })}
        </div>
      )}

      {mode === 'ring' && (
        <div className="mb-3 flex items-center gap-2">
          <button type="button" aria-label="Répondre avec la vidéo" onClick={() => void join(true)} className={GREEN}><Video className="h-6 w-6" /></button>
          <button type="button" aria-label="Répondre" onClick={() => void join(false)} className={GREEN}><Phone className="h-6 w-6" /></button>
          <button type="button" aria-label="Refuser" onClick={() => dismissRing(callId)} className="flex h-12 w-[63px] items-center justify-center rounded-xl bg-[#da373c] text-white transition-colors hover:bg-[#a12d2f]"><X className="h-6 w-6" /></button>
        </div>
      )}
      {mode === 'join' && (
        <div className="mb-8 flex items-center gap-2">
          <button type="button" aria-label="Rejoindre avec la vidéo" onClick={() => void join(true)} className={GREEN}><Video className="h-6 w-6" /></button>
          <button type="button" aria-label="Rejoindre l'appel" onClick={() => void join(false)} className={GREEN}><Phone className="h-6 w-6" /></button>
        </div>
      )}
      {mode === 'joined' && (
        <VoiceActionBar
          variant="dm"
          isMuted={rtc.isMuted}
          isDeafened={deafened}
          isCameraOn={!rtc.isVideoOff}
          isScreenSharing={rtc.isScreenSharing}
          onToggleMute={rtc.toggleMute}
          onToggleDeafen={toggleDeafen}
          onToggleCamera={toggleCamera}
          onToggleScreenShare={toggleScreen}
          onDisconnect={hangUp}
          onHideSelfRequest={() => setHideSelfOpen(true)}
          hasMicrophoneAccess={voice.hasMicrophoneAccess}
          micVolume={voice.micVolume}
          onMicVolumeChange={voice.setMicVolume}
          vadSensitivity={voice.vadSensitivity}
          onVadSensitivityChange={voice.setVadSensitivity}
          noiseSuppression={voice.noiseSuppression}
          onNoiseSuppressionChange={voice.setNoiseSuppression}
          rnnoiseAvailable={voice.rnnoiseAvailable}
          audioFilters={voice.audioFilters}
          onAudioFilterChange={voice.setAudioFilter}
        />
      )}

      <CameraPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} onConfirm={() => void rtc.toggleVideo()} />
      <HideSelfCameraDialog open={hideSelfOpen} onOpenChange={setHideSelfOpen} />
      <ShareHost open={shareOpen} onOpenChange={setShareOpen} onStart={(o) => toggleScreen(o)} />
    </div>
  );
}

/* Selecteur de partage ouvert depuis le panneau de la barre laterale (la barre en a un autre pour son propre bouton). */
function ShareHost({ open, onOpenChange, onStart }: { open: boolean; onOpenChange: (o: boolean) => void; onStart: (o: ScreenShareOptions) => void }) {
  return <ScreenShareQualityModal open={open} onOpenChange={onOpenChange} onStart={onStart} />;
}
