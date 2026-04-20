import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  useNotifications,
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useDeleteNotification,
  useRespondToDeletionRequest,
  type ServerNotification,
} from '@/hooks/useNotifications';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { MobilePullIndicator } from '@/components/mobile/MobilePullIndicator';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Inbox,
  AlertTriangle,
  Bell,
  Check,
  X,
  Trash2,
  CheckCheck,
  Loader2,
  AtSign,
  MessageSquare,
} from 'lucide-react';
import { haptics } from '@/lib/haptics';

type Filter = 'all' | 'mentions' | 'replies' | 'system';

const FILTERS: { id: Filter; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'Tout', icon: Bell },
  { id: 'mentions', label: 'Mentions', icon: AtSign },
  { id: 'replies', label: 'Réponses', icon: MessageSquare },
  { id: 'system', label: 'Système', icon: AlertTriangle },
];

function categorize(n: ServerNotification): Filter {
  if (n.type === 'mention') return 'mentions';
  if (n.type === 'reply' || n.type === 'thread_reply') return 'replies';
  return 'system';
}

export function MobileNotificationsView() {
  const { data: notifications = [], isLoading } = useNotifications();
  const markAllRead = useMarkAllNotificationsAsRead();
  const markRead = useMarkNotificationAsRead();
  const deleteNotification = useDeleteNotification();
  const respondToDeletion = useRespondToDeletionRequest();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<Filter>('all');

  const { containerRef, pullDistance, progress, refreshing } =
    usePullToRefresh<HTMLDivElement>({
      onRefresh: async () => {
        await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      },
    });

  const filtered = useMemo(() => {
    if (filter === 'all') return notifications;
    return notifications.filter((n) => categorize(n) === filter);
  }, [notifications, filter]);

  const unreadCount = notifications.filter((n) => n.status === 'pending').length;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border bg-[hsl(var(--surface-header))]">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-sm">Notifications</h2>
          {unreadCount > 0 && (
            <span
              className="text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full h-4 min-w-4 px-1 flex items-center justify-center"
              aria-label={`${unreadCount} non lues`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* Pills */}
      <div
        className="flex gap-2 overflow-x-auto px-3 py-2 border-b border-border scrollbar-thin"
        role="tablist"
      >
        {FILTERS.map((f) => {
          const Icon = f.icon;
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              role="tab"
              aria-selected={active}
              onClick={() => {
                haptics.light();
                setFilter(f.id);
              }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                active
                  ? 'bg-primary/20 text-primary'
                  : 'bg-[hsl(var(--surface-2))] text-muted-foreground',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {f.label}
            </button>
          );
        })}
      </div>

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
          <div
            className="flex items-center justify-center p-8"
            role="status"
            aria-busy="true"
          >
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <ul className="divide-y divide-border" role="list">
            {filtered.map((n) => (
              <SwipeableNotificationRow
                key={n.id}
                notification={n}
                onMarkRead={() => markRead.mutate(n.id)}
                onDelete={() => deleteNotification.mutate(n.id)}
                onRespond={(accept) =>
                  respondToDeletion.mutate({ notificationId: n.id, accept })
                }
              />
            ))}
          </ul>
        )}
      </div>

      {/* FAB - mark all read */}
      {unreadCount > 0 && (
        <button
          onClick={() => {
            haptics.medium();
            markAllRead.mutate();
          }}
          className="fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px))] right-4 h-12 px-5 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center gap-2 hover:bg-primary/90 transition-colors z-10 text-sm font-medium"
          aria-label="Tout marquer comme lu"
          title="Tout marquer comme lu"
        >
          <CheckCheck className="w-4 h-4" />
          Tout marquer lu
        </button>
      )}
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────

function EmptyState({ filter }: { filter: Filter }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-[hsl(var(--surface-2))] flex items-center justify-center mb-4">
        <Inbox className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-sm text-foreground">
        {filter === 'all'
          ? 'Aucune notification'
          : 'Rien dans cette catégorie'}
      </h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
        Vous serez prévenu·e ici quand quelque chose d'important se passe.
      </p>
    </div>
  );
}

// ─── Swipeable row ─────────────────────────────────────────────────────

interface SwipeableNotificationRowProps {
  notification: ServerNotification;
  onMarkRead: () => void;
  onDelete: () => void;
  onRespond: (accept: boolean) => void;
}

function SwipeableNotificationRow({
  notification,
  onMarkRead,
  onDelete,
  onRespond,
}: SwipeableNotificationRowProps) {
  const [dragX, setDragX] = useState(0);
  const [startX, setStartX] = useState<number | null>(null);
  const [committed, setCommitted] = useState(false);
  const isUnread = notification.status === 'pending';
  const isDeletionRequest = notification.type === 'server_deletion_request';

  const onTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setCommitted(false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startX == null) return;
    const dx = e.touches[0].clientX - startX;
    const clamped = Math.max(-160, Math.min(160, dx));
    setDragX(clamped);
    if (!committed && Math.abs(clamped) > 80) {
      haptics.light();
      setCommitted(true);
    }
  };

  const onTouchEnd = () => {
    if (Math.abs(dragX) > 80) {
      haptics.medium();
      if (dragX < 0) {
        // swipe left: archive (delete)
        onDelete();
      } else if (isUnread) {
        // swipe right: mark as read
        onMarkRead();
      }
    }
    setDragX(0);
    setStartX(null);
    setCommitted(false);
  };

  const showLeftAction = dragX > 8 && isUnread;
  const showRightAction = dragX < -8;

  return (
    <li className="relative overflow-hidden bg-background" role="listitem">
      {/* Left action background (mark as read) */}
      {showLeftAction && (
        <div className="absolute inset-y-0 left-0 flex items-center pl-5 bg-primary/15 text-primary">
          <Check className="w-5 h-5" />
        </div>
      )}
      {/* Right action background (delete) */}
      {showRightAction && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-5 bg-destructive/15 text-destructive">
          <Trash2 className="w-5 h-5" />
        </div>
      )}

      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        className={cn(
          'flex gap-3 px-4 py-3 bg-background relative transition-transform',
          isUnread && 'bg-primary/5',
        )}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: startX == null ? 'transform 200ms ease' : 'none',
        }}
      >
        {/* Unread dot */}
        {isUnread && (
          <span
            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary"
            aria-label="Non lue"
          />
        )}

        {/* Avatar */}
        <Avatar className="w-9 h-9 flex-shrink-0">
          {notification.sender?.avatar_url ? (
            <AvatarImage src={notification.sender.avatar_url} />
          ) : null}
          <AvatarFallback className="bg-[hsl(var(--surface-3))] text-xs">
            {isDeletionRequest ? (
              <AlertTriangle className="w-4 h-4 text-destructive" />
            ) : (
              notification.sender?.display_name?.charAt(0).toUpperCase() ?? 'N'
            )}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-sm font-medium text-foreground truncate">
              {notification.title}
            </h4>
            <span className="text-[10px] text-muted-foreground flex-shrink-0">
              {formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
                locale: fr,
              })}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.message}
          </p>

          {/* Deletion request actions */}
          {isDeletionRequest && notification.status === 'pending' && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onRespond(true)}
                className="flex items-center gap-1 px-3 py-1 rounded-md bg-destructive text-destructive-foreground text-xs font-medium"
              >
                <Check className="w-3 h-3" />
                Accepter
              </button>
              <button
                onClick={() => onRespond(false)}
                className="flex items-center gap-1 px-3 py-1 rounded-md bg-[hsl(var(--surface-2))] text-foreground text-xs font-medium"
              >
                <X className="w-3 h-3" />
                Refuser
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
