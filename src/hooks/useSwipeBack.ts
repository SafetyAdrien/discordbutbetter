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
  const lockOffsetRef = useRef(0);
  const currentXRef = useRef(0);
  const isSwipingRef = useRef(false);
  const lockedRef = useRef<'horizontal' | 'vertical' | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingXRef = useRef(0);
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
      try { exitAnimationRef.current.cancel(); } catch {}
      exitAnimationRef.current = null;
    }
    if (snapBackAnimationRef.current) {
      try { snapBackAnimationRef.current.cancel(); } catch {}
      snapBackAnimationRef.current = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (fullScreen || touch.clientX <= edgeWidth) {
      cancelAnimations();
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      currentXRef.current = 0;
      lockOffsetRef.current = 0;
      isSwipingRef.current = false;
      lockedRef.current = null;
      clearTransform();
    }
  }, [edgeWidth, fullScreen, clearTransform, cancelAnimations]);

  const flushTransform = useCallback(() => {
    rafRef.current = null;
    if (elementRef.current) {
      elementRef.current.style.transform = `translate3d(${pendingXRef.current}px, 0, 0)`;
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startXRef.current === null || startYRef.current === null) return;
    const touch = e.touches[0];
    const dxRaw = touch.clientX - startXRef.current;
    const dy = Math.abs(touch.clientY - startYRef.current);
    const absDx = Math.abs(dxRaw);

    if (lockedRef.current === null && (absDx > 4 || dy > 6)) {
      lockedRef.current = absDx > dy * 1.1 ? 'horizontal' : 'vertical';
      if (lockedRef.current === 'horizontal') {
        // Anchor at the current finger position to avoid an initial jump
        // equal to the lock threshold.
        lockOffsetRef.current = dxRaw;
        setIsDragging(true);
      }
    }
    if (lockedRef.current !== 'horizontal') return;

    const dx = dxRaw - lockOffsetRef.current;
    if (dx > 0) {
      isSwipingRef.current = true;
      currentXRef.current = dx;
      pendingXRef.current = dx;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(flushTransform);
      }
    } else if (isSwipingRef.current) {
      // Finger moved back past origin — clamp to 0.
      currentXRef.current = 0;
      pendingXRef.current = 0;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(flushTransform);
      }
    }
  }, [flushTransform]);


  const onTouchEnd = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // Ensure final pending value is committed before animating from it.
    if (elementRef.current && isSwipingRef.current) {
      elementRef.current.style.transform = `translate3d(${currentXRef.current}px, 0, 0)`;
    }
    if (isSwipingRef.current && currentXRef.current > threshold) {
      const el = elementRef.current;
      if (el && typeof el.animate === 'function') {
        const fromX = currentXRef.current;
        exitAnimationRef.current = el.animate(
          [
            { transform: `translate3d(${fromX}px, 0, 0)` },
            { transform: 'translate3d(100%, 0, 0)' },
          ],
          { duration: 220, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', fill: 'forwards' }
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
        const fromX = currentXRef.current;
        snapBackAnimationRef.current = el.animate(
          [
            { transform: `translate3d(${fromX}px, 0, 0)` },
            { transform: 'translate3d(0, 0, 0)' },
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
    lockOffsetRef.current = 0;
    isSwipingRef.current = false;
    lockedRef.current = null;
    setIsDragging(false);
  }, [onBack, threshold, clearTransform]);


  return { onTouchStart, onTouchMove, onTouchEnd, setRef, isDragging };
}
