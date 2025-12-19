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
  targetType: 'server' | 'folder' | null;
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
  const [dropIndicator, setDropIndicator] = useState<DropIndicatorState>({ targetId: null, targetType: null, type: null });
  
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

  const originRef = useRef<{ serverId: string; sourceFolderId: string | null } | null>(null);
  const [previewState, setPreviewState] = useState<{
    rootServerIds: string[];
    folderServerIds: Record<string, string[]>;
  } | null>(null);
  const [draggingFromFolder, setDraggingFromFolder] = useState(false);
  
  // Get active server for overlay
  const activeServer = useMemo(() => {
    if (!activeId) return null;
    const idStr = String(activeId);

    if (idStr.startsWith('server-')) {
      const serverId = idStr.replace('server-', '');
      return servers.find((s) => s.id === serverId) || null;
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
      setDropIndicator({ targetId: null, targetType: null, type: null });
    }, FOLDER_CREATION_THRESHOLD);
  }, [clearMergeState, onCreateFolder]);

  // Build unified order: folders and standalone servers in display order
  const getUnifiedOrder = useCallback(() => {
    // The unified order includes folder IDs (prefixed) and standalone server IDs
    const orderItems: { type: 'folder' | 'server'; id: string }[] = [];
    
    // First, add items based on serverOrder
    const standaloneSet = new Set(standaloneServers.map(s => s.id));
    const folderSet = new Set(folders.map(f => f.id));
    
    // Create a map to track position hints from serverOrder
    const orderMap = new Map<string, number>();
    serverOrder.forEach((id, index) => {
      orderMap.set(id, index);
    });
    
    // Collect all items with their positions
    const allItems: { type: 'folder' | 'server'; id: string; position: number }[] = [];
    
    folders.forEach(f => {
      // Use the first server's position in the folder, or a high number
      const firstServerPos = f.serverIds.length > 0 
        ? (orderMap.get(f.serverIds[0]) ?? Infinity)
        : Infinity;
      allItems.push({ type: 'folder', id: f.id, position: firstServerPos });
    });
    
    standaloneServers.forEach(s => {
      allItems.push({ type: 'server', id: s.id, position: orderMap.get(s.id) ?? Infinity });
    });
    
    // Sort by position
    allItems.sort((a, b) => a.position - b.position);
    
    return allItems.map(item => ({ type: item.type, id: item.id }));
  }, [folders, standaloneServers, serverOrder]);

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
    setDropIndicator({ targetId: null, targetType: null, type: null });
    setPreviewState(null);

    const activeIdStr = String(event.active.id);
    if (!activeIdStr.startsWith('server-')) {
      originRef.current = null;
      setDraggingFromFolder(false);
      return;
    }

    const serverId = activeIdStr.replace('server-', '');
    const sourceFolderId = folders.find((f) => f.serverIds.includes(serverId))?.id ?? null;
    originRef.current = { serverId, sourceFolderId };
    setDraggingFromFolder(!!sourceFolderId);
  }, [clearMergeState, folders]);

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
      setDropIndicator({ targetId: null, targetType: null, type: null });
      clearMergeState();
      setPreviewState(null);
      return;
    }

    setOverId(over.id);

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    const origin = originRef.current;
    const activeServerId = activeIdStr.startsWith('server-') ? activeIdStr.replace('server-', '') : null;
    const isDraggingServer = !!activeServerId;

    const overData = (over.data?.current || {}) as any;
    const overRect = over.rect;
    const cursorY = lastCursorY.current;

    const isOverRootDrop = overIdStr === 'root-drop';
    const isOverFolderIcon = overIdStr.startsWith('folder-');
    const isOverServer = overIdStr.startsWith('server-');

    const overContainerId: 'root' | `folder-${string}` = isOverRootDrop
      ? 'root'
      : overData?.containerId === 'root'
        ? 'root'
        : typeof overData?.containerId === 'string' && overData.containerId.startsWith('folder-')
          ? overData.containerId
          : 'root';

    // Dragging a server over a FOLDER icon -> check edge vs center
    if (isDraggingServer && isOverFolderIcon && overRect) {
      const folderId = overIdStr.replace('folder-', '');
      const zone = determineZone(cursorY, { top: overRect.top, height: overRect.height });
      
      if (zone === 'center') {
        // Center zone: add to folder
        clearMergeState();
        setPreviewState(null);
        setDropIndicator({ targetId: folderId, targetType: 'folder', type: 'add-to-folder' });
      } else {
        // Edge zone: insert before/after folder in root order
        clearMergeState();
        setDropIndicator({ 
          targetId: folderId, 
          targetType: 'folder', 
          type: zone === 'before' ? 'insert-before' : 'insert-after' 
        });
        setPreviewState(null);
      }
      return;
    }

    // Dragging a server over a server INSIDE a folder -> add to that folder
    if (isDraggingServer && isOverServer && overContainerId.startsWith('folder-')) {
      clearMergeState();
      setPreviewState(null);
      const folderId = overContainerId.replace('folder-', '');
      setDropIndicator({ targetId: folderId, targetType: 'folder', type: 'add-to-folder' });
      return;
    }

    // Dragging a server over another ROOT server
    if (isDraggingServer && isOverServer && overContainerId === 'root' && overRect) {
      const zone = determineZone(cursorY, { top: overRect.top, height: overRect.height });
      const overServerId = overIdStr.replace('server-', '');

      if (zone === 'center') {
        // Center zone: merge mode (folder creation)
        if (activeServerId && (mergeState.sourceId !== activeServerId || mergeState.targetId !== overServerId)) {
          startMergeTimer(activeServerId, overServerId);
        }
        setDropIndicator({ targetId: overServerId, targetType: 'server', type: 'merge' });
        setPreviewState(null);
      } else {
        // Edge zone: insert mode
        clearMergeState();
        setDropIndicator({ targetId: overServerId, targetType: 'server', type: zone === 'before' ? 'insert-before' : 'insert-after' });

        // Cross-container preview: Folder -> Root (edge zone only)
        if (origin?.sourceFolderId && origin.serverId && activeServerId === origin.serverId) {
          const rootIdsBase = standaloneServers
            .map((s) => s.id)
            .filter((id) => id !== origin.serverId);

          const folderMap: Record<string, string[]> = {};
          folders.forEach((f) => {
            folderMap[f.id] = f.serverIds.filter((id) => !(f.id === origin.sourceFolderId && id === origin.serverId));
          });

          const targetIndex = rootIdsBase.indexOf(overServerId);
          const insertIndex = targetIndex === -1
            ? rootIdsBase.length
            : zone === 'after'
              ? targetIndex + 1
              : targetIndex;

          const nextRoot = [...rootIdsBase];
          nextRoot.splice(insertIndex, 0, origin.serverId);

          setPreviewState({ rootServerIds: nextRoot, folderServerIds: folderMap });
        } else {
          setPreviewState(null);
        }
      }
      return;
    }

    // Root drop zone (end of list)
    if (isDraggingServer && isOverRootDrop) {
      clearMergeState();
      setDropIndicator({ targetId: null, targetType: null, type: null });

      if (origin?.sourceFolderId && origin.serverId && activeServerId === origin.serverId) {
        const rootIdsBase = standaloneServers
          .map((s) => s.id)
          .filter((id) => id !== origin.serverId);

        const folderMap: Record<string, string[]> = {};
        folders.forEach((f) => {
          folderMap[f.id] = f.serverIds.filter((id) => !(f.id === origin.sourceFolderId && id === origin.serverId));
        });

        setPreviewState({ rootServerIds: [...rootIdsBase, origin.serverId], folderServerIds: folderMap });
      } else {
        setPreviewState(null);
      }
      return;
    }

    clearMergeState();
    setDropIndicator({ targetId: null, targetType: null, type: null });
    setPreviewState(null);
  }, [clearMergeState, determineZone, folders, mergeState.sourceId, mergeState.targetId, standaloneServers, startMergeTimer]);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    const activeIdStr = String(active.id);
    const currentIndicator = dropIndicator;
    const wasMerging = mergeState.progress >= 100;

    const origin = originRef.current;
    originRef.current = null;

    // Reset all state
    setActiveId(null);
    setOverId(null);
    setDropIndicator({ targetId: null, targetType: null, type: null });
    clearMergeState();
    setPreviewState(null);
    setDraggingFromFolder(false);

    // If merge completed, folder was created - nothing else to do
    if (wasMerging) return;

    const serverId = origin?.serverId ?? (activeIdStr.startsWith('server-') ? activeIdStr.replace('server-', '') : null);
    if (!serverId) return;

    const sourceFolderId = origin?.sourceFolderId ?? null;

    // Dropped outside any droppable -> if dragged from folder, extract to end
    if (!over) {
      if (sourceFolderId) {
        const full = getFullServerOrder();
        const without = full.filter((id) => id !== serverId);
        without.push(serverId);
        onReorderServers(without);
        onRemoveFromFolder(sourceFolderId, serverId);
      }
      return;
    }

    if (active.id === over.id) return;

    const overIdStr = String(over.id);
    const overData = (over.data?.current || {}) as any;

    const isOverRootDrop = overIdStr === 'root-drop';
    const isOverFolderIcon = overIdStr.startsWith('folder-');
    const isOverServer = overIdStr.startsWith('server-');

    const overContainerId: 'root' | `folder-${string}` = isOverRootDrop
      ? 'root'
      : overData?.containerId === 'root'
        ? 'root'
        : typeof overData?.containerId === 'string' && overData.containerId.startsWith('folder-')
          ? overData.containerId
          : 'root';

    // 1) Add to folder (center zone on folder)
    if (currentIndicator.type === 'add-to-folder' && currentIndicator.targetId) {
      const targetFolderId = currentIndicator.targetId;
      onAddToFolder(targetFolderId, serverId);
      if (sourceFolderId && sourceFolderId !== targetFolderId) {
        onRemoveFromFolder(sourceFolderId, serverId);
      }
      return;
    }

    // 2) Insert before/after a FOLDER (edge zones on folder)
    if (currentIndicator.targetType === 'folder' && (currentIndicator.type === 'insert-before' || currentIndicator.type === 'insert-after')) {
      const targetFolderId = currentIndicator.targetId;
      const targetFolder = folders.find(f => f.id === targetFolderId);
      
      if (targetFolder && targetFolder.serverIds.length > 0) {
        // Find a reference server ID from the target folder to determine position
        const full = getFullServerOrder();
        const without = full.filter((id) => id !== serverId);
        
        // Get position of first server in target folder
        const referenceServerId = currentIndicator.type === 'insert-before' 
          ? targetFolder.serverIds[0] 
          : targetFolder.serverIds[targetFolder.serverIds.length - 1];
        
        const refIndex = without.indexOf(referenceServerId);
        const insertIndex = refIndex === -1 
          ? without.length 
          : currentIndicator.type === 'insert-after' 
            ? refIndex + 1 
            : refIndex;
        
        without.splice(insertIndex, 0, serverId);
        onReorderServers(without);
        
        if (sourceFolderId) {
          onRemoveFromFolder(sourceFolderId, serverId);
        }
      }
      return;
    }

    // 3) Folder -> Root extraction (drop on root server or root drop zone)
    if (sourceFolderId && (isOverRootDrop || (isOverServer && overContainerId === 'root'))) {
      const full = getFullServerOrder();
      const without = full.filter((id) => id !== serverId);

      if (isOverRootDrop) {
        without.push(serverId);
      } else {
        const targetServerId = overIdStr.replace('server-', '');
        const targetIndex = without.indexOf(targetServerId);
        const insertAfter = currentIndicator.type === 'insert-after';
        const insertIndex = targetIndex === -1 ? without.length : insertAfter ? targetIndex + 1 : targetIndex;
        without.splice(insertIndex, 0, serverId);
      }

      onReorderServers(without);
      onRemoveFromFolder(sourceFolderId, serverId);
      return;
    }

    // 4) Root -> Folder (drop on folder icon center)
    if (!sourceFolderId && isOverFolderIcon && currentIndicator.type === 'add-to-folder') {
      const folderId = overIdStr.replace('folder-', '');
      onAddToFolder(folderId, serverId);
      return;
    }

    // 5) Root -> Folder (drop on a server inside a folder)
    if (!sourceFolderId && isOverServer && overContainerId.startsWith('folder-')) {
      const folderId = overContainerId.replace('folder-', '');
      onAddToFolder(folderId, serverId);
      return;
    }

    // 6) Root reorder (server over root server)
    if (!sourceFolderId && isOverServer && overContainerId === 'root') {
      const targetServerId = overIdStr.replace('server-', '');

      const full = getFullServerOrder();
      const without = full.filter((id) => id !== serverId);
      const targetIndex = without.indexOf(targetServerId);

      if (targetIndex === -1) {
        without.push(serverId);
      } else {
        const insertAfter = currentIndicator.type === 'insert-after' || currentIndicator.type === 'merge';
        const insertIndex = insertAfter ? targetIndex + 1 : targetIndex;
        without.splice(insertIndex, 0, serverId);
      }

      onReorderServers(without);
      return;
    }

    // 7) Folder -> Folder (drop on folder icon center)
    if (sourceFolderId && isOverFolderIcon && currentIndicator.type === 'add-to-folder') {
      const targetFolderId = overIdStr.replace('folder-', '');
      if (targetFolderId !== sourceFolderId) {
        onRemoveFromFolder(sourceFolderId, serverId);
        onAddToFolder(targetFolderId, serverId);
      }
      return;
    }

    // 8) Folder -> Folder (drop on a server inside another folder)
    if (sourceFolderId && isOverServer && overContainerId.startsWith('folder-')) {
      const targetFolderId = overContainerId.replace('folder-', '');
      if (targetFolderId !== sourceFolderId) {
        onRemoveFromFolder(sourceFolderId, serverId);
        onAddToFolder(targetFolderId, serverId);
      }
      return;
    }
  }, [dropIndicator, mergeState.progress, clearMergeState, getFullServerOrder, folders, onReorderServers, onRemoveFromFolder, onAddToFolder]);

  // Handle drag cancel
  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverId(null);
    setDropIndicator({ targetId: null, targetType: null, type: null });
    clearMergeState();
    setPreviewState(null);
    originRef.current = null;
    setDraggingFromFolder(false);
  }, [clearMergeState]);

  // Check if we should restrict to vertical axis
  const shouldRestrictVertical = useMemo(() => {
    if (!activeId) return true;
    return !draggingFromFolder;
  }, [activeId, draggingFromFolder]);

  const previewFolders = useMemo(() => {
    if (!previewState) return folders;
    return folders.map((f) => ({
      ...f,
      serverIds: previewState.folderServerIds[f.id] ?? f.serverIds,
    }));
  }, [previewState, folders]);

  const previewStandaloneServers = useMemo(() => {
    if (!previewState) return standaloneServers;
    return previewState.rootServerIds
      .map((id) => servers.find((s) => s.id === id))
      .filter((s): s is Server => !!s);
  }, [previewState, standaloneServers, servers]);

  return {
    activeId,
    activeServer,
    overId,
    dropIndicator,
    mergeState,
    shouldRestrictVertical,
    previewFolders,
    previewStandaloneServers,
    handleDragStart,
    handleDragMove,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}
