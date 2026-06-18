import { useId } from 'react';
import { cn } from '@/lib/utils';

export type StatusValue = 'online' | 'idle' | 'dnd' | 'offline' | string | null | undefined;

interface StatusIndicatorProps {
  status: StatusValue;
  className?: string;
  /** Tailwind background class applied to the wrapper so cutouts blend with the surrounding surface. Default: bg-card */
  bgClassName?: string;
}

export function StatusIndicator({ status, className, bgClassName = 'bg-card' }: StatusIndicatorProps) {
  const safe = (status || 'offline') as 'online' | 'idle' | 'dnd' | 'offline';
  const uid = useId().replace(/:/g, '');

  return (
    <span
      className={cn('inline-block rounded-full overflow-hidden', bgClassName, className)}
      aria-hidden="true"
    >
      <svg viewBox="0 0 80 80" width="100%" height="100%" className="block">
        {safe === 'online' && (
          <circle cx="40" cy="40" r="40" fill="#23A559" />
        )}
        {safe === 'idle' && (
          <>
            <mask id={`idle-${uid}`}>
              <circle cx="40" cy="40" r="40" fill="white" />
              <circle cx="20" cy="20" r="30" fill="black" />
            </mask>
            <circle cx="40" cy="40" r="40" fill="#F0B232" mask={`url(#idle-${uid})`} />
          </>
        )}
        {safe === 'dnd' && (
          <>
            <mask id={`dnd-${uid}`}>
              <circle cx="40" cy="40" r="40" fill="white" />
              <rect x="10" y="30" width="60" height="20" rx="10" fill="black" />
            </mask>
            <circle cx="40" cy="40" r="40" fill="#F23F43" mask={`url(#dnd-${uid})`} />
          </>
        )}
        {safe === 'offline' && (
          <>
            <mask id={`off-${uid}`}>
              <circle cx="40" cy="40" r="40" fill="white" />
              <circle cx="40" cy="40" r="20" fill="black" />
            </mask>
            <circle cx="40" cy="40" r="40" fill="#80848E" mask={`url(#off-${uid})`} />
          </>
        )}
      </svg>
    </span>
  );
}
