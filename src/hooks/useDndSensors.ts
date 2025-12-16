import { 
  PointerSensor, 
  KeyboardSensor, 
  useSensor, 
  useSensors,
  TouchSensor,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

/**
 * Custom hook providing optimized DnD sensors for Discord-like experience
 * - PointerSensor with 5px activation distance (prevents accidental drags)
 * - TouchSensor for mobile with 10px tolerance and 200ms delay
 * - KeyboardSensor for accessibility
 */
export function useDndSensors(options?: {
  activationDistance?: number;
  touchDelay?: number;
}) {
  const { activationDistance = 5, touchDelay = 200 } = options || {};

  return useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: activationDistance,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: touchDelay,
        tolerance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
}

/**
 * Calculate drop position based on cursor position relative to element
 */
export function calculateDropPosition(
  clientY: number,
  elementRect: { top: number; height: number }
): 'before' | 'after' {
  const middleY = elementRect.top + elementRect.height / 2;
  return clientY < middleY ? 'before' : 'after';
}

/**
 * Get the ID without prefix (e.g., "channel-123" -> "123")
 */
export function stripDndPrefix(id: string, prefix: string): string {
  return id.startsWith(prefix) ? id.replace(prefix, '') : id;
}

/**
 * Check if dragged item type matches target
 */
export function isDragTypeMatch(
  activeId: string,
  overId: string,
  type: 'category' | 'channel' | 'role'
): boolean {
  const prefix = `${type}-`;
  return activeId.startsWith(prefix) && overId.startsWith(prefix);
}

/**
 * Reorder array items with support for precise insertion
 */
export function reorderItems<T extends { id: string }>(
  items: T[],
  activeId: string,
  overId: string,
  position: 'before' | 'after'
): T[] {
  const activeIndex = items.findIndex(item => item.id === activeId);
  const overIndex = items.findIndex(item => item.id === overId);
  
  if (activeIndex === -1 || overIndex === -1) return items;
  
  // Remove active item
  const result = items.filter(item => item.id !== activeId);
  const activeItem = items[activeIndex];
  
  // Calculate insertion index
  let insertIndex = position === 'before' ? overIndex : overIndex + 1;
  
  // Adjust if we removed an element before the insertion point
  if (activeIndex < overIndex) {
    insertIndex--;
  }
  
  // Ensure valid index
  insertIndex = Math.max(0, Math.min(insertIndex, result.length));
  
  // Insert at precise position
  result.splice(insertIndex, 0, activeItem);
  
  return result;
}

/**
 * Move item between arrays with precise insertion
 */
export function moveItemBetweenArrays<T extends { id: string }>(
  sourceItems: T[],
  targetItems: T[],
  activeId: string,
  overId: string,
  position: 'before' | 'after'
): { source: T[]; target: T[] } {
  const activeItem = sourceItems.find(item => item.id === activeId);
  if (!activeItem) return { source: sourceItems, target: targetItems };
  
  const newSource = sourceItems.filter(item => item.id !== activeId);
  const overIndex = targetItems.findIndex(item => item.id === overId);
  
  let insertIndex = position === 'before' ? overIndex : overIndex + 1;
  insertIndex = Math.max(0, Math.min(insertIndex, targetItems.length));
  
  const newTarget = [...targetItems];
  newTarget.splice(insertIndex, 0, activeItem);
  
  return { source: newSource, target: newTarget };
}
