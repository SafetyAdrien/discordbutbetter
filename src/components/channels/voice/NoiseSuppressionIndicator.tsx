import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ShieldCheck, ShieldOff, Shield } from 'lucide-react';
import type { NoiseSuppressonMode } from '@/utils/webrtc/AudioProcessor';

interface NoiseSuppressionIndicatorProps {
  mode: NoiseSuppressonMode;
  onToggle: () => void;
  available: boolean;
}

const MODE_CONFIG: Record<NoiseSuppressonMode, { icon: typeof Shield; label: string; className: string }> = {
  off: {
    icon: ShieldOff,
    label: 'Krisp désactivé',
    className: 'text-muted-foreground',
  },
  low: {
    icon: Shield,
    label: 'Krisp — Faible',
    className: 'text-primary',
  },
  high: {
    icon: ShieldCheck,
    label: 'Krisp — Fort',
    className: 'text-[hsl(var(--online))]',
  },
};

export function NoiseSuppressionIndicator({ mode, onToggle, available }: NoiseSuppressionIndicatorProps) {
  if (!available) return null;

  const config = MODE_CONFIG[mode];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className={cn('flex-1 h-8', config.className)}
            onClick={onToggle}
          >
            <Icon className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{config.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
