import React, { createContext, useContext, useRef } from "react";

// ============================================================================
// dnd-kit → react-dnd compatibility shim
// Provides the @dnd-kit API surface used by the codebase, backed by react-dnd.
// ============================================================================

export type UniqueIdentifier = string | number;

export interface ActiveLike {
  id: UniqueIdentifier;
  data: { current: any };
}

export interface OverLike {
  id: UniqueIdentifier;
  rect: DOMRect | null;
}

export interface ActivatorEventLike {
  clientX: number;
  clientY: number;
}

export interface DragStartEvent {
  active: ActiveLike;
}
export interface DragOverEvent {
  active: ActiveLike;
  over: OverLike | null;
  delta: { x: number; y: number };
  activatorEvent: ActivatorEventLike | null;
}
export interface DragEndEvent extends DragOverEvent {}
export type CollisionDetection = (...args: any[]) => any;

export interface DndHandlers {
  onDragStart?: (event: DragStartEvent) => void;
  onDragOver?: (event: DragOverEvent) => void;
  onDragEnd?: (event: DragEndEvent) => void;
  onDragCancel?: (event?: DragStartEvent) => void;
}

export interface DndSharedState {
  activatorEvent: ActivatorEventLike | null;
  lastOverId: UniqueIdentifier | null;
  nodes: Map<UniqueIdentifier, HTMLElement>;
  activeId: UniqueIdentifier | null;
  activeData: any;
}

interface DndShimContextValue {
  handlersRef: React.MutableRefObject<DndHandlers>;
  state: DndSharedState;
}

const DndShimContext = createContext<DndShimContextValue | null>(null);

export function useDndShim(): DndShimContextValue {
  // Allow useSortable to live without a wrapping DndContext (no-op handlers).
  const ctx = useContext(DndShimContext);
  if (ctx) return ctx;
  // Stable global fallback — avoids crashes if a SortableItem renders outside.
  return GLOBAL_FALLBACK;
}

const GLOBAL_FALLBACK: DndShimContextValue = {
  handlersRef: { current: {} },
  state: {
    activatorEvent: null,
    lastOverId: null,
    nodes: new Map(),
    activeId: null,
    activeData: null,
  },
};

export interface DndContextProps extends DndHandlers {
  children?: React.ReactNode;
  sensors?: any;
  collisionDetection?: CollisionDetection;
  modifiers?: any[];
}

export function DndContext({
  onDragStart,
  onDragOver,
  onDragEnd,
  onDragCancel,
  children,
}: DndContextProps) {
  const handlersRef = useRef<DndHandlers>({});
  handlersRef.current = { onDragStart, onDragOver, onDragEnd, onDragCancel };

  const stateRef = useRef<DndSharedState>({
    activatorEvent: null,
    lastOverId: null,
    nodes: new Map(),
    activeId: null,
    activeData: null,
  });

  return (
    <DndShimContext.Provider value={{ handlersRef, state: stateRef.current }}>
      {children}
    </DndShimContext.Provider>
  );
}
