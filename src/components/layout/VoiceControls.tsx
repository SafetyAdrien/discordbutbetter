import { cn } from '@/lib/utils';
import { Mic, MicOff, Headphones, HeadphoneOff, PhoneOff, AlertTriangle, Radio, ChevronDown, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

  const [audioInputDevices, setAudioInputDevices] = useState<MediaDevice[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDevice[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDevice[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('');
  const [selectedVideo, setSelectedVideo] = useState<string>('');

  // Fetch available devices
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        setAudioInputDevices(
          devices
            .filter(d => d.kind === 'audioinput')
            .map(d => ({ deviceId: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 5)}` }))
        );
        
        setAudioOutputDevices(
          devices
            .filter(d => d.kind === 'audiooutput')
            .map(d => ({ deviceId: d.deviceId, label: d.label || `Haut-parleur ${d.deviceId.slice(0, 5)}` }))
        );
        
        setVideoDevices(
          devices
            .filter(d => d.kind === 'videoinput')
            .map(d => ({ deviceId: d.deviceId, label: d.label || `Caméra ${d.deviceId.slice(0, 5)}` }))
        );
      } catch (err) {
        console.error('Failed to enumerate devices:', err);
      }
    };

    fetchDevices();
    
    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', fetchDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', fetchDevices);
    };
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
          {/* Microphone Button Group */}
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
            
            <Popover>
              <PopoverTrigger asChild>
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
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-2">
                <p className="text-xs font-medium text-muted-foreground mb-2">Périphérique d'entrée</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {audioInputDevices.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 py-1">Aucun périphérique</p>
                  ) : (
                    audioInputDevices.map(device => (
                      <button
                        key={device.deviceId}
                        onClick={() => setSelectedAudioInput(device.deviceId)}
                        className={cn(
                          "w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors",
                          selectedAudioInput === device.deviceId && "bg-primary/20 text-primary"
                        )}
                      >
                        <span className="truncate block">{device.label}</span>
                      </button>
                    ))
                  )}
                </div>
                
                <div className="border-t border-border mt-2 pt-2">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Périphérique de sortie</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {audioOutputDevices.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-2 py-1">Aucun périphérique</p>
                    ) : (
                      audioOutputDevices.map(device => (
                        <button
                          key={device.deviceId}
                          onClick={() => setSelectedAudioOutput(device.deviceId)}
                          className={cn(
                            "w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors",
                            selectedAudioOutput === device.deviceId && "bg-primary/20 text-primary"
                          )}
                        >
                          <span className="truncate block">{device.label}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Camera Button Group */}
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 rounded-r-none"
                >
                  <Video className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Activer la caméra</TooltipContent>
            </Tooltip>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-1 rounded-l-none border-l border-border/50"
                >
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-2">
                <p className="text-xs font-medium text-muted-foreground mb-2">Caméra</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {videoDevices.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 py-1">Aucune caméra</p>
                  ) : (
                    videoDevices.map(device => (
                      <button
                        key={device.deviceId}
                        onClick={() => setSelectedVideo(device.deviceId)}
                        className={cn(
                          "w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors",
                          selectedVideo === device.deviceId && "bg-primary/20 text-primary"
                        )}
                      >
                        <span className="truncate block">{device.label}</span>
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Headphones */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={isDeafened ? 'destructive' : 'ghost'}
                className={cn(
                  'h-8 px-2',
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