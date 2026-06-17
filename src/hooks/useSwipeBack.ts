import { useRef, useCallback } from 'react';
import { haptics } from '@/lib/haptics';

interface SwipeBackOptions {
  onBack: () => void;
  threshold?: number;
  /** Width of the activation zone from the chosen edge. Default 40. */
  edgeWidth?: number;
  /**
   * Which edge initiates the gesture:
   * - 'right' (default): swipe from the right edge towards the left → back
   * - 'left': iOS-style swipe from the left edge towards the right → back
   */
  edge?: 'left' | 'right';
}

export function useSwipeBack({
  onBack,
  threshold = 80,
  edgeWidth = 40,
  edge = 'right',
}: SwipeBackOptions) {
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const currentDxRef = useRef(0);
  const isSwipingRef = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const w = typeof window !== 'undefined' ? window.innerWidth : 0;
    const fromRightEdge = edge === 'right' && touch.clientX >= w - edgeWidth;
    const fromLeftEdge = edge === 'left' && touch.clientX <= edgeWidth;
    if (fromRightEdge || fromLeftEdge) {
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      isSwipingRef.current = false;
      currentDxRef.current = 0;
    }
  }, [edge, edgeWidth]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startXRef.current === null || startYRef.current === null) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startXRef.current;
    const absDx = Math.abs(dx);
    const dy = Math.abs(touch.clientY - startYRef.current);

    // Direction must match the configured edge.
    const directional = edge === 'right' ? dx < -10 : dx > 10;
    if (directional && absDx > dy * 1.5) {
      isSwipingRef.current = true;
      currentDxRef.current = absDx;
    }
  }, [edge]);

  const onTouchEnd = useCallback(() => {
    if (isSwipingRef.current && currentDxRef.current > threshold) {
      haptics.light();
      onBack();
    }
    startXRef.current = null;
    startYRef.current = null;
    currentDxRef.current = 0;
    isSwipingRef.current = false;
  }, [onBack, threshold]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
