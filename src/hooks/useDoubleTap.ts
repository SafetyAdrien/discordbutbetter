import { useRef, useCallback } from 'react';
import { haptics } from '@/lib/haptics';

interface UseDoubleTapOptions {
  onDoubleTap: () => void;
  /** Max delay in ms between two taps to count as a double-tap. Default 300. */
  delay?: number;
  /** Max distance in px between two taps to count as a double-tap. Default 24. */
  tolerance?: number;
  /** Disable the gesture. */
  disabled?: boolean;
  /** Fire a light haptic on commit. Default true. */
  hapticFeedback?: boolean;
}

/**
 * Discord-style double-tap gesture for chat bubbles (e.g., quick ❤️ reaction).
 * Returns touch handlers; safe to compose with long-press / swipe handlers.
 */
export function useDoubleTap({
  onDoubleTap,
  delay = 300,
  tolerance = 24,
  disabled = false,
  hapticFeedback = true,
}: UseDoubleTapOptions) {
  const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      const touch = e.changedTouches[0];
      if (!touch) return;
      const now = Date.now();
      const last = lastTapRef.current;
      if (
        last &&
        now - last.t <= delay &&
        Math.abs(touch.clientX - last.x) <= tolerance &&
        Math.abs(touch.clientY - last.y) <= tolerance
      ) {
        lastTapRef.current = null;
        if (hapticFeedback) haptics.light();
        onDoubleTap();
        return;
      }
      lastTapRef.current = { t: now, x: touch.clientX, y: touch.clientY };
    },
    [disabled, delay, tolerance, hapticFeedback, onDoubleTap]
  );

  return { onTouchEnd };
}
