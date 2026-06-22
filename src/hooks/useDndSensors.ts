/**
 * Compatibility shim — sensors are now configured globally inside
 * AppDndProvider (react-dnd MultiBackend with HTML5 + Touch + Accessible).
 * Individual lists no longer need to register sensors, so this hook is a
 * no-op kept only to preserve existing import sites.
 */

export function useDndSensors(_options?: {
  activationDistance?: number;
  touchDelay?: number;
}) {
  return {} as any;
}

export function calculateDropPosition(
  clientY: number,
  elementRect: { top: number; height: number }
): 'before' | 'after' {
  const middleY = elementRect.top + elementRect.height / 2;
  return clientY < middleY ? 'before' : 'after';
}

export function stripDndPrefix(id: string, prefix: string): string {
  return id.startsWith(prefix) ? id.replace(prefix, '') : id;
}

export function isDragTypeMatch(
  activeId: string,
  overId: string,
  type: 'category' | 'channel' | 'role'
): boolean {
  const prefix = `${type}-`;
  return activeId.startsWith(prefix) && overId.startsWith(prefix);
}

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
