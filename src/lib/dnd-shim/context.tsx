import React, { createContext, useContext, useEffect, useRef } from "react";

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
  overlayHidden: boolean;
  version: number;
  listeners: Set<() => void>;
}

function notifyDndState(state: DndSharedState) {
  state.version += 1;
  state.listeners.forEach((listener) => listener());
}

export function purgeDndArtifacts({ removeOverlay = false } = {}) {
  if (typeof document === "undefined") return;
  if (removeOverlay) {
    document.querySelectorAll<HTMLElement>("[data-dnd-overlay-root]").forEach((el) => el.remove());
    document.querySelectorAll<HTMLElement>('body > div[style*="z-index: 9999"][style*="pointer-events: none"]').forEach((el) => el.remove());
  }
  document.querySelectorAll<HTMLElement>(".drag-previewer").forEach((el) => {
    el.style.display = "none";
    el.innerHTML = "";
    requestAnimationFrame(() => el.remove());
  });
  document.querySelectorAll<HTMLElement>(".dnd-item-dragging").forEach((el) => {
    el.classList.remove("dnd-item-dragging");
  });
  document.querySelectorAll<HTMLElement>('.dnd-drop-indicator-line[data-visible="true"]').forEach((el) => {
    el.setAttribute("data-visible", "false");
  });
}

export function setDndActiveState(
  state: DndSharedState,
  activeId: UniqueIdentifier,
  activeData: any,
  activatorEvent: ActivatorEventLike | null,
) {
  state.activatorEvent = activatorEvent;
  state.lastOverId = null;
  state.activeId = activeId;
  state.activeData = activeData;
  state.overlayHidden = false;
  notifyDndState(state);
}

export function hideDndOverlay(state: DndSharedState) {
  purgeDndArtifacts({ removeOverlay: true });
  const changed = !state.overlayHidden || state.activeId != null || state.activeData != null;
  state.overlayHidden = true;
  state.activeId = null;
  state.activeData = null;
  if (changed) notifyDndState(state);
}

export function clearDndSharedState(state: DndSharedState) {
  purgeDndArtifacts({ removeOverlay: state.activeId != null });
  const changed = state.activeId != null || state.activeData != null || state.lastOverId != null || state.activatorEvent != null || state.overlayHidden;
  state.activatorEvent = null;
  state.lastOverId = null;
  state.activeId = null;
  state.activeData = null;
  state.overlayHidden = true;
  if (changed) notifyDndState(state);
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
    overlayHidden: false,
    version: 0,
    listeners: new Set(),
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
    overlayHidden: false,
    version: 0,
    listeners: new Set(),
  });

  useEffect(() => {
    let cleanupTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleStaleDragCleanup = () => {
      if (cleanupTimer) clearTimeout(cleanupTimer);
      cleanupTimer = setTimeout(() => {
        cleanupTimer = null;
        const state = stateRef.current;
        if (state.activeId == null) return;
        const active = { id: state.activeId, data: { current: state.activeData } };
        hideDndOverlay(state);
        handlersRef.current.onDragCancel?.({ active });
      }, 0);
    };

    const cleanupEvents = ["pointerup", "pointercancel", "mouseup", "touchend", "touchcancel", "dragend", "drop", "blur"] as const;
    cleanupEvents.forEach((eventName) => {
      window.addEventListener(eventName, scheduleStaleDragCleanup, { capture: true, passive: true });
    });
    return () => {
      if (cleanupTimer) clearTimeout(cleanupTimer);
      cleanupEvents.forEach((eventName) => {
        window.removeEventListener(eventName, scheduleStaleDragCleanup, { capture: true });
      });
    };
  }, []);

  return (
    <DndShimContext.Provider value={{ handlersRef, state: stateRef.current }}>
      {children}
    </DndShimContext.Provider>
  );
}
