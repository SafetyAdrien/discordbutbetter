import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Volume2, VolumeX } from 'lucide-react';
import { DiscordMicOff as MicOff } from '@/components/icons/DiscordMicOff';
import { DiscordHeadphonesOff as HeadphoneOff } from '@/components/icons/DiscordHeadphonesOff';
import { useState } from 'react';

interface Participant {
  user_id: string;
  muted: boolean;
  deafened: boolean;
  server_muted?: boolean;
  server_deafened?: boolean;
  camera?: boolean;
  streaming?: boolean;
  profile: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface VoiceParticipantPopoverProps {
  participant: Participant;
  canModerate: boolean;
  volume: number;
  onVolumeChange: (volume: number) => void;
  onServerMute: (muted: boolean) => void;
  onServerDeafen: (deafened: boolean) => void;
  children: React.ReactNode;
}

export function VoiceParticipantPopover({
  participant,
  canModerate,
  volume,
  onVolumeChange,
  onServerMute,
  onServerDeafen,
  children,
}: VoiceParticipantPopoverProps) {
  const [open, setOpen] = useState(false);
  const [localVolume, setLocalVolume] = useState(volume);

  const handleVolumeChange = (values: number[]) => {
    const newVolume = values[0];
    setLocalVolume(newVolume);
  };

  const handleVolumeCommit = (values: number[]) => {
    onVolumeChange(values[0]);
  };

  const isMuted = localVolume === 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        {/* Header */}
        <div className="p-3 flex items-center gap-3 bg-muted/30">
          <Avatar className="w-10 h-10">
            <AvatarImage src={participant.profile.avatar_url || undefined} />
            <AvatarFallback className="text-sm">
              {participant.profile.display_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{participant.profile.display_name}</p>
            <p className="text-xs text-muted-foreground truncate">@{participant.profile.username.toLowerCase()}</p>
          </div>
        </div>

        {/* Volume Control */}
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Volume utilisateur</span>
            <span className="text-xs text-muted-foreground">{localVolume}%</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => {
                const newVolume = isMuted ? 100 : 0;
                setLocalVolume(newVolume);
                onVolumeChange(newVolume);
              }}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-destructive" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
            <Slider
              value={[localVolume]}
              max={200}
              step={5}
              onValueChange={handleVolumeChange}
              onValueCommit={handleVolumeCommit}
              className="flex-1"
            />
          </div>

          {localVolume > 100 && (
            <p className="text-xs text-warning">Volume amplifié au-delà de 100%</p>
          )}
        </div>

        {/* Server Mute Indicator */}
        {(participant.server_muted || participant.server_deafened) && (
          <>
            <Separator />
            <div className="p-3 space-y-2">
              {participant.server_muted && (
                <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
                  <MicOff className="w-4 h-4" />
                  <span>Muté par le serveur</span>
                </div>
              )}
              {participant.server_deafened && (
                <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
                  <HeadphoneOff className="w-4 h-4" />
                  <span>Rendu sourd par le serveur</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Admin Controls */}
        {canModerate && (
          <>
            <Separator />
            <div className="p-3 space-y-2">
              <p className="text-xs text-muted-foreground mb-2">Actions de modération</p>
              <div className="flex gap-2">
                <Button
                  variant={participant.server_muted ? 'secondary' : 'outline'}
                  size="sm"
                  className={cn(
                    'flex-1 gap-2',
                    participant.server_muted && 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                  )}
                  onClick={() => onServerMute(!participant.server_muted)}
                >
                  <MicOff className="w-4 h-4" />
                  {participant.server_muted ? 'Unmute' : 'Mute'}
                </Button>
                <Button
                  variant={participant.server_deafened ? 'secondary' : 'outline'}
                  size="sm"
                  className={cn(
                    'flex-1 gap-2',
                    participant.server_deafened && 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                  )}
                  onClick={() => onServerDeafen(!participant.server_deafened)}
                >
                  <HeadphoneOff className="w-4 h-4" />
                  {participant.server_deafened ? 'Undeafen' : 'Deafen'}
                </Button>
              </div>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
