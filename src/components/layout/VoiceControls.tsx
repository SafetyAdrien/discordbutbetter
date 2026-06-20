import { cn } from '@/lib/utils';
import { PhoneOff, AlertTriangle, Radio, ChevronDown } from 'lucide-react';
import { DiscordMic } from '@/components/icons/DiscordMic';
import { DiscordMicOff } from '@/components/icons/DiscordMicOff';
import { DiscordHeadphones } from '@/components/icons/DiscordHeadphones';
import { DiscordHeadphonesOff } from '@/components/icons/DiscordHeadphonesOff';
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
    <div className="px-2.5 py-2.5 bg-[hsl(var(--surface-2))] rounded-2xl mx-1 mb-1" style={{ boxShadow: 'var(--shadow-elevation-1)' }}>
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
          <div className="flex items-center gap-2 p-2 rounded-xl bg-warning/10 border border-warning/20">
            <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-warning font-medium">Mode écoute seule</p>
              <p className="text-xs text-muted-foreground">Microphone non disponible</p>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-6 px-2 text-xs rounded-full"
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
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-[hsl(var(--online))] rounded-full transition-all duration-75"
              style={{ width: `${Math.min(localAudioLevel * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* PTT Indicator */}
      {isPushToTalkMode && (
        <div className="mb-2 px-1">
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-primary/10 border border-primary/20">
            <Radio className="w-3 h-3 text-primary" />
            <p className="text-xs text-primary">Push-to-Talk actif (Espace)</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2">
        <TooltipProvider>
          {/* Mic button with settings popover on chevron */}
          <div className="flex items-center flex-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={isMuted ? 'destructive' : 'ghost'}
                  className={cn(
                    'flex-1 h-10 rounded-l-2xl rounded-r-none transition-all active:scale-95',
                    isMuted && 'bg-destructive/15 hover:bg-destructive/25 text-destructive',
                    !isMuted && 'bg-muted/40 hover:bg-muted/60',
                    !hasMicrophoneAccess && 'opacity-50',
                  )}
                  onClick={onToggleMute}
                >
                  {isMuted ? <DiscordMicOff className="w-[18px] h-[18px]" /> : <DiscordMic className="w-[18px] h-[18px]" />}
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
                className="h-10 w-7 px-0 rounded-l-none rounded-r-2xl border-l border-border/30 bg-muted/40 hover:bg-muted/60"
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
                  'flex-1 h-10 rounded-2xl transition-all active:scale-95',
                  isDeafened
                    ? 'bg-destructive/15 hover:bg-destructive/25 text-destructive'
                    : 'bg-muted/40 hover:bg-muted/60',
                )}
                onClick={onToggleDeafen}
              >
                {isDeafened ? (
                  <DiscordHeadphonesOff className="w-[18px] h-[18px]" />
                ) : (
                  <DiscordHeadphones className="w-[18px] h-[18px]" />
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
                className={cn(
                  'flex-1 h-10 rounded-2xl transition-all active:scale-95',
                  !isPushToTalkMode && 'bg-muted/40 hover:bg-muted/60',
                )}
                onClick={togglePushToTalkMode}
              >
                <Radio className="w-[18px] h-[18px]" />
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
                className="flex-1 h-10 rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all active:scale-95"
                onClick={onDisconnect}
              >
                <PhoneOff className="w-[18px] h-[18px]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Déconnexion</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
