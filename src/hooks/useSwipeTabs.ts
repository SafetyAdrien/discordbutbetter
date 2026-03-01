import { useRef, useCallback, useState } from 'react';

interface SwipeTabsOptions {
  currentIndex: number;
  tabCount: number;
  onSwipe: (newIndex: number) => void;
  threshold?: number;
  edgeGuard?: number;
}

export function useSwipeTabs({
  currentIndex,
  tabCount,
  onSwipe,
  threshold = 50,
  edgeGuard = 30,
}: SwipeTabsOptions) {
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const lockedRef = useRef<'horizontal' | 'vertical' | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    // Skip edge zone to avoid conflict with swipe-back
    if (touch.clientX <= edgeGuard) return;
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    lockedRef.current = null;
    setOffsetX(0);
  }, [edgeGuard]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startXRef.current === null || startYRef.current === null) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startXRef.current;
    const dy = Math.abs(touch.clientY - startYRef.current);

    // Lock direction after 10px of movement
    if (lockedRef.current === null && (Math.abs(dx) > 10 || dy > 10)) {
      lockedRef.current = Math.abs(dx) > dy ? 'horizontal' : 'vertical';
    }

    if (lockedRef.current !== 'horizontal') return;

    // Dampen at edges
    const atStart = currentIndex === 0 && dx > 0;
    const atEnd = currentIndex === tabCount - 1 && dx < 0;
    const dampened = (atStart || atEnd) ? dx * 0.3 : dx;

    setOffsetX(dampened);
  }, [currentIndex, tabCount]);

  const onTouchEnd = useCallback(() => {
    if (lockedRef.current === 'horizontal' && Math.abs(offsetX) > threshold) {
      if (offsetX < 0 && currentIndex < tabCount - 1) {
        onSwipe(currentIndex + 1);
      } else if (offsetX > 0 && currentIndex > 0) {
        onSwipe(currentIndex - 1);
      }
    }
    startXRef.current = null;
    startYRef.current = null;
    lockedRef.current = null;
    setOffsetX(0);
  }, [offsetX, threshold, currentIndex, tabCount, onSwipe]);

  return { onTouchStart, onTouchMove, onTouchEnd, offsetX };
}
