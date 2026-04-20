import { useRef, useCallback } from 'react';
import { haptics } from '@/lib/haptics';

interface UseLongPressOptions {
  onLongPress: () => void;
  delay?: number;
  /** Fire a medium haptic tick when the long-press commits. Default true. */
  hapticFeedback?: boolean;
}

export function useLongPress({ onLongPress, delay = 500, hapticFeedback = true }: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  const start = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      // Prevent context menu on mobile
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
