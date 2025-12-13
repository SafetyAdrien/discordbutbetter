import { cn } from '@/lib/utils';
import { Mic, MicOff, Headphones, HeadphoneOff, PhoneOff, AlertTriangle, Radio, ChevronDown, Video, VideoOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { useVoice } from '@/contexts/VoiceContext';
import { VoiceConnectionIndicator } from '@/components/channels/voice/VoiceConnectionIndicator';
import { useState, useEffect } from 'react';

interface VoiceControlsProps {
  channelName: string;
  serverName: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onDisconnect: () => void;
}

interface MediaDevice {
  deviceId: string;
  label: string;
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

  const [audioInputs, setAudioInputs] = useState<MediaDevice[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDevice[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDevice[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('default');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('default');
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>('default');
  const [isCameraOn, setIsCameraOn] = useState(false);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioInputs(devices.filter(d => d.kind === 'audioinput').map(d => ({ deviceId: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 4)}` })));
        setAudioOutputs(devices.filter(d => d.kind === 'audiooutput').map(d => ({ deviceId: d.deviceId, label: d.label || `Sortie ${d.deviceId.slice(0, 4)}` })));
        setVideoInputs(devices.filter(d => d.kind === 'videoinput').map(d => ({ deviceId: d.deviceId, label: d.label || `Caméra ${d.deviceId.slice(0, 4)}` })));
      } catch (e) {
        console.error('Failed to enumerate devices', e);
      }
    };
    loadDevices();
    navigator.mediaDevices.addEventListener('devicechange', loadDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
  }, []);

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

      {/* Controls */}
      <div className="flex items-center gap-1">
        <TooltipProvider>
          {/* Mic Button with Dropdown */}
          <div className="flex flex-1">
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
                    'h-8 px-1 rounded-l-none border-l border-border/50',
                    isMuted && 'bg-destructive/20 hover:bg-destructive/30 text-destructive'
                  )}
                >
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Périphérique d'entrée</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {audioInputs.length > 0 ? audioInputs.map(device => (
                  <DropdownMenuItem 
                    key={device.deviceId}
                    onClick={() => setSelectedAudioInput(device.deviceId)}
                    className={cn(selectedAudioInput === device.deviceId && 'bg-primary/20')}
                  >
                    <span className="truncate">{device.label}</span>
                  </DropdownMenuItem>
                )) : (
                  <DropdownMenuItem disabled>Aucun périphérique</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Headphones Button with Dropdown */}
          <div className="flex flex-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={isDeafened ? 'destructive' : 'ghost'}
                  className={cn(
                    'flex-1 h-8 rounded-r-none',
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
                    'h-8 px-1 rounded-l-none border-l border-border/50',
                    isDeafened && 'bg-destructive/20 hover:bg-destructive/30 text-destructive'
                  )}
                >
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Périphérique de sortie</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {audioOutputs.length > 0 ? audioOutputs.map(device => (
                  <DropdownMenuItem 
                    key={device.deviceId}
                    onClick={() => setSelectedAudioOutput(device.deviceId)}
                    className={cn(selectedAudioOutput === device.deviceId && 'bg-primary/20')}
                  >
                    <span className="truncate">{device.label}</span>
                  </DropdownMenuItem>
                )) : (
                  <DropdownMenuItem disabled>Aucun périphérique</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Camera Button with Dropdown */}
          <div className="flex flex-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={isCameraOn ? 'secondary' : 'ghost'}
                  className="flex-1 h-8 rounded-r-none"
                  onClick={() => setIsCameraOn(!isCameraOn)}
                >
                  {isCameraOn ? (
                    <Video className="w-4 h-4" />
                  ) : (
                    <VideoOff className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isCameraOn ? 'Désactiver la caméra' : 'Activer la caméra'}
              </TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant={isCameraOn ? 'secondary' : 'ghost'}
                  className="h-8 px-1 rounded-l-none border-l border-border/50"
                >
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Caméra</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {videoInputs.length > 0 ? videoInputs.map(device => (
                  <DropdownMenuItem 
                    key={device.deviceId}
                    onClick={() => setSelectedVideoInput(device.deviceId)}
                    className={cn(selectedVideoInput === device.deviceId && 'bg-primary/20')}
                  >
                    <span className="truncate">{device.label}</span>
                  </DropdownMenuItem>
                )) : (
                  <DropdownMenuItem disabled>Aucune caméra</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* PTT Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={isPushToTalkMode ? 'secondary' : 'ghost'}
                className="h-8 px-2"
                onClick={togglePushToTalkMode}
              >
                <Radio className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isPushToTalkMode ? 'Désactiver Push-to-Talk' : 'Activer Push-to-Talk'}
            </TooltipContent>
          </Tooltip>

          {/* Disconnect */}
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
