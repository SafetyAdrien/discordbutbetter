import { cn } from '@/lib/utils';
import { Mic, MicOff, Headphones, HeadphoneOff, PhoneOff, AlertTriangle, Radio, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useVoice } from '@/contexts/VoiceContext';
import { VoiceConnectionIndicator } from '@/components/channels/voice/VoiceConnectionIndicator';
import { MicrophoneSettingsPopover } from '@/components/channels/voice/MicrophoneSettingsPopover';

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
    noiseSuppression,
    setNoiseSuppression,
    rnnoiseAvailable,
    micVolume,
    setMicVolume,
    vadSensitivity,
    setVadSensitivity,
    audioFilters,
    setAudioFilter,
  } = useVoice();

  return (
    <div className="px-2 py-2 bg-[#e0e0e3] border-t border-[#c8c8cb]">
      {/* Connection Info */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <VoiceConnectionIndicator stats={connectionStats} connected />
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

      {/* Controls */}
      <div className="flex items-center gap-1">
        <TooltipProvider>
          {/* Mic button with settings popover on chevron */}
          <div className="flex items-center flex-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={isMuted ? 'destructive' : 'ghost'}
                  className={cn(
                    'flex-1 h-8 rounded-r-none',
                    isMuted && 'bg-destructive/20 hover:bg-destructive/30 text-destructive',
                    !hasMicrophoneAccess && 'opacity-50'
                  )}
                  onClick={onToggleMute}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {/* Krisp active indicator */}
                  {noiseSuppression !== 'off' && rnnoiseAvailable && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[hsl(var(--online))]" />
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
            <MicrophoneSettingsPopover
              micVolume={micVolume}
              onMicVolumeChange={setMicVolume}
              vadSensitivity={vadSensitivity}
              onVadSensitivityChange={setVadSensitivity}
              noiseSuppression={noiseSuppression}
              onNoiseSuppressionChange={setNoiseSuppression}
              rnnoiseAvailable={rnnoiseAvailable}
              enableDeEsser={audioFilters.deEsser}
              onToggleDeEsser={(v) => setAudioFilter('deEsser', v)}
              enableLowShelf={audioFilters.lowShelf}
              onToggleLowShelf={(v) => setAudioFilter('lowShelf', v)}
              enableHighPass={audioFilters.highPass}
              onToggleHighPass={(v) => setAudioFilter('highPass', v)}
            >
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-6 px-0 rounded-l-none border-l border-border/30"
              >
                <ChevronDown className="w-3 h-3" />
              </Button>
            </MicrophoneSettingsPopover>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={isDeafened ? 'destructive' : 'ghost'}
                className={cn(
                  'flex-1 h-8',
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

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={isPushToTalkMode ? 'secondary' : 'ghost'}
                className="flex-1 h-8"
                onClick={togglePushToTalkMode}
              >
                <Radio className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isPushToTalkMode ? 'Désactiver Push-to-Talk' : 'Activer Push-to-Talk'}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="flex-1 h-8 hover:bg-destructive/20 hover:text-destructive"
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
