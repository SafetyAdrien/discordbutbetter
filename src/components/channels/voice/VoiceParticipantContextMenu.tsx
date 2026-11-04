import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { VolumeX, RotateCcw, UserCircle } from 'lucide-react';
import { Volume2 } from '@/components/icons/discord/lucide';
import { DiscordMicOff as MicOff } from '@/components/icons/DiscordMicOff';
import { DiscordHeadphonesOff as HeadphoneOff } from '@/components/icons/DiscordHeadphonesOff';
import { useVoiceUserSettings } from '@/hooks/useVoiceUserSettings';
import { useAuth } from '@/contexts/AuthContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useLongPress } from '@/hooks/useLongPress';
import { Slider } from '@/components/ui/slider';
import { useState, useEffect } from 'react';

interface VoiceParticipantContextMenuProps {
  participantUserId: string;
  participantName: string;
  onViewProfile: () => void;
  children: React.ReactNode;
  // Server-side moderation (optional)
  canModerate?: boolean;
  serverMuted?: boolean;
  serverDeafened?: boolean;
  onServerMute?: (muted: boolean) => void;
  onServerDeafen?: (deafened: boolean) => void;
  channelId?: string;
  isLocal?: boolean;
}

export function VoiceParticipantContextMenu({
  participantUserId,
  participantName,
  onViewProfile,
  children,
  canModerate = false,
  serverMuted = false,
  serverDeafened = false,
  onServerMute,
  onServerDeafen,
  isLocal,
}: VoiceParticipantContextMenuProps) {
  const { user } = useAuth();
  const { isMobile } = useBreakpoint();
  const { getUserVolume, setUserVolume } = useVoiceUserSettings();
  const isOwnUser = isLocal ?? (user?.id === participantUserId);
  const currentVolume = getUserVolume(participantUserId);
  const [localVolume, setLocalVolume] = useState(currentVolume);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Keep local in sync if external volume changes between menu openings
  useEffect(() => {
    setLocalVolume(currentVolume);
  }, [currentVolume]);

  const longPressHandlers = useLongPress({
    onLongPress: () => setSheetOpen(true),
  });

  const handleMuteUser = () => {
    setUserVolume.mutate({ targetUserId: participantUserId, volume: 0 });
    setLocalVolume(0);
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

  // Stop pointer/click propagation so Radix ContextMenu does not auto-close
  // when the user drags the slider. The slider lives inside a plain <div>,
  // not a ContextMenuItem, so there is no onSelect to intercept.
  const stopMenuClose = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  const renderActions = (onAction?: () => void) => (
    <>
      {!isOwnUser && (
        <>
          {/* Volume Slider — non-Item wrapper to prevent menu auto-close on drag */}
          <div
            className="px-3 py-2 space-y-2"
            onPointerDown={stopMenuClose}
            onMouseDown={stopMenuClose}
            onClick={stopMenuClose}
          >
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
            {localVolume > 100 && (
              <p className="text-[10px] text-warning">Volume amplifié au-delà de 100%</p>
            )}
          </div>
          <div className="h-px bg-border my-1" />
          <button type="button" onClick={() => { handleMuteUser(); onAction?.(); }} className="flex items-center gap-3 w-full px-2 py-[6px] rounded-[4px] text-[14px] leading-[18px] text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors">
            <VolumeX className="w-4 h-4 text-muted-foreground" />
            {currentVolume === 0 ? 'Déjà muté' : 'Muter cet utilisateur'}
          </button>
          <button type="button" onClick={() => { handleResetVolume(); onAction?.(); }} className="flex items-center gap-3 w-full px-2 py-[6px] rounded-[4px] text-[14px] leading-[18px] text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors">
            <RotateCcw className="w-4 h-4 text-muted-foreground" />
            Réinitialiser le volume
          </button>

          {/* Server-side moderation */}
          {canModerate && (onServerMute || onServerDeafen) && (
            <>
              <div className="h-px bg-border my-1" />
              {onServerMute && (
                <button type="button" onClick={() => { onServerMute(!serverMuted); onAction?.(); }} className="flex items-center gap-3 w-full px-2 py-[6px] rounded-[4px] text-[14px] leading-[18px] text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors">
                  <MicOff className="w-4 h-4 text-muted-foreground" />
                  {serverMuted ? 'Réactiver le micro (serveur)' : 'Couper le micro (serveur)'}
                </button>
              )}
              {onServerDeafen && (
                <button type="button" onClick={() => { onServerDeafen(!serverDeafened); onAction?.(); }} className="flex items-center gap-3 w-full px-2 py-[6px] rounded-[4px] text-[14px] leading-[18px] text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors">
                  <HeadphoneOff className="w-4 h-4 text-muted-foreground" />
                  {serverDeafened ? 'Réactiver le son (serveur)' : 'Rendre sourd (serveur)'}
                </button>
              )}
            </>
          )}
          <div className="h-px bg-border my-1" />
        </>
      )}
      <button type="button" onClick={() => { onViewProfile(); onAction?.(); }} className="flex items-center gap-3 w-full px-2 py-[6px] rounded-[4px] text-[14px] leading-[18px] text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors">
        <UserCircle className="w-4 h-4 text-muted-foreground" />
        Voir le profil
      </button>
    </>
  );

  if (isMobile) {
    return (
      <>
        <div {...longPressHandlers} style={{ touchAction: 'manipulation' }}>
          {children}
        </div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            side="bottom"
            className="p-0 rounded-t-2xl border-t border-border bg-popover max-h-[85vh] overflow-y-auto"
          >
            <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-muted-foreground/30" />
            <div className="px-4 py-2 border-b border-border/40">
              <div className="text-sm font-semibold text-foreground">{participantName}</div>
            </div>
            <div className="p-2">
              {renderActions(() => setSheetOpen(false))}
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        {!isOwnUser && (
          <>
            {/* Volume Slider — non-Item wrapper to prevent menu auto-close on drag */}
            <div
              className="px-3 py-2 space-y-2"
              onPointerDown={stopMenuClose}
              onMouseDown={stopMenuClose}
              onClick={stopMenuClose}
            >
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
              {localVolume > 100 && (
                <p className="text-[10px] text-warning">Volume amplifié au-delà de 100%</p>
              )}
            </div>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleMuteUser} className="gap-2">
              <VolumeX className="w-4 h-4" />
              {currentVolume === 0 ? 'Déjà muté' : 'Muter cet utilisateur'}
            </ContextMenuItem>
            <ContextMenuItem onClick={handleResetVolume} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Réinitialiser le volume
            </ContextMenuItem>

            {/* Server-side moderation */}
            {canModerate && (onServerMute || onServerDeafen) && (
              <>
                <ContextMenuSeparator />
                {onServerMute && (
                  <ContextMenuItem
                    onClick={() => onServerMute(!serverMuted)}
                    className="gap-2"
                  >
                    <MicOff className="w-4 h-4" />
                    {serverMuted ? 'Réactiver le micro (serveur)' : 'Couper le micro (serveur)'}
                  </ContextMenuItem>
                )}
                {onServerDeafen && (
                  <ContextMenuItem
                    onClick={() => onServerDeafen(!serverDeafened)}
                    className="gap-2"
                  >
                    <HeadphoneOff className="w-4 h-4" />
                    {serverDeafened ? 'Réactiver le son (serveur)' : 'Rendre sourd (serveur)'}
                  </ContextMenuItem>
                )}
              </>
            )}
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem onClick={onViewProfile} className="gap-2">
          <UserCircle className="w-4 h-4" />
          Voir le profil
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
