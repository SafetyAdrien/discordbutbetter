import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2 } from 'lucide-react';
import { DMCall } from '@/hooks/useDMCalls';
import { useDMCallWebRTC } from '@/hooks/useDMCallWebRTC';
import { VoiceConnectionIndicator } from '@/components/channels/voice/VoiceConnectionIndicator';
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
  isInitiator: boolean;
}

export function DMCallView({ call, participant, onEndCall, isInitiator }: DMCallViewProps) {
  const [duration, setDuration] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const {
    isConnected,
    isConnecting,
    isMuted,
    isVideoOff,
    audioLevel,
    remoteVideoStream,
    localVideoStream,
    connectionStats,
    remoteMuted,
    remoteVideoOff,
    connect,
    disconnect,
    toggleMute,
    toggleVideo,
  } = useDMCallWebRTC();

  // Connect when call becomes active
  useEffect(() => {
    if (call.status === 'active' && participant && !isConnected && !isConnecting) {
      connect(call.id, participant.id, isInitiator);
    }
  }, [call.status, call.id, participant, isConnected, isConnecting, isInitiator, connect]);

  // Handle local video stream
  useEffect(() => {
    if (localVideoRef.current && localVideoStream) {
      localVideoRef.current.srcObject = localVideoStream;
    }
  }, [localVideoStream]);

  // Handle remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteVideoStream) {
      remoteVideoRef.current.srcObject = remoteVideoStream;
    }
  }, [remoteVideoStream]);

  // Track call duration
  useEffect(() => {
    if (call.status !== 'active' || !call.started_at) return;

    const startTime = new Date(call.started_at).getTime();
    
    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [call.status, call.started_at]);

  // Cleanup on unmount or call end
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const handleEndCall = () => {
    disconnect();
    onEndCall();
  };

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
              {isConnecting && 'Connexion...'}
              {isConnected && call.status === 'active' && formatDuration(duration)}
              {!isConnected && !isConnecting && call.status === 'ringing' && 'Appel en cours...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <VoiceConnectionIndicator stats={connectionStats} connected={isConnected} />
          <Button variant="ghost" size="icon">
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Remote Video (if video call) */}
        {remoteVideoStream && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Local Video (Picture in Picture) */}
        {localVideoStream && (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-24 right-4 w-32 h-24 rounded-lg object-cover border-2 border-border shadow-lg z-10"
          />
        )}

        {/* Avatar display when no video */}
        {!remoteVideoStream && (
          <div className="text-center">
            <div className="relative">
              <Avatar className={cn(
                "w-32 h-32 mx-auto mb-6 ring-4 transition-all duration-200",
                remoteMuted ? "ring-muted-foreground/30" : audioLevel > 0.05 ? "ring-[hsl(var(--online))]" : "ring-primary/20"
              )}>
                <AvatarImage src={participant?.avatar_url || undefined} />
                <AvatarFallback className="text-4xl bg-primary/20 text-primary">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isConnected && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[hsl(var(--online))] border-2 border-background" />
              )}
              {remoteMuted && isConnected && (
                <div className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-destructive border-2 border-background flex items-center justify-center">
                  <MicOff className="w-3.5 h-3.5 text-destructive-foreground" />
                </div>
              )}
            </div>
            <h2 className="text-xl font-semibold mb-2">{displayName}</h2>
            <p className="text-muted-foreground">
              {isConnecting && 'Connexion en cours...'}
              {isConnected && call.status === 'active' && formatDuration(duration)}
              {!isConnected && !isConnecting && call.status === 'ringing' && 'Appel en cours...'}
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 flex items-center justify-center gap-4">
        <Button
          variant={isMuted ? 'destructive' : 'secondary'}
          size="lg"
          className="rounded-full w-14 h-14"
          onClick={toggleMute}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </Button>
        
        {call.call_type === 'video' && (
          <Button
            variant={isVideoOff ? 'destructive' : 'secondary'}
            size="lg"
            className="rounded-full w-14 h-14"
            onClick={toggleVideo}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </Button>
        )}
        
        <Button
          variant="destructive"
          size="lg"
          className="rounded-full w-14 h-14"
          onClick={handleEndCall}
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
