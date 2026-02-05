import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Mic, MicOff, Video, VideoOff, MonitorUp, 
  PhoneOff, MessageSquare, Users, MoreHorizontal,
  ChevronDown
} from 'lucide-react';

interface VoiceActionBarProps {
  isMuted: boolean;
  isDeafened: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  showChat: boolean;
  showMembers: boolean;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onToggleMembers: () => void;
  onDisconnect: () => void;
  hasMicrophoneAccess: boolean;
  // Permission props
  canSpeak?: boolean;
  canVideo?: boolean;
  canStream?: boolean;
}

export function VoiceActionBar({
  isMuted,
  isDeafened,
  isCameraOn,
  isScreenSharing,
  showChat,
  showMembers,
  onToggleMute,
  onToggleDeafen,
  onToggleCamera,
  onToggleScreenShare,
  onToggleChat,
  onToggleMembers,
  onDisconnect,
  hasMicrophoneAccess,
  canSpeak = true,
  canVideo = true,
  canStream = true,
}: VoiceActionBarProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 via-black/30 to-transparent">
      <div className="flex items-center justify-center gap-2">
        <TooltipProvider>
          {/* Group 1: Mic & Camera with dropdowns */}
          <div className="flex items-center bg-[#232428] rounded-lg overflow-hidden">
            {/* Mute Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    'h-11 px-4 rounded-none hover:bg-white/10 active:bg-white/20 transition-colors duration-150',
                    isMuted && 'bg-destructive/20 text-destructive hover:bg-destructive/30 active:bg-destructive/40',
                    (!hasMicrophoneAccess || !canSpeak) && 'opacity-50'
                  )}
                  onClick={onToggleMute}
                  disabled={!hasMicrophoneAccess || !canSpeak}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {!canSpeak ? 'Permission non accordée' : !hasMicrophoneAccess ? 'Microphone non disponible' : isMuted ? 'Activer le micro' : 'Couper le micro'}
              </TooltipContent>
            </Tooltip>

            {/* Divider */}
            <div className="w-px h-6 bg-white/10" />

            {/* Camera Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    'h-11 px-4 rounded-none hover:bg-white/10 active:bg-white/20 transition-colors duration-150',
                    isCameraOn && 'bg-[hsl(var(--online))]/20 text-[hsl(var(--online))] hover:bg-[hsl(var(--online))]/30',
                    !canVideo && 'opacity-50'
                  )}
                  onClick={onToggleCamera}
                  disabled={!canVideo}
                >
                  {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {!canVideo ? 'Permission non accordée' : isCameraOn ? 'Désactiver la caméra' : 'Activer la caméra'}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Group 2: Chat, Members, Screen Share, More */}
          <div className="flex items-center bg-[#232428] rounded-lg overflow-hidden">
            {/* Chat Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    'h-11 px-3 rounded-none hover:bg-white/10 active:bg-white/20 transition-colors duration-150',
                    showChat && 'bg-white/10'
                  )}
                  onClick={onToggleChat}
                >
                  <MessageSquare className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Chat textuel</TooltipContent>
            </Tooltip>

            {/* Members Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    'h-11 px-3 rounded-none hover:bg-white/10 active:bg-white/20 transition-colors duration-150',
                    showMembers && 'bg-white/10'
                  )}
                  onClick={onToggleMembers}
                >
                  <Users className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Membres</TooltipContent>
            </Tooltip>

            {/* Screen Share */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    'h-11 px-3 rounded-none hover:bg-white/10 active:bg-white/20 transition-colors duration-150',
                    isScreenSharing && 'bg-[hsl(var(--online))]/20 text-[hsl(var(--online))] hover:bg-[hsl(var(--online))]/30',
                    !canStream && 'opacity-50'
                  )}
                  onClick={onToggleScreenShare}
                  disabled={!canStream}
                >
                  <MonitorUp className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {!canStream ? 'Permission non accordée' : isScreenSharing ? 'Arrêter le partage' : 'Partager l\'écran'}
              </TooltipContent>
            </Tooltip>

            {/* More Options */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-11 px-3 rounded-none hover:bg-white/10 active:bg-white/20 transition-colors duration-150"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Plus d'options</TooltipContent>
            </Tooltip>
          </div>

          {/* Disconnect Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="h-11 w-11 rounded-full bg-destructive hover:bg-destructive/80 text-destructive-foreground"
                onClick={onDisconnect}
              >
                <PhoneOff className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Déconnexion</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
