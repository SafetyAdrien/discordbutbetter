import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveKit } from '@/hooks/useLiveKit';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LiveKitConnectionTest() {
  const { user } = useAuth();
  const [joined, setJoined] = useState(false);

  const roomName = user?.id ? `test-${user.id}` : null;
  const { room, isConnected, isConnecting, error, localAudioTrack, localVideoTrack, toggleMute, toggleVideo, disconnect } = useLiveKit(
    joined ? roomName : null,
    {
      audio: true,
      video: false,
      name: user?.user_metadata?.display_name || user?.email || user?.id,
      metadata: { test: true },
      onError: (err) => console.error('[LiveKitTest] onError:', err),
      onDisconnected: (reason) => console.log('[LiveKitTest] disconnected:', reason),
    }
  );

  const handleJoin = () => setJoined(true);
  const handleLeave = async () => {
    await disconnect();
    setJoined(false);
  };

  return (
    <div className="p-6 max-w-md mx-auto space-y-4 border border-border rounded-xl bg-[hsl(var(--surface-1))]">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Test LiveKit</h3>
        <div className={cn(
          'w-3 h-3 rounded-full',
          isConnected ? 'bg-[hsl(var(--online))]' : isConnecting ? 'bg-amber-500 animate-pulse' : 'bg-muted-foreground'
        )} />
      </div>

      <div className="text-sm text-muted-foreground">
        {error ? (
          <span className="text-destructive">Erreur : {error.message}</span>
        ) : isConnected ? (
          <span>Connecté à <strong>{room?.name}</strong></span>
        ) : isConnecting ? (
          <span>Connexion en cours...</span>
        ) : (
          <span>Non connecté</span>
        )}
      </div>

      <div className="flex gap-2 justify-center">
        {!joined ? (
          <Button onClick={handleJoin} disabled={!roomName || isConnecting}>
            Rejoindre le test
          </Button>
        ) : (
          <>
            <Button
              variant={localAudioTrack && !localAudioTrack.isMuted ? 'secondary' : 'destructive'}
              size="icon"
              className="rounded-full w-12 h-12"
              onClick={toggleMute}
              disabled={!isConnected}
            >
              {localAudioTrack && !localAudioTrack.isMuted ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </Button>

            <Button
              variant={localVideoTrack && !localVideoTrack.isMuted ? 'secondary' : 'default'}
              size="icon"
              className="rounded-full w-12 h-12"
              onClick={toggleVideo}
              disabled={!isConnected}
            >
              {localVideoTrack && !localVideoTrack.isMuted ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>

            <Button variant="destructive" size="icon" className="rounded-full w-12 h-12" onClick={handleLeave}>
              <PhoneOff className="w-5 h-5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
