import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, TouchEvent as ReactTouchEvent } from 'react';

export interface TouchReorderState {
  /** Id of the item currently being dragged, or null. */
  activeId: string | null;
  /** Id whose slot the dragged item would take if dropped right now. */
  overId: string | null;
  /** 'before' | 'after' relative to `overId`. */
  position: 'before' | 'after' | null;
}

type TouchEventLike = ReactTouchEvent;
export interface TouchReorderOptions {
  /** Current ordered ids. */
  items: readonly string[];
  /** Called when the order should be committed. */
  onReorder: (fromId: string, toId: string, position: 'before' | 'after') => void;
  /** Milliseconds a touch must be held before a drag starts. */
  longPressDelay?: number;
  /** Movement (px) allowed during the long press before it is cancelled. */
  cancelSlop?: number;
  /** Disable reordering (e.g. missing permission). */
  disabled?: boolean;
}

export interface TouchReorderResult {
  state: TouchReorderState;
  /** Props to spread on the drag handle of each row. */
  handleProps: (id: string) => {
    onTouchStart: (e: TouchEventLike) => void;
    onTouchMove: (e: TouchEventLike) => void;
    onTouchEnd: (e: TouchEventLike) => void;
    onTouchCancel: (e: TouchEventLike) => void;
  };
  /** True when the given row is the one being dragged. */
  isDragging: (id: string) => boolean;
  /** True when the drop indicator belongs to this row. */
  dropIndicator: (id: string) => 'before' | 'after' | null;
  /** Props for the scroll container: stops native scroll while dragging. */
  containerProps: { style: CSSProperties };
}

const EMPTY: TouchReorderState = { activeId: null, overId: null, position: null };

/**
 * Touch-driven reordering, modelled on Discord's mobile channel list.
 *
 * The desktop list uses react-dnd through `src/lib/dnd-shim`, which relies on
 * HTML5 drag events — those do not exist on touch devices. Rather than pull the
 * whole shim onto mobile, this hook implements the interaction directly:
 *
 *  - a long press on a drag handle starts the drag (so a normal tap still
 *    opens the channel),
 *  - while dragging, the item follows the finger vertically,
 *  - the drop position is computed from the midpoints of the sibling rows,
 *    exactly like the desktop list,
 *  - releasing commits the move; leaving the bounds or cancelling discards it.
 *
 * Rows must be registered through `data-reorder-id` so their geometry can be
 * measured.
 */
export function useTouchReorder({
  items,
  onReorder,
  longPressDelay = 260,
  cancelSlop = 10,
  disabled = false,
}: TouchReorderOptions): TouchReorderResult {
  const [state, setState] = useState<TouchReorderState>(EMPTY);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const activeIdRef = useRef<string | null>(null);
  /** Live (unflushed) drag position, read by move/end handlers. */
  const pendingRef = useRef<TouchReorderState>(EMPTY);
  const stateRef = useRef(state);
  stateRef.current = state;

  const commit = useCallback(() => {
    const { activeId, overId, position } = pendingRef.current;
    setState(EMPTY);
    pendingRef.current = EMPTY;
    activeIdRef.current = null;

    if (!activeId || !overId || !position) return;
    if (activeId === overId) return;
    onReorder(activeId, overId, position);
  }, [onReorder]);

  const reset = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    startPointRef.current = null;
    activeIdRef.current = null;
    pendingRef.current = EMPTY;
    setState(EMPTY);
  }, []);

  // Clear any pending timer on unmount.
  useEffect(() => () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  }, []);

  /** Resolve the drop target from the pointer's vertical position. */
  const resolveTarget = useCallback((clientY: number): { overId: string; position: 'before' | 'after' } | null => {
    const list = itemsRef.current;
    if (list.length === 0) return null;

    // Rows are looked up by data attribute so we measure the live DOM.
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>('[data-reorder-id]'),
    ).filter((n) => n.dataset.reorderId);

    let best: { overId: string; position: 'before' | 'after' } | null = null;
    for (const node of nodes) {
      const id = node.dataset.reorderId;
      if (id === activeIdRef.current) continue;
      const rect = node.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (clientY < mid) {
        best = { overId: id, position: 'before' };
        break;
      }
      // Last row passed: drop after it.
      best = { overId: id, position: 'after' };
    }
    return best;
  }, []);

  const handleProps = useCallback(
    (id: string) => ({
      onTouchStart: (e: TouchEventLike) => {
        if (disabled) return;
        const touch = e.touches[0];
        if (!touch) return;
        startPointRef.current = { x: touch.clientX, y: touch.clientY };

        longPressTimerRef.current = setTimeout(() => {
          // Re-read the touch: the finger may have moved during the delay.
          const t = e.touches[0];
          if (!t) return;
          activeIdRef.current = id;
          const next: TouchReorderState = { activeId: id, overId: id, position: 'after' };
          pendingRef.current = next;
          setState(next);
          // Haptic-like feedback where supported.
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try { navigator.vibrate?.(10); } catch { /* ignore */ }
          }
        }, longPressDelay);
      },

      onTouchMove: (e: TouchEventLike) => {
        const touch = e.touches[0];
        if (!touch) return;
        const start = startPointRef.current;

        // Before the drag starts, cancel if the finger scrolled instead.
        if (!activeIdRef.current) {
          if (longPressTimerRef.current && start) {
            const dy = Math.abs(touch.clientY - start.y);
            const dx = Math.abs(touch.clientX - start.x);
            if (dx > cancelSlop || dy > cancelSlop) {
              clearTimeout(longPressTimerRef.current);
              longPressTimerRef.current = null;
            }
          }
          return;
        }

        const target = resolveTarget(touch.clientY);
        const current = pendingRef.current;
        if (!target) {
          if (current.overId || current.position) {
            const next = { activeId: current.activeId, overId: null, position: null };
            pendingRef.current = next;
            setState(next);
          }
          return;
        }
        if (target.overId !== current.overId || target.position !== current.position) {
          const next = { activeId: current.activeId, overId: target.overId, position: target.position };
          pendingRef.current = next;
          setState(next);
        }
      },

      onTouchEnd: () => {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        startPointRef.current = null;
        if (!activeIdRef.current) return;
        commit();
      },

      onTouchCancel: () => reset(),
    }),
    [disabled, longPressDelay, cancelSlop, resolveTarget, commit, reset],
  );

  const isDragging = useCallback((id: string) => state.activeId === id, [state.activeId]);

  const dropIndicator = useCallback(
    (id: string) => (state.overId === id ? state.position : null),
    [state.overId, state.position],
  );

  return {
    state,
    handleProps,
    isDragging,
    dropIndicator,
    // `touch-action: none` while dragging is what stops the browser from
    // hijacking the gesture as a scroll and firing touchcancel underneath us.
    containerProps: { style: { touchAction: state.activeId ? 'none' : undefined } },
  };
}