import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useDragLayer } from "react-dnd";

export interface DragOverlayProps {
  children?: React.ReactNode;
  dropAnimation?: any;
  modifiers?: any[];
}

export function DragOverlay({ children }: DragOverlayProps) {
  const [forceHidden, setForceHidden] = useState(false);
  const { isDragging, hasItem, currentOffset, initialOffset } = useDragLayer((m) => ({
    isDragging: m.isDragging(),
    hasItem: m.getItem() != null,
    currentOffset: m.getSourceClientOffset(),
    initialOffset: m.getInitialSourceClientOffset(),
  }));

  useEffect(() => {
    const hide = () => setForceHidden(true);
    const armNextDrag = () => setForceHidden(false);
    const hideEvents = ["pointerup", "mouseup", "touchend", "touchcancel", "drop", "dragend", "blur"] as const;
    const startEvents = ["pointerdown", "mousedown", "touchstart", "dragstart"] as const;
    hideEvents.forEach((eventName) => window.addEventListener(eventName, hide, { capture: true, passive: true }));
    startEvents.forEach((eventName) => window.addEventListener(eventName, armNextDrag, { capture: true, passive: true }));
    return () => {
      hideEvents.forEach((eventName) => window.removeEventListener(eventName, hide, { capture: true }));
      startEvents.forEach((eventName) => window.removeEventListener(eventName, armNextDrag, { capture: true }));
    };
  }, []);

  useEffect(() => {
    if (!isDragging || !hasItem) setForceHidden(false);
  }, [hasItem, isDragging]);

  if (typeof document === "undefined") return null;
  // Defensive: hide as soon as ANY drag-state signal clears, not just isDragging.
  if (forceHidden || !isDragging || !hasItem || !currentOffset || !initialOffset || !children) {
    return null;
  }

  return createPortal(
    <div
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
