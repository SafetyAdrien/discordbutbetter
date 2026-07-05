import { Gift } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BirthdayAvatarCrownProps {
  className?: string;
}

/**
 * Golden animated ring + small Gift icon anchored at 12 o'clock on the ring path,
 * shown around the avatar of a user whose public birthday is today.
 * Must be placed as a sibling absolute overlay inside a `relative overflow-visible`
 * avatar wrapper (as done in `UserAvatarImage`).
 */
export function BirthdayAvatarCrown({ className }: BirthdayAvatarCrownProps) {
  return (
    <>
      {/* Rotating golden ring, ~3px thick, sitting just outside the avatar edge */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-[-4px] rounded-full',
          'bg-[conic-gradient(from_0deg,#f5b301,#ffd54a,#ff9500,#f5b301)]',
          'animate-[spin_8s_linear_infinite]',
          'opacity-95',
          className,
        )}
        style={{
          WebkitMask:
            'radial-gradient(circle, transparent calc(50% - 3px), #000 calc(50% - 2px))',
          mask: 'radial-gradient(circle, transparent calc(50% - 3px), #000 calc(50% - 2px))',
        }}
      />
      {/* Static gift icon pinned on the ring path at 12 o'clock */}
      <span
        aria-label="Birthday"
        className="pointer-events-none absolute left-1/2 top-[-6px] z-10 -translate-x-1/2 leading-none drop-shadow-[0_0_3px_rgba(245,179,1,0.6)]"
      >
        <Gift
          size={12}
          className="text-[#f5b301]"
          fill="currentColor"
          strokeWidth={1.5}
        />
      </span>
    </>
  );
}
