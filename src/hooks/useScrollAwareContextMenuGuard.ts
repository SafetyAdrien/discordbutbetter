import { useCallback, useRef } from 'react';

/**
 * Radix `ContextMenu` opens on the native `contextmenu` event. On touch
 * devices that event is synthesized after a long-press, and Radix does NOT
 * apply a movement threshold — so a long press that is actually the start of
 * a scroll opens the menu by mistake.
 *
 * Spread the returned handlers on the **scrollable container** that wraps
 * the Radix triggers. We record the touchstart position, watch touchmove
 * displacement, and intercept the next `contextmenu` event (capture phase)
 * when significant movement happened during the gesture — cancelling the
 * menu open without affecting scroll, taps, or true stationary long-presses.
 */
export function useScrollAwareContextMenuGuard(moveThresholdPx = 10) {
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);
  const lastMovedAtRef = useRef(0);

  const onTouchStartCapture = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    startPosRef.current = { x: t.clientX, y: t.clientY };
    movedRef.current = false;
  }, []);

  const onTouchMoveCapture = useCallback(
    (e: React.TouchEvent) => {
      const start = startPosRef.current;
      const t = e.touches[0];
      if (!start || !t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (dx * dx + dy * dy > moveThresholdPx * moveThresholdPx) {
        movedRef.current = true;
        lastMovedAtRef.current = Date.now();
      }
    },
    [moveThresholdPx]
  );

  const onTouchEndCapture = useCallback(() => {
    // Keep the "moved" flag alive for a brief window so a contextmenu that
    // fires right after touchend still gets swallowed.
    setTimeout(() => {
      movedRef.current = false;
      startPosRef.current = null;
    }, 350);
  }, []);

  const onContextMenuCapture = useCallback((e: React.MouseEvent) => {
    // Only swallow context menus triggered by touch: pointerType isn't
    // available on the MouseEvent, but if a recent touch sequence moved past
    // the threshold (or is still in progress), we know the user was scrolling.
    if (movedRef.current || Date.now() - lastMovedAtRef.current < 350) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  return {
    onTouchStartCapture,
    onTouchMoveCapture,
    onTouchEndCapture,
    onTouchCancelCapture: onTouchEndCapture,
    onContextMenuCapture,
  };
}
