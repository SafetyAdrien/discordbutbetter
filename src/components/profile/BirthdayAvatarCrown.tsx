import { Gift } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BirthdayAvatarCrownProps {
  className?: string;
  /** Rendered diameter of the parent avatar in px. Drives ring thickness & icon size. */
  avatarSizePx?: number;
}

/**
 * Golden animated ring + red Gift icon anchored at 12 o'clock on the ring path,
 * shown around the avatar of a user whose public birthday is today.
 * Sizes scale proportionally with `avatarSizePx` so the effect looks right on
 * both tiny (24px) and large (96px+) avatars.
 */
export function BirthdayAvatarCrown({ className, avatarSizePx = 40 }: BirthdayAvatarCrownProps) {
  const ringThickness = Math.max(1, Math.round(avatarSizePx * 0.035 * 10) / 10);
  const offset = Math.max(1, Math.round(avatarSizePx * 0.025));
  const iconSize = Math.max(6, Math.round(avatarSizePx * 0.16));
  const iconTop = -Math.round(iconSize * 0.55);
  const maskOuter = ringThickness * 1.5;
  const maskInner = ringThickness * 0.5;

  return (
    <>
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute rounded-full',
          'bg-[conic-gradient(from_0deg,#f5b301,#ffd54a,#ff9500,#f5b301)]',
          'animate-[spin_12s_linear_infinite]',
          className,
        )}
        style={{
          inset: `-${offset}px`,
          WebkitMask: `radial-gradient(circle, transparent calc(50% - ${maskOuter}px), #000 calc(50% - ${maskInner}px))`,
          mask: `radial-gradient(circle, transparent calc(50% - ${maskOuter}px), #000 calc(50% - ${maskInner}px))`,
        }}
      />
      <span
        aria-label="Birthday"
        className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 leading-none drop-shadow-[0_0_2px_rgba(239,68,68,0.55)]"
        style={{ top: `${iconTop}px` }}
      >
        <Gift
          size={iconSize}
          className="text-[#ef4444]"
          fill="currentColor"
          strokeWidth={1.25}
        />
      </span>
    </>
  );
}
