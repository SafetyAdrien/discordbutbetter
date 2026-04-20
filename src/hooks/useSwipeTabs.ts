import { useRef, useCallback } from 'react';
import { haptics } from '@/lib/haptics';

interface SwipeTabsOptions {
  currentIndex: number;
  tabCount: number;
  onSwipe: (newIndex: number) => void;
  threshold?: number;
  edgeGuard?: number;
}

function isInteractiveTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  // Walk up to find data-swipe-ignore
  let node: HTMLElement | null = el;
  while (node) {
    if (node.dataset?.swipeIgnore === 'true') return true;
    node = node.parentElement;
  }
  return false;
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
  const lastDxRef = useRef(0);
  const lockedRef = useRef<'horizontal' | 'vertical' | null>(null);
  const trackingRef = useRef(false);

  const reset = useCallback(() => {
    startXRef.current = null;
    startYRef.current = null;
    lastDxRef.current = 0;
    lockedRef.current = null;
    trackingRef.current = false;
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Multi-touch guard
    if (e.touches.length !== 1) { reset(); return; }
    const touch = e.touches[0];
    // Edge guard (swipe-back zone)
    if (touch.clientX <= edgeGuard) return;
    // Interactive element guard
    if (isInteractiveTarget(e.target)) return;

    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    lastDxRef.current = 0;
    lockedRef.current = null;
    trackingRef.current = true;
  }, [edgeGuard, reset]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!trackingRef.current || startXRef.current === null || startYRef.current === null) return;
    // Multi-touch cancel
    if (e.touches.length !== 1) { reset(); return; }

    const touch = e.touches[0];
    const dx = touch.clientX - startXRef.current;
    const dy = Math.abs(touch.clientY - startYRef.current);
    const absDx = Math.abs(dx);

    // Lock direction after 10px movement
    if (lockedRef.current === null && (absDx > 10 || dy > 10)) {
      // Require horizontal to clearly dominate (1.25x ratio)
      lockedRef.current = absDx > dy * 1.25 ? 'horizontal' : 'vertical';
    }

    if (lockedRef.current !== 'horizontal') return;

    lastDxRef.current = dx;
  }, [reset]);

  const onTouchEnd = useCallback(() => {
    if (!trackingRef.current) return;
    const dx = lastDxRef.current;

    if (lockedRef.current === 'horizontal' && Math.abs(dx) > threshold) {
      if (dx < 0 && currentIndex < tabCount - 1) {
        haptics.selection();
        onSwipe(currentIndex + 1);
      } else if (dx > 0 && currentIndex > 0) {
        haptics.selection();
        onSwipe(currentIndex - 1);
      }
    }

    reset();
  }, [threshold, currentIndex, tabCount, onSwipe, reset]);

  const onTouchCancel = useCallback(() => {
    reset();
  }, [reset]);

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel };
}
