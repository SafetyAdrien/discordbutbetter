import { useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { DMCall } from '@/hooks/useDMCalls';

interface IncomingCallModalProps {
  call: DMCall;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallModal({ call, onAccept, onDecline }: IncomingCallModalProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play ringtone
  useEffect(() => {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 440;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.1;
    
    oscillator.start();
    
    // Ring pattern
    const ringInterval = setInterval(() => {
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.5);
    }, 1000);

    return () => {
      clearInterval(ringInterval);
      oscillator.stop();
      audioContext.close();
    };
  }, []);

  const initiatorName = call.initiator?.display_name || 'Utilisateur';

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <div className="flex flex-col items-center py-6">
          <div className="relative mb-6">
            <Avatar className="w-24 h-24 ring-4 ring-primary/20 animate-pulse">
              <AvatarImage src={call.initiator?.avatar_url || undefined} />
              <AvatarFallback className="text-3xl bg-primary/20 text-primary">
                {initiatorName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-2 -right-2 p-2 rounded-full bg-primary">
              {call.call_type === 'video' ? (
                <Video className="w-4 h-4 text-primary-foreground" />
              ) : (
                <Phone className="w-4 h-4 text-primary-foreground" />
              )}
            </div>
          </div>
          
          <h3 className="text-lg font-semibold mb-1">{initiatorName}</h3>
          <p className="text-muted-foreground mb-6">
            {call.call_type === 'video' ? 'Appel vidéo entrant...' : 'Appel vocal entrant...'}
          </p>
          
          <div className="flex gap-4">
            <Button
              variant="destructive"
              size="lg"
              className="rounded-full w-14 h-14"
              onClick={onDecline}
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
            <Button
              variant="default"
              size="lg"
              className="rounded-full w-14 h-14 bg-[hsl(var(--online))] hover:bg-[hsl(var(--online))]/90"
              onClick={onAccept}
            >
              <Phone className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
