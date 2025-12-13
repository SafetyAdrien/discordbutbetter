import { cn } from '@/lib/utils';
import { Signal, SignalHigh, SignalLow, SignalMedium, SignalZero } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface ConnectionStats {
  latency: number;           // RTT in ms
  packetLoss: number;        // percentage 0-100
  jitter: number;            // in ms
  bitrate: number;           // kbps
  iceState: RTCIceConnectionState;
  connectionType: string;    // 'relay' | 'srflx' | 'prflx' | 'host'
}

interface VoiceConnectionIndicatorProps {
  stats: ConnectionStats | null;
  className?: string;
}

type QualityLevel = 'excellent' | 'good' | 'poor' | 'critical';

export function VoiceConnectionIndicator({ stats, className }: VoiceConnectionIndicatorProps) {
  if (!stats) {
    return (
      <div className={cn('flex items-center', className)}>
        <Signal className="w-4 h-4 text-muted-foreground animate-pulse" />
      </div>
    );
  }

  // Determine connection quality
  const getQuality = (): QualityLevel => {
    if (stats.latency < 50 && stats.packetLoss < 1) return 'excellent';
    if (stats.latency < 100 && stats.packetLoss < 5) return 'good';
    if (stats.latency < 200 && stats.packetLoss < 10) return 'poor';
    return 'critical';
  };

  const quality = getQuality();

  const qualityConfig = {
    excellent: {
      color: 'text-[hsl(var(--online))]',
      label: 'Excellente',
      icon: SignalHigh,
    },
    good: {
      color: 'text-yellow-500',
      label: 'Bonne',
      icon: SignalMedium,
    },
    poor: {
      color: 'text-orange-500',
      label: 'Faible',
      icon: SignalLow,
    },
    critical: {
      color: 'text-destructive',
      label: 'Critique',
      icon: SignalZero,
    },
  };

  const config = qualityConfig[quality];
  const Icon = config.icon;

  const connectionTypeLabels: Record<string, string> = {
    host: 'Direct',
    srflx: 'STUN',
    prflx: 'Peer reflexive',
    relay: 'Relais (TURN)',
    unknown: 'Inconnu',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center cursor-help', className)}>
            <Icon className={cn('w-4 h-4', config.color)} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="p-3">
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Qualité</span>
              <span className={cn('font-medium', config.color)}>{config.label}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Latence</span>
              <span className="font-medium">{stats.latency}ms</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Perte de paquets</span>
              <span className="font-medium">{stats.packetLoss}%</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Jitter</span>
              <span className="font-medium">{stats.jitter}ms</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Connexion</span>
              <span className="font-medium">{connectionTypeLabels[stats.connectionType] || stats.connectionType}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
