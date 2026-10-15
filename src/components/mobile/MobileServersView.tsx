import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Plus, MessageCircle } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useServerUnreadCounts } from '@/hooks/useServerUnreadCounts';
import { useServerOrder } from '@/hooks/useServerOrder';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { useDMMentionCounts } from '@/hooks/useDMMentionCounts';
import { useChannels } from '@/hooks/useChannels';

import { MobileChannelListView } from './MobileChannelListView';
import { MobileHomeView } from './MobileHomeView';
import { MobileServerActionSheet } from './MobileServerActionSheet';
import { Separator } from '@/components/ui/separator';
import type { Server } from '@/types/app';
import { MentionBadge } from '@/components/ui/MentionBadge';
import { useLongPress } from '@/hooks/useLongPress';

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
  onChannelSelect: (serverId: string, channelId: string, channelType: string, channelName?: string) => void;
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
  isShaking,
  isDragging,
  dragActive,
  dropIndicator,
  onTap,
  onLongPress,
}: {
  server: Server;
  isActive: boolean;
  hasUnread: boolean;
  mentionCount: number;
  isShaking: boolean;
  isDragging: boolean;
  dragActive: boolean;
  dropIndicator: 'before' | 'after' | null;
  onTap: () => void;
  onLongPress: () => void;
}) {
  const {
    setNodeRef,
    transform,
    transition,
    attributes,
    listeners,
  } = useSortable({ id: server.id });

  const longPress = useLongPress({ onLongPress });

  // A real drag starting mid-press means the finger moved — cancel the pending long-press.
  useEffect(() => {
    if (isDragging) longPress.onTouchMove();
  }, [isDragging]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: dragActive ? 'none' : 'manipulation',
    // Windowing: skip rendering work for off-screen icons
    contentVisibility: dragActive ? 'visible' : 'auto',
    containIntrinsicSize: '56px 56px',
  } as React.CSSProperties;

  return (
    <div ref={setNodeRef} style={style} className="group relative w-full flex flex-col items-center overflow-visible">

      {dropIndicator === 'before' && (
        <div className="w-10 h-0.5 bg-primary rounded-full mx-auto mb-0.5" />
      )}
      {/* Active pill indicator — same style/behavior as desktop */}
      <div
        className={cn(
          'absolute left-0 top-1/2 -translate-y-1/2 w-[4px] rounded-r-full bg-foreground pointer-events-none z-10',
          isActive
            ? 'h-10'
            : hasUnread || mentionCount > 0
              ? 'h-2'
              : 'h-0 group-hover:h-5'
        )}
        style={{ transition: 'height 300ms' }}
      />
      <button type="button"
        {...attributes}
        {...listeners}
        onClick={onTap}
        onTouchStart={(e) => {
          listeners?.onTouchStart?.(e);
          longPress.onTouchStart(e);
        }}
        onTouchMove={(e) => {
          listeners?.onTouchMove?.(e);
          longPress.onTouchMove(e);
        }}
        onTouchEnd={(e) => {
          listeners?.onTouchEnd?.(e);
          longPress.onTouchEnd();
        }}
        onTouchCancel={(e) => {
          listeners?.onTouchCancel?.(e);
          longPress.onTouchCancel();
        }}
        className={cn(
          'relative flex items-center justify-center py-0.5 group',
          isDragging && 'opacity-30'
        )}
      >
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

          <MentionBadge
            count={mentionCount}
            size="lg"
            className={cn(
              'absolute top-0 right-0 translate-x-[35%] -translate-y-[35%] border-2 border-[hsl(var(--surface-server-list))] animate-badge-pop',
              isShaking && 'animate-badge-shake'
            )}
            style={{ boxShadow: 'var(--shadow-elevation-1)' }}
          />
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
  onCreateClick,
  onOpenSettings,
  onOpenDM,
  onShowFriends,
}: MobileServersViewProps) {
  const { unreadInfo } = useServerUnreadCounts();
  const { sortServers, reorderServers } = useServerOrder();
  const { unreadCounts: dmUnreadCounts } = useUnreadCounts();
  const { totalMentionCount: totalDMMentions } = useDMMentionCounts();
  const [showDMs, setShowDMs] = useState(false);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(activeServerId);
  const [actionSheetServer, setActionSheetServer] = useState<Server | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after'>('after');
  const wasDraggingRef = useRef(false);

  const totalUnreadDMs = Object.values(dmUnreadCounts).reduce((a, b) => a + b, 0);

  // Shake animation state — mirrors desktop ServerList
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
    if (totalDMMentions > prevDMCount.current) {
      setShakingDMs(true);
      setTimeout(() => setShakingDMs(false), 500);
    }
    prevDMCount.current = totalDMMentions;
  }, [totalDMMentions]);

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
      return;
    }
    // Recover when the selected server has disappeared (left/deleted)
    if (selectedServerId && sortedServers.length > 0 && !sortedServers.some(s => s.id === selectedServerId)) {
      setSelectedServerId(sortedServers[0].id);
      return;
    }
    // No servers left at all → show DMs
    if (sortedServers.length === 0 && selectedServerId) {
      setSelectedServerId(null);
      setShowDMs(true);
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
    <div className="flex h-full bg-[hsl(var(--surface-server-list))]">
      {/* Left: Server icons column */}
      <div
        data-swipe-ignore="true"
        className={cn(
        'w-[72px] flex-shrink-0 bg-[hsl(var(--surface-server-list))] flex flex-col items-center py-2 gap-1.5'
      )}>
        {/* DM Button */}
        <div className="group relative w-full flex justify-center">
          <div
            className={cn(
              'absolute left-0 top-1/2 -translate-y-1/2 w-[4px] rounded-r-full bg-foreground pointer-events-none z-10',
              showDMs
                ? 'h-10'
                : totalUnreadDMs > 0 || totalDMMentions > 0
                  ? 'h-2'
                  : 'h-0 group-hover:h-5'
            )}
            style={{ transition: 'height 300ms' }}
          />
          <button type="button"
            onClick={handleDMClick}
            className={cn(
              ICON_SIZE, 'relative flex items-center justify-center rounded-2xl transition-all',
              showDMs
                ? 'bg-primary text-primary-foreground rounded-2xl'
                : 'bg-surface-3 hover:bg-primary/20 hover:text-primary text-muted-foreground rounded-2xl'
            )}
          >
            <MessageCircle className="w-6 h-6" />
            {totalDMMentions > 0 && !showDMs ? (
              <MentionBadge
                count={totalDMMentions}
                size="md"
                className={cn(
                  'absolute bottom-0 right-0 translate-x-[35%] translate-y-[35%] border-2 border-[hsl(var(--surface-server-list))] animate-badge-pop',
                  shakingDMs && 'animate-badge-shake'
                )}
                style={{ boxShadow: 'var(--shadow-elevation-1)' }}
              />
            ) : totalUnreadDMs > 0 && !showDMs ? (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-foreground border-2 border-[hsl(var(--surface-server-list))]" />
            ) : null}
          </button>
        </div>

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
                  isShaking={shakingServers.has(server.id)}
                  isDragging={activeDragId === server.id}
                  dragActive={!!activeDragId}
                  dropIndicator={isOver ? dropPosition : null}
                  onTap={() => handleServerTap(server.id)}
                  onLongPress={() => setActionSheetServer(server)}
                />
              );
            })}
          </SortableContext>

          <DragOverlay dropAnimation={null}>
            {draggedServer ? <ServerIconOverlay server={draggedServer} /> : null}
          </DragOverlay>
        </DndContext>

        {servers.length > 0 && <Separator className="w-8 my-1" />}

        <button type="button"
          onClick={onCreateClick}
          className={cn(ICON_SIZE, 'flex items-center justify-center rounded-2xl bg-surface-3 hover:bg-primary/20 hover:text-primary transition-colors text-muted-foreground')}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Right: Content panel */}
      <div className="flex-1 min-w-0 overflow-hidden rounded-tl-[30px] bg-[hsl(var(--surface-1))]">
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
            onChannelSelect={(channelId, channelType, channelName) => {
              if (!selectedServerId) return;
              onChannelSelect(selectedServerId, channelId, channelType, channelName);
            }}
            onOpenSettings={onOpenSettings}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <p className="text-muted-foreground text-sm mb-4">Sélectionnez un serveur</p>
            <button type="button"
              onClick={onCreateClick}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
            >
              Créer un serveur
            </button>
          </div>
        )}
      </div>

      <MobileServerActionSheet
        server={actionSheetServer}
        open={!!actionSheetServer}
        onOpenChange={(open) => !open && setActionSheetServer(null)}
        onOpenSettings={() => {
          if (!actionSheetServer) return;
          handleServerTap(actionSheetServer.id);
          onOpenSettings?.();
        }}
      />
    </div>
  );
}
