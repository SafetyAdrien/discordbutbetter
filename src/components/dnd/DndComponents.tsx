import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ============================================
// DROP INDICATOR - Blue horizontal line
// ============================================
export interface DropIndicatorProps {
  isVisible: boolean;
  orientation?: 'horizontal' | 'vertical';
}

export const DropIndicator = forwardRef<HTMLDivElement, DropIndicatorProps>(
  ({ isVisible, orientation = 'horizontal' }, ref) => {
    if (!isVisible) return null;
    
    return (
      <div 
        ref={ref}
        className={cn(
          "pointer-events-none transition-opacity duration-150",
          orientation === 'horizontal' 
            ? "h-[2px] w-full my-px rounded-full bg-[#5865f2] shadow-[0_0_8px_rgba(88,101,242,0.6)]"
            : "w-[2px] h-full mx-px rounded-full bg-[#5865f2] shadow-[0_0_8px_rgba(88,101,242,0.6)]"
        )}
      />
    );
  }
);
DropIndicator.displayName = 'DropIndicator';

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
        "opacity-90 shadow-2xl rounded-lg border border-[#5865f2]/50 bg-card/95 backdrop-blur-sm",
        "scale-105 cursor-grabbing",
        className
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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id,
    data,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging 
      ? 'opacity 150ms ease' 
      : 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1), opacity 150ms ease',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "touch-none",
        isDragging && "opacity-40 scale-[0.98]",
        isOver && "ring-2 ring-[#5865f2]/30 rounded",
        className
      )}
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
      className={cn(
        "rounded-md bg-muted/30 border-2 border-dashed border-muted-foreground/20",
        className
      )}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
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
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {name}
        </span>
        <span className="text-[10px] text-muted-foreground/60">
          ({channelCount} salons)
        </span>
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
        <span className="text-sm font-medium truncate">{name}</span>
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
        {iconUrl && !iconUrl.startsWith('http') ? (
          <span className="text-sm">{iconUrl}</span>
        ) : iconUrl ? (
          <img src={iconUrl} alt="" className="w-4 h-4 object-contain" />
        ) : (
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0" 
            style={{ backgroundColor: color || '#99AAB5' }}
          />
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
          "transition-all duration-150",
          isOver && canDrop && "bg-[#5865f2]/5 ring-1 ring-[#5865f2]/30 rounded-md",
          isOver && !canDrop && "bg-destructive/5 ring-1 ring-destructive/30 rounded-md",
          className
        )}
      >
        {children}
      </div>
    );
  }
);
DroppableZone.displayName = 'DroppableZone';
