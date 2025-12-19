import { useState, useRef, useCallback, useMemo } from 'react';
import { 
  DragStartEvent, 
  DragEndEvent, 
  DragMoveEvent,
  UniqueIdentifier,
} from '@dnd-kit/core';
import { Server } from '@/types/app';
import { ServerFolder, FOLDER_CREATION_THRESHOLD } from '@/types/serverFolder';

// Zone detection: center = merge, edge = insert
export type DropZoneType = 'insert-before' | 'insert-after' | 'merge' | 'add-to-folder' | null;

export interface DropIndicatorState {
  targetId: string | null;
  type: DropZoneType;
}

export interface MergeState {
  sourceId: string | null;
  targetId: string | null;
  startTime: number | null;
  progress: number;
}

interface UseServerDndProps {
  servers: Server[];
  folders: ServerFolder[];
  standaloneServers: Server[];
  serverOrder: string[];
  onReorderServers: (newOrder: string[]) => void;
  onCreateFolder: (params: { serverIds: string[]; name: string; position: number }) => void;
  onAddToFolder: (folderId: string, serverId: string) => void;
  onRemoveFromFolder: (folderId: string, serverId: string) => void;
}

// Threshold for determining center vs edge zone (as percentage from center)
const CENTER_ZONE_THRESHOLD = 0.35; // 35% from center = center zone, rest is edge

export function useServerDnd({
  servers,
  folders,
  standaloneServers,
  serverOrder,
  onReorderServers,
  onCreateFolder,
  onAddToFolder,
  onRemoveFromFolder,
}: UseServerDndProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicatorState>({ targetId: null, type: null });
  
  // Merge state for folder creation with timer
  const [mergeState, setMergeState] = useState<MergeState>({
    sourceId: null,
    targetId: null,
    startTime: null,
    progress: 0,
  });
  
  const mergeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mergeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCursorY = useRef<number>(0);
  
  // Get active server for overlay
  const activeServer = useMemo(() => {
    if (!activeId) return null;
    const idStr = String(activeId);
    
    if (idStr.startsWith('server-')) {
      const serverId = idStr.replace('server-', '');
      return servers.find(s => s.id === serverId) || null;
    }
    
    if (idStr.startsWith('nested-')) {
      const parts = idStr.split('-');
      const serverId = parts[parts.length - 1];
      return servers.find(s => s.id === serverId) || null;
    }
    
    return null;
  }, [activeId, servers]);

  // Clear merge state
  const clearMergeState = useCallback(() => {
    if (mergeTimerRef.current) {
      clearTimeout(mergeTimerRef.current);
      mergeTimerRef.current = null;
    }
    if (mergeIntervalRef.current) {
      clearInterval(mergeIntervalRef.current);
      mergeIntervalRef.current = null;
    }
    setMergeState({ sourceId: null, targetId: null, startTime: null, progress: 0 });
  }, []);

  // Start merge timer for folder creation
  const startMergeTimer = useCallback((sourceId: string, targetId: string) => {
    clearMergeState();
    
    const startTime = Date.now();
    setMergeState({ sourceId, targetId, startTime, progress: 0 });
    
    mergeIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / FOLDER_CREATION_THRESHOLD) * 100, 100);
      setMergeState(prev => ({ ...prev, progress }));
    }, 50);
    
    mergeTimerRef.current = setTimeout(() => {
      onCreateFolder({
        serverIds: [targetId, sourceId],
        name: 'Dossier',
        position: 0,
      });
      clearMergeState();
      setActiveId(null);
      setOverId(null);
      setDropIndicator({ targetId: null, type: null });
    }, FOLDER_CREATION_THRESHOLD);
  }, [clearMergeState, onCreateFolder]);

  // Get full server order
  const getFullServerOrder = useCallback(() => {
    const base = serverOrder.length ? [...serverOrder] : [];
    const known = new Set(base);
    servers.forEach((s) => {
      if (!known.has(s.id)) base.push(s.id);
    });
    return base;
  }, [serverOrder, servers]);

  // Determine zone based on cursor position relative to element center
  const determineZone = useCallback((cursorY: number, elementRect: { top: number; height: number }): 'center' | 'before' | 'after' => {
    const elementCenter = elementRect.top + elementRect.height / 2;
    const distanceFromCenter = Math.abs(cursorY - elementCenter);
    const halfHeight = elementRect.height / 2;
    
    // If cursor is within center threshold, it's center zone (merge)
    if (distanceFromCenter < halfHeight * CENTER_ZONE_THRESHOLD) {
      return 'center';
    }
    
    // Otherwise it's edge zone (insert before/after)
    return cursorY < elementCenter ? 'before' : 'after';
  }, []);

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
    clearMergeState();
    setDropIndicator({ targetId: null, type: null });
  }, [clearMergeState]);

  // Handle drag move - track cursor position
  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const { activatorEvent, delta } = event;
    if (activatorEvent && 'clientY' in activatorEvent) {
      lastCursorY.current = (activatorEvent as MouseEvent).clientY + delta.y;
    }
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((event: any) => {
    const { active, over } = event;
    
    if (!over || over.id === active.id) {
      setOverId(null);
      setDropIndicator({ targetId: null, type: null });
      clearMergeState();
      return;
    }

    setOverId(over.id);

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    
    const isDraggingServer = activeIdStr.startsWith('server-') || activeIdStr.startsWith('nested-');
    const isOverStandaloneServer = overIdStr.startsWith('server-');
    const isOverFolder = overIdStr.startsWith('folder-');
    const isOverNestedServer = overIdStr.startsWith('nested-');
    
    // Get over element rect
    const overRect = over.rect;
    const cursorY = lastCursorY.current;
    
    // Dragging a server over a FOLDER -> add to folder mode
    if (isDraggingServer && isOverFolder) {
      clearMergeState();
      const folderId = overIdStr.replace('folder-', '');
      setDropIndicator({ targetId: folderId, type: 'add-to-folder' });
      return;
    }
    
    // Dragging a server over a NESTED server -> add to that folder
    if (isDraggingServer && isOverNestedServer) {
      clearMergeState();
      const parts = overIdStr.split('-');
      const folderId = parts[1];
      setDropIndicator({ targetId: folderId, type: 'add-to-folder' });
      return;
    }
    
    // Dragging a server over another STANDALONE server
    if (isDraggingServer && isOverStandaloneServer && overRect) {
      const zone = determineZone(cursorY, { top: overRect.top, height: overRect.height });
      const overServerId = overIdStr.replace('server-', '');
      
      if (zone === 'center') {
        // Center zone: merge mode (folder creation)
        const activeServerId = activeIdStr.startsWith('nested-') 
          ? activeIdStr.split('-').pop()! 
          : activeIdStr.replace('server-', '');
        
        if (mergeState.sourceId !== activeServerId || mergeState.targetId !== overServerId) {
          startMergeTimer(activeServerId, overServerId);
        }
        
        setDropIndicator({ targetId: overServerId, type: 'merge' });
      } else {
        // Edge zone: insert mode
        clearMergeState();
        setDropIndicator({ 
          targetId: overServerId, 
          type: zone === 'before' ? 'insert-before' : 'insert-after' 
        });
      }
      return;
    }
    
    clearMergeState();
    setDropIndicator({ targetId: null, type: null });
  }, [clearMergeState, startMergeTimer, mergeState.sourceId, mergeState.targetId, determineZone]);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    const activeIdStr = String(active.id);
    const currentIndicator = dropIndicator;
    const wasMerging = mergeState.progress >= 100;
    
    // Reset all state
    setActiveId(null);
    setOverId(null);
    setDropIndicator({ targetId: null, type: null });
    clearMergeState();

    // If merge completed, folder was created - nothing else to do
    if (wasMerging) return;

    if (!over) {
      // Dropped outside - if nested server, extract to end
      if (activeIdStr.startsWith('nested-')) {
        const parts = activeIdStr.split('-');
        const folderId = parts[1];
        const serverId = parts[parts.length - 1];

        const full = getFullServerOrder();
        const without = full.filter((id) => id !== serverId);
        without.push(serverId);
        onReorderServers(without);
        onRemoveFromFolder(folderId, serverId);
      }
      return;
    }

    if (active.id === over.id) return;

    const overIdStr = String(over.id);

    // Handle nested server being dragged out
    if (activeIdStr.startsWith('nested-')) {
      const parts = activeIdStr.split('-');
      const sourceFolderId = parts[1];
      const serverId = parts[parts.length - 1];

      // Dropped onto a standalone server
      if (overIdStr.startsWith('server-')) {
        const targetServerId = overIdStr.replace('server-', '');
        
        const full = getFullServerOrder();
        const without = full.filter((id) => id !== serverId);
        const targetIndex = without.indexOf(targetServerId);
        
        if (targetIndex === -1) {
          without.push(serverId);
        } else {
          // Use the drop indicator type if available
          const insertAfter = currentIndicator.type === 'insert-after' || currentIndicator.type === 'merge';
          const insertIndex = insertAfter ? targetIndex + 1 : targetIndex;
          without.splice(insertIndex, 0, serverId);
        }
        
        onReorderServers(without);
        onRemoveFromFolder(sourceFolderId, serverId);
        return;
      }

      // Dropped on a folder
      if (overIdStr.startsWith('folder-')) {
        const targetFolderId = overIdStr.replace('folder-', '');
        if (targetFolderId !== sourceFolderId) {
          onRemoveFromFolder(sourceFolderId, serverId);
          onAddToFolder(targetFolderId, serverId);
        }
        return;
      }

      // Dropped on a nested server in a different folder
      if (overIdStr.startsWith('nested-')) {
        const overParts = overIdStr.split('-');
        const targetFolderId = overParts[1];
        if (targetFolderId !== sourceFolderId) {
          onRemoveFromFolder(sourceFolderId, serverId);
          onAddToFolder(targetFolderId, serverId);
        }
        return;
      }
    }

    // Handle standalone server dragged onto a folder
    if (activeIdStr.startsWith('server-') && overIdStr.startsWith('folder-')) {
      const serverId = activeIdStr.replace('server-', '');
      const folderId = overIdStr.replace('folder-', '');
      onAddToFolder(folderId, serverId);
      return;
    }

    // Handle standalone server dragged onto a nested server
    if (activeIdStr.startsWith('server-') && overIdStr.startsWith('nested-')) {
      const serverId = activeIdStr.replace('server-', '');
      const overParts = overIdStr.split('-');
      const folderId = overParts[1];
      onAddToFolder(folderId, serverId);
      return;
    }

    // Standalone server onto standalone server - reorder based on drop indicator
    if (activeIdStr.startsWith('server-') && overIdStr.startsWith('server-')) {
      const activeServerId = activeIdStr.replace('server-', '');
      const targetServerId = overIdStr.replace('server-', '');
      
      const full = getFullServerOrder();
      const without = full.filter((id) => id !== activeServerId);
      const targetIndex = without.indexOf(targetServerId);
      
      if (targetIndex === -1) {
        without.push(activeServerId);
      } else {
        const insertAfter = currentIndicator.type === 'insert-after' || currentIndicator.type === 'merge';
        const insertIndex = insertAfter ? targetIndex + 1 : targetIndex;
        without.splice(insertIndex, 0, activeServerId);
      }
      
      onReorderServers(without);
    }
  }, [dropIndicator, mergeState.progress, clearMergeState, getFullServerOrder, onReorderServers, onRemoveFromFolder, onAddToFolder]);

  // Handle drag cancel
  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverId(null);
    setDropIndicator({ targetId: null, type: null });
    clearMergeState();
  }, [clearMergeState]);

  // Check if we should restrict to vertical axis
  const shouldRestrictVertical = useMemo(() => {
    if (!activeId) return true;
    const idStr = String(activeId);
    return !idStr.startsWith('nested-');
  }, [activeId]);

  return {
    activeId,
    activeServer,
    overId,
    dropIndicator,
    mergeState,
    shouldRestrictVertical,
    handleDragStart,
    handleDragMove,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}
