import { cn } from '@/lib/utils';
import { Mic, MicOff, Headphones, HeadphoneOff, PhoneOff, AlertTriangle, Radio, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useVoice } from '@/contexts/VoiceContext';
import { VoiceConnectionIndicator } from '@/components/channels/voice/VoiceConnectionIndicator';

interface VoiceControlsProps {
  channelName: string;
  serverName: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onDisconnect: () => void;
}

export function VoiceControls({
  channelName,
  serverName,
  isMuted,
  isDeafened,
  onToggleMute,
  onToggleDeafen,
  onDisconnect,
}: VoiceControlsProps) {
  const { 
    localAudioLevel, 
    microphoneError, 
    hasMicrophoneAccess, 
    retryMicrophone,
    isPushToTalkMode,
    togglePushToTalkMode,
    connectionStats,
  } = useVoice();

  return (
    <div className="px-2 py-2 bg-[hsl(var(--online))]/10 border-t border-[hsl(var(--online))]/20">
      {/* Connection Info */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <VoiceConnectionIndicator stats={connectionStats} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[hsl(var(--online))]">
            Connecté
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {channelName}{serverName && ` / ${serverName}`}
          </p>
        </div>
      </div>

      {/* Microphone Error */}
      {microphoneError && (
        <div className="mb-2 px-1">
          <div className="flex items-center gap-2 p-2 rounded bg-warning/10 border border-warning/20">
            <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-warning font-medium">Mode écoute seule</p>
              <p className="text-xs text-muted-foreground">Microphone non disponible</p>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-6 px-2 text-xs"
              onClick={retryMicrophone}
            >
              Activer
            </Button>
          </div>
        </div>
      )}

      {/* Audio Level Bar */}
      {hasMicrophoneAccess && !isMuted && (
        <div className="mb-2 px-1">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-[hsl(var(--online))] transition-all duration-75"
              style={{ width: `${Math.min(localAudioLevel * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* PTT Indicator */}
      {isPushToTalkMode && (
        <div className="mb-2 px-1">
          <div className="flex items-center gap-2 p-1.5 rounded bg-primary/10 border border-primary/20">
            <Radio className="w-3 h-3 text-primary" />
            <p className="text-xs text-primary">Push-to-Talk actif (Espace)</p>
          </div>
        </div>
      )}

      {/* Controls - Separated groups with chevrons */}
      <div className="flex items-center gap-1">
        <TooltipProvider>
          {/* Microphone Group */}
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={isMuted ? 'destructive' : 'ghost'}
                  className={cn(
                    'h-8 px-2 rounded-r-none',
                    isMuted && 'bg-destructive/20 hover:bg-destructive/30 text-destructive',
                    !hasMicrophoneAccess && 'opacity-50'
                  )}
                  onClick={onToggleMute}
                  disabled={!hasMicrophoneAccess}
                >
                  {isMuted ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {!hasMicrophoneAccess 
                  ? 'Microphone non disponible' 
                  : isMuted 
                    ? 'Activer le micro' 
                    : 'Couper le micro'}
              </TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant={isMuted ? 'destructive' : 'ghost'}
                  className={cn(
                    'h-8 w-5 px-0 rounded-l-none border-l border-border/30',
                    isMuted && 'bg-destructive/20 hover:bg-destructive/30 text-destructive'
                  )}
                >
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Périphériques d'entrée</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Microphone par défaut</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={togglePushToTalkMode}>
                  <Radio className="w-4 h-4 mr-2" />
                  {isPushToTalkMode ? 'Désactiver Push-to-Talk' : 'Activer Push-to-Talk'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Headphones Group */}
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={isDeafened ? 'destructive' : 'ghost'}
                  className={cn(
                    'h-8 px-2 rounded-r-none',
                    isDeafened && 'bg-destructive/20 hover:bg-destructive/30 text-destructive'
                  )}
                  onClick={onToggleDeafen}
                >
                  {isDeafened ? (
                    <HeadphoneOff className="w-4 h-4" />
                  ) : (
                    <Headphones className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isDeafened ? 'Activer le son' : 'Couper le son'}
              </TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant={isDeafened ? 'destructive' : 'ghost'}
                  className={cn(
                    'h-8 w-5 px-0 rounded-l-none border-l border-border/30',
                    isDeafened && 'bg-destructive/20 hover:bg-destructive/30 text-destructive'
                  )}
                >
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Périphériques de sortie</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Haut-parleurs par défaut</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Disconnect Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 hover:bg-destructive/20 hover:text-destructive"
                onClick={onDisconnect}
              >
                <PhoneOff className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Déconnexion</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
