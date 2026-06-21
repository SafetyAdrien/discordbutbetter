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
}

export function VoiceStatusBadge({ channelName, serverName, onDisconnect }: VoiceStatusBadgeProps) {
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
      className="mx-2 px-3 py-2 rounded-2xl bg-[hsl(var(--surface-2))] border border-border/40"
      style={{ boxShadow: 'var(--shadow-elevation-2)' }}
    >
      {/* Ligne 1 : statut */}
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="w-7 h-7 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 shrink-0"
                onClick={onDisconnect}
              >
                <PhoneOff className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Déconnexion</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Ligne 2 : contrôles média */}
      <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-center gap-1.5">
        <TooltipProvider delayDuration={200}>
          {/* Vidéo */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => toggleCamera()}
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-muted',
                  isCameraActive && 'bg-destructive/15 text-destructive hover:bg-destructive/25'
                )}
              >
                {isCameraActive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4 text-muted-foreground" />}
              </button>
            </TooltipTrigger>
            <TooltipContent>{isCameraActive ? 'Arrêter la vidéo' : 'Activer la vidéo'}</TooltipContent>
          </Tooltip>

          {/* Partage d'écran */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => toggleScreenShare()}
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-muted',
                  isScreenSharing && 'bg-[hsl(var(--online))]/15 text-[hsl(var(--online))] hover:bg-[hsl(var(--online))]/25'
                )}
              >
                {isScreenSharing ? <Monitor className="w-4 h-4" /> : <MonitorOff className="w-4 h-4 text-muted-foreground" />}
              </button>
            </TooltipTrigger>
            <TooltipContent>{isScreenSharing ? 'Arrêter le partage' : "Partager l'écran"}</TooltipContent>
          </Tooltip>

          {/* Soundboard (désactivé) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                disabled
                className="w-8 h-8 rounded-lg flex items-center justify-center opacity-40 cursor-not-allowed"
              >
                <Music2 className="w-4 h-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Soundboard — Bientôt disponible</TooltipContent>
          </Tooltip>

          {/* Krisp / Noise suppression */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setNoiseSuppression(krispActive ? 'off' : 'high')}
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-muted',
                  krispActive && 'bg-[hsl(var(--online))]/15 text-[hsl(var(--online))] hover:bg-[hsl(var(--online))]/25'
                )}
              >
                <Wand2 className={cn('w-4 h-4', !krispActive && 'text-muted-foreground')} />
              </button>
            </TooltipTrigger>
            <TooltipContent>{krispActive ? 'Krisp activé' : 'Krisp désactivé'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
