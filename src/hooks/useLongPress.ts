import { useRef, useCallback } from 'react';
import { haptics } from '@/lib/haptics';

interface UseLongPressOptions {
  onLongPress: () => void;
  /** Final commit delay in ms. Discord-like default is 400ms. */
  delay?: number;
  /** Fire haptic ticks (light at ~60% delay, medium on commit). Default true. */
  hapticFeedback?: boolean;
}

export function useLongPress({ onLongPress, delay = 400, hapticFeedback = true }: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  const start = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    isLongPress.current = false;
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
  }, [onLongPress, delay, hapticFeedback]);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  }, []);

  const move = useCallback(() => {
    // Cancel if user moves finger (not a long press)
    clear();
  }, [clear]);

  return {
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: move,
    isLongPress,
  };
}
