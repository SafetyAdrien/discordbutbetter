import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Plus, Compass, MessageCircle } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useServerUnreadCounts } from '@/hooks/useServerUnreadCounts';
import { useServerOrder } from '@/hooks/useServerOrder';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { useChannels } from '@/hooks/useChannels';

import { MobileChannelListView } from './MobileChannelListView';
import { MobileHomeView } from './MobileHomeView';
import { Separator } from '@/components/ui/separator';
import type { Server } from '@/types/app';

import {
  DndContext,
  closestCenter,
  DragOverlay,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

interface MobileServersViewProps {
  servers: Server[];
  activeServerId: string | null;
  rawServers: any[];
  activeDMId: string | null;
  onServerSelect: (serverId: string) => void;
  onChannelSelect: (serverId: string, channelId: string, channelType: string) => void;
  onDiscoverClick: () => void;
  onCreateClick: () => void;
  onOpenSettings?: (initialTab?: string) => void;
  onOpenDM: (conversationId: string) => void;
  onShowFriends: () => void;
}

const ICON_SIZE = 'size-[52px] aspect-square shrink-0';

function SortableMobileServerIcon({
  server,
  isActive,
  hasUnread,
  mentionCount,
  isDragging,
  dragActive,
  dropIndicator,
  onTap,
}: {
  server: Server;
  isActive: boolean;
  hasUnread: boolean;
  mentionCount: number;
  isDragging: boolean;
  dragActive: boolean;
  dropIndicator: 'before' | 'after' | null;
  onTap: () => void;
}) {
  const {
    setNodeRef,
    transform,
    transition,
    attributes,
    listeners,
  } = useSortable({ id: server.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: dragActive ? 'none' : 'manipulation',
  };

  return (
    <div ref={setNodeRef} style={style}>
      {dropIndicator === 'before' && (
        <div className="w-10 h-0.5 bg-primary rounded-full mx-auto mb-0.5" />
      )}
      <button
        {...attributes}
        {...listeners}
        onClick={onTap}
        className={cn(
          'relative flex items-center justify-center w-full py-0.5 group',
          isDragging && 'opacity-30'
        )}
      >
        <div className={cn(
          'absolute -left-[11px] top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-foreground transition-all',
          isActive ? 'h-8' : hasUnread ? 'h-3' : 'h-0 opacity-0'
        )} />

        <div className="relative">
          <Avatar className={cn(
            ICON_SIZE,
            'rounded-2xl transition-all',
            isActive && 'rounded-xl ring-2 ring-primary'
          )}>
            {server.icon?.startsWith('http') ? (
              <AvatarImage src={server.icon} />
            ) : null}
            <AvatarFallback className="bg-muted text-foreground text-base rounded-2xl">
              {server.icon && !server.icon.startsWith('http')
                ? server.icon
                : server.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {mentionCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1.5 flex items-center justify-center text-[11px] font-bold bg-destructive text-destructive-foreground rounded-full border-2 border-[hsl(var(--surface-server-list))]">
              {mentionCount > 99 ? '99+' : mentionCount}
            </span>
          )}
        </div>
      </button>
      {dropIndicator === 'after' && (
        <div className="w-10 h-0.5 bg-primary rounded-full mx-auto mt-0.5" />
      )}
    </div>
  );
}

const ServerIconOverlay = React.forwardRef<HTMLDivElement, { server: Server }>(
  function ServerIconOverlay({ server }, ref) {
    return (
      <div ref={ref} className="scale-110 drop-shadow-lg">
        <Avatar className={cn(ICON_SIZE, 'rounded-2xl')}>
          {server.icon?.startsWith('http') ? (
            <AvatarImage src={server.icon} />
          ) : null}
          <AvatarFallback className="bg-muted text-foreground text-base rounded-2xl">
            {server.icon && !server.icon.startsWith('http')
              ? server.icon
              : server.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }
);

export function MobileServersView({
  servers,
  activeServerId,
  rawServers,
  activeDMId,
  onServerSelect,
  onChannelSelect,
  onDiscoverClick,
  onCreateClick,
  onOpenSettings,
  onOpenDM,
  onShowFriends,
}: MobileServersViewProps) {
  const { unreadInfo } = useServerUnreadCounts();
  const { sortServers, reorderServers } = useServerOrder();
  const { unreadCounts: dmUnreadCounts } = useUnreadCounts();
  const [showDMs, setShowDMs] = useState(false);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(activeServerId);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after'>('after');
  const wasDraggingRef = useRef(false);

  const totalUnreadDMs = Object.values(dmUnreadCounts).reduce((a, b) => a + b, 0);

  const sensors = useSensors(
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
  );

  const sortedServers = useMemo(() => sortServers(servers), [servers, sortServers]);
  const serverIds = useMemo(() => sortedServers.map(s => s.id), [sortedServers]);

  useEffect(() => {
    if (activeServerId && !selectedServerId) {
      setSelectedServerId(activeServerId);
    }
  }, [activeServerId]);

  useEffect(() => {
    if (!selectedServerId && !showDMs && sortedServers.length > 0) {
      setSelectedServerId(sortedServers[0].id);
    }
  }, [sortedServers, selectedServerId, showDMs]);

  const handleDMClick = useCallback(() => {
    if (wasDraggingRef.current) return;
    setShowDMs(true);
    setSelectedServerId(null);
  }, []);

  const handleServerTap = useCallback((serverId: string) => {
    if (wasDraggingRef.current) return;
    setShowDMs(false);
    setSelectedServerId(serverId);
    onServerSelect(serverId);
  }, [onServerSelect]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
    wasDraggingRef.current = true;
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setOverId(null);
      return;
    }
    setOverId(String(over.id));
    const activeIdx = serverIds.indexOf(String(event.active.id));
    const overIdx = serverIds.indexOf(String(over.id));
    setDropPosition(activeIdx < overIdx ? 'after' : 'before');
  }, [serverIds]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    setOverId(null);

    if (over && active.id !== over.id) {
      const oldIndex = serverIds.indexOf(String(active.id));
      const newIndex = serverIds.indexOf(String(over.id));
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(serverIds, oldIndex, newIndex);
        reorderServers(newOrder);
      }
    }

    setTimeout(() => { wasDraggingRef.current = false; }, 300);
  }, [serverIds, reorderServers]);

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
    setOverId(null);
    setTimeout(() => { wasDraggingRef.current = false; }, 300);
  }, []);

  const draggedServer = activeDragId ? sortedServers.find(s => s.id === activeDragId) : null;

  const selectedRawServer = rawServers.find(s => s.id === selectedServerId);

  // Cache-first: prefer hydrated channels from useChannels over potentially-empty rawServers tree
  const { data: channelsData } = useChannels(selectedServerId);

  const resolvedCategoriesSrc = channelsData?.categories ?? selectedRawServer?.categories ?? [];
  const resolvedOrphansSrc = channelsData?.orphanChannels ?? selectedRawServer?.orphanChannels ?? [];

  const categoriesForList = resolvedCategoriesSrc.map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    channels: (cat.channels || []).map((ch: any) => ({
      id: ch.id, name: ch.name, type: ch.type || 'text', description: ch.description, icon_url: ch.icon_url ?? null,
    })),
  }));

  const orphanChannelsForList = (resolvedOrphansSrc || []).map((ch: any) => ({
    id: ch.id, name: ch.name, type: ch.type || 'text', description: ch.description, icon_url: ch.icon_url ?? null,
  }));

  return (
    <div className="flex h-full">
      {/* Left: Server icons column */}
      <div
        data-swipe-ignore="true"
        className={cn(
        'w-[72px] flex-shrink-0 bg-[hsl(var(--surface-server-list))] flex flex-col items-center py-2 gap-1.5 border-r border-border/50 overflow-y-auto scrollbar-hide'
      )}>
        {/* DM Button */}
        <button
          onClick={handleDMClick}
          className={cn(
            ICON_SIZE, 'relative flex items-center justify-center rounded-2xl transition-all',
            showDMs
              ? 'bg-primary text-primary-foreground rounded-2xl'
              : 'bg-surface-3 hover:bg-primary/20 hover:text-primary text-muted-foreground rounded-2xl'
          )}
        >
          <div className={cn(
            'absolute -left-[11px] top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-foreground transition-all',
            showDMs ? 'h-8' : totalUnreadDMs > 0 ? 'h-3' : 'h-0 opacity-0'
          )} />
          <MessageCircle className="w-6 h-6" />
          {totalUnreadDMs > 0 && !showDMs && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full">
              {totalUnreadDMs > 99 ? '99+' : totalUnreadDMs}
            </span>
          )}
        </button>

        <Separator className="w-8 my-1" />

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
            {sortedServers.map((server) => {
              const info = unreadInfo[server.id] || { hasUnread: false, mentionCount: 0 };
              const isOver = overId === server.id && activeDragId !== server.id;
              return (
                <SortableMobileServerIcon
                  key={server.id}
                  server={server}
                  isActive={!showDMs && selectedServerId === server.id}
                  hasUnread={info.hasUnread}
                  mentionCount={info.mentionCount}
                  isDragging={activeDragId === server.id}
                  dragActive={!!activeDragId}
                  dropIndicator={isOver ? dropPosition : null}
                  onTap={() => handleServerTap(server.id)}
                />
              );
            })}
          </SortableContext>

          <DragOverlay dropAnimation={null}>
            {draggedServer ? <ServerIconOverlay server={draggedServer} /> : null}
          </DragOverlay>
        </DndContext>

        {servers.length > 0 && <Separator className="w-8 my-1" />}

        <button
          onClick={onDiscoverClick}
          className={cn(ICON_SIZE, 'flex items-center justify-center rounded-2xl bg-surface-3 hover:bg-primary/20 hover:text-primary transition-colors text-muted-foreground')}
        >
          <Compass className="w-6 h-6" />
        </button>

        <button
          onClick={onCreateClick}
          className={cn(ICON_SIZE, 'flex items-center justify-center rounded-2xl bg-surface-3 hover:bg-primary/20 hover:text-primary transition-colors text-muted-foreground')}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Right: Content panel */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {showDMs ? (
          <MobileHomeView
            activeDMId={activeDMId}
            onConversationSelect={onOpenDM}
            onShowFriends={onShowFriends}
          />
        ) : selectedServerId && (selectedRawServer || servers.find(s => s.id === selectedServerId)) ? (
          <MobileChannelListView
            embedded
            serverName={(selectedRawServer?.name) || servers.find(s => s.id === selectedServerId)?.name || 'Serveur'}
            serverId={selectedServerId}
            categories={categoriesForList}
            orphanChannels={orphanChannelsForList}
            onBack={() => {}}
            onChannelSelect={(channelId, channelType) => {
              onChannelSelect(selectedServerId, channelId, channelType);
            }}
            onOpenSettings={onOpenSettings}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <p className="text-muted-foreground text-sm mb-4">Sélectionnez un serveur</p>
            <button
              onClick={onCreateClick}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
            >
              Créer un serveur
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
