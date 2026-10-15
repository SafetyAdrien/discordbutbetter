import { useCallback, useEffect, useMemo, useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import { useDndShim, UniqueIdentifier } from "./context";

const SORTABLE_TYPE = "sortable-item";

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
        const initial = monitor.getInitialClientOffset();
        ctx.state.activatorEvent = {
          clientX: initial?.x ?? 0,
          clientY: initial?.y ?? 0,
        };
        ctx.state.lastOverId = null;
        ctx.state.activeId = id;
        ctx.state.activeData = dataRef.current;
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
        ctx.state.activeId = null;
        ctx.state.activeData = null;
        ctx.state.lastOverId = null;
        ctx.state.activatorEvent = null;
      },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [id, disabled],
  );

  // rAF-throttled hover dispatch — avoids spamming onDragOver on every mousemove
  const hoverFrameRef = useRef<number | null>(null);
  const pendingHoverRef = useRef<{ item: any; overId: UniqueIdentifier; delta: { x: number; y: number } } | null>(null);

  useEffect(() => () => {
    if (hoverFrameRef.current != null) cancelAnimationFrame(hoverFrameRef.current);
  }, []);

  const [{ isOver }, dropRef] = useDrop(
    () => ({
      accept: SORTABLE_TYPE,
      hover: (item: any, monitor) => {
        if (ctx.state.activeId == null) return;
        if (!monitor.isOver({ shallow: true })) return;
        if (item.id === id) return;
        ctx.state.lastOverId = id;
        // Record the hovered id alongside the item. The previous code closed
        // over `id` in the rAF callback, so when A then B were hovered within
        // the same frame, A scheduled the frame, B updated `lastOverId` but
        // returned early — and the frame reported `over: A` while the pointer
        // was actually over B. That made the drop indicator lag one row behind
        // the cursor and appear to move the wrong way.
        pendingHoverRef.current = { item, overId: id, delta: snapshotDelta(monitor) };
        if (hoverFrameRef.current != null) return;
        hoverFrameRef.current = requestAnimationFrame(() => {
          hoverFrameRef.current = null;
          const pending = pendingHoverRef.current;
          pendingHoverRef.current = null;
          if (!pending) return;
          // Drag may have ended between scheduling and executing the frame.
          if (ctx.state.activeId == null) return;
          // Use the element that was actually hovered, not this closure's node.
          const overNode = ctx.state.nodes.get(pending.overId);
          const overRect = overNode ? overNode.getBoundingClientRect() : null;
          ctx.handlersRef.current.onDragOver?.({
            active: { id: pending.item.id, data: { current: pending.item.data } },
            over: { id: pending.overId, rect: overRect },
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

  return {
    attributes,
    listeners: {},
    setNodeRef,
    setActivatorNodeRef,
    transform: null,
    transition: undefined,
    isDragging,
    isOver,
  };
}
