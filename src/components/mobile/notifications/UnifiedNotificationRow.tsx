import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AtSign,
  MessageSquare,
  AlertTriangle,
  MessagesSquare,
  Check,
  X,
  Trash2,
  Star,
  Bell,
} from 'lucide-react';
import { haptics } from '@/lib/haptics';
import type { UnifiedNotification } from '@/hooks/useUnifiedNotifications';
import type { ServerNotification } from '@/hooks/useNotifications';

interface Props {
  n: UnifiedNotification;
  onTap: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
  onRespond: (accept: boolean) => void;
}

const KIND_ICONS = {
  mention: AtSign,
  reply: MessageSquare,
  system: AlertTriangle,
  dm: MessagesSquare,
} as const;

const KIND_COLORS = {
  mention: 'text-primary bg-primary/15',
  reply: 'text-sky-400 bg-sky-500/15',
  system: 'text-amber-400 bg-amber-500/15',
  dm: 'text-violet-400 bg-violet-500/15',
} as const;

export function UnifiedNotificationRow({ n, onTap, onMarkRead, onDelete, onRespond }: Props) {
  const [dragX, setDragX] = useState(0);
  const [startX, setStartX] = useState<number | null>(null);
  const [committed, setCommitted] = useState(false);

  const KindIcon = KIND_ICONS[n.kind];
  const isDeletionRequest =
    n.kind === 'system' && (n.raw as ServerNotification).type === 'server_deletion_request';

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
      if (dragX < 0) onDelete();
      else if (n.isUnread) onMarkRead();
    }
    setDragX(0);
    setStartX(null);
    setCommitted(false);
  };

  const showLeftAction = dragX > 8 && n.isUnread;
  const showRightAction = dragX < -8;

  return (
    <li className="relative overflow-hidden bg-background" role="listitem">
      {showLeftAction && (
        <div className="absolute inset-y-0 left-0 flex items-center pl-5 bg-primary/15 text-primary">
          <Check className="w-5 h-5" />
        </div>
      )}
      {showRightAction && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-5 bg-destructive/15 text-destructive">
          <Trash2 className="w-5 h-5" />
        </div>
      )}

      <button
        onClick={onTap}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        className={cn(
          'w-full flex gap-3 px-4 py-3 bg-background relative transition-transform text-left active:bg-muted/30',
          n.isUnread && 'bg-primary/[0.04]'
        )}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: startX == null ? 'transform 200ms ease' : 'none',
        }}
      >
        {/* Highlight bar */}
        {n.highlight && (
          <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-primary" />
        )}

        {/* Avatar with kind badge */}
        <div className="relative shrink-0">
          <Avatar className="w-11 h-11">
            {n.avatarUrl && <AvatarImage src={n.avatarUrl} />}
            <AvatarFallback className="bg-[hsl(var(--surface-3))] text-sm font-medium">
              {isDeletionRequest ? (
                <AlertTriangle className="w-4 h-4 text-destructive" />
              ) : (
                n.fallback
              )}
            </AvatarFallback>
          </Avatar>
          <div
            className={cn(
              'absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-background',
              KIND_COLORS[n.kind]
            )}
          >
            <KindIcon className="w-2.5 h-2.5" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <h4 className="text-sm font-semibold text-foreground truncate">{n.title}</h4>
              {n.highlight && n.kind === 'dm' && (
                <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {n.unreadCount > 1 && (
                <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                  {n.unreadCount > 99 ? '99+' : n.unreadCount}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: false, locale: fr })}
              </span>
              {n.isUnread && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
            </div>
          </div>

          {n.serverName && (
            <p className="text-[11px] text-muted-foreground/80 truncate flex items-center gap-1">
              <Bell className="w-2.5 h-2.5" />
              {n.serverName}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>

          {isDeletionRequest && (n.raw as ServerNotification).status === 'pending' && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRespond(true);
                }}
                className="flex items-center gap-1 px-3 py-1 rounded-md bg-destructive text-destructive-foreground text-xs font-medium"
              >
                <Check className="w-3 h-3" />
                Accepter
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRespond(false);
                }}
                className="flex items-center gap-1 px-3 py-1 rounded-md bg-[hsl(var(--surface-2))] text-foreground text-xs font-medium"
              >
                <X className="w-3 h-3" />
                Refuser
              </button>
            </div>
          )}
        </div>
      </button>
    </li>
  );
}
