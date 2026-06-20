import { ReactNode, forwardRef, useCallback } from 'react';
import { Reply } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSwipeToReply } from '@/hooks/useSwipeToReply';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface SwipeToReplyRowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether the gesture should be active (mobile only). */
  enabled: boolean;
  onReply: () => void;
  /** Optional double-tap handler — typically a quick reaction (❤️). */
  onDoubleTap?: () => void;
  /** Inline className for the outer wrapper (positioning only). */
  className?: string;
  children: ReactNode;
}

/**
 * Wraps a chat message row with a Discord/iMessage-style swipe-to-reply gesture.
 *
 * Architecture:
 * - Desktop (`enabled=false`) → renders a plain passthrough `<div>` forwarding
 *   the ref and ALL Radix-injected props (onContextMenu, onPointerDown, …).
 *   No mobile hook is mounted, no touch handler, no transform — zero impact.
 * - Mobile (`enabled=true`) → delegates to `<MobileSwipeRow>` which owns the
 *   swipe/double-tap logic and the visual reveal indicator.
 */
export const SwipeToReplyRow = forwardRef<HTMLDivElement, SwipeToReplyRowProps>(function SwipeToReplyRow(
  { enabled, onReply, onDoubleTap, className, children, ...rest },
  ref,
) {
  if (!enabled) {
    // === DESKTOP PATH ===
    // Pure passthrough. Radix `asChild` props (onContextMenu, onPointerDown,
    // onKeyDown…) flow straight through `...rest`. No touch listeners attached.
    return (
      <div ref={ref} className={className} {...rest}>
        {children}
      </div>
    );
  }

  // === MOBILE PATH ===
  return (
    <MobileSwipeRow
      ref={ref}
      onReply={onReply}
      onDoubleTap={onDoubleTap}
      className={className}
      {...rest}
    >
      {children}
    </MobileSwipeRow>
  );
});

// -----------------------------------------------------------------------------
// MobileSwipeRow — isolated mobile-only implementation.
// Hooks here only run when the parent is mounted on mobile/tablet, so desktop
// never pays the cost (no listeners, no re-renders on swipe progress, etc.).
// -----------------------------------------------------------------------------

interface MobileSwipeRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onTouchStart' | 'onTouchMove' | 'onTouchEnd' | 'onTouchCancel'> {
  onReply: () => void;
  onDoubleTap?: () => void;
  className?: string;
  children: ReactNode;
}

const MobileSwipeRow = forwardRef<HTMLDivElement, MobileSwipeRowProps>(function MobileSwipeRow(
  { onReply, onDoubleTap, className, children, ...rest },
  ref,
) {
  const reduced = useReducedMotion();
  const handleReply = useCallback(() => onReply(), [onReply]);
  const swipe = useSwipeToReply({ onReply: handleReply, disabled: false });
  const dbl = useDoubleTap({ onDoubleTap: onDoubleTap ?? (() => {}), disabled: !onDoubleTap });

  // Compose touch handlers: swipe owns start/move/cancel; both listen to end.
  const onTouchEnd = (e: React.TouchEvent) => {
    swipe.handlers.onTouchEnd();
    dbl.onTouchEnd(e);
  };

  return (
    <div
      ref={ref}
      className={cn('relative touch-pan-y select-none', className)}
      role="group"
      aria-roledescription="Glisser vers la gauche pour répondre"
      onTouchStart={swipe.handlers.onTouchStart}
      onTouchMove={swipe.handlers.onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={swipe.handlers.onTouchCancel}
      {...rest}
    >
      {/* Reveal indicator behind the row (right side, iMessage-style) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3"
        style={{ opacity: swipe.progress }}
      >
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-primary/15 text-primary transition-transform',
            swipe.progress >= 1 ? 'scale-110' : 'scale-90'
          )}
          style={{ width: 32, height: 32 }}
        >
          <Reply className="h-4 w-4" />
        </div>
      </div>

      <div
        style={{
          transform: reduced ? undefined : `translate3d(${swipe.translateX}px, 0, 0)`,
          transition: swipe.isActive ? 'none' : 'transform 220ms cubic-bezier(0.2, 0, 0, 1)',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  );
});
