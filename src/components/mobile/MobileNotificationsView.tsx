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
  DEFAULT_FILTERS,
  hasActiveFilters,
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
  onBack?: () => void;
  onOpenDM?: (conversationId: string) => void;
  onOpenServer?: (serverId: string) => void;
}

export function MobileNotificationsView({
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

  const [filters, setFilters] = useState<NotifFilters>({ ...DEFAULT_FILTERS, kinds: new Set() });
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
      <div className="h-12 px-2 flex items-center gap-1 border-b border-border bg-[hsl(var(--surface-header))]">
        {onBack && (
          <button
            onClick={() => {
              haptics.light();
              onBack();
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center active:bg-muted/60"
            aria-label="Retour"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <h2 className="font-semibold text-base flex-1 truncate flex items-center gap-2">
          Notifications
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold bg-primary/20 text-primary rounded-full h-4 min-w-4 px-1.5 flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </h2>
        <button
          onClick={() => {
            haptics.light();
            setFilterSheetOpen(true);
          }}
          className={cn(
            'relative w-9 h-9 rounded-full flex items-center justify-center active:bg-muted/60',
            active && 'text-primary'
          )}
          aria-label="Filtres"
        >
          <SlidersHorizontal className="w-5 h-5" />
          {active && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-[hsl(var(--surface-header))]" />
          )}
        </button>
      </div>

      {/* Active filter chips */}
      {filterChips.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-3 py-2 border-b border-border scrollbar-thin">
          {filterChips.map((c) => (
            <button
              key={c.key}
              onClick={() => removeChip(c)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium whitespace-nowrap"
            >
              {c.label}
              <X className="w-3 h-3" />
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
