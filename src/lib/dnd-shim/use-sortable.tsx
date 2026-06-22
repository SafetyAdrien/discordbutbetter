import { useCallback, useEffect, useMemo, useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import { clearDndSharedState, hideDndOverlay, setDndActiveState, useDndShim, UniqueIdentifier } from "./context";

const SORTABLE_TYPE = "sortable-item";

const activeDragIds = new Set<UniqueIdentifier>();

export interface UseSortableOptions {
  id: UniqueIdentifier;
  data?: any;
  disabled?: boolean;
  transition?: any;
}

export interface SortableResult {
  attributes: Record<string, any>;
  listeners: Record<string, any>;
  setNodeRef: (el: HTMLElement | null) => void;
  setActivatorNodeRef: (el: HTMLElement | null) => void;
  transform: null;
  transition: undefined;
  isDragging: boolean;
  isOver: boolean;
}

function snapshotDelta(monitor: any) {
  const initial = monitor.getInitialClientOffset();
  const current = monitor.getClientOffset();
  return {
    x: (current?.x ?? 0) - (initial?.x ?? 0),
    y: (current?.y ?? 0) - (initial?.y ?? 0),
  };
}

export function useSortable(opts: UseSortableOptions): SortableResult {
  const { id, data, disabled } = opts;
  const ctx = useDndShim();
  const domRef = useRef<HTMLElement | null>(null);

  const dataRef = useRef(data);
  dataRef.current = data;

  const [{ isDragging }, dragRef, previewRef] = useDrag(
    () => ({
      type: SORTABLE_TYPE,
      canDrag: () => !disabled,
      item: (monitor) => {
        clearDndSharedState(ctx.state);
        const initial = monitor.getInitialClientOffset();
        const activatorEvent = {
          clientX: initial?.x ?? 0,
          clientY: initial?.y ?? 0,
        };
        activeDragIds.add(id);
        setDndActiveState(ctx.state, id, dataRef.current, activatorEvent);
        ctx.handlersRef.current.onDragStart?.({
          active: { id, data: { current: dataRef.current } },
        });
        return { id, data: dataRef.current };
      },
      end: (item: any, monitor) => {
        const overId = ctx.state.lastOverId;
        const overEl = overId != null ? ctx.state.nodes.get(overId) : null;
        const overRect = overEl ? overEl.getBoundingClientRect() : null;
        const delta = snapshotDelta(monitor);
        const activatorEvent = ctx.state.activatorEvent;
        const didDrop = monitor.didDrop();

        // Clear shared state FIRST so any re-render the handlers trigger sees a
        // clean slate — prevents the DragOverlay from sticking around.
        activeDragIds.delete(item?.id ?? id);
        hideDndOverlay(ctx.state);

        try {
          if (didDrop && overId != null) {
            ctx.handlersRef.current.onDragEnd?.({
              active: { id: item.id, data: { current: item.data } },
              over: { id: overId, rect: overRect },
              delta,
              activatorEvent,
            });
          } else {
            ctx.handlersRef.current.onDragCancel?.({
              active: { id: item.id, data: { current: item.data } },
            });
          }
        } catch (err) {
          // Swallow handler errors so react-dnd's internal teardown still runs.
          console.error("[dnd-shim] drag-end handler threw:", err);
        }
      },
      isDragging: (monitor) => (monitor.getItem() as any)?.id === id,
      collect: (monitor) => ({
        isDragging: monitor.isDragging() && activeDragIds.has(id) && (monitor.getItem() as any)?.id === id,
      }),
    }),
    [id, disabled],
  );

  useEffect(() => () => {
    activeDragIds.delete(id);
    if (ctx.state.activeId === id) clearDndSharedState(ctx.state);
  }, [ctx.state, id]);

  useEffect(() => {
    const releaseStaleDrag = () => {
      const wasActive = ctx.state.activeId === id || activeDragIds.has(id);
      const activeData = ctx.state.activeData ?? dataRef.current;
      window.setTimeout(() => {
        if (!wasActive || !activeDragIds.has(id)) return;
        const active = { id, data: { current: activeData } };
        activeDragIds.delete(id);
        hideDndOverlay(ctx.state);
        ctx.handlersRef.current.onDragCancel?.({ active });
      }, 0);
    };
    const events = ["pointerup", "pointercancel", "mouseup", "touchend", "touchcancel", "drop", "dragend", "blur"] as const;
    events.forEach((eventName) => window.addEventListener(eventName, releaseStaleDrag, { capture: true, passive: true }));
    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, releaseStaleDrag, { capture: true }));
    };
  }, [ctx.state, id]);

  // rAF-throttled hover dispatch — avoids spamming onDragOver on every mousemove
  const hoverFrameRef = useRef<number | null>(null);
  const pendingHoverRef = useRef<{ item: any; delta: { x: number; y: number } } | null>(null);

  useEffect(() => () => {
    if (hoverFrameRef.current != null) cancelAnimationFrame(hoverFrameRef.current);
  }, []);

  const [{ isOver }, dropRef] = useDrop(
    () => ({
      accept: SORTABLE_TYPE,
      hover: (item: any, monitor) => {
        if (!monitor.isOver({ shallow: true })) return;
        if (item.id === id) return;
        ctx.state.lastOverId = id;
        pendingHoverRef.current = { item, delta: snapshotDelta(monitor) };
        if (hoverFrameRef.current != null) return;
        hoverFrameRef.current = requestAnimationFrame(() => {
          hoverFrameRef.current = null;
          const pending = pendingHoverRef.current;
          pendingHoverRef.current = null;
          if (!pending) return;
          const overEl = domRef.current;
          const overRect = overEl ? overEl.getBoundingClientRect() : null;
          ctx.handlersRef.current.onDragOver?.({
            active: { id: pending.item.id, data: { current: pending.item.data } },
            over: { id, rect: overRect },
            delta: pending.delta,
            activatorEvent: ctx.state.activatorEvent,
          });
        });
      },
      drop: (item: any) => {
        ctx.state.lastOverId = id;
        return { id };
      },
      collect: (monitor) => {
        const item = monitor.getItem() as any;
        return {
          isOver:
            monitor.isOver({ shallow: true }) && item && item.id !== id,
        };
      },
    }),
    [id],
  );

  // Hide native HTML5 drag preview — consumers render their own DragOverlay.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      previewRef(getEmptyImage(), { captureDraggingState: true });
    } catch {
      /* TouchBackend / AccessibleBackend ignore getEmptyImage */
    }
  }, [previewRef]);

  const setActivatorNodeRef = useCallback(
    (el: HTMLElement | null) => {
      dragRef(el);
    },
    [dragRef],
  );

  const setNodeRef = useCallback(
    (el: HTMLElement | null) => {
      domRef.current = el;
      dropRef(el);
      // Also wire drag here so consumers without setActivatorNodeRef still drag.
      dragRef(el);
      if (el) ctx.state.nodes.set(id, el);
      else ctx.state.nodes.delete(id);
    },
    [dragRef, dropRef, id, ctx.state.nodes],
  );

  const attributes = useMemo(
    () => ({
      role: "button",
      "aria-roledescription": "élément triable",
      tabIndex: disabled ? -1 : 0,
    }),
    [disabled],
  );

  const isActivelyDragging = isDragging && activeDragIds.has(id) && ctx.state.activeId === id;

  return {
    attributes,
    listeners: {},
    setNodeRef,
    setActivatorNodeRef,
    transform: null,
    transition: undefined,
    isDragging: isActivelyDragging,
    isOver,
  };
}
