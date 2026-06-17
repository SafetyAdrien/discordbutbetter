import { useRef, useCallback } from 'react';
import { haptics } from '@/lib/haptics';

interface SwipeBackOptions {
  onBack: () => void;
  threshold?: number;
  edgeWidth?: number;
  /**
   * When true, the gesture can start anywhere on screen, not only from the
   * left edge. Useful inside chat/conversation overlays where users expect a
   * full-width left→right swipe to navigate back.
   */
  fullScreen?: boolean;
}

export function useSwipeBack({
  onBack,
  threshold = 100,
  edgeWidth = 30,
  fullScreen = false,
}: SwipeBackOptions) {
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const currentXRef = useRef(0);
  const isSwipingRef = useRef(false);
  const lockedRef = useRef<'horizontal' | 'vertical' | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (fullScreen || touch.clientX <= edgeWidth) {
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      isSwipingRef.current = false;
      lockedRef.current = null;
    }
  }, [edgeWidth, fullScreen]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startXRef.current === null || startYRef.current === null) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startXRef.current;
    const dy = Math.abs(touch.clientY - startYRef.current);
    const absDx = Math.abs(dx);

    // Lock axis on first meaningful movement to preserve vertical scrolling.
    if (lockedRef.current === null && (absDx > 8 || dy > 8)) {
      lockedRef.current = absDx > dy * 1.5 ? 'horizontal' : 'vertical';
    }
    if (lockedRef.current !== 'horizontal') return;

    // Only rightward (left→right) swipe counts as back.
    if (dx > 10) {
      isSwipingRef.current = true;
      currentXRef.current = dx;
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (isSwipingRef.current && currentXRef.current > threshold) {
      haptics.light();
      onBack();
    }
    startXRef.current = null;
    startYRef.current = null;
    currentXRef.current = 0;
    isSwipingRef.current = false;
    lockedRef.current = null;
  }, [onBack, threshold]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
