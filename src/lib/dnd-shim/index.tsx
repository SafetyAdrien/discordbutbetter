// Re-exports for the @dnd-kit compatibility layer
export * from "./context";
export * from "./use-sortable";
export * from "./use-droppable";
export * from "./drag-overlay";

// arrayMove helper (parity with @dnd-kit/sortable)
export function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const result = arr.slice();
  if (from < 0 || from >= result.length) return result;
  const [item] = result.splice(from, 1);
  const clampedTo = Math.max(0, Math.min(to, result.length));
  result.splice(clampedTo, 0, item);
  return result;
}

// No-op placeholders for sensors / strategies / modifiers / collision detection
export const PointerSensor: any = { id: "pointer" };
export const KeyboardSensor: any = { id: "keyboard" };
export const TouchSensor: any = { id: "touch" };
export const MouseSensor: any = { id: "mouse" };

export const useSensor = (sensor: any, _opts?: any) => sensor;
export const useSensors = (...sensors: any[]) => sensors;

export const closestCenter: any = () => [];
export const closestCorners: any = () => [];
export const pointerWithin: any = () => [];
export const rectIntersection: any = () => [];

export const verticalListSortingStrategy: any = "vertical";
export const horizontalListSortingStrategy: any = "horizontal";
export const rectSortingStrategy: any = "rect";
export const sortableKeyboardCoordinates: any = () => ({ x: 0, y: 0 });

export const restrictToVerticalAxis: any = { id: "restrict-vertical" };
export const restrictToHorizontalAxis: any = { id: "restrict-horizontal" };
export const restrictToParentElement: any = { id: "restrict-parent" };
export const restrictToWindowEdges: any = { id: "restrict-window" };

// CSS transform helper (parity with @dnd-kit/utilities)
export const CSS = {
  Transform: {
    toString(transform: { x: number; y: number; scaleX?: number; scaleY?: number } | null | undefined) {
      if (!transform) return undefined;
      const { x = 0, y = 0, scaleX = 1, scaleY = 1 } = transform;
      return `translate3d(${x}px, ${y}px, 0) scaleX(${scaleX}) scaleY(${scaleY})`;
    },
  },
  Translate: {
    toString(t: { x: number; y: number } | null | undefined) {
      if (!t) return undefined;
      return `translate3d(${t.x}px, ${t.y}px, 0)`;
    },
  },
};

// SortableContext: render children. The shim does not care about strategy/items.
import React from "react";
export interface SortableContextProps {
  items?: any[];
  strategy?: any;
  id?: string;
  children?: React.ReactNode;
}
export function SortableContext({ children }: SortableContextProps) {
  return <>{children}</>;
}
