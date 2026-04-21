import * as React from 'react';
import { type LucideIcon, type LucideProps } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ICON_SIZE_PX,
  ICON_STROKE_WIDTH,
  FILLABLE_LUCIDE_ICONS,
  type IconSize,
  type IconVariant,
} from '@/lib/icon-config';

export interface IconProps extends Omit<LucideProps, 'size' | 'ref'> {
  /** Lucide icon component (e.g. `Heart`, `Smile`). */
  icon: LucideIcon;
  /** Standardised size token. Default `md` (20px). */
  size?: IconSize;
  /** Visual variant. `filled` paints the SVG with currentColor when supported. */
  variant?: IconVariant;
}

/**
 * Unified icon wrapper. Applies modern, rounded, slightly thicker stroke
 * (matching the project-wide `.lucide` CSS override) and supports a
 * `filled` variant for state icons.
 *
 * Usage:
 *   <Icon icon={Heart} variant="filled" size="md" />
 */
export const Icon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ icon: LucideComp, size = 'md', variant = 'outline', className, strokeWidth, ...rest }, ref) => {
    const px = ICON_SIZE_PX[size];
    const isFillable = FILLABLE_LUCIDE_ICONS.has(LucideComp.displayName ?? '');
    const shouldFill = variant === 'filled' && isFillable;

    return (
      <LucideComp
        ref={ref}
        width={px}
        height={px}
        strokeWidth={strokeWidth ?? ICON_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={shouldFill ? 'currentColor' : 'none'}
        className={cn('shrink-0', className)}
        aria-hidden="true"
        {...rest}
      />
    );
  },
);
Icon.displayName = 'Icon';
