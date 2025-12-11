import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2 } from 'lucide-react';
import { DMCall } from '@/hooks/useDMCalls';
import { cn } from '@/lib/utils';

interface DMCallViewProps {
  call: DMCall;
  participant: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
  onEndCall: () => void;
}

export function DMCallView({ call, participant, onEndCall }: DMCallViewProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(call.call_type !== 'video');
  const [duration, setDuration] = useState(0);

  // Track call duration
  useEffect(() => {
    if (call.status !== 'active' || !call.started_at) return;

    const startTime = new Date(call.started_at).getTime();
    
    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [call.status, call.started_at]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const displayName = participant?.display_name || 'Utilisateur';

  return (
    <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={participant?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{displayName}</p>
            <p className="text-xs text-muted-foreground">
              {call.status === 'active' ? formatDuration(duration) : 'Connexion...'}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon">
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <Avatar className="w-32 h-32 mx-auto mb-6 ring-4 ring-primary/20">
            <AvatarImage src={participant?.avatar_url || undefined} />
            <AvatarFallback className="text-4xl bg-primary/20 text-primary">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-semibold mb-2">{displayName}</h2>
          <p className="text-muted-foreground">
            {call.status === 'ringing' && 'Appel en cours...'}
            {call.status === 'active' && formatDuration(duration)}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 flex items-center justify-center gap-4">
        <Button
          variant={isMuted ? 'destructive' : 'secondary'}
          size="lg"
          className="rounded-full w-14 h-14"
          onClick={() => setIsMuted(!isMuted)}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </Button>
        
        {call.call_type === 'video' && (
          <Button
            variant={isVideoOff ? 'destructive' : 'secondary'}
            size="lg"
            className="rounded-full w-14 h-14"
            onClick={() => setIsVideoOff(!isVideoOff)}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </Button>
        )}
        
        <Button
          variant="destructive"
          size="lg"
          className="rounded-full w-14 h-14"
          onClick={onEndCall}
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
