import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import React from 'react';
import { GripVertical, Plus, ArrowUpDown, FolderOpen, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { channelIcons } from '@/lib/channelIcons';
import { useChannels, useReorderCategories, useReorderChannels, type CategoryWithChannels, type OrphanChannel } from '@/hooks/useChannels';
import { resolveCategoryDropTarget, pickCategoryDropTarget, type CategoryDropTarget } from '@/lib/dnd/categoryDropTarget';
import { CreateChannelModal } from '@/components/modals/CreateChannelModal';
import { Button } from '@/components/ui/button';
import {
  DndContext,
  closestCenter,
  pointerWithin,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragOverlay,
  type CollisionDetection,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

interface Props {
  serverId: string;
}

type DropPosition = 'before' | 'after';

/** Drop indicator — a small semi-transparent blue dot instead of a line. */
function DropIndicator({ isVisible, position }: { isVisible: boolean; position: DropPosition; variant?: 'channel' | 'category' }) {
  return (
    <div
      data-visible={isVisible ? 'true' : 'false'}
      className={cn(
        'absolute -left-3 z-50 pointer-events-none',
        'w-2 h-2 rounded-full bg-primary/50',
        isVisible ? 'opacity-100' : 'opacity-0',
        position === 'before' ? 'top-0 -translate-y-1/2' : 'bottom-0 translate-y-1/2',
      )}
    />
  );
}

function getDragClientYFallback(event: DragOverEvent | DragEndEvent): number | null {
  const activatorEvent = event.activatorEvent as MouseEvent | TouchEvent | null;
  if (!activatorEvent) return null;
  if ('clientY' in activatorEvent) return activatorEvent.clientY + event.delta.y;
  if (!('touches' in activatorEvent)) return null;
  const touch = activatorEvent.touches[0] || (activatorEvent as TouchEvent).changedTouches?.[0];
  return touch ? touch.clientY + event.delta.y : null;
}

function ChannelIcon({ type }: { type: string }) {
  const Icon = channelIcons[type] || channelIcons.text;
  return <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />;
}

function SortableChannelRow({
  channel,
  reordering,
  showDropIndicator,
  dropPosition,
}: {
  channel: OrphanChannel;
  reordering: boolean;
  showDropIndicator: boolean;
  dropPosition: DropPosition;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `channel-${channel.id}`,
    disabled: !reordering,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn('relative', isDragging && 'opacity-40 z-10')}>
      <DropIndicator isVisible={showDropIndicator} position={dropPosition} variant="channel" />
      <div
        {...(reordering ? { ...attributes, ...listeners } : {})}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-md bg-muted/40',
          reordering && 'cursor-grab active:cursor-grabbing touch-none',
        )}
      >
        {reordering && <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />}
        <ChannelIcon type={channel.type} />
        <span className="text-sm truncate">{channel.name}</span>
      </div>
    </div>
  );
}

function SortableCategoryBlock({
  category,
  reordering,
  showDropIndicator,
  dropPosition,
  children,
}: {
  category: CategoryWithChannels;
  reordering: boolean;
  showDropIndicator: boolean;
  dropPosition: DropPosition;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `category-${category.id}`,
    disabled: !reordering,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div className={cn('relative', isDragging && 'opacity-40 z-10')}>
      {/* setNodeRef stays on the header only — never the whole block — so
          collision detection never has to choose between a channel's small
          rect and the category's large rect (which would always win). */}
      <div
        ref={setNodeRef}
        style={style}
        data-dnd-type="category"
        data-category-id={category.id}
        className="relative flex items-center gap-1.5 px-1 py-2.5 -my-1.5"
        {...(reordering ? { ...attributes, ...listeners } : {})}
      >
        <DropIndicator isVisible={showDropIndicator} position={dropPosition} variant="category" />
        {reordering && <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0 cursor-grab active:cursor-grabbing touch-none" />}
        <FolderOpen className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{category.name}</span>
      </div>
      <div className="space-y-1 pl-2 mt-1">{children}</div>
    </div>
  );
}

const TOP_ORPHAN_DROP_ID = 'server-channels-top-orphan-drop';

function TopOrphanDropTarget({ isChannelDrag, isVisible }: { isChannelDrag: boolean; isVisible: boolean }) {
  const { setNodeRef } = useDroppable({ id: TOP_ORPHAN_DROP_ID, disabled: !isChannelDrag });
  if (!isChannelDrag) return null;
  return (
    <div ref={setNodeRef} className="relative h-1">
      <DropIndicator isVisible={isVisible} position="before" variant="channel" />
    </div>
  );
}

export function ServerChannelsManager({ serverId }: Props) {
  const { data } = useChannels(serverId);
  const reorderCategories = useReorderCategories();
  const reorderChannels = useReorderChannels();
  const [reordering, setReordering] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Draft copy used while reordering — dragging only mutates this local
  // state. Nothing is persisted until "Enregistrer" is clicked; "Annuler"
  // just discards the draft and restores the server's actual order.
  const [draftCategories, setDraftCategories] = useState<CategoryWithChannels[]>([]);
  const [draftOrphans, setDraftOrphans] = useState<OrphanChannel[]>([]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dropPositionRef = useRef<DropPosition>('after');
  const [dropPosition, setDropPosition] = useState<DropPosition>('after');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  // @dnd-kit's PointerSensor/TouchSensor fire real pointermove/touchmove events
  // during a drag (unlike native HTML5 drag&drop, which only fires "dragover").
  // Track the live cursor position from those so drop-position detection reads
  // the actual pointer instead of a derived (and sometimes stale) delta.
  const liveClientYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!activeId) {
      liveClientYRef.current = null;
      return;
    }
    const handlePointerMove = (e: PointerEvent) => {
      liveClientYRef.current = e.clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) liveClientYRef.current = touch.clientY;
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [activeId]);

  const getDragClientY = useCallback((event: DragOverEvent | DragEndEvent): number | null => {
    if (liveClientYRef.current !== null) return liveClientYRef.current;
    return getDragClientYFallback(event);
  }, []);

  const liveCategories = useMemo(() => data?.categories ?? [], [data]);
  const liveOrphanChannels = useMemo(() => data?.orphanChannels ?? [], [data]);

  // While reordering, read/write the local draft so nothing hits the server
  // until "Enregistrer" — otherwise reflect the live server data directly.
  const categories = reordering ? draftCategories : liveCategories;
  const orphanChannels = reordering ? draftOrphans : liveOrphanChannels;
  const categoryIds = useMemo(() => categories.map((c) => `category-${c.id}`), [categories]);

  const categoriesForSelector = useMemo(
    () => categories.map((c) => ({ id: c.id, name: c.name })),
    [categories],
  );

  const allChannelSortIds = useMemo(() => {
    const ids = orphanChannels.map((c) => `channel-${c.id}`);
    categories.forEach((cat) => cat.channels.forEach((c) => ids.push(`channel-${c.id}`)));
    return ids;
  }, [categories, orphanChannels]);

  const findChannelCategory = useCallback((channelId: string): string | null => {
    for (const cat of categories) {
      if (cat.channels.some((c) => c.id === channelId)) return cat.id;
    }
    return null;
  }, [categories]);

  const getCategoryDropTarget = useCallback((activeCategoryId: string, event: DragOverEvent | DragEndEvent): CategoryDropTarget | null => {
    const clientY = getDragClientY(event);
    if (clientY === null) return null;
    const headers = Array.from(
      document.querySelectorAll<HTMLElement>('[data-dnd-type="category"][data-category-id]'),
    )
      .map((el) => ({ id: el.dataset.categoryId!, rect: el.getBoundingClientRect() }))
      .filter((h) => h.id && h.id !== activeCategoryId);
    return resolveCategoryDropTarget(headers.map((h) => ({ id: h.id, top: h.rect.top, height: h.rect.height })), clientY);
  }, [getDragClientY]);

  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    const activeIdStr = args.active.id.toString();
    const isCategory = activeIdStr.startsWith('category-');
    const containers = args.droppableContainers.filter((c) => {
      const id = c.id.toString();
      if (id === activeIdStr) return false;
      if (isCategory) return id.startsWith('category-');
      return id.startsWith('channel-') || id.startsWith('category-') || id === TOP_ORPHAN_DROP_ID;
    });
    const pointerHits = pointerWithin({ ...args, droppableContainers: containers });
    return pointerHits.length > 0 ? pointerHits : closestCenter({ ...args, droppableContainers: containers });
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    dropPositionRef.current = 'after';
    setDropPosition('after');
    setOverId(null);
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    const activeIdStr = active.id.toString();

    if (activeIdStr.startsWith('category-')) {
      const activeCatId = activeIdStr.replace('category-', '');
      const target = getCategoryDropTarget(activeCatId, event);
      if (!target) { setOverId(null); return; }
      dropPositionRef.current = target.position;
      setDropPosition(target.position);
      setOverId(`category-${target.overCatId}`);
      return;
    }

    if (!over || over.id === active.id) {
      setOverId(null);
      return;
    }
    const overIdStr = over.id.toString();

    if (overIdStr === TOP_ORPHAN_DROP_ID) {
      dropPositionRef.current = 'before';
      setDropPosition('before');
      setOverId(TOP_ORPHAN_DROP_ID);
      return;
    }

    // Hovering a category header while dragging a channel always means
    // "insert at the top of this category" — unambiguous, no before/after
    // split on a thin header (that math was disconnected from the actual
    // insert position and made the drop feel random).
    if (overIdStr.startsWith('category-')) {
      dropPositionRef.current = 'before';
      setDropPosition('before');
      setOverId(overIdStr);
      return;
    }

    const overRect = over.rect;
    if (overRect) {
      const clientY = getDragClientY(event) ?? 0;
      const middleY = overRect.top + overRect.height * 0.5;
      const position: DropPosition = clientY < middleY ? 'before' : 'after';
      dropPositionRef.current = position;
      setDropPosition(position);
    }
    setOverId(overIdStr);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const currentDropPosition = dropPositionRef.current;
    const lastOverId = overId;
    setOverId(null);
    setActiveId(null);
    const { active, over } = event;
    const activeIdStr = active.id as string;
    const overIdStr = over?.id as string | undefined;

    // Category reordering — updates the local draft only, nothing is sent to the server yet.
    if (activeIdStr.startsWith('category-')) {
      const activeCatId = activeIdStr.replace('category-', '');
      const hoverTarget = lastOverId?.startsWith('category-') && lastOverId !== activeIdStr
        ? { overCatId: lastOverId.replace('category-', ''), position: currentDropPosition }
        : null;
      const resolved = pickCategoryDropTarget(hoverTarget, getCategoryDropTarget(activeCatId, event));
      if (!resolved) return;

      const oldIndex = categories.findIndex((c) => c.id === activeCatId);
      const overIndex = categories.findIndex((c) => c.id === resolved.overCatId);
      if (oldIndex === -1 || overIndex === -1) return;

      const activeCategory = categories[oldIndex];
      const remaining = categories.filter((c) => c.id !== activeCatId);
      let insertIndex = resolved.position === 'before' ? overIndex : overIndex + 1;
      if (oldIndex < overIndex) insertIndex--;
      insertIndex = Math.max(0, Math.min(insertIndex, remaining.length));
      remaining.splice(insertIndex, 0, activeCategory);
      setDraftCategories(remaining);
      return;
    }

    if (!over || !overIdStr || active.id === over.id) return;

    // Channel reordering / moving between categories — local draft only.
    if (activeIdStr.startsWith('channel-')) {
      const activeChannelId = activeIdStr.replace('channel-', '');
      const sourceCategoryId = findChannelCategory(activeChannelId);

      if (overIdStr === TOP_ORPHAN_DROP_ID) {
        const activeChannel = [...orphanChannels, ...categories.flatMap((c) => c.channels)].find((c) => c.id === activeChannelId);
        if (!activeChannel) return;
        const rest = orphanChannels.filter((c) => c.id !== activeChannelId);
        setDraftOrphans([activeChannel, ...rest]);
        if (sourceCategoryId) {
          setDraftCategories(categories.map((cat) =>
            cat.id === sourceCategoryId
              ? { ...cat, channels: cat.channels.filter((c) => c.id !== activeChannelId) }
              : cat
          ));
        }
        return;
      }

      if (overIdStr.startsWith('channel-')) {
        const overChannelId = overIdStr.replace('channel-', '');
        const targetCategoryId = findChannelCategory(overChannelId);
        const targetChannels = targetCategoryId
          ? categories.find((c) => c.id === targetCategoryId)!.channels
          : orphanChannels;

        const allChannels = [...orphanChannels, ...categories.flatMap((c) => c.channels)];
        const activeChannel = allChannels.find((c) => c.id === activeChannelId);
        if (!activeChannel) return;

        let newTargetChannels: OrphanChannel[];
        if (sourceCategoryId === targetCategoryId) {
          const oldIndex = targetChannels.findIndex((c) => c.id === activeChannelId);
          const overIndex = targetChannels.findIndex((c) => c.id === overChannelId);
          if (oldIndex === -1 || overIndex === -1) return;
          const filtered = targetChannels.filter((c) => c.id !== activeChannelId);
          let insertIndex = currentDropPosition === 'before' ? overIndex : overIndex + 1;
          if (oldIndex < overIndex) insertIndex--;
          insertIndex = Math.max(0, Math.min(insertIndex, filtered.length));
          filtered.splice(insertIndex, 0, activeChannel);
          newTargetChannels = filtered;
        } else {
          const filtered = targetChannels.filter((c) => c.id !== activeChannelId);
          const overIndex = filtered.findIndex((c) => c.id === overChannelId);
          const insertIndex = currentDropPosition === 'before' ? overIndex : overIndex + 1;
          newTargetChannels = [...filtered.slice(0, insertIndex), activeChannel, ...filtered.slice(insertIndex)];
        }

        if (targetCategoryId === null) {
          setDraftOrphans(newTargetChannels);
        } else {
          setDraftCategories((prev) => prev.map((cat) => (cat.id === targetCategoryId ? { ...cat, channels: newTargetChannels } : cat)));
        }
        if (sourceCategoryId !== targetCategoryId) {
          if (sourceCategoryId === null) {
            setDraftOrphans((prev) => prev.filter((c) => c.id !== activeChannelId));
          } else {
            setDraftCategories((prev) => prev.map((cat) =>
              cat.id === sourceCategoryId ? { ...cat, channels: cat.channels.filter((c) => c.id !== activeChannelId) } : cat
            ));
          }
        }
        return;
      }

      if (overIdStr.startsWith('category-')) {
        const targetCategoryId = overIdStr.replace('category-', '');
        const targetCategory = categories.find((c) => c.id === targetCategoryId);
        if (!targetCategory) return;
        const activeChannel = [...orphanChannels, ...categories.flatMap((c) => c.channels)].find((c) => c.id === activeChannelId);
        if (!activeChannel) return;

        // Dropping directly on a category header always inserts at the top
        // of that category's channel list (see handleDragOver).
        setDraftCategories((prev) => prev.map((cat) => {
          if (cat.id === targetCategoryId) {
            const filtered = cat.channels.filter((c) => c.id !== activeChannelId);
            return { ...cat, channels: [activeChannel, ...filtered] };
          }
          if (cat.id === sourceCategoryId) {
            return { ...cat, channels: cat.channels.filter((c) => c.id !== activeChannelId) };
          }
          return cat;
        }));
        if (sourceCategoryId === null) {
          setDraftOrphans((prev) => prev.filter((c) => c.id !== activeChannelId));
        }
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
    dropPositionRef.current = 'after';
    setDropPosition('after');
  };

  const isChannelDrag = activeId?.startsWith('channel-') ?? false;
  const draggedChannel = isChannelDrag
    ? [...orphanChannels, ...categories.flatMap((c) => c.channels)].find((c) => `channel-${c.id}` === activeId)
    : null;
  const draggedCategory = activeId?.startsWith('category-')
    ? categories.find((c) => `category-${c.id}` === activeId)
    : null;

  const handleStartReorder = () => {
    setDraftCategories(liveCategories);
    setDraftOrphans(liveOrphanChannels);
    setReordering(true);
  };

  const handleCancelReorder = () => {
    setReordering(false);
    setDraftCategories([]);
    setDraftOrphans([]);
  };

  const handleSaveReorder = async () => {
    setIsSaving(true);
    try {
      // Categories order — only if it actually changed.
      const categoryIdsChanged = draftCategories.map((c) => c.id).join(',') !== liveCategories.map((c) => c.id).join(',');
      if (categoryIdsChanged) {
        await reorderCategories.mutateAsync({ serverId, orderedIds: draftCategories.map((c) => c.id) });
      }

      // Orphan channels — only if changed.
      const orphanIdsChanged = draftOrphans.map((c) => c.id).join(',') !== liveOrphanChannels.map((c) => c.id).join(',');
      if (orphanIdsChanged) {
        await reorderChannels.mutateAsync({ serverId, categoryId: null, orderedIds: draftOrphans.map((c) => c.id) });
      }

      // Each category's channel list — only the ones that actually changed.
      for (const draftCat of draftCategories) {
        const liveCat = liveCategories.find((c) => c.id === draftCat.id);
        const draftIds = draftCat.channels.map((c) => c.id).join(',');
        const liveIds = (liveCat?.channels ?? []).map((c) => c.id).join(',');
        if (draftIds !== liveIds) {
          await reorderChannels.mutateAsync({ serverId, categoryId: draftCat.id, orderedIds: draftCat.channels.map((c) => c.id) });
        }
      }

      setReordering(false);
      setDraftCategories([]);
      setDraftOrphans([]);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative space-y-4 pb-20">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">Salons</h3>
          <p className="text-sm text-muted-foreground">Gérez la structure des salons et catégories de votre serveur.</p>
        </div>
        {reordering ? (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button type="button" variant="ghost" size="sm" onClick={handleCancelReorder} disabled={isSaving}>
              Annuler
            </Button>
            <Button type="button" size="sm" onClick={handleSaveReorder} disabled={isSaving}>
              <Check className="w-4 h-4 mr-1.5" />
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-shrink-0"
            onClick={handleStartReorder}
          >
            <ArrowUpDown className="w-4 h-4 mr-1.5" />
            Réorganiser
          </Button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        modifiers={[restrictToVerticalAxis]}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={[...allChannelSortIds, ...categoryIds]} strategy={verticalListSortingStrategy}>
          {reordering && <TopOrphanDropTarget isChannelDrag={isChannelDrag} isVisible={overId === TOP_ORPHAN_DROP_ID} />}

          {orphanChannels.length > 0 && (
            <div className="space-y-1">
              {orphanChannels.map((channel) => (
                <SortableChannelRow
                  key={channel.id}
                  channel={channel}
                  reordering={reordering}
                  showDropIndicator={overId === `channel-${channel.id}`}
                  dropPosition={dropPosition}
                />
              ))}
            </div>
          )}

          <div className="space-y-4">
            {categories.map((category) => (
              <SortableCategoryBlock
                key={category.id}
                category={category}
                reordering={reordering}
                showDropIndicator={overId === `category-${category.id}`}
                dropPosition={dropPosition}
              >
                {category.channels.map((channel) => (
                  <SortableChannelRow
                    key={channel.id}
                    channel={channel}
                    reordering={reordering}
                    showDropIndicator={overId === `channel-${channel.id}`}
                    dropPosition={dropPosition}
                  />
                ))}
                {category.channels.length === 0 && (
                  <p className="text-xs text-muted-foreground italic pl-3 py-1">Aucun salon dans cette catégorie</p>
                )}
              </SortableCategoryBlock>
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {draggedChannel && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted shadow-lg">
              <ChannelIcon type={draggedChannel.type} />
              <span className="text-sm truncate">{draggedChannel.name}</span>
            </div>
          )}
          {draggedCategory && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-muted shadow-lg">
              <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{draggedCategory.name}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {categories.length === 0 && orphanChannels.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Aucun salon pour l'instant.</p>
      )}

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
        <Button
          type="button"
          size="lg"
          className="rounded-full shadow-lg px-6"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="w-5 h-5 mr-1.5" />
          Créer
        </Button>
      </div>

      {createOpen && (
        <CreateChannelModal
          serverId={serverId}
          categoryId={null}
          categoryName=""
          categories={categoriesForSelector}
          showCategorySelector
          onClose={() => setCreateOpen(false)}
        />
      )}
    </div>
  );
}
