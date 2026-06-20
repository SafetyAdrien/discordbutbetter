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

  // Unified visual identity across all profile views.
  // Only the text size and max-width adapt to the surface.
  const sizeClasses = {
    sm: { text: 'text-xs', maxW: 'max-w-[200px]' },
    md: { text: 'text-sm', maxW: 'max-w-[220px]' },
    lg: { text: 'text-base', maxW: '' },
  }[size];

  const shared = {
    pill: 'pl-2 pr-3 py-1.5 min-h-[32px] gap-2',
    smallBubble: '-left-2.5 -top-3.5 w-3 h-3',
    tinyBubble: 'left-1.5 -top-1.5 w-3 h-3',
    icon: 'w-[18px] h-[18px]',
    plus: 'w-3.5 h-3.5',
  };

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
        shared.pill,
        sizeClasses.maxW,
        className
      )}
    >
      {/* Mini detached bubble (top-left, far) */}
      <span
        aria-hidden
        className={cn('absolute rounded-full bg-[hsl(220_8%_18%)] shadow', shared.smallBubble)}
      />
      {/* Small bubble fused into the top-left of the main pill */}
      <span
        aria-hidden
        className={cn('absolute rounded-[3px_50%_50%_50%] bg-[hsl(220_8%_18%)]', shared.tinyBubble)}
      />

      {showPlaceholder && !customStatus && (
        <span className={cn('shrink-0 text-foreground flex items-center justify-center', shared.icon)}>
          <Plus className={shared.plus} strokeWidth={2.25} />
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
