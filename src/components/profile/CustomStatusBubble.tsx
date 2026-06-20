import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomStatusBubbleProps {
  customStatus?: string | null;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  /** Show "Quoi de neuf ?" placeholder when there is no status (own profile). */
  showPlaceholder?: boolean;
  className?: string;
}

/**
 * Unified custom status bubble used across all profile views (mobile, desktop, DM, server).
 * Mirrors the mobile profile design: a pill with two small detached "speech" bubbles on the
 * top-left corner, an optional "+" icon, and italic text.
 */
export function CustomStatusBubble({
  customStatus,
  onClick,
  size = 'md',
  showPlaceholder = false,
  className,
}: CustomStatusBubbleProps) {
  if (!customStatus && !showPlaceholder) return null;

  const sizeClasses = {
    sm: {
      pill: 'pl-1.5 pr-2.5 py-1 min-h-[28px] gap-1.5',
      smallBubble: '-left-2 -top-3 w-2.5 h-2.5',
      tinyBubble: 'left-1 -top-1 w-2.5 h-2.5',
      icon: 'w-4 h-4',
      plus: 'w-3 h-3',
      text: 'text-xs',
      maxW: 'max-w-[200px]',
    },
    md: {
      pill: 'pl-2 pr-3 py-1.5 min-h-[34px] gap-2',
      smallBubble: '-left-2.5 -top-4 w-3 h-3',
      tinyBubble: 'left-1.5 -top-1.5 w-3 h-3',
      icon: 'w-[18px] h-[18px]',
      plus: 'w-3.5 h-3.5',
      text: 'text-sm',
      maxW: 'max-w-[220px]',
    },
    lg: {
      pill: 'pl-2 pr-4 py-2 min-h-[40px] gap-2 mr-3',
      smallBubble: '-left-3 -top-5 w-4 h-4',
      tinyBubble: 'left-2 -top-2 w-4 h-4',
      icon: 'w-5 h-5',
      plus: 'w-[18px] h-[18px]',
      text: 'text-base',
      maxW: '',
    },
  }[size];

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-label={onClick ? 'Modifier le statut personnalisé' : undefined}
      className={cn(
        'relative inline-flex items-center text-left rounded-full shadow-md',
        'bg-[hsl(220_8%_18%)]',
        onClick && 'hover:bg-[hsl(220_8%_22%)] active:bg-[hsl(220_8%_22%)] transition-colors cursor-pointer',
        sizeClasses.pill,
        sizeClasses.maxW,
        className
      )}
    >
      {/* Mini detached bubble (top-left, far) */}
      <span
        aria-hidden
        className={cn('absolute rounded-full bg-[hsl(220_8%_18%)] shadow', sizeClasses.smallBubble)}
      />
      {/* Small bubble fused into the top-left of the main pill */}
      <span
        aria-hidden
        className={cn('absolute rounded-[3px_50%_50%_50%] bg-[hsl(220_8%_18%)]', sizeClasses.tinyBubble)}
      />

      {showPlaceholder && !customStatus && (
        <span className={cn('shrink-0 text-foreground flex items-center justify-center', sizeClasses.icon)}>
          <Plus className={sizeClasses.plus} strokeWidth={2.25} />
        </span>
      )}

      <span
        className={cn(
          'italic whitespace-nowrap truncate',
          sizeClasses.text,
          customStatus ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        {customStatus || 'Quoi de neuf ?'}
      </span>
    </Component>
  );
}
