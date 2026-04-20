import { ReactNode, useCallback } from 'react';
import { Reply } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSwipeToReply } from '@/hooks/useSwipeToReply';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface SwipeToReplyRowProps {
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
export function SwipeToReplyRow({
  enabled,
  onReply,
  onDoubleTap,
  className,
  children,
}: SwipeToReplyRowProps) {
  const reduced = useReducedMotion();
  const handleReply = useCallback(() => onReply(), [onReply]);
  const swipe = useSwipeToReply({ onReply: handleReply, disabled: !enabled });
  const dbl = useDoubleTap({ onDoubleTap: onDoubleTap ?? (() => {}), disabled: !enabled || !onDoubleTap });

  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  // Compose touch handlers: swipe owns start/move/cancel; both listen to end.
  const onTouchEnd = (e: React.TouchEvent) => {
    swipe.handlers.onTouchEnd();
    dbl.onTouchEnd(e);
  };

  return (
    <div
      className={cn('relative touch-pan-y select-none', className)}
      role="group"
      aria-roledescription="Glisser à droite pour répondre"
      onTouchStart={swipe.handlers.onTouchStart}
      onTouchMove={swipe.handlers.onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={swipe.handlers.onTouchCancel}
    >
      {/* Reveal indicator behind the row */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
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
}
