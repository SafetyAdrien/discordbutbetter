import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Volume2, VolumeX, HeadphoneOff, RotateCcw, UserCircle } from 'lucide-react';
import { useVoiceUserSettings } from '@/hooks/useVoiceUserSettings';
import { useAuth } from '@/contexts/AuthContext';
import { Slider } from '@/components/ui/slider';
import { useState } from 'react';

interface VoiceParticipantContextMenuProps {
  participantUserId: string;
  participantName: string;
  onViewProfile: () => void;
  children: React.ReactNode;
}

export function VoiceParticipantContextMenu({
  participantUserId,
  participantName,
  onViewProfile,
  children,
}: VoiceParticipantContextMenuProps) {
  const { user } = useAuth();
  const { getUserVolume, setUserVolume } = useVoiceUserSettings();
  const isOwnUser = user?.id === participantUserId;
  const currentVolume = getUserVolume(participantUserId);
  const [localVolume, setLocalVolume] = useState(currentVolume);

  const handleMuteUser = () => {
    setUserVolume.mutate({ targetUserId: participantUserId, volume: 0 });
  };

  const handleResetVolume = () => {
    setUserVolume.mutate({ targetUserId: participantUserId, volume: 100 });
    setLocalVolume(100);
  };

  const handleVolumeChange = (values: number[]) => {
    setLocalVolume(values[0]);
  };

  const handleVolumeCommit = (values: number[]) => {
    setUserVolume.mutate({ targetUserId: participantUserId, volume: values[0] });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        {!isOwnUser && (
          <>
            {/* Volume Slider */}
            <div className="px-3 py-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">Volume utilisateur</span>
                <span className="text-xs text-muted-foreground">{localVolume}%</span>
              </div>
              <Slider
                value={[localVolume]}
                max={200}
                step={5}
                onValueChange={handleVolumeChange}
                onValueCommit={handleVolumeCommit}
                className="w-full"
              />
            </div>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={handleMuteUser}
              className="gap-2"
            >
              <VolumeX className="w-4 h-4" />
              {currentVolume === 0 ? 'Déjà muté' : 'Muter cet utilisateur'}
            </ContextMenuItem>
            <ContextMenuItem
              onClick={handleResetVolume}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Réinitialiser le volume
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem
          onClick={onViewProfile}
          className="gap-2"
        >
          <UserCircle className="w-4 h-4" />
          Voir le profil
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
