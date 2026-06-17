import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useDeleteNotification,
  useRespondToDeletionRequest,
} from '@/hooks/useNotifications';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { useUnifiedNotifications, type UnifiedNotification } from '@/hooks/useUnifiedNotifications';
import { useServers } from '@/hooks/useServers';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { MobilePullIndicator } from '@/components/mobile/MobilePullIndicator';
import {
  NotificationsFilterSheet,
  hasActiveFilters,
  loadSavedFilters,
  type NotifFilters,
} from '@/components/mobile/notifications/NotificationsFilterSheet';
import { NotificationSection } from '@/components/mobile/notifications/NotificationSection';
import { UnifiedNotificationRow } from '@/components/mobile/notifications/UnifiedNotificationRow';
import { cn } from '@/lib/utils';
import {
  Inbox,
  SlidersHorizontal,
  CheckCheck,
  Loader2,
  ChevronLeft,
  X,
} from 'lucide-react';
import { haptics } from '@/lib/haptics';

const DAY = 24 * 60 * 60 * 1000;

interface MobileNotificationsViewProps {
  compact?: boolean;
  onBack?: () => void;
  onOpenDM?: (conversationId: string) => void;
  onOpenServer?: (serverId: string) => void;
}

export function MobileNotificationsView({
  compact,
  onBack,
  onOpenDM,
  onOpenServer,
}: MobileNotificationsViewProps = {}) {
  const { items, isLoading } = useUnifiedNotifications();
  const markAllRead = useMarkAllNotificationsAsRead();
  const markRead = useMarkNotificationAsRead();
  const deleteNotification = useDeleteNotification();
  const respondToDeletion = useRespondToDeletionRequest();
  const { markAsRead: markDMRead } = useUnreadCounts();
  const { data: servers = [] } = useServers();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<NotifFilters>(() => loadSavedFilters());
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const { containerRef, pullDistance, progress, refreshing } =
    usePullToRefresh<HTMLDivElement>({
      onRefresh: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['notifications'] }),
          queryClient.invalidateQueries({ queryKey: ['unread-counts'] }),
          queryClient.invalidateQueries({ queryKey: ['dm-conversations'] }),
        ]);
      },
    });

  const filtered = useMemo(() => {
    const now = Date.now();
    const periodCutoff =
      filters.period === 'today'
        ? now - DAY
        : filters.period === 'week'
        ? now - 7 * DAY
        : filters.period === 'month'
        ? now - 30 * DAY
        : 0;

    return items.filter((n) => {
      if (filters.kinds.size > 0 && !filters.kinds.has(n.kind)) return false;
      if (filters.serverId === '__dm__' && n.kind !== 'dm') return false;
      if (filters.serverId && filters.serverId !== '__dm__' && n.serverId !== filters.serverId)
        return false;
      if (periodCutoff > 0 && Date.parse(n.createdAt) < periodCutoff) return false;
      return true;
    });
  }, [items, filters]);

  const grouped = useMemo(() => {
    const now = Date.now();
    const today: UnifiedNotification[] = [];
    const week: UnifiedNotification[] = [];
    const older: UnifiedNotification[] = [];
    for (const n of filtered) {
      const age = now - Date.parse(n.createdAt);
      if (age < DAY) today.push(n);
      else if (age < 7 * DAY) week.push(n);
      else older.push(n);
    }
    return { today, week, older };
  }, [filtered]);

  const unreadCount = items.filter((n) => n.isUnread).length;
  const active = hasActiveFilters(filters);

  const handleTap = (n: UnifiedNotification) => {
    haptics.light();
    if (n.kind === 'dm' && n.conversationId) {
      markDMRead.mutate(n.conversationId);
      onOpenDM?.(n.conversationId);
      return;
    }
    if (n.isUnread) markRead.mutate((n.raw as any).id);
    if (n.serverId) onOpenServer?.(n.serverId);
  };

  const handleMarkRead = (n: UnifiedNotification) => {
    if (n.kind === 'dm' && n.conversationId) markDMRead.mutate(n.conversationId);
    else markRead.mutate((n.raw as any).id);
  };

  const handleDelete = (n: UnifiedNotification) => {
    if (n.kind === 'dm' && n.conversationId) markDMRead.mutate(n.conversationId);
    else deleteNotification.mutate((n.raw as any).id);
  };

  const filterChips = buildFilterChips(filters, servers);
  const removeChip = (chip: ChipDef) => {
    const next: NotifFilters = {
      ...filters,
      kinds: new Set(filters.kinds),
    };
    chip.apply(next);
    setFilters(next);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className={cn(
        "px-3 bg-background border-b border-border/50 shrink-0",
        compact ? "py-2" : "pt-3 pb-3"
      )}>
        <div className="flex items-center justify-between gap-2">
          {compact ? (
            <span className="text-sm font-bold">Notifications</span>
          ) : (
            <>
              {onBack ? (
                <button
                  onClick={() => {
                    haptics.light();
                    onBack();
                  }}
                  className="-ml-2 h-9 w-9 rounded-full flex items-center justify-center active:bg-muted/60"
                  aria-label="Retour"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              ) : (
                <div className="w-9" />
              )}
              <div className="flex items-baseline gap-2">
                <h1 className="text-[26px] leading-none font-bold tracking-tight">Notifications</h1>
                {unreadCount > 0 && (
                  <span className="text-xs font-semibold text-primary">
                    {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </>
          )}

          <button
            onClick={() => {
              haptics.light();
              setFilterSheetOpen(true);
            }}
            className={cn(
              'relative rounded-full flex items-center gap-1.5 font-semibold transition-colors shrink-0',
              compact
                ? 'h-7 px-2 text-[10px]'
                : 'h-9 px-3 text-xs',
              active
                ? 'bg-primary text-primary-foreground'
                : 'bg-[hsl(var(--surface-2))] text-foreground/80 active:bg-[hsl(var(--surface-3))]'
            )}
            aria-label="Filtres"
          >
            <SlidersHorizontal className={cn(compact ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
            {!compact && 'Filtres'}
            {active && (
              <span className={cn(
                "rounded-full bg-background/25 font-bold flex items-center justify-center",
                compact ? "ml-0.5 min-w-[14px] h-3.5 px-0.5 text-[9px]" : "ml-0.5 min-w-[16px] h-4 px-1 text-[10px]"
              )}>
                {filterChips.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Active filter chips */}
      {filterChips.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-2 border-b border-border/50 scrollbar-thin">
          {filterChips.map((c) => (
            <button
              key={c.key}
              onClick={() => removeChip(c)}
              className="flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium whitespace-nowrap active:bg-primary/25 transition-colors"
            >
              {c.label}
              <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                <X className="w-2.5 h-2.5" />
              </span>
            </button>
          ))}
        </div>
      )}



      {/* List */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-y-auto overscroll-contain"
      >
        <MobilePullIndicator
          pullDistance={pullDistance}
          progress={progress}
          refreshing={refreshing}
        />

        {isLoading ? (
          <div className="flex items-center justify-center p-8" role="status" aria-busy="true">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState active={active} />
        ) : (
          <div className="pb-24">
            <NotificationSection label="Aujourd'hui" count={grouped.today.length}>
              {grouped.today.map((n) => (
                <UnifiedNotificationRow
                  key={n.id}
                  n={n}
                  onTap={() => handleTap(n)}
                  onMarkRead={() => handleMarkRead(n)}
                  onDelete={() => handleDelete(n)}
                  onRespond={(accept) =>
                    respondToDeletion.mutate({ notificationId: (n.raw as any).id, accept })
                  }
                />
              ))}
            </NotificationSection>
            <NotificationSection label="Cette semaine" count={grouped.week.length}>
              {grouped.week.map((n) => (
                <UnifiedNotificationRow
                  key={n.id}
                  n={n}
                  onTap={() => handleTap(n)}
                  onMarkRead={() => handleMarkRead(n)}
                  onDelete={() => handleDelete(n)}
                  onRespond={(accept) =>
                    respondToDeletion.mutate({ notificationId: (n.raw as any).id, accept })
                  }
                />
              ))}
            </NotificationSection>
            <NotificationSection
              label="Plus ancien"
              count={grouped.older.length}
              defaultOpen={false}
            >
              {grouped.older.map((n) => (
                <UnifiedNotificationRow
                  key={n.id}
                  n={n}
                  onTap={() => handleTap(n)}
                  onMarkRead={() => handleMarkRead(n)}
                  onDelete={() => handleDelete(n)}
                  onRespond={(accept) =>
                    respondToDeletion.mutate({ notificationId: (n.raw as any).id, accept })
                  }
                />
              ))}
            </NotificationSection>
          </div>
        )}
      </div>

      {/* FAB */}
      {unreadCount > 0 && (
        <button
          onClick={() => {
            haptics.medium();
            markAllRead.mutate();
          }}
          className={cn(
            'fixed right-4 h-12 px-5 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center gap-2 active:bg-primary/90 transition-colors z-10 text-sm font-medium',
            onBack ? 'bottom-4' : 'bottom-[calc(72px+env(safe-area-inset-bottom,0px))]'
          )}
          aria-label="Tout marquer comme lu"
        >
          <CheckCheck className="w-4 h-4" />
          Tout marquer lu
        </button>
      )}

      <NotificationsFilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filters={filters}
        onChange={setFilters}
      />
    </div>
  );
}

function EmptyState({ active }: { active: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-[hsl(var(--surface-2))] flex items-center justify-center mb-4">
        <Inbox className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-sm text-foreground">
        {active ? 'Aucun résultat' : 'Aucune notification'}
      </h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
        {active
          ? 'Essayez de modifier ou réinitialiser les filtres.'
          : "Vous serez prévenu·e ici quand quelque chose d'important se passe."}
      </p>
    </div>
  );
}

// ── Chips helpers ──
interface ChipDef {
  key: string;
  label: string;
  apply: (f: NotifFilters) => void;
}

const KIND_LABELS: Record<string, string> = {
  mention: 'Mentions',
  reply: 'Réponses',
  system: 'Système',
  dm: 'Messages privés',
};

const PERIOD_LABELS: Record<string, string> = {
  today: "Aujourd'hui",
  week: '7 jours',
  month: '30 jours',
};

function buildFilterChips(
  f: NotifFilters,
  servers: { id: string; name: string }[]
): ChipDef[] {
  const chips: ChipDef[] = [];

  for (const k of f.kinds) {
    chips.push({
      key: `kind:${k}`,
      label: KIND_LABELS[k] ?? k,
      apply: (nf) => nf.kinds.delete(k),
    });
  }

  if (f.serverId === '__dm__') {
    chips.push({
      key: 'src:dm',
      label: 'Messages privés',
      apply: (nf) => {
        nf.serverId = null;
      },
    });
  } else if (f.serverId) {
    const srv = servers.find((s) => s.id === f.serverId);
    chips.push({
      key: `src:${f.serverId}`,
      label: srv?.name ?? 'Serveur',
      apply: (nf) => {
        nf.serverId = null;
      },
    });
  }

  if (f.period !== 'all') {
    chips.push({
      key: `period:${f.period}`,
      label: PERIOD_LABELS[f.period],
      apply: (nf) => {
        nf.period = 'all';
      },
    });
  }

  return chips;
}
