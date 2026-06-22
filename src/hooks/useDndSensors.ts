// ============================================================================
// Drag-and-drop utility helpers (formerly @dnd-kit sensors hook).
//
// Sensors are no longer required — drag interactions are handled by the
// global react-dnd MultiBackend (HTML5 + Touch + AccessibleBackend) mounted
// in App.tsx, mirroring Discord's react-dnd-accessible-backend setup.
// This file keeps the pure utility helpers that callers still import.
// ============================================================================

/** Item types shared across draggable surfaces (servers, channels, …) */
export const DND_TYPES = {
  SERVER: 'server',
  CHANNEL: 'channel',
  CATEGORY: 'category',
  ROLE: 'role',
} as const;
export type DndType = typeof DND_TYPES[keyof typeof DND_TYPES];

/**
 * Legacy compatibility hook — sensors are now configured globally via
 * MultiBackend. Returns an empty array so existing call sites compile.
 */
export function useDndSensors(_options?: {
  activationDistance?: number;
  touchDelay?: number;
}): any[] {
  return [];
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

  const result = items.filter(item => item.id !== activeId);
  const activeItem = items[activeIndex];

  let insertIndex = position === 'before' ? overIndex : overIndex + 1;
  if (activeIndex < overIndex) insertIndex--;
  insertIndex = Math.max(0, Math.min(insertIndex, result.length));

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
