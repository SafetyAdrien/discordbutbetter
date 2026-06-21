import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

type Size = 'xs' | 'sm' | 'md' | 'lg';

interface MentionBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  count: number;
  size?: Size;
  className?: string;
}

/**
 * Discord-style mention badge.
 * - count < 100 → perfect circle (square w==h, rounded-full), shows exact number.
 * - count >= 100 → horizontal pill (h fixed, min-w, padded), shows "99+".
 * Returns null if count <= 0.
 *
 * Stable anchoring: width transitions are smooth and the element does not
 * intercept pointer events so absolutely-positioned overlays never block clicks
 * on the parent (server icon, channel row, etc.). Use `right-0 translate-x-*`
 * on the call-site wrapper to make the badge grow leftward without shifting.
 */
export const MentionBadge = forwardRef<HTMLSpanElement, MentionBadgeProps>(
  ({ count, size = 'md', className, ...rest }, ref) => {
    if (!count || count <= 0) return null;

    const overflow = count >= 100;
    const label = overflow ? '99+' : String(count);

    // Per-size dimensions. Keep w==h when not overflowing → perfect circle.
    const dims: Record<Size, { circle: string; pill: string; text: string }> = {
      xs: {
        circle: 'h-[14px] w-[14px]',
        pill: 'h-[14px] min-w-[22px] px-1',
        text: 'text-[9px]',
      },
      sm: {
        circle: 'h-[18px] w-[18px]',
        pill: 'h-[18px] min-w-[28px] px-1',
        text: 'text-[10px]',
      },
      md: {
        circle: 'h-5 w-5',
        pill: 'h-5 min-w-[30px] px-1.5',
        text: 'text-[11px]',
      },
      lg: {
        circle: 'h-[22px] w-[22px]',
        pill: 'h-[22px] min-w-[34px] px-1.5',
        text: 'text-[11px]',
      },
    };

    const d = dims[size];

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-full font-bold leading-none bg-destructive text-destructive-foreground tabular-nums select-none pointer-events-none whitespace-nowrap origin-center transform-gpu transition-[min-width,width] duration-150 ease-out',
          d.text,
          overflow ? d.pill : d.circle,
          className,
        )}
        aria-label={`${count} mention${count > 1 ? 's' : ''}`}
        {...rest}
      >
        {label}
      </span>
    );
  },
);
MentionBadge.displayName = 'MentionBadge';
