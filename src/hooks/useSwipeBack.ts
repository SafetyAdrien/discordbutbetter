import { useRef, useCallback } from 'react';

interface SwipeBackOptions {
  onBack: () => void;
  threshold?: number;
  edgeWidth?: number;
}

export function useSwipeBack({ onBack, threshold = 100, edgeWidth = 30 }: SwipeBackOptions) {
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const currentXRef = useRef(0);
  const isSwipingRef = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch.clientX <= edgeWidth) {
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      isSwipingRef.current = false;
    }
  }, [edgeWidth]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startXRef.current === null || startYRef.current === null) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startXRef.current;
    const dy = Math.abs(touch.clientY - startYRef.current);
    
    // Only horizontal swipe
    if (dx > 10 && dx > dy * 1.5) {
      isSwipingRef.current = true;
      currentXRef.current = dx;
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (isSwipingRef.current && currentXRef.current > threshold) {
      onBack();
    }
    startXRef.current = null;
    startYRef.current = null;
    currentXRef.current = 0;
    isSwipingRef.current = false;
  }, [onBack, threshold]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
