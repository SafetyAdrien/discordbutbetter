import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobilePullIndicatorProps {
  pullDistance: number;
  progress: number;
  refreshing: boolean;
  threshold?: number;
}

/**
 * Material-style pull-to-refresh indicator.
 * Sits absolutely above content; parent must be `relative`.
 */
export function MobilePullIndicator({
  pullDistance,
  progress,
  refreshing,
  threshold = 70,
}: MobilePullIndicatorProps) {
  const visible = pullDistance > 4 || refreshing;
  const translateY = refreshing ? threshold * 0.6 : pullDistance * 0.6;
  const scale = 0.6 + 0.4 * progress;

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        'pointer-events-none absolute top-0 left-1/2 z-30 -translate-x-1/2 transition-opacity',
        visible ? 'opacity-100' : 'opacity-0',
      )}
      style={{
        transform: `translate(-50%, ${translateY - 24}px)`,
      }}
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--surface-3))] shadow-md"
        style={{ transform: `scale(${scale})` }}
        role="status"
        aria-busy={refreshing || undefined}
      >
        <Loader2
          className={cn(
            'h-4 w-4 text-foreground',
            refreshing ? 'animate-spin' : '',
          )}
          style={{
            transform: refreshing ? undefined : `rotate(${progress * 270}deg)`,
            transition: refreshing ? undefined : 'transform 80ms linear',
          }}
        />
      </div>
    </div>
  );
}
