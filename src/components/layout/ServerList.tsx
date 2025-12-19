import { Server } from '@/types/app';
import { cn } from '@/lib/utils';
import { Compass, Plus, MessageCircle, Settings, UserPlus, Hash, LogOut, CheckCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { copyToClipboard } from '@/lib/clipboard';
import { toast } from '@/hooks/use-toast';
import { useServerUnreadCounts } from '@/hooks/useServerUnreadCounts';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { useServerOrder } from '@/hooks/useServerOrder';
import { useServerFolders } from '@/hooks/useServerFolders';
import { useLeaveServer } from '@/hooks/useLeaveServer';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useRef, useMemo, forwardRef } from 'react';
import { SortableFolderItem } from '@/components/server-folders/SortableFolderItem';
import { useServerDnd } from '@/hooks/useServerDnd';

// DnD Kit imports
import { 
  DndContext, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragOverlay,
  UniqueIdentifier,
  closestCenter,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

// Drop Indicator line
const DropIndicatorLine = ({ position }: { position: 'before' | 'after' }) => (
  <div 
    className={cn(
      "absolute left-1/2 -translate-x-1/2 w-10 h-[2px] z-50 pointer-events-none",
      "bg-[#5865f2] rounded-full",
      position === 'before' ? "top-0 -translate-y-1" : "bottom-0 translate-y-1"
    )}
  />
);

// Merge Indicator (when hovering to create folder)
const MergeIndicator = ({ progress }: { progress: number }) => (
  <div className="absolute inset-0 rounded-[16px] pointer-events-none overflow-hidden">
    <div 
      className="absolute inset-0 bg-[#5865f2]/30 rounded-[inherit]"
      style={{
        clipPath: `inset(${100 - progress}% 0 0 0)`,
        transition: 'clip-path 50ms linear',
      }}
    />
    <div className="absolute inset-0 border-2 border-[#5865f2] rounded-[inherit] opacity-50" />
  </div>
);

// Sortable Server Icon Component
function SortableServerIcon({
  server,
  isActive,
  unreadCount,
  isShaking,
  showInsertBefore,
  showInsertAfter,
  showMergeIndicator,
  mergeProgress,
  onClick,
  onOpenSettings,
  onMarkAsRead,
  onInvite,
  onCopyId,
  onLeave,
}: {
  server: Server;
  isActive: boolean;
  unreadCount: number;
  isShaking: boolean;
  showInsertBefore: boolean;
  showInsertAfter: boolean;
  showMergeIndicator: boolean;
  mergeProgress: number;
  onClick: () => void;
  onOpenSettings?: () => void;
  onMarkAsRead: () => void;
  onInvite: () => void;
  onCopyId: () => void;
  onLeave: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `server-${server.id}`,
    data: { type: 'server', server },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'opacity 150ms ease' : transition,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn("relative", isDragging && "z-50")}
    >
      {/* Insert indicator BEFORE */}
      {showInsertBefore && <DropIndicatorLine position="before" />}
      
      {/* Insert indicator AFTER */}
      {showInsertAfter && <DropIndicatorLine position="after" />}
      
      {/* Merge indicator (folder creation) */}
      {showMergeIndicator && <MergeIndicator progress={mergeProgress} />}
      
      <ContextMenu>
        <Tooltip>
          <ContextMenuTrigger asChild>
            <TooltipTrigger asChild>
              <button
                {...attributes}
                {...listeners}
                onClick={onClick}
                className={cn(
                  'server-icon relative group select-none',
                  isActive
                    ? 'bg-[#5865f2] text-white rounded-[16px]'
                    : 'bg-card hover:bg-[#5865f2]/80 hover:text-white',
                  isDragging && 'opacity-30 scale-95'
                )}
              >
                {/* Active indicator */}
                <div
                  className={cn(
                    'absolute -left-3 w-1 rounded-r-full bg-foreground transition-all duration-300',
                    isActive
                      ? 'h-10'
                      : unreadCount > 0
                        ? 'h-2'
                        : 'h-0 group-hover:h-5'
                  )}
                />
                
                {server.icon ? (
                  server.icon.startsWith('http') ? (
                    <img 
                      src={server.icon} 
                      alt={server.name}
                      className="w-full h-full object-cover rounded-[inherit] pointer-events-none"
                      draggable={false}
                    />
                  ) : (
                    <span className="text-xl pointer-events-none">{server.icon}</span>
                  )
                ) : (
                  <span className="text-sm font-semibold pointer-events-none">
                    {server.name.slice(0, 2).toUpperCase()}
                  </span>
                )}

                {/* Unread notification badge */}
                {unreadCount > 0 && (
                  <div className={cn(
                    "absolute -bottom-1 -right-1 min-w-[20px] h-5 px-1.5 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground text-xs font-bold border-2 border-sidebar animate-badge-pop",
                    isShaking && "animate-badge-shake"
                  )}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </div>
                )}
              </button>
            </TooltipTrigger>
          </ContextMenuTrigger>
          <TooltipContent side="right">
            <p>{server.name}</p>
          </TooltipContent>
        </Tooltip>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={onMarkAsRead}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Marquer comme lu
          </ContextMenuItem>
          <ContextMenuItem onClick={onInvite}>
            <UserPlus className="w-4 h-4 mr-2" />
            Inviter des personnes
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={onOpenSettings}>
            <Settings className="w-4 h-4 mr-2" />
            Paramètres du serveur
          </ContextMenuItem>
          <ContextMenuItem onClick={onCopyId}>
            <Hash className="w-4 h-4 mr-2" />
            Copier l'ID
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem 
            onClick={onLeave}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Quitter le serveur
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}

// Server Drag Overlay
const ServerDragOverlay = forwardRef<HTMLDivElement, { server: Server }>(({ server }, ref) => {
  return (
    <div ref={ref} className="server-icon bg-[#5865f2] text-white rounded-[16px] scale-110 shadow-2xl opacity-95 cursor-grabbing">
      {server.icon ? (
        server.icon.startsWith('http') ? (
          <img 
            src={server.icon} 
            alt={server.name}
            className="w-full h-full object-cover rounded-[inherit]"
          />
        ) : (
          <span className="text-xl">{server.icon}</span>
        )
      ) : (
        <span className="text-sm font-semibold">
          {server.name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
});
ServerDragOverlay.displayName = 'ServerDragOverlay';

interface ServerListProps {
  servers: Server[];
  activeServerId: string | null;
  onServerSelect: (serverId: string | null) => void;
  onDiscoverClick: () => void;
  onCreateClick: () => void;
  onOpenServerSettings?: (serverId: string) => void;
}

export function ServerList({
  servers,
  activeServerId,
  onServerSelect,
  onDiscoverClick,
  onCreateClick,
  onOpenServerSettings,
}: ServerListProps) {
  const { unreadCounts, markServerAsRead } = useServerUnreadCounts();
  const { unreadCounts: dmUnreadCounts } = useUnreadCounts();
  const { serverOrder, sortServers, reorderServers } = useServerOrder();
  const { 
    folders, 
    createFolder, 
    updateFolder, 
    deleteFolder, 
    addServerToFolder, 
    removeServerFromFolder,
    toggleFolderExpanded,
    getServerIdsInFolders,
  } = useServerFolders();
  const leaveServer = useLeaveServer();
  const { user } = useAuth();

  // Leave server dialog state
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [serverToLeave, setServerToLeave] = useState<Server | null>(null);

  // Get server IDs in folders
  const serverIdsInFolders = useMemo(() => getServerIdsInFolders(), [folders]);
  
  // Filter and sort standalone servers (not in any folder)
  const standaloneServers = useMemo(() => {
    return sortServers(servers.filter(s => !serverIdsInFolders.has(s.id)));
  }, [servers, serverIdsInFolders, sortServers]);

  // Calculate total unread DMs
  const totalUnreadDMs = Object.values(dmUnreadCounts).reduce((acc, count) => acc + count, 0);
  const hasUnreadDMs = Object.values(dmUnreadCounts).some(count => count > 0);

  // DnD Hook
  const {
    activeId,
    activeServer,
    dropIndicator,
    mergeState,
    shouldRestrictVertical,
    handleDragStart,
    handleDragMove,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  } = useServerDnd({
    servers,
    folders,
    standaloneServers,
    serverOrder,
    onReorderServers: reorderServers,
    onCreateFolder: (params) => createFolder.mutate(params),
    onAddToFolder: addServerToFolder,
    onRemoveFromFolder: removeServerFromFolder,
  });

  // Create sortable items for DnD context
  const sortableItems = useMemo(() => {
    const items: UniqueIdentifier[] = [];
    
    // Add folders and their nested servers
    folders.forEach(folder => {
      items.push(`folder-${folder.id}`);
      folder.serverIds.forEach(serverId => {
        items.push(`nested-${folder.id}-${serverId}`);
      });
    });
    
    // Add standalone servers
    standaloneServers.forEach(server => {
      items.push(`server-${server.id}`);
    });
    
    return items;
  }, [folders, standaloneServers]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // DnD modifiers
  const dndModifiers = useMemo(() => {
    return shouldRestrictVertical ? [restrictToVerticalAxis] : [];
  }, [shouldRestrictVertical]);

  // Track previous counts for shake animation
  const prevUnreadCounts = useRef<Record<string, number>>({});
  const prevDMCount = useRef<number>(0);
  const [shakingServers, setShakingServers] = useState<Set<string>>(new Set());
  const [shakingDMs, setShakingDMs] = useState(false);

  useEffect(() => {
    const newShaking = new Set<string>();
    Object.entries(unreadCounts).forEach(([serverId, count]) => {
      const prevCount = prevUnreadCounts.current[serverId] || 0;
      if (count > prevCount) {
        newShaking.add(serverId);
      }
    });

    if (newShaking.size > 0) {
      setShakingServers(newShaking);
      setTimeout(() => setShakingServers(new Set()), 500);
    }

    prevUnreadCounts.current = { ...unreadCounts };
  }, [unreadCounts]);

  useEffect(() => {
    if (totalUnreadDMs > prevDMCount.current) {
      setShakingDMs(true);
      setTimeout(() => setShakingDMs(false), 500);
    }
    prevDMCount.current = totalUnreadDMs;
  }, [totalUnreadDMs]);

  const handleCopyId = (serverId: string) => {
    copyToClipboard(serverId, 'ID serveur copié');
  };

  const handleMarkAsRead = (serverId: string) => {
    markServerAsRead(serverId);
    toast({ title: 'Serveur marqué comme lu' });
  };

  const handleInvite = (serverId: string) => {
    const inviteLink = `${window.location.origin}/invite/${serverId}`;
    copyToClipboard(inviteLink, 'Lien d\'invitation copié');
  };

  const handleLeaveServer = (server: Server) => {
    if (server.ownerId === user?.id) {
      toast({ title: "Vous ne pouvez pas quitter un serveur dont vous êtes propriétaire", variant: "destructive" });
      return;
    }
    setServerToLeave(server);
    setShowLeaveDialog(true);
  };

  const confirmLeaveServer = () => {
    if (!serverToLeave) return;
    leaveServer.mutate(serverToLeave.id, {
      onSuccess: () => {
        setShowLeaveDialog(false);
        setServerToLeave(null);
        if (activeServerId === serverToLeave.id) {
          onServerSelect(null);
        }
      }
    });
  };

  const handleServerClick = (serverId: string) => {
    onServerSelect(serverId);
    markServerAsRead(serverId);
  };

  // Get servers for a folder
  const getServersForFolder = (folder: typeof folders[0]) => {
    return folder.serverIds
      .map(id => servers.find(s => s.id === id))
      .filter((s): s is Server => s !== undefined);
  };

  return (
    <div className="w-[72px] bg-[hsl(var(--sidebar-background))] flex flex-col items-center py-3 gap-2 border-r border-border/50">
      {/* Home / DMs */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onServerSelect(null)}
            className={cn(
              'server-icon bg-card hover:bg-primary hover:text-primary-foreground relative group',
              activeServerId === null && 'bg-primary text-primary-foreground rounded-[16px]'
            )}
          >
            <div
              className={cn(
                'absolute -left-3 w-1 rounded-r-full bg-foreground transition-all duration-300',
                activeServerId === null
                  ? 'h-10'
                  : hasUnreadDMs
                    ? 'h-2'
                    : 'h-0 group-hover:h-5'
              )}
            />
            <MessageCircle className="w-6 h-6" />
            
            {totalUnreadDMs > 0 && (
              <div className={cn(
                "absolute -bottom-1 -right-1 min-w-[20px] h-5 px-1.5 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground text-xs font-bold border-2 border-sidebar animate-badge-pop",
                shakingDMs && "animate-badge-shake"
              )}>
                {totalUnreadDMs > 99 ? '99+' : totalUnreadDMs}
              </div>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Messages Privés</p>
        </TooltipContent>
      </Tooltip>

      <div className="w-8 h-[2px] bg-border rounded-full my-1" />

      {/* Server Icons with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={dndModifiers}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
          <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col items-center gap-2 w-full">
            {/* Render folders first */}
            {folders.map((folder) => (
              <SortableFolderItem
                key={folder.id}
                folder={folder}
                servers={getServersForFolder(folder)}
                activeServerId={activeServerId}
                unreadCounts={unreadCounts}
                onServerSelect={handleServerClick}
                onToggleExpanded={() => toggleFolderExpanded(folder.id)}
                onUpdateFolder={(name, color) => {
                  updateFolder.mutate({
                    folderId: folder.id,
                    updates: { name, color },
                  });
                }}
                onDeleteFolder={() => deleteFolder.mutate(folder.id)}
                onMarkAllAsRead={() => {
                  folder.serverIds.forEach(id => markServerAsRead(id));
                  toast({ title: 'Dossier marqué comme lu' });
                }}
                showDropIndicator={dropIndicator.targetId === folder.id && dropIndicator.type === 'add-to-folder'}
                dropPosition="after"
              />
            ))}

            {/* Render standalone servers */}
            {standaloneServers.map((server) => (
              <SortableServerIcon
                key={server.id}
                server={server}
                isActive={activeServerId === server.id}
                unreadCount={unreadCounts[server.id] ?? 0}
                isShaking={shakingServers.has(server.id)}
                showInsertBefore={dropIndicator.targetId === server.id && dropIndicator.type === 'insert-before'}
                showInsertAfter={dropIndicator.targetId === server.id && dropIndicator.type === 'insert-after'}
                showMergeIndicator={mergeState.targetId === server.id && dropIndicator.type === 'merge'}
                mergeProgress={mergeState.targetId === server.id ? mergeState.progress : 0}
                onClick={() => handleServerClick(server.id)}
                onOpenSettings={() => onOpenServerSettings?.(server.id)}
                onMarkAsRead={() => handleMarkAsRead(server.id)}
                onInvite={() => handleInvite(server.id)}
                onCopyId={() => handleCopyId(server.id)}
                onLeave={() => handleLeaveServer(server)}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
          {activeServer && <ServerDragOverlay server={activeServer} />}
        </DragOverlay>
      </DndContext>

      <div className="w-8 h-[2px] bg-border rounded-full my-1" />

      {/* Action Buttons */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onCreateClick}
            className="server-icon bg-card hover:bg-[#5865f2] hover:text-white text-[#5865f2]"
          >
            <Plus className="w-6 h-6" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Ajouter un serveur</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onDiscoverClick}
            className="server-icon bg-card hover:bg-[#5865f2] hover:text-white text-[#5865f2]"
          >
            <Compass className="w-6 h-6" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Découvrir des serveurs</p>
        </TooltipContent>
      </Tooltip>

      {/* Leave Server Alert Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter « {serverToLeave?.name} »</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir quitter ce serveur ? Vous pourrez le rejoindre à nouveau si vous avez une invitation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmLeaveServer}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Quitter le serveur
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
