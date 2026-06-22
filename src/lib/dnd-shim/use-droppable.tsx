import { useCallback, useRef } from "react";
import { useDrop } from "react-dnd";
import { useDndShim, UniqueIdentifier } from "./context";

const SORTABLE_TYPE = "sortable-item";

export interface UseDroppableOptions {
  id: UniqueIdentifier;
  data?: any;
  disabled?: boolean;
}

export interface DroppableResult {
  setNodeRef: (el: HTMLElement | null) => void;
  isOver: boolean;
  active: { id: UniqueIdentifier; data: any } | null;
}

/**
 * Drop-only target (no drag). Parity with @dnd-kit/core's `useDroppable`.
 * Integrates with the same SORTABLE_TYPE used by useSortable so a sortable item
 * can be dropped into a plain droppable zone.
 */
export function useDroppable(opts: UseDroppableOptions): DroppableResult {
  const { id, disabled } = opts;
  const ctx = useDndShim();
  const domRef = useRef<HTMLElement | null>(null);

  const [{ isOver, item }, dropRef] = useDrop(
    () => ({
      accept: SORTABLE_TYPE,
      canDrop: () => !disabled,
      hover: (it: any, monitor) => {
        if (disabled) return;
        if (ctx.state.activeId == null) return;
        if (!monitor.isOver({ shallow: true })) return;
        if (it.id === id) return;
        ctx.state.lastOverId = id;
        const overEl = domRef.current;
        const overRect = overEl ? overEl.getBoundingClientRect() : null;
        const initial = monitor.getInitialClientOffset();
        const current = monitor.getClientOffset();
        const delta = {
          x: (current?.x ?? 0) - (initial?.x ?? 0),
          y: (current?.y ?? 0) - (initial?.y ?? 0),
        };
        ctx.handlersRef.current.onDragOver?.({
          active: { id: it.id, data: { current: it.data } },
          over: { id, rect: overRect },
          delta,
          activatorEvent: ctx.state.activatorEvent,
        });
      },
      drop: () => {
        ctx.state.lastOverId = id;
        return { id };
      },
      collect: (monitor) => ({
        isOver: monitor.isOver({ shallow: true }),
        item: monitor.getItem() as any,
      }),
    }),
    [id, disabled],
  );

  const setNodeRef = useCallback(
    (el: HTMLElement | null) => {
      domRef.current = el;
      dropRef(el);
      if (el) ctx.state.nodes.set(id, el);
      else ctx.state.nodes.delete(id);
    },
    [dropRef, id, ctx.state.nodes],
  );

  return {
    setNodeRef,
    isOver,
    active: item ? { id: item.id, data: item.data } : null,
  };
}
