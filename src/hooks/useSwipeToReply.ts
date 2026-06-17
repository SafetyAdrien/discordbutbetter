import { useRef, useState, useCallback } from 'react';
import { haptics } from '@/lib/haptics';

interface UseSwipeToReplyOptions {
  onReply: () => void;
  /** Distance (px) to commit the reply gesture. Default 64. */
  threshold?: number;
  /** Maximum visual translation (px). Default 90. */
  maxTranslate?: number;
  /** Disable the gesture entirely (e.g. desktop). */
  disabled?: boolean;
}

/**
 * Discord/iMessage-style swipe-to-reply for chat bubbles.
 * Returns touch handlers + the live `translateX` so the caller can render
 * a transform and an icon that fades in based on `progress` (0..1).
 *
 * The gesture only commits on a clear, dominant horizontal rightward swipe.
 * Vertical scrolling is preserved by locking direction after a small movement.
 */
export function useSwipeToReply({
  onReply,
  threshold = 64,
  maxTranslate = 90,
  disabled = false,
}: UseSwipeToReplyOptions) {
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const lockedRef = useRef<'horizontal' | 'vertical' | null>(null);
  const committedRef = useRef(false);
  const [translateX, setTranslateX] = useState(0);

  const reset = useCallback(() => {
    startXRef.current = null;
    startYRef.current = null;
    lockedRef.current = null;
    committedRef.current = false;
    setTranslateX(0);
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || e.touches.length !== 1) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    lockedRef.current = null;
    committedRef.current = false;
  }, [disabled]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || startXRef.current === null || startYRef.current === null) return;
    const dx = e.touches[0].clientX - startXRef.current;
    const dy = Math.abs(e.touches[0].clientY - startYRef.current);
    const absDx = Math.abs(dx);

    if (lockedRef.current === null && (absDx > 8 || dy > 8)) {
      lockedRef.current = absDx > dy * 1.4 ? 'horizontal' : 'vertical';
    }
    if (lockedRef.current !== 'horizontal') return;

    // Only react to rightward swipes; clamp & rubber-band past max.
    const clamped = Math.max(0, Math.min(maxTranslate, dx));
    setTranslateX(clamped);

    // Light haptic tick when the user crosses the commit threshold.
    if (!committedRef.current && clamped >= threshold) {
      committedRef.current = true;
      haptics.selection();
    } else if (committedRef.current && clamped < threshold) {
      committedRef.current = false;
    }
  }, [disabled, threshold, maxTranslate]);

  const onTouchEnd = useCallback(() => {
    if (committedRef.current) {
      haptics.light();
      onReply();
    }
    reset();
  }, [onReply, reset]);

  const onTouchCancel = useCallback(() => {
    reset();
  }, [reset]);

  const progress = Math.min(1, translateX / threshold);

  return {
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel },
    translateX,
    progress,
    isActive: translateX > 0,
  };
}
