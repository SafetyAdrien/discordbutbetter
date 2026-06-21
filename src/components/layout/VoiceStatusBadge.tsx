import { PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useVoice } from '@/contexts/VoiceContext';
import { VoiceConnectionIndicator } from '@/components/channels/voice/VoiceConnectionIndicator';

interface VoiceStatusBadgeProps {
  channelName: string;
  serverName: string | null;
  onDisconnect: () => void;
}

export function VoiceStatusBadge({ channelName, serverName, onDisconnect }: VoiceStatusBadgeProps) {
  const { connectionStats } = useVoice();

  return (
    <div
      className="mx-2 px-3 py-2 rounded-2xl flex items-center gap-2 bg-[hsl(var(--surface-2))] border border-border/40"
      style={{ boxShadow: 'var(--shadow-elevation-2)' }}
    >
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
  );
}
