import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ============================================
// DROP INDICATOR - Discord-style blue line with circles
// Pixel-perfect positioning with absolute placement
// ============================================
export interface DropIndicatorProps {
  isVisible: boolean;
  position: "before" | "after";
  orientation?: "horizontal" | "vertical";
  /** Full-width indicator ignoring parent padding */
  fullWidth?: boolean;
}

export const DropIndicator = forwardRef<HTMLDivElement, DropIndicatorProps>(
  ({ isVisible, position, orientation = "horizontal", fullWidth = false }, ref) => {
    if (!isVisible) return null;

    const sharedAnim = "animate-[dnd-indicator-in_120ms_cubic-bezier(0.22,1,0.36,1)_forwards] will-change-transform";

    if (orientation === "vertical") {
      return (
        <div
          ref={ref}
          aria-hidden
          className={cn(
            "absolute top-0 bottom-0 w-[2px] z-20 pointer-events-none origin-center",
            "bg-[#5865f2] shadow-[0_0_6px_rgba(88,101,242,0.55)] rounded-full",
            "before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:-translate-y-[3px]",
            "before:w-[8px] before:h-[3px] before:rounded-full before:bg-[#5865f2]",
            "after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:translate-y-[3px]",
            "after:w-[8px] after:h-[3px] after:rounded-full after:bg-[#5865f2]",
            position === "before" ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2",
            sharedAnim,
          )}
        />
      );
    }

    return (
      <div
        ref={ref}
        aria-hidden
        className={cn(
          "absolute h-[2px] z-20 pointer-events-none origin-center",
          fullWidth ? "-left-2 -right-2" : "left-0 right-0",
          "bg-[#5865f2] shadow-[0_0_6px_rgba(88,101,242,0.55)] rounded-full",
          "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:-translate-x-[3px]",
          "before:w-[8px] before:h-[3px] before:rounded-full before:bg-[#5865f2]",
          "after:absolute after:right-0 after:top-1/2 after:-translate-y-1/2 after:translate-x-[3px]",
          "after:w-[8px] after:h-[3px] after:rounded-full after:bg-[#5865f2]",
          position === "before" ? "top-0 -translate-y-1/2" : "bottom-0 translate-y-1/2",
          sharedAnim,
        )}
      />
    );
  },
);
DropIndicator.displayName = "DropIndicator";

// ============================================
// DRAG OVERLAY WRAPPER - Semi-transparent ghost
// ============================================
export interface DragOverlayItemProps {
  children: React.ReactNode;
  className?: string;
}

export const DragOverlayItem = ({ children, className }: DragOverlayItemProps) => {
  return (
    <div
      className={cn(
        "opacity-95 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.45)] rounded-lg border border-[#5865f2]/40 bg-card/95 backdrop-blur-sm",
        "scale-[1.03] cursor-grabbing select-none will-change-transform",
        "transition-transform duration-100 ease-out",
        className,
      )}
    >
      {children}
    </div>
  );
};

// ============================================
// SORTABLE WRAPPER - Generic sortable container
// ============================================
export interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  data?: Record<string, unknown>;
  disabled?: boolean;
}

export const SortableItem = ({ id, children, className, data, disabled }: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, isDragging, isOver } = useSortable({
    id,
    data,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "touch-none transition-[opacity,transform] duration-100 ease-out",
        isDragging && "opacity-40",
        isOver && "outline outline-1 outline-[#5865f2]/40 rounded-md",
        className,
      )}
      style={isDragging ? { willChange: "opacity, transform" } : undefined}
    >
      {children}
    </div>
  );
};

// ============================================
// PLACEHOLDER - Shows where item was during drag
// ============================================
export interface DragPlaceholderProps {
  height?: number | string;
  className?: string;
}

export const DragPlaceholder = ({ height = 40, className }: DragPlaceholderProps) => {
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-md border border-dashed border-[#5865f2]/40 bg-[#5865f2]/5",
        "animate-[dnd-placeholder-pulse_1.4s_ease-in-out_infinite]",
        className,
      )}
      style={{ height: typeof height === "number" ? `${height}px` : height }}
    />
  );
};

// ============================================
// CATEGORY DRAG OVERLAY
// ============================================
export interface CategoryOverlayProps {
  name: string;
  channelCount: number;
}

export const CategoryDragOverlay = ({ name, channelCount }: CategoryOverlayProps) => {
  return (
    <DragOverlayItem className="px-3 py-2 min-w-[200px]">
      <div className="flex items-center gap-2">
        <span className="text-xs font-normal text-muted-foreground uppercase tracking-wide">{name}</span>
        <span className="text-[14px] text-muted-foreground/60">({channelCount} salons)</span>
      </div>
    </DragOverlayItem>
  );
};

// ============================================
// CHANNEL DRAG OVERLAY
// ============================================
export interface ChannelOverlayProps {
  name: string;
  icon: React.ReactNode;
  type?: string;
}

export const ChannelDragOverlay = ({ name, icon, type }: ChannelOverlayProps) => {
  return (
    <DragOverlayItem className="px-3 py-2 min-w-[180px]">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-normal truncate">{name}</span>
      </div>
    </DragOverlayItem>
  );
};

// ============================================
// ROLE DRAG OVERLAY
// ============================================
export interface RoleOverlayProps {
  name: string;
  color: string | null;
  iconUrl?: string | null;
}

export const RoleDragOverlay = ({ name, color, iconUrl }: RoleOverlayProps) => {
  return (
    <DragOverlayItem className="px-3 py-2 min-w-[160px]">
      <div className="flex items-center gap-2">
        {iconUrl && !iconUrl.startsWith("http") ? (
          <span className="text-sm">{iconUrl}</span>
        ) : iconUrl ? (
          <img src={iconUrl} alt="" className="w-4 h-4 object-contain" />
        ) : (
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color || "#99AAB5" }} />
        )}
        <span className="text-sm font-medium truncate">{name}</span>
      </div>
    </DragOverlayItem>
  );
};

// ============================================
// DROPPABLE ZONE - For receiving items
// ============================================
export interface DroppableZoneProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  isOver?: boolean;
  canDrop?: boolean;
}

export const DroppableZone = forwardRef<HTMLDivElement, DroppableZoneProps>(
  ({ id, children, className, isOver, canDrop = true }, ref) => {
    return (
      <div
        ref={ref}
        data-droppable-id={id}
        className={cn(
          "transition-[background-color,box-shadow] duration-100 ease-out rounded-md",
          isOver && canDrop && "bg-[#5865f2]/10 shadow-[inset_0_0_0_1px_rgba(88,101,242,0.35)]",
          isOver && !canDrop && "bg-destructive/10 shadow-[inset_0_0_0_1px_hsl(var(--destructive)/0.4)]",
          className,
        )}
      >
        {children}
      </div>
    );
  },
);
DroppableZone.displayName = "DroppableZone";
