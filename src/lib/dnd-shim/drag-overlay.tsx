import React, { useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useDragLayer } from "react-dnd";
import { hideDndOverlay, useDndShim } from "./context";

export interface DragOverlayProps {
  children?: React.ReactNode;
  dropAnimation?: any;
  modifiers?: any[];
}

export function DragOverlay({ children }: DragOverlayProps) {
  const ctx = useDndShim();
  const dndVersion = useSyncExternalStore(
    (listener) => {
      ctx.state.listeners.add(listener);
      return () => ctx.state.listeners.delete(listener);
    },
    () => ctx.state.version,
    () => 0,
  );
  const { isDragging, hasItem, currentOffset, initialOffset } = useDragLayer((m) => ({
    isDragging: m.isDragging(),
    hasItem: m.getItem() != null,
    currentOffset: m.getSourceClientOffset(),
    initialOffset: m.getInitialSourceClientOffset(),
  }));

  const shouldRender = !ctx.state.overlayHidden && ctx.state.activeId != null && isDragging && hasItem && currentOffset && initialOffset && children;

  useLayoutEffect(() => {
    if (shouldRender || typeof document === "undefined") return;
    document.querySelectorAll<HTMLElement>("[data-dnd-overlay-root]").forEach((el) => el.remove());
  }, [shouldRender, dndVersion]);

  useEffect(() => {
    const hide = () => hideDndOverlay(ctx.state);
    const hideEvents = ["pointerup", "pointercancel", "mouseup", "touchend", "touchcancel", "drop", "dragend", "blur"] as const;
    hideEvents.forEach((eventName) => window.addEventListener(eventName, hide, { capture: true, passive: true }));
    return () => {
      hideEvents.forEach((eventName) => window.removeEventListener(eventName, hide, { capture: true }));
    };
  }, [ctx.state]);

  if (typeof document === "undefined") return null;
  // Defensive: hide as soon as ANY drag-state signal clears, not just isDragging.
  if (!shouldRender) {
    return null;
  }

  return createPortal(
    <div
      data-dnd-overlay-root="true"
      style={{
        position: "fixed",
        pointerEvents: "none",
        zIndex: 9999,
        left: 0,
        top: 0,
        transform: `translate3d(${currentOffset.x}px, ${currentOffset.y}px, 0)`,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
