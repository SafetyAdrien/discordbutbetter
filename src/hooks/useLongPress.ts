import { useRef, useCallback } from 'react';
import { haptics } from '@/lib/haptics';

interface UseLongPressOptions {
  onLongPress: () => void;
  /** Final commit delay in ms. Discord-like default is 400ms. */
  delay?: number;
  /** Fire haptic ticks (light at ~60% delay, medium on commit). Default true. */
  hapticFeedback?: boolean;
  /**
   * Distance (in CSS pixels) the finger must travel from the touchstart point
   * before the press is treated as a scroll and cancelled. Defaults to 8 px —
   * large enough to absorb sub-pixel jitter that iOS Safari/Chromium emit on
   * static touches, small enough that any real scroll cancels immediately.
   */
  moveThresholdPx?: number;
}

export function useLongPress({
  onLongPress,
  delay = 400,
  hapticFeedback = true,
  moveThresholdPx = 8,
}: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const start = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      isLongPress.current = false;

      // Record the starting point so `move` can apply a real displacement
      // threshold instead of cancelling on the first sub-pixel jitter event.
      if ('touches' in e && e.touches.length > 0) {
        startPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if ('clientX' in e) {
        startPosRef.current = { x: e.clientX, y: e.clientY };
      } else {
        startPosRef.current = null;
      }

      // Progressive haptic — light tick a bit before commit so the user feels the gesture engage
      if (hapticFeedback) {
        previewTimerRef.current = setTimeout(() => {
          haptics.light();
        }, Math.max(150, Math.floor(delay * 0.6)));
      }
      timerRef.current = setTimeout(() => {
        isLongPress.current = true;
        e.preventDefault?.();
        if (hapticFeedback) haptics.medium();
        onLongPress();
      }, delay);
    },
    [onLongPress, delay, hapticFeedback]
  );

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    startPosRef.current = null;
  }, []);

  const move = useCallback(
    (e?: React.TouchEvent) => {
      // No event = manual cancellation from a parent gesture handler.
      // Preserve the legacy behaviour of "cancel on any move".
      if (!e) {
        clear();
        return;
      }
      const start = startPosRef.current;
      if (!start || !timerRef.current) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (dx * dx + dy * dy > moveThresholdPx * moveThresholdPx) {
        // Movement exceeded the threshold → user is scrolling, not pressing.
        clear();
      }
    },
    [clear, moveThresholdPx]
  );

  return {
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchCancel: clear,
    onTouchMove: move,
    isLongPress,
  };
}
