import { Server } from '@/types/app';
import { cn } from '@/lib/utils';
import { Compass, Plus, MessageCircle, Settings, UserPlus, Hash, LogOut, CheckCircle, Volume2 } from 'lucide-react';
import { useServerVoiceParticipants } from '@/hooks/useServerVoiceParticipants';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
import { toast } from 'sonner';
import { useServerUnreadCounts } from '@/hooks/useServerUnreadCounts';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { useServerOrder } from '@/hooks/useServerOrder';
import { useLeaveServer } from '@/hooks/useLeaveServer';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useRef, useMemo, useCallback, forwardRef } from 'react';


// DnD Kit imports
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

// (Drop indicator removed - now rendered inline like mobile)

// Sortable Server Icon Component
function SortableServerIcon({
  server,
  isActive,
  hasUnread,
  mentionCount,
  isShaking,
  isDragging,
  dropIndicator,
  onClick,
  onOpenSettings,
  onMarkAsRead,
  onInvite,
  onCopyId,
  onLeave,
}: {
  server: Server;
  isActive: boolean;
  hasUnread: boolean;
  mentionCount: number;
  isShaking: boolean;
  isDragging: boolean;
  dropIndicator: 'before' | 'after' | null;
  onClick: () => void;
  onOpenSettings?: () => void;
  onMarkAsRead: () => void;
  onInvite: () => void;
  onCopyId: () => void;
  onLeave: () => void;
}) {
  const { data: voiceParticipants } = useServerVoiceParticipants(server.id);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: server.id,
    data: { type: 'server', server },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="relative overflow-visible will-change-transform"
    >
      {/* Inline drop indicator - before */}
      {dropIndicator === 'before' && (
        <div className="w-10 h-[2px] bg-primary rounded-full mx-auto mb-0.5 shadow-[0_0_4px_hsl(var(--primary)/0.5)]" />
      )}
      
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
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface-3 hover:bg-primary/80 hover:text-primary-foreground',
                    isDragging && 'opacity-30'
                  )}
                >
                  {/* Active pill indicator */}
                  <div
                    className={cn(
                      'absolute -left-[14px] w-[4px] rounded-r-full bg-foreground',
                      isActive
                        ? 'h-10'
                        : hasUnread || mentionCount > 0
                          ? 'h-2'
                          : 'h-0 group-hover:h-5'
                    )}
                    style={{ transition: 'height 300ms cubic-bezier(0.2, 0, 0, 1)' }}
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

                {/* Voice activity badge - top right */}
                {voiceParticipants && voiceParticipants.length > 0 && mentionCount === 0 && (
                  <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-black rounded-full flex items-center justify-center border-2 border-sidebar">
                    <Volume2 className="w-3.5 h-3.5 text-white" />
                  </div>
                )}

                {/* Mention notification badge - ONLY shows for mentions, not general unreads */}
                {mentionCount > 0 && (
                  <div className={cn(
                    "absolute -bottom-1 -right-1 min-w-[20px] h-5 px-1.5 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground text-xs font-bold border-2 border-surface-1 animate-badge-pop",
                    isShaking && "animate-badge-shake"
                  )}
                  style={{ boxShadow: 'var(--shadow-elevation-1)' }}>
                    {mentionCount > 99 ? '99+' : mentionCount}
                  </div>
                )}
              </button>
            </TooltipTrigger>
          </ContextMenuTrigger>
          <TooltipContent side="right" className="max-w-[200px]">
            <p className="font-semibold">{server.name}</p>
            {voiceParticipants && voiceParticipants.length > 0 && (
              <div className="mt-1.5 pt-1.5 border-t border-border/50">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-muted-foreground/30 flex items-center justify-center shrink-0">
                    <Volume2 className="w-3 h-3 text-white" />
                  </div>
                  <div className="flex items-center -space-x-1.5">
                    {voiceParticipants.slice(0, 3).map((p) => (
                      <Avatar key={p.user_id} className="w-4 h-4 border border-popover">
                        {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                        <AvatarFallback className="text-[7px] bg-muted">
                          {p.display_name.slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  {voiceParticipants.length > 3 && (
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      +{voiceParticipants.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )}
          </TooltipContent>
        </Tooltip>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onSelect={onMarkAsRead}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Marquer comme lu
          </ContextMenuItem>
          <ContextMenuItem onSelect={onInvite}>
            <UserPlus className="w-4 h-4 mr-2" />
            Inviter des personnes
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={onOpenSettings}>
            <Settings className="w-4 h-4 mr-2" />
            Paramètres du serveur
          </ContextMenuItem>
          <ContextMenuItem onSelect={onCopyId}>
            <Hash className="w-4 h-4 mr-2" />
            Copier l'ID
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem 
            onSelect={(e) => {
              e.preventDefault();
              onLeave();
            }}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Quitter le serveur
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {/* Inline drop indicator - after */}
      {dropIndicator === 'after' && (
        <div className="w-10 h-[2px] bg-primary rounded-full mx-auto mt-0.5 shadow-[0_0_4px_hsl(var(--primary)/0.5)]" />
      )}
    </div>
  );
}

// Server Drag Overlay
const ServerDragOverlay = forwardRef<HTMLDivElement, { server: Server }>(({ server }, ref) => {
  return (
    <div
      ref={ref}
      className="server-icon bg-primary text-primary-foreground scale-110 opacity-95 cursor-grabbing"
      style={{ boxShadow: 'var(--shadow-elevation-3)' }}
    >
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
  const { unreadInfo, markServerAsRead } = useServerUnreadCounts();
  const { unreadCounts: dmUnreadCounts } = useUnreadCounts();
  const { sortServers, reorderServers } = useServerOrder();
  const leaveServer = useLeaveServer();
  const { user } = useAuth();
  

  // Leave server dialog state
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [serverToLeave, setServerToLeave] = useState<Server | null>(null);

  // Sort servers by user's custom order
  const sortedServers = useMemo(() => sortServers(servers), [servers, sortServers]);
  const serverIds = useMemo(() => sortedServers.map(s => s.id), [sortedServers]);

  // Calculate total unread DMs
  const totalUnreadDMs = Object.values(dmUnreadCounts).reduce((acc, count) => acc + count, 0);
  const hasUnreadDMs = Object.values(dmUnreadCounts).some(count => count > 0);

  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after'>('after');
  const wasDraggingRef = useRef(false);
  
  const activeServer = activeId ? sortedServers.find(s => s.id === activeId) : null;

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // Track previous counts for shake animation
  const prevMentionCounts = useRef<Record<string, number>>({});
  const prevDMCount = useRef<number>(0);
  const [shakingServers, setShakingServers] = useState<Set<string>>(new Set());
  const [shakingDMs, setShakingDMs] = useState(false);

  useEffect(() => {
    const newShaking = new Set<string>();
    Object.entries(unreadInfo).forEach(([serverId, info]) => {
      const prevCount = prevMentionCounts.current[serverId] || 0;
      if (info.mentionCount > prevCount) {
        newShaking.add(serverId);
      }
    });

    if (newShaking.size > 0) {
      setShakingServers(newShaking);
      setTimeout(() => setShakingServers(new Set()), 500);
    }

    const newPrevCounts: Record<string, number> = {};
    Object.entries(unreadInfo).forEach(([serverId, info]) => {
      newPrevCounts[serverId] = info.mentionCount;
    });
    prevMentionCounts.current = newPrevCounts;
  }, [unreadInfo]);

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
    toast.success('Serveur marqué comme lu');
  };

  const handleInvite = (serverId: string) => {
    const inviteLink = `${window.location.origin}/invite/${serverId}`;
    copyToClipboard(inviteLink, 'Lien d\'invitation copié');
  };

  const handleLeaveServer = (server: Server) => {
    console.log('[DEBUG] handleLeaveServer called for server:', server.id, server.name);
    console.log('[DEBUG] Current user:', user?.id);
    console.log('[DEBUG] Server owner:', server.ownerId);
    // Check if user is the owner
    if (server.ownerId === user?.id) {
      console.log('[DEBUG] User is owner, cannot leave');
      toast.error("Vous ne pouvez pas quitter un serveur dont vous êtes propriétaire");
      return;
    }
    console.log('[DEBUG] Opening leave dialog');
    setServerToLeave(server);
    setShowLeaveDialog(true);
  };

  const confirmLeaveServer = () => {
    console.log('[DEBUG] confirmLeaveServer called');
    console.log('[DEBUG] serverToLeave:', serverToLeave?.id);
    if (!serverToLeave) {
      console.log('[DEBUG] No server to leave');
      return;
    }
    console.log('[DEBUG] Calling leaveServer.mutate');
    leaveServer.mutate(serverToLeave.id, {
      onSuccess: () => {
        console.log('[DEBUG] Leave server success');
        setShowLeaveDialog(false);
        setServerToLeave(null);
        // Redirection is handled reactively by Index.tsx useEffect
      },
      onError: (error) => {
        console.log('[DEBUG] Leave server error:', error);
      }
    });
  };

  const handleServerClick = useCallback((serverId: string) => {
    if (wasDraggingRef.current) return;
    onServerSelect(serverId);
    markServerAsRead(serverId);
  }, [onServerSelect, markServerAsRead]);

  // DnD handlers (mobile-style)
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    wasDraggingRef.current = true;
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || over.id === active.id) {
      setOverId(null);
      return;
    }
    setOverId(over.id as string);
    const activeIdx = serverIds.indexOf(active.id as string);
    const overIdx = serverIds.indexOf(over.id as string);
    setDropPosition(activeIdx < overIdx ? 'after' : 'before');
  }, [serverIds]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (over && active.id !== over.id) {
      const oldIndex = serverIds.indexOf(active.id as string);
      const newIndex = serverIds.indexOf(over.id as string);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(serverIds, oldIndex, newIndex);
        reorderServers(newOrder);
      }
    }

    setTimeout(() => { wasDraggingRef.current = false; }, 100);
  }, [serverIds, reorderServers]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverId(null);
    setTimeout(() => { wasDraggingRef.current = false; }, 100);
  }, []);

  return (
    <div className="w-[80px] bg-[hsl(var(--surface-server-list))] border-r border-border/20 flex flex-col items-center py-3 gap-1.5">
      {/* Home / DMs */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onServerSelect(null)}
            className={cn(
              'server-icon relative group',
              activeServerId === null 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-surface-3 hover:bg-primary hover:text-primary-foreground'
            )}
          >
            {/* Pill highlight behind active icon */}
            {activeServerId === null && (
              <div className="absolute -left-[14px] w-[4px] h-10 rounded-r-full bg-foreground" 
                style={{ transition: 'height 300ms cubic-bezier(0.2, 0, 0, 1)' }} />
            )}
            {activeServerId !== null && hasUnreadDMs && (
              <div className="absolute -left-[14px] w-[4px] h-2 rounded-r-full bg-foreground" />
            )}
            {activeServerId !== null && !hasUnreadDMs && (
              <div className="absolute -left-[14px] w-[4px] h-0 group-hover:h-5 rounded-r-full bg-foreground"
                style={{ transition: 'height 300ms cubic-bezier(0.2, 0, 0, 1)' }} />
            )}
            <MessageCircle className="w-6 h-6" />
            
            {totalUnreadDMs > 0 && (
              <div className={cn(
                "absolute -bottom-1 -right-1 min-w-[20px] h-5 px-1.5 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground text-xs font-bold border-2 border-surface-1 animate-badge-pop",
                shakingDMs && "animate-badge-shake"
              )}
              style={{ boxShadow: 'var(--shadow-elevation-1)' }}>
                {totalUnreadDMs > 99 ? '99+' : totalUnreadDMs}
              </div>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Messages Privés</p>
        </TooltipContent>
      </Tooltip>

      <div className="w-10 h-[3px] bg-surface-3 rounded-full my-1" />

      {/* Server Icons with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={serverIds} strategy={verticalListSortingStrategy}>
          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin flex flex-col items-center gap-2 w-full pt-1">
            {sortedServers.map((server) => {
              const serverInfo = unreadInfo[server.id] || { hasUnread: false, mentionCount: 0 };
              return (
                <SortableServerIcon
                  key={server.id}
                  server={server}
                  isActive={activeServerId === server.id}
                  hasUnread={serverInfo.hasUnread}
                  mentionCount={serverInfo.mentionCount}
                  isShaking={shakingServers.has(server.id)}
                  isDragging={activeId === server.id}
                  dropIndicator={overId === server.id && activeId !== server.id ? dropPosition : null}
                  onClick={() => handleServerClick(server.id)}
                  onOpenSettings={() => onOpenServerSettings?.(server.id)}
                  onMarkAsRead={() => handleMarkAsRead(server.id)}
                  onInvite={() => handleInvite(server.id)}
                  onCopyId={() => handleCopyId(server.id)}
                  onLeave={() => handleLeaveServer(server)}
                />
              );
            })}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {activeServer && <ServerDragOverlay server={activeServer} />}
        </DragOverlay>
      </DndContext>

      <div className="w-10 h-[3px] bg-surface-3 rounded-full my-1" />

      {/* Action Buttons */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onCreateClick}
            className="server-icon bg-surface-3 hover:bg-status-online hover:text-primary-foreground text-status-online"
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
            className="server-icon bg-surface-3 hover:bg-primary hover:text-primary-foreground text-primary"
          >
            <Compass className="w-6 h-6" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Découvrir des serveurs</p>
        </TooltipContent>
      </Tooltip>

      {/* Leave Server Confirmation Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter le serveur</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir quitter <strong>{serverToLeave?.name}</strong> ? Vous pourrez rejoindre à nouveau avec
              une invitation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setServerToLeave(null)}>Annuler</AlertDialogCancel>
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
