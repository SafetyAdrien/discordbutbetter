import { useCallback, useEffect, useRef, useState } from 'react';
import { haptics } from '@/lib/haptics';
import { useReducedMotion } from './useReducedMotion';

interface UsePullToRefreshOptions {
  onRefresh: () => void | Promise<void>;
  threshold?: number;
  maxPull?: number;
  disabled?: boolean;
}

/**
 * Pull-to-refresh hook (Discord/Material style).
 * Returns ref to attach on the scroll container, current pull distance,
 * a `refreshing` flag and a `progress` value in [0,1].
 */
export function usePullToRefresh<T extends HTMLElement = HTMLDivElement>({
  onRefresh,
  threshold = 70,
  maxPull = 110,
  disabled = false,
}: UsePullToRefreshOptions) {
  const containerRef = useRef<T | null>(null);
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const reducedMotion = useReducedMotion();
  const triggeredRef = useRef(false);

  const onTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || refreshing) return;
      const el = containerRef.current;
      if (!el) return;
      // Only when scrolled to top
      if (el.scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
      triggeredRef.current = false;
    },
    [disabled, refreshing],
  );

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!pulling.current || startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setPullDistance(0);
        return;
      }
      // Damping
      const eased = Math.min(maxPull, Math.pow(dy, 0.85));
      setPullDistance(eased);
      if (!triggeredRef.current && eased >= threshold) {
        triggeredRef.current = true;
        haptics.light();
      }
    },
    [maxPull, threshold],
  );

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    const distance = pullDistance;
    startY.current = null;

    if (distance >= threshold && !refreshing) {
      haptics.medium();
      setRefreshing(true);
      setPullDistance(threshold);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [onRefresh, pullDistance, refreshing, threshold]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || disabled) return;
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [disabled, onTouchEnd, onTouchMove, onTouchStart]);

  const progress = Math.min(1, pullDistance / threshold);

  return {
    containerRef,
    pullDistance,
    progress,
    refreshing,
    reducedMotion,
  };
}
