/**
 * react-dnd shim exposing the @dnd-kit API surface used in the project.
 *
 * Backed by:
 *   - react-dnd (core)
 *   - react-dnd-html5-backend  (mouse + native HTML5)
 *   - react-dnd-touch-backend  (touch / long-press)
 *   - react-dnd-accessible-backend  (keyboard + screen reader, Discord)
 *   - react-dnd-multi-backend  (combine all three with transitions)
 *
 * Components remain unchanged (DndContext / SortableContext / useSortable /
 * DragOverlay / arrayMove / CSS.Transform / sensors / modifiers) but every
 * runtime call goes through react-dnd. A single global <DndProvider> wraps
 * <App /> in main.tsx, so every useSortable() invocation works out of the box.
 */

import {
  createContext,
  useContext,
  useRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  DndProvider,
  useDrag,
  useDrop,
  useDragLayer,
} from "react-dnd";
import { HTML5Backend, getEmptyImage } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import { MultiBackend, MouseTransition, TouchTransition } from "react-dnd-multi-backend";
import AccessibleBackend from "react-dnd-accessible-backend";

// =====================================================================
// Global pointer tracking — used to synthesize @dnd-kit's
// `event.activatorEvent` + `event.delta` semantics for hover/end callbacks.
// =====================================================================
type PointerState = { x: number; y: number; startX: number; startY: number };
const pointer: PointerState = { x: 0, y: 0, startX: 0, startY: 0 };

if (typeof window !== "undefined") {
  const move = (e: PointerEvent | MouseEvent) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  };
  const tmove = (e: TouchEvent) => {
    const t = e.touches[0] || e.changedTouches[0];
    if (t) {
      pointer.x = t.clientX;
      pointer.y = t.clientY;
    }
  };
  const down = (e: PointerEvent | MouseEvent) => {
    pointer.startX = e.clientX;
    pointer.startY = e.clientY;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  };
  const tdown = (e: TouchEvent) => {
    const t = e.touches[0];
    if (t) {
      pointer.startX = t.clientX;
      pointer.startY = t.clientY;
      pointer.x = t.clientX;
      pointer.y = t.clientY;
    }
  };
  window.addEventListener("pointermove", move as EventListener, { passive: true, capture: true });
  window.addEventListener("touchmove", tmove as EventListener, { passive: true, capture: true });
  window.addEventListener("pointerdown", down as EventListener, { passive: true, capture: true });
  window.addEventListener("touchstart", tdown as EventListener, { passive: true, capture: true });
}

// =====================================================================
// Public type aliases compatible with @dnd-kit
// =====================================================================
export type UniqueIdentifier = string | number;

export interface DragSyntheticEvent {
  active: { id: UniqueIdentifier; data: { current: any } };
  over: { id: UniqueIdentifier; data: { current: any }; rect: DOMRect | null } | null;
  delta: { x: number; y: number };
  activatorEvent: { clientX: number; clientY: number };
}
export type DragStartEvent = DragSyntheticEvent;
export type DragOverEvent = DragSyntheticEvent;
export type DragEndEvent = DragSyntheticEvent;
export type CollisionDetection = (...args: any[]) => any;

// =====================================================================
// DndContext — per-list event coordinator (does NOT replace react-dnd's
// global DndProvider; that lives in main.tsx).
// =====================================================================
interface DndCoordinator {
  fireStart: (id: string, data: any) => void;
  fireOver: (overId: string | null, overData: any, overRect: DOMRect | null) => void;
  fireEnd: (didDrop: boolean) => void;
  stateRef: React.MutableRefObject<{
    activeId: string | null;
    activeData: any;
    overId: string | null;
    overData: any;
    overRect: DOMRect | null;
  }>;
}

const DndCtx = createContext<DndCoordinator | null>(null);

interface DndContextProps {
  children?: ReactNode;
  onDragStart?: (e: DragStartEvent) => void;
  onDragOver?: (e: DragOverEvent) => void;
  onDragEnd?: (e: DragEndEvent) => void;
  onDragCancel?: () => void;
  // The following props are accepted for API compatibility and ignored:
  sensors?: any;
  collisionDetection?: any;
  modifiers?: any;
  measuring?: any;
}

export function DndContext({
  children,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDragCancel,
}: DndContextProps) {
  const stateRef = useRef({
    activeId: null as string | null,
    activeData: null as any,
    overId: null as string | null,
    overData: null as any,
    overRect: null as DOMRect | null,
  });

  // Stable callbacks-via-ref so memoised value never re-creates.
  const cbRef = useRef({ onDragStart, onDragOver, onDragEnd, onDragCancel });
  cbRef.current = { onDragStart, onDragOver, onDragEnd, onDragCancel };

  const value = useMemo<DndCoordinator>(
    () => ({
      stateRef,
      fireStart: (id, data) => {
        stateRef.current.activeId = id;
        stateRef.current.activeData = data;
        stateRef.current.overId = null;
        stateRef.current.overData = null;
        stateRef.current.overRect = null;
        cbRef.current.onDragStart?.({
          active: { id, data: { current: data } },
          over: null,
          delta: { x: 0, y: 0 },
          activatorEvent: { clientX: pointer.startX, clientY: pointer.startY },
        });
      },
      fireOver: (overId, overData, overRect) => {
        stateRef.current.overId = overId;
        stateRef.current.overData = overData;
        stateRef.current.overRect = overRect;
        const { activeId, activeData } = stateRef.current;
        if (!activeId) return;
        cbRef.current.onDragOver?.({
          active: { id: activeId, data: { current: activeData } },
          over: overId
            ? { id: overId, data: { current: overData }, rect: overRect }
            : null,
          delta: { x: pointer.x - pointer.startX, y: pointer.y - pointer.startY },
          activatorEvent: { clientX: pointer.startX, clientY: pointer.startY },
        });
      },
      fireEnd: (didDrop) => {
        const { activeId, activeData, overId, overData, overRect } = stateRef.current;
        if (!activeId) {
          stateRef.current = {
            activeId: null,
            activeData: null,
            overId: null,
            overData: null,
            overRect: null,
          };
          return;
        }
        if (didDrop && overId) {
          cbRef.current.onDragEnd?.({
            active: { id: activeId, data: { current: activeData } },
            over: { id: overId, data: { current: overData }, rect: overRect },
            delta: { x: pointer.x - pointer.startX, y: pointer.y - pointer.startY },
            activatorEvent: { clientX: pointer.startX, clientY: pointer.startY },
          });
        } else {
          cbRef.current.onDragCancel?.();
        }
        stateRef.current = {
          activeId: null,
          activeData: null,
          overId: null,
          overData: null,
          overRect: null,
        };
      },
    }),
    [],
  );

  return <DndCtx.Provider value={value}>{children}</DndCtx.Provider>;
}

// =====================================================================
// SortableContext — defines a unique drag type per list, so items from
// different sortable lists cannot be dropped onto each other.
// =====================================================================
interface SortableCtxValue {
  items: string[];
  type: string;
}
const SortableCtx = createContext<SortableCtxValue | null>(null);

let _typeCounter = 0;
const newSortableType = () => `sortable-${++_typeCounter}`;

interface SortableContextProps {
  children?: ReactNode;
  items: (string | number)[] | { id: string | number }[];
  strategy?: any; // accepted for compatibility, ignored
  disabled?: boolean;
}

export function SortableContext({ items, children }: SortableContextProps) {
  const typeRef = useRef<string>("");
  if (!typeRef.current) typeRef.current = newSortableType();
  const ids = useMemo(
    () => (items || []).map((it: any) => String(typeof it === "object" ? it.id : it)),
    [items],
  );
  const value = useMemo(() => ({ items: ids, type: typeRef.current }), [ids]);
  return <SortableCtx.Provider value={value}>{children}</SortableCtx.Provider>;
}

// =====================================================================
// useSortable — drop-in replacement for @dnd-kit/sortable's useSortable.
// =====================================================================
interface UseSortableOptions {
  id: UniqueIdentifier;
  data?: any;
  disabled?: boolean;
  transition?: any; // ignored
}

interface UseSortableReturn {
  attributes: Record<string, any>;
  listeners: Record<string, any>;
  setNodeRef: (el: HTMLElement | null) => void;
  setActivatorNodeRef: (el: HTMLElement | null) => void;
  transform: null;
  transition: undefined;
  isDragging: boolean;
  isOver: boolean;
}

export function useSortable({
  id,
  data,
  disabled,
}: UseSortableOptions): UseSortableReturn {
  const sortable = useContext(SortableCtx);
  const dnd = useContext(DndCtx);
  const type = sortable?.type || "sortable-default";
  const idStr = String(id);
  const elRef = useRef<HTMLElement | null>(null);
  const dataKey = useMemo(() => {
    try {
      return JSON.stringify(data ?? null);
    } catch {
      return "";
    }
  }, [data]);

  const [{ isDragging }, dragRef, preview] = useDrag(
    () => ({
      type,
      canDrag: !disabled,
      item: () => {
        dnd?.fireStart(idStr, data);
        return { id: idStr, data };
      },
      end: (_item: any, monitor: any) => {
        dnd?.fireEnd(monitor.didDrop());
      },
      collect: (m: any) => ({ isDragging: m.isDragging() }),
    }),
    [type, idStr, disabled, dataKey],
  );

  const [{ isOver }, dropRef] = useDrop(
    () => ({
      accept: type,
      hover: (item: any) => {
        if (!item || item.id === idStr) return;
        const rect = elRef.current?.getBoundingClientRect() ?? null;
        dnd?.fireOver(idStr, data, rect);
      },
      drop: () => ({ overId: idStr }),
      collect: (m: any) => ({ isOver: m.isOver({ shallow: true }) }),
    }),
    [type, idStr, dataKey],
  );

  // Hide the native HTML5 drag image so callers can render their own DragOverlay.
  useEffect(() => {
    try {
      preview(getEmptyImage(), { captureDraggingState: true });
    } catch {
      // Non-HTML5 backends ignore preview customisation.
    }
  }, [preview]);

  const setNodeRef = useCallback(
    (el: HTMLElement | null) => {
      elRef.current = el;
      dropRef(el);
      dragRef(el);
    },
    [dragRef, dropRef],
  );

  const setActivatorNodeRef = useCallback(
    (el: HTMLElement | null) => {
      // When the caller wires a dedicated drag handle, re-target the drag
      // source to that element while leaving the drop zone on the wrapper.
      dragRef(el);
    },
    [dragRef],
  );

  return {
    attributes: {
      role: "button",
      tabIndex: disabled ? -1 : 0,
      "aria-roledescription": "sortable",
    },
    listeners: {},
    setNodeRef,
    setActivatorNodeRef,
    transform: null,
    transition: undefined,
    isDragging,
    isOver,
  };
}

// =====================================================================
// DragOverlay — renders the active element under the cursor using
// react-dnd's drag layer monitor (since native preview is hidden).
// =====================================================================
interface DragOverlayProps {
  children?: ReactNode;
  dropAnimation?: any; // ignored
  modifiers?: any; // ignored
}

export function DragOverlay({ children }: DragOverlayProps) {
  const layer = useDragLayer((m: any) => ({
    isDragging: m.isDragging(),
    offset: m.getClientOffset(),
    initialOffset: m.getInitialClientOffset(),
    initialSourceOffset: m.getInitialSourceClientOffset(),
  }));

  if (typeof document === "undefined") return null;
  if (!layer.isDragging || !layer.offset || !layer.initialOffset || !layer.initialSourceOffset) {
    return null;
  }

  const x =
    layer.initialSourceOffset.x + (layer.offset.x - layer.initialOffset.x);
  const y =
    layer.initialSourceOffset.y + (layer.offset.y - layer.initialOffset.y);

  return createPortal(
    <div
      style={{
        position: "fixed",
        pointerEvents: "none",
        top: 0,
        left: 0,
        transform: `translate(${x}px, ${y}px)`,
        zIndex: 9999,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

// =====================================================================
// API-compatible no-ops / helpers
// =====================================================================
export const closestCenter: any = () => [];
export const pointerWithin: any = () => [];
export const rectIntersection: any = () => [];
export const verticalListSortingStrategy: any = undefined;
export const horizontalListSortingStrategy: any = undefined;
export const sortableKeyboardCoordinates: any = undefined;
export const restrictToVerticalAxis: any = undefined;
export const restrictToHorizontalAxis: any = undefined;

export const useSensor = (_sensor?: any, _opts?: any) => ({}) as any;
export const useSensors = (..._args: any[]) => ({}) as any;
export const PointerSensor: any = "pointer";
export const KeyboardSensor: any = "keyboard";
export const TouchSensor: any = "touch";
export const MouseSensor: any = "mouse";

export const CSS = {
  Transform: { toString: (_t: any) => undefined as any },
  Translate: { toString: (_t: any) => undefined as any },
};

export function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  if (from === to) return arr.slice();
  const result = arr.slice();
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

// =====================================================================
// AppDndProvider — single global react-dnd provider with three backends:
//   1. HTML5 Backend (mouse / native drag)
//   2. Touch Backend (long-press, mobile)
//   3. Accessible Backend (Discord — keyboard + screen reader)
// =====================================================================
export function AppDndProvider({ children }: { children: ReactNode }) {
  const options = useMemo(
    () => ({
      backends: [
        {
          id: "html5",
          backend: HTML5Backend,
          transition: MouseTransition,
        },
        {
          id: "touch",
          backend: TouchBackend,
          options: {
            delayTouchStart: 200,
            enableMouseEvents: false,
            ignoreContextMenu: true,
            touchSlop: 8,
          },
          preview: true,
          transition: TouchTransition,
        },
        {
          id: "accessible",
          backend: AccessibleBackend,
          options: {
            isDragTrigger: (event: KeyboardEvent) =>
              event.key === " " || event.key === "Enter",
            announceMessages: {
              pickedUpItem: () => "Élément saisi",
              droppedItem: () => "Élément déposé",
              hoveredTarget: () => "Survol d'une cible",
              canceledDrag: () => "Déplacement annulé",
            },
          },
          preview: true,
        },
      ],
    }),
    [],
  );

  return (
    <DndProvider backend={MultiBackend} options={options}>
      {children}
    </DndProvider>
  );
}
