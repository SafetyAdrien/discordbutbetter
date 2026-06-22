import React from "react";
import { createPortal } from "react-dom";
import { useDragLayer } from "react-dnd";

export interface DragOverlayProps {
  children?: React.ReactNode;
  dropAnimation?: any;
  modifiers?: any[];
}

export function DragOverlay({ children }: DragOverlayProps) {
  const { isDragging, hasItem, currentOffset, initialOffset } = useDragLayer((m) => ({
    isDragging: m.isDragging(),
    hasItem: m.getItem() != null,
    currentOffset: m.getSourceClientOffset(),
    initialOffset: m.getInitialSourceClientOffset(),
  }));

  if (typeof document === "undefined") return null;
  // Defensive: hide as soon as ANY drag-state signal clears, not just isDragging.
  if (!isDragging || !hasItem || !currentOffset || !initialOffset || !children) {
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
