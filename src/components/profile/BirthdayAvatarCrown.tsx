import { cn } from '@/lib/utils';

interface BirthdayAvatarCrownProps {
  /** Size tier — the crown scales with the avatar. */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const CAKE_SIZE: Record<NonNullable<BirthdayAvatarCrownProps['size']>, string> = {
  xs: 'text-[9px] -bottom-0.5 -right-0.5',
  sm: 'text-[11px] -bottom-0.5 -right-0.5',
  md: 'text-sm -bottom-1 -right-1',
  lg: 'text-lg -bottom-1 -right-1',
};

/**
 * Golden animated ring + 🎂 emoji overlay for a user whose public birthday is today.
 * Must be placed as a sibling absolute overlay inside a `relative` avatar wrapper.
 */
export function BirthdayAvatarCrown({ size = 'sm', className }: BirthdayAvatarCrownProps) {
  return (
    <>
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-[-3px] rounded-full',
          'bg-[conic-gradient(from_0deg,#f5b301,#ffd54a,#ff9500,#f5b301)]',
          'animate-[spin_8s_linear_infinite]',
          'opacity-90',
          className,
        )}
        style={{
          WebkitMask:
            'radial-gradient(circle, transparent calc(50% - 3px), #000 calc(50% - 2px))',
          mask: 'radial-gradient(circle, transparent calc(50% - 3px), #000 calc(50% - 2px))',
        }}
      />
      <span
        aria-label="Birthday"
        className={cn(
          'pointer-events-none absolute leading-none select-none drop-shadow-md z-10',
          CAKE_SIZE[size],
        )}
      >
        🎂
      </span>
    </>
  );
}
