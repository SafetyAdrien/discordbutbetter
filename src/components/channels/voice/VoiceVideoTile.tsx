import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { DiscordMic } from '@/components/icons/DiscordMic';
import { DiscordMicOff } from '@/components/icons/DiscordMicOff';
import { DiscordHeadphonesOff } from '@/components/icons/DiscordHeadphonesOff';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface VoiceVideoTileProps {
  stream: MediaStream | null;
  type: 'camera' | 'screen';
  participantName: string;
  avatarUrl?: string | null;
  isSpeaking?: boolean;
  isMuted?: boolean;
  isDeafened?: boolean;
  isLocal?: boolean;
  className?: string;
}

export function VoiceVideoTile({
  stream,
  type,
  participantName,
  avatarUrl,
  isSpeaking = false,
  isMuted = false,
  isDeafened = false,
  isLocal = false,
  className,
}: VoiceVideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Apercu de son propre partage : mis en pause 5 s apres que la fenetre a perdu le focus.
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!(isLocal && type === 'screen')) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const sync = () => {
      clearTimeout(t);
      if (document.visibilityState === 'visible' && document.hasFocus()) { setPaused(false); return; }
      t = setTimeout(() => setPaused(true), 5000);
    };
    sync();
    window.addEventListener('focus', sync);
    window.addEventListener('blur', sync);
    document.addEventListener('visibilitychange', sync);
    return () => { clearTimeout(t); window.removeEventListener('focus', sync); window.removeEventListener('blur', sync); document.removeEventListener('visibilitychange', sync); };
  }, [isLocal, type]);
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (paused) el.pause(); else void el.play().catch(() => undefined);
  }, [paused]);

  useEffect(() => {
    const el = videoRef.current;
    if (el && stream) {
      el.srcObject = stream;
    }
    return () => {
      // Detach from the element captured at setup time: by cleanup time
      // `videoRef.current` is already null (React detaches refs before
      // running effect cleanups), so reading it here was a no-op and leaked
      // the MediaStream reference on the detached element.
      if (el) el.srcObject = null;
    };
  }, [stream]);

  return (
    <div
      className={cn(
        // No colour transition on the speaking border: it added a visible
        // ~150 ms ramp after the VAD had already decided, which read as lag.
        'relative rounded-xl overflow-hidden bg-background border-2',
        type === 'screen' && 'col-span-2 row-span-2',
        isSpeaking ? 'border-[hsl(var(--online))]' : 'border-transparent',
        className
      )}
    >
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2d2f34] to-[#1e1f22]">
          <Avatar className="w-24 h-24">
            <AvatarImage src={avatarUrl || undefined} alt={participantName} />
            <AvatarFallback className="text-2xl bg-primary/20 text-primary">
              {participantName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Name badge */}
      <div className="absolute bottom-2 left-2 flex items-center gap-2 px-2 py-1 rounded-md bg-black/60">
        {isMuted ? (
          <DiscordMicOff className="w-4 h-4 text-destructive" />
        ) : isDeafened ? (
          <DiscordHeadphonesOff className="w-4 h-4 text-destructive" />
        ) : (
          <DiscordMic className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-sm font-medium text-white">
          {participantName}
          {isLocal && ' (Vous)'}
        </span>
      </div>

      {/* Partage d'ecran : pastille "EN DIRECT" (video de reference) */}
      {type === 'screen' && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-1.5 h-[18px] flex items-center rounded-[4px] bg-[#da373c] text-white text-[10px] font-bold uppercase leading-none">
          En direct
        </div>
      )}

      {/* Apercu local en pause quand la fenetre est masquee : on garde le stream, on economise le rendu */}
      {paused && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center px-6">
          <p className="text-base font-semibold text-white">Ton stream est toujours en cours !</p>
          <p className="mt-1 text-sm text-white/80">Nous avons mis cet aperçu en pause pour économiser tes ressources.</p>
        </div>
      )}
    </div>
  );
}