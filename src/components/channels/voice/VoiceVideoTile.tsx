import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Mic, MicOff, Headphones } from 'lucide-react';
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

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <div
      className={cn(
        'relative rounded-xl overflow-hidden bg-[#1e1f22]',
        type === 'screen' && 'col-span-2 row-span-2',
        isSpeaking && 'ring-2 ring-[hsl(var(--voice-active))] voice-speaking-glow',
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
      <div className="absolute bottom-2 left-2 flex items-center gap-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm">
        {isMuted ? (
          <MicOff className="w-4 h-4 text-destructive" />
        ) : isDeafened ? (
          <Headphones className="w-4 h-4 text-destructive" />
        ) : (
          <Mic className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-sm font-medium text-white">
          {participantName}
          {isLocal && ' (Vous)'}
        </span>
      </div>

      {/* Screen share indicator */}
      {type === 'screen' && (
        <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-[#5865f2]/80 text-white text-xs font-medium">
          Partage d'écran
        </div>
      )}
    </div>
  );
}