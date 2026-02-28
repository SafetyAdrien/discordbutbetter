import { cn } from '@/lib/utils';
import { Signal, SignalHigh, SignalLow, SignalMedium, SignalZero } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState, useEffect, useRef } from 'react';

export interface ConnectionStats {
  latency: number;
  packetLoss: number;
  jitter: number;
  bitrate: number;
  iceState: RTCIceConnectionState;
  connectionType: string;
}

interface VoiceConnectionIndicatorProps {
  stats: ConnectionStats | null;
  className?: string;
  onQualityChange?: (quality: QualityLevel | null) => void;
}

export type QualityLevel = 'excellent' | 'good' | 'poor' | 'critical';

const qualityOrder: QualityLevel[] = ['critical', 'poor', 'good', 'excellent'];

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

function getQuality(stats: ConnectionStats): QualityLevel {
  if (stats.latency < 50 && stats.packetLoss < 1) return 'excellent';
  if (stats.latency < 100 && stats.packetLoss < 5) return 'good';
  if (stats.latency < 200 && stats.packetLoss < 10) return 'poor';
  return 'critical';
}

export function VoiceConnectionIndicator({ stats, className, onQualityChange }: VoiceConnectionIndicatorProps) {
  const [animatedQuality, setAnimatedQuality] = useState<QualityLevel | null>(null);
  const isFirstConnection = useRef(true);
  const animationTimers = useRef<NodeJS.Timeout[]>([]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      animationTimers.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (!stats) {
      setAnimatedQuality(null);
      onQualityChange?.(null);
      isFirstConnection.current = true;
      return;
    }

    const targetQuality = getQuality(stats);

    if (isFirstConnection.current) {
      // Progressive entrance animation
      isFirstConnection.current = false;
      animationTimers.current.forEach(clearTimeout);
      animationTimers.current = [];

      const targetIndex = qualityOrder.indexOf(targetQuality);

      qualityOrder.forEach((level, i) => {
        if (i <= targetIndex) {
          const timer = setTimeout(() => {
            setAnimatedQuality(level);
            onQualityChange?.(level);
          }, i * 300);
          animationTimers.current.push(timer);
        }
      });
    } else {
      // Smooth transition for ongoing quality changes
      setAnimatedQuality(targetQuality);
      onQualityChange?.(targetQuality);
    }
  }, [stats, onQualityChange]);

  if (!stats || !animatedQuality) {
    return (
      <div className={cn('flex items-center', className)}>
        <Signal className="w-4 h-4 text-muted-foreground animate-pulse" />
      </div>
    );
  }

  const config = qualityConfig[animatedQuality];
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
            <Icon className={cn('w-4 h-4 transition-colors duration-500 ease-out', config.color)} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="p-3">
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Qualité</span>
              <span className={cn('font-medium transition-colors duration-500', config.color)}>{config.label}</span>
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
