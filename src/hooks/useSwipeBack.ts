import { useRef, useCallback, useState } from 'react';
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
  threshold = 55,
  edgeWidth = 48,
  fullScreen = false,
}: SwipeBackOptions) {
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const currentXRef = useRef(0);
  const isSwipingRef = useRef(false);
  const lockedRef = useRef<'horizontal' | 'vertical' | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const exitAnimationRef = useRef<Animation | null>(null);
  const snapBackAnimationRef = useRef<Animation | null>(null);

  const setRef = useCallback((node: HTMLElement | null) => {
    elementRef.current = node;
  }, []);

  const clearTransform = useCallback(() => {
    if (elementRef.current) {
      elementRef.current.style.transform = '';
    }
  }, []);

  const cancelAnimations = useCallback(() => {
    if (exitAnimationRef.current) {
      try {
        exitAnimationRef.current.cancel();
      } catch {}
      exitAnimationRef.current = null;
    }
    if (snapBackAnimationRef.current) {
      try {
        snapBackAnimationRef.current.cancel();
      } catch {}
      snapBackAnimationRef.current = null;
    }
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (fullScreen || touch.clientX <= edgeWidth) {
      cancelAnimations();
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      currentXRef.current = 0;
      isSwipingRef.current = false;
      lockedRef.current = null;
      clearTransform();
    }
  }, [edgeWidth, fullScreen, clearTransform, cancelAnimations]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startXRef.current === null || startYRef.current === null) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startXRef.current;
    const dy = Math.abs(touch.clientY - startYRef.current);
    const absDx = Math.abs(dx);

    // Lock axis on first meaningful movement to preserve vertical scrolling.
    // More sensitive: lock horizontal as soon as dx clearly leads dy.
    if (lockedRef.current === null && (absDx > 4 || dy > 6)) {
      lockedRef.current = absDx > dy * 1.1 ? 'horizontal' : 'vertical';
      if (lockedRef.current === 'horizontal') {
        setIsDragging(true);
      }
    }
    if (lockedRef.current !== 'horizontal') return;

    // Only rightward (left→right) swipe counts as back.
    if (dx > 0) {
      isSwipingRef.current = true;
      currentXRef.current = dx;
      if (elementRef.current) {
        elementRef.current.style.transform = `translateX(${dx}px)`;
      }
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (isSwipingRef.current && currentXRef.current > threshold) {
      const el = elementRef.current;
      if (el && typeof el.animate === 'function') {
        exitAnimationRef.current = el.animate(
          [
            { transform: `translateX(${currentXRef.current}px)` },
            { transform: 'translateX(100%)' },
          ],
          { duration: 250, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }
        );
        exitAnimationRef.current.onfinish = () => {
          haptics.light();
          onBack();
        };
      } else {
        haptics.light();
        onBack();
      }
    } else {
      const el = elementRef.current;
      if (el && currentXRef.current > 0 && typeof el.animate === 'function') {
        snapBackAnimationRef.current = el.animate(
          [
            { transform: `translateX(${currentXRef.current}px)` },
            { transform: 'translateX(0px)' },
          ],
          { duration: 200, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }
        );
        snapBackAnimationRef.current.onfinish = () => {
          clearTransform();
        };
      } else {
        clearTransform();
      }
    }
    startXRef.current = null;
    startYRef.current = null;
    currentXRef.current = 0;
    isSwipingRef.current = false;
    lockedRef.current = null;
    setIsDragging(false);
  }, [onBack, threshold, clearTransform]);

  return { onTouchStart, onTouchMove, onTouchEnd, setRef, isDragging };
}
