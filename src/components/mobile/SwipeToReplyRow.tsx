import { ReactNode, forwardRef, useCallback } from 'react';
import { Reply } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSwipeToReply } from '@/hooks/useSwipeToReply';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface SwipeToReplyRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onTouchStart' | 'onTouchMove' | 'onTouchEnd' | 'onTouchCancel'> {
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
 * Renders a soft Reply icon that fades in from the left as the user drags right.
 * Falls back to a transparent passthrough on desktop or when disabled.
 *
 * Composition rules:
 * - Sits *inside* the existing ContextMenuTrigger so long-press/right-click still work.
 * - Wraps the original visual row; the row keeps its own padding and styles.
 * - Honours `prefers-reduced-motion` by killing the transform animation.
 */
export const SwipeToReplyRow = forwardRef<HTMLDivElement, SwipeToReplyRowProps>(function SwipeToReplyRow(
  { enabled, onReply, onDoubleTap, className, children },
  ref,
) {
  const reduced = useReducedMotion();
  const handleReply = useCallback(() => onReply(), [onReply]);
  const swipe = useSwipeToReply({ onReply: handleReply, disabled: !enabled });
  const dbl = useDoubleTap({ onDoubleTap: onDoubleTap ?? (() => {}), disabled: !enabled || !onDoubleTap });

  // IMPORTANT : forwarder la ref dans les deux branches pour que Radix
  // ContextMenuTrigger asChild / Tooltip puissent attacher correctement
  // leurs handlers. Sans ça, le clic-droit Desktop est cassé.
  if (!enabled) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

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
