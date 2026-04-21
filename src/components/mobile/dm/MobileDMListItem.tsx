import { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BellOff, Check, Image as ImageIcon, Mic, Paperclip, Trash2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useLongPress } from '@/hooks/useLongPress';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

const statusColors: Record<string, string> = {
  online: 'bg-[hsl(var(--online))]',
  idle: 'bg-[hsl(var(--idle))]',
  dnd: 'bg-[hsl(var(--dnd))]',
  offline: 'bg-[hsl(var(--offline))]',
};

const statusLabels: Record<string, string> = {
  online: 'En ligne',
  idle: 'Inactif',
  dnd: 'Ne pas déranger',
  offline: 'Hors ligne',
};

export interface MobileDMListItemData {
  conversationId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  isGroup: boolean;
  groupSize?: number;
  status: 'online' | 'idle' | 'dnd' | 'offline' | null;
  customStatus?: string | null;
  lastMessage?: {
    content: string;
    createdAt: string;
    authorName: string | null;
    isOwn: boolean;
    hasAttachment?: 'image' | 'video' | 'audio' | 'file' | null;
  };
  unreadCount: number;
  isMuted: boolean;
  isFavorite: boolean;
  isTyping: boolean;
}

interface Props {
  item: MobileDMListItemData;
  onTap: () => void;
  onLongPress: () => void;
  onToggleMute: () => void;
  onArchive: () => void;
  onMarkRead: () => void;
}

const REVEAL_LEFT = 80; // each action width when swiping left
const SWIPE_RIGHT_COMMIT = 80;
const MAX_REVEAL_LEFT = 160;
const MAX_SWIPE_RIGHT = 110;

function formatCompact(date: Date): string {
  if (isToday(date)) return format(date, 'HH:mm', { locale: fr });
  if (isYesterday(date)) return 'Hier';
  if (isThisWeek(date, { weekStartsOn: 1 })) return format(date, 'EEE', { locale: fr });
  return format(date, 'dd/MM', { locale: fr });
}

const attachmentIcon: Record<string, typeof Paperclip> = {
  image: ImageIcon,
  video: ImageIcon,
  audio: Mic,
  file: Paperclip,
};

const attachmentLabel: Record<string, string> = {
  image: 'Image',
  video: 'Vidéo',
  audio: 'Message vocal',
  file: 'Pièce jointe',
};

export function MobileDMListItem({
  item,
  onTap,
  onLongPress,
  onToggleMute,
  onArchive,
  onMarkRead,
}: Props) {
  const reduced = useReducedMotion();
  const [translateX, setTranslateX] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const horizontalLock = useRef<boolean | null>(null);
  const movedRef = useRef(false);
  const rightCommitFiredRef = useRef(false);

  const longPress = useLongPress({
    onLongPress: () => {
      if (movedRef.current) return;
      onLongPress();
    },
    delay: 480,
  });

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      longPress.onTouchStart(e);
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      horizontalLock.current = null;
      movedRef.current = false;
      rightCommitFiredRef.current = false;
      setIsActive(true);
    },
    [longPress],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (startX.current == null || startY.current == null) return;
      const dx = e.touches[0].clientX - startX.current;
      const dy = e.touches[0].clientY - startY.current;
      if (horizontalLock.current === null) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        horizontalLock.current = Math.abs(dx) > Math.abs(dy);
      }
      if (!horizontalLock.current) {
        longPress.onTouchMove();
        return;
      }
      movedRef.current = true;
      longPress.onTouchMove();
      if (dx < 0) {
        const eased = -Math.min(MAX_REVEAL_LEFT, Math.pow(-dx, 0.92));
        setTranslateX(eased);
      } else {
        const eased = Math.min(MAX_SWIPE_RIGHT, Math.pow(dx, 0.92));
        setTranslateX(eased);
        if (!rightCommitFiredRef.current && eased >= SWIPE_RIGHT_COMMIT) {
          rightCommitFiredRef.current = true;
          haptics.selection();
        }
      }
    },
    [longPress],
  );

  const handleTouchEnd = useCallback(() => {
    longPress.onTouchEnd();
    setIsActive(false);
    const tx = translateX;
    startX.current = null;
    startY.current = null;
    horizontalLock.current = null;
    if (tx <= -REVEAL_LEFT) {
      setTranslateX(-REVEAL_LEFT * 2);
    } else if (tx >= SWIPE_RIGHT_COMMIT && item.unreadCount > 0) {
      haptics.success();
      onMarkRead();
      setTranslateX(0);
    } else {
      setTranslateX(0);
    }
  }, [longPress, translateX, item.unreadCount, onMarkRead]);

  // Auto-close revealed state on outside tap
  useEffect(() => {
    if (translateX === 0) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(`[data-dm-item="${item.conversationId}"]`)) return;
      setTranslateX(0);
    };
    document.addEventListener('touchstart', handler, { passive: true });
    document.addEventListener('mousedown', handler);
    return () => {
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('mousedown', handler);
    };
  }, [translateX, item.conversationId]);

  const handleClick = () => {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    if (translateX !== 0) {
      setTranslateX(0);
      return;
    }
    haptics.selection();
    onTap();
  };

  const status = item.isGroup ? null : item.status || 'offline';
  const last = item.lastMessage;
  const lastDate = last ? new Date(last.createdAt) : null;

  const previewPrefix = last?.isOwn
    ? 'Toi : '
    : item.isGroup && last?.authorName
      ? `${last.authorName} : `
      : '';

  const AttachIcon = last?.hasAttachment ? attachmentIcon[last.hasAttachment] : null;

  const aria = `${item.displayName}${item.unreadCount > 0 ? `, ${item.unreadCount} non lu` : ''}${item.isMuted ? ', notifications coupées' : ''}${status ? `, ${statusLabels[status]}` : ''}`;

  return (
    <div
      data-dm-item={item.conversationId}
      className="relative overflow-hidden bg-card"
    >
      {/* Right-swipe (left-anchored) action: mark as read */}
      {item.unreadCount > 0 && (
        <div
          aria-hidden={translateX <= 0}
          className="absolute inset-y-0 left-0 flex items-stretch"
          style={{ width: MAX_SWIPE_RIGHT }}
        >
          <div className="flex flex-col items-center justify-center gap-1 w-full text-xs font-medium bg-[hsl(var(--online))]/15 text-[hsl(var(--online))]">
            <Check className="w-5 h-5" />
            <span>Lu</span>
          </div>
        </div>
      )}

      {/* Left-swipe reveal: mute + archive */}
      <div
        aria-hidden={translateX >= 0}
        className="absolute inset-y-0 right-0 flex items-stretch"
        style={{ width: REVEAL_LEFT * 2 }}
      >
        <button
          type="button"
          onClick={() => {
            haptics.medium();
            onToggleMute();
            setTranslateX(0);
          }}
          className="flex flex-col items-center justify-center gap-1 w-20 text-xs font-medium bg-[hsl(var(--idle))]/15 text-[hsl(var(--idle))] active:bg-[hsl(var(--idle))]/25"
          aria-label={item.isMuted ? 'Réactiver les notifications' : 'Couper les notifications'}
        >
          <BellOff className="w-5 h-5" />
          <span>{item.isMuted ? 'Activer' : 'Muet'}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            haptics.warning();
            onArchive();
            setTranslateX(0);
          }}
          className="flex flex-col items-center justify-center gap-1 w-20 text-xs font-medium bg-[hsl(var(--destructive))]/15 text-[hsl(var(--destructive))] active:bg-[hsl(var(--destructive))]/25"
          aria-label="Archiver la conversation"
        >
          <Trash2 className="w-5 h-5" />
          <span>Archiver</span>
        </button>
      </div>

      <button
        type="button"
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        aria-label={aria}
        className="relative w-full flex items-center gap-3 px-4 py-3 bg-card text-left active:bg-muted/40"
        style={{
          transform: reduced ? undefined : `translate3d(${translateX}px, 0, 0)`,
          transition: isActive ? 'none' : 'transform 220ms cubic-bezier(0.2, 0, 0, 1)',
          willChange: 'transform',
        }}
      >
        <div className="relative shrink-0">
          <div
            className={cn(
              'rounded-full p-[2px]',
              status === 'online' && 'bg-[hsl(var(--online))]',
              status === 'idle' && 'bg-[hsl(var(--idle))]',
              status === 'dnd' && 'bg-[hsl(var(--dnd))]',
              (status === 'offline' || status === null) && 'bg-border',
            )}
          >
            <Avatar className="w-12 h-12 ring-2 ring-card">
              <AvatarImage src={item.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                {(item.displayName || '?').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          {item.isGroup ? (
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary text-primary-foreground border-2 border-card flex items-center justify-center">
              <Users className="w-3 h-3" />
            </div>
          ) : (
            status && (
              <div
                className={cn(
                  'absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-card',
                  statusColors[status],
                )}
                aria-hidden="true"
              />
            )
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p
              className={cn(
                'text-sm truncate flex-1',
                item.unreadCount > 0 ? 'font-semibold text-foreground' : 'font-medium text-foreground/90',
              )}
            >
              {item.displayName}
            </p>
            {item.isMuted && (
              <BellOff className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" aria-hidden />
            )}
            {lastDate && (
              <span
                className={cn(
                  'text-[11px] shrink-0',
                  item.unreadCount > 0 ? 'text-primary font-semibold' : 'text-muted-foreground',
                )}
              >
                {formatCompact(lastDate)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {item.isTyping ? (
              <p className="text-xs text-primary truncate flex items-center gap-1">
                <span className="inline-flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                  <span className="w-1 h-1 rounded-full bg-primary animate-pulse [animation-delay:120ms]" />
                  <span className="w-1 h-1 rounded-full bg-primary animate-pulse [animation-delay:240ms]" />
                </span>
                en train d'écrire…
              </p>
            ) : last ? (
              <p
                className={cn(
                  'text-xs truncate flex-1',
                  item.unreadCount > 0 ? 'text-foreground/80' : 'text-muted-foreground',
                )}
              >
                {AttachIcon ? (
                  <span className="inline-flex items-center gap-1">
                    {previewPrefix}
                    <AttachIcon className="w-3 h-3 inline" aria-hidden />
                    <span>{last.content || attachmentLabel[last.hasAttachment as string]}</span>
                  </span>
                ) : (
                  <>
                    {previewPrefix}
                    {last.content}
                  </>
                )}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic truncate">Aucun message</p>
            )}
            {item.unreadCount > 0 && (
              <span
                aria-label={`${item.unreadCount} non lus`}
                className={cn(
                  'min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[10px] font-bold rounded-full shrink-0',
                  item.isMuted
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-destructive text-destructive-foreground',
                )}
              >
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </span>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}
