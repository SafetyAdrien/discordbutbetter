import { PhoneOff, Video, VideoOff, Monitor, MonitorOff, Music2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useVoice } from '@/contexts/VoiceContext';
import { VoiceConnectionIndicator } from '@/components/channels/voice/VoiceConnectionIndicator';
import { cn } from '@/lib/utils';

interface VoiceStatusBadgeProps {
  channelName: string;
  serverName: string | null;
  onDisconnect: () => void;
  connectedToProfile?: boolean;
}

export function VoiceStatusBadge({ channelName, serverName, onDisconnect, connectedToProfile }: VoiceStatusBadgeProps) {
  const {
    connectionStats,
    isCameraActive,
    toggleCamera,
    isScreenSharing,
    toggleScreenShare,
    noiseSuppression,
    setNoiseSuppression,
  } = useVoice();

  const krispActive = noiseSuppression !== 'off';

  return (
    <div
      className={cn(
        // Stacked on the user panel and painted with the same `--input` token,
        // so when you join a voice channel the bottom-left corner becomes one
        // continuous lighter block instead of three different shades of grey.
        "w-full px-2 py-1.5 bg-[hsl(var(--input))] border-t border-white/[0.06]",
        connectedToProfile ? "border-b-0" : "rounded-2xl mx-2 mb-1 border"
      )}
      style={{ boxShadow: connectedToProfile ? undefined : 'var(--shadow-elevation-2)' }}
    >
      {/* Ligne 1 : statut + Krisp + déconnexion */}
      <div className="flex items-center gap-2">
        <VoiceConnectionIndicator stats={connectionStats} connected />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[hsl(var(--online))] leading-tight">
            Vocal connecté
          </p>
          <p className="text-xs text-muted-foreground truncate leading-tight">
            {channelName}{serverName ? ` / ${serverName}` : ''}
          </p>
        </div>

        <TooltipProvider delayDuration={200}>
          {/* Krisp / Noise suppression */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button"
                onClick={() => setNoiseSuppression(krispActive ? 'off' : 'high')}
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-muted shrink-0',
                  krispActive && 'bg-[hsl(var(--online))]/15 text-[hsl(var(--online))] hover:bg-[hsl(var(--online))]/25'
                )}
              >
                <Wand2 className={cn('w-3 h-3', !krispActive && 'text-muted-foreground')} />
              </button>
            </TooltipTrigger>
            <TooltipContent>{krispActive ? 'Krisp activé' : 'Krisp désactivé'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="w-6 h-6 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 shrink-0"
                onClick={onDisconnect}
              >
                <PhoneOff className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Déconnexion</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Ligne 2 : contrôles média — 3 boutons séparés sur toute la largeur */}
      <div className="mt-1 w-full grid grid-cols-3 gap-1.5">
        <TooltipProvider delayDuration={200}>
          {/* Vidéo */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button"
                onClick={() => toggleCamera()}
                className={cn(
                  'w-full h-7 rounded-lg bg-[hsl(var(--surface-1))]/60 flex items-center justify-center transition-colors hover:bg-muted',
                  isCameraActive && 'bg-destructive/15 text-destructive hover:bg-destructive/25'
                )}
              >
                {isCameraActive ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
            </TooltipTrigger>
            <TooltipContent>{isCameraActive ? 'Arrêter la vidéo' : 'Activer la vidéo'}</TooltipContent>
          </Tooltip>

          {/* Partage d'écran */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button"
                onClick={() => toggleScreenShare()}
                className={cn(
                  'w-full h-7 rounded-lg bg-[hsl(var(--surface-1))]/60 flex items-center justify-center transition-colors hover:bg-muted',
                  isScreenSharing && 'bg-[hsl(var(--online))]/15 text-[hsl(var(--online))] hover:bg-[hsl(var(--online))]/25'
                )}
              >
                {isScreenSharing ? <Monitor className="w-3.5 h-3.5" /> : <MonitorOff className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
            </TooltipTrigger>
            <TooltipContent>{isScreenSharing ? 'Arrêter le partage' : "Partager l'écran"}</TooltipContent>
          </Tooltip>

          {/* Soundboard (désactivé) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button"
                disabled
                className="w-full h-7 rounded-lg bg-[hsl(var(--surface-1))]/60 flex items-center justify-center opacity-40 cursor-not-allowed"
              >
                <Music2 className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Soundboard — Bientôt disponible</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>



    </div>
  );
}
