import { useRef, useState, useCallback, useEffect } from 'react';
import { Star, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useLongPress } from '@/hooks/useLongPress';
import { StatusIndicator } from '@/components/ui/StatusIndicator';

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

export interface MobileFriendCardData {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  status: 'online' | 'idle' | 'dnd' | 'offline' | null;
  customStatus?: string | null;
  /** Optional metric label: "12 msg cette semaine", "Demande envoyée", etc. */
  metricLabel?: string | null;
  isFavorite: boolean;
}

interface MobileFriendCardProps {
  friend: MobileFriendCardData;
  onTap: () => void;
  onLongPress: () => void;
  onToggleFavorite: () => void;
  onMessage: () => void;
  /** Optional right slot for inline actions (e.g. accept/decline buttons on pending). */
  rightSlot?: React.ReactNode;
  /** Disable the swipe gesture (e.g. on pending requests). */
  swipeDisabled?: boolean;
}

const REVEAL_THRESHOLD = 80;
const MAX_REVEAL = 160;

export function MobileFriendCard({
  friend,
  onTap,
  onLongPress,
  onToggleFavorite,
  onMessage,
  rightSlot,
  swipeDisabled = false,
}: MobileFriendCardProps) {
  const reduced = useReducedMotion();
  const [translateX, setTranslateX] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const horizontalLock = useRef<boolean | null>(null);
  const movedRef = useRef(false);

  const longPress = useLongPress({
    onLongPress: () => {
      if (movedRef.current) return;
      onLongPress();
    },
    delay: 450,
  });

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      longPress.onTouchStart(e);
      if (swipeDisabled) return;
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      horizontalLock.current = null;
      movedRef.current = false;
      setIsActive(true);
    },
    [longPress, swipeDisabled],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (swipeDisabled || startX.current == null || startY.current == null) return;
      const dx = e.touches[0].clientX - startX.current;
      const dy = e.touches[0].clientY - startY.current;

      if (horizontalLock.current === null) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        horizontalLock.current = Math.abs(dx) > Math.abs(dy);
      }

      if (!horizontalLock.current) {
        // vertical scroll: cancel swipe & long-press
        longPress.onTouchMove();
        return;
      }

      // Only react to left swipes (negative dx)
      if (dx > 0) {
        setTranslateX(0);
        return;
      }
      movedRef.current = true;
      longPress.onTouchMove();
      const eased = -Math.min(MAX_REVEAL, Math.pow(-dx, 0.92));
      setTranslateX(eased);
    },
    [longPress, swipeDisabled],
  );

  const handleTouchEnd = useCallback(() => {
    longPress.onTouchEnd();
    if (swipeDisabled) {
      setIsActive(false);
      return;
    }
    setIsActive(false);
    startX.current = null;
    startY.current = null;
    horizontalLock.current = null;
    // Reset translate; tap detection lives in onClick
    if (translateX <= -REVEAL_THRESHOLD) {
      // settle to revealed state momentarily — keep open
      setTranslateX(-REVEAL_THRESHOLD);
    } else {
      setTranslateX(0);
    }
  }, [longPress, swipeDisabled, translateX]);

  // Auto-close revealed state when tapping outside
  useEffect(() => {
    if (translateX === 0) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(`[data-friend-card="${friend.userId}"]`)) return;
      setTranslateX(0);
    };
    document.addEventListener('touchstart', handler, { passive: true });
    document.addEventListener('mousedown', handler);
    return () => {
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('mousedown', handler);
    };
  }, [translateX, friend.userId]);

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

  const status = friend.status || 'offline';

  return (
    <div
      data-friend-card={friend.userId}
      className="relative overflow-hidden bg-card"
    >
      {/* Reveal actions */}
      {!swipeDisabled && (
        <div
          aria-hidden={translateX === 0}
          className="absolute inset-y-0 right-0 flex items-stretch"
          style={{ width: REVEAL_THRESHOLD * 2 }}
        >
          <button
            type="button"
            onClick={() => {
              haptics.medium();
              onToggleFavorite();
              setTranslateX(0);
            }}
            className={cn(
              'flex flex-col items-center justify-center gap-1 w-20 text-xs font-medium',
              'bg-[hsl(var(--idle))]/15 text-[hsl(var(--idle))] active:bg-[hsl(var(--idle))]/25',
            )}
            aria-label={friend.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Star className={cn('w-5 h-5', friend.isFavorite && 'fill-current')} />
            <span>{friend.isFavorite ? 'Retirer' : 'Favori'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              haptics.medium();
              onMessage();
              setTranslateX(0);
            }}
            className="flex flex-col items-center justify-center gap-1 w-20 text-xs font-medium bg-primary/15 text-primary active:bg-primary/25"
            aria-label={`Envoyer un message à ${friend.displayName}`}
          >
            <MessageCircle className="w-5 h-5" />
            <span>Message</span>
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        aria-label={`${friend.displayName}, ${statusLabels[status]}. ${friend.metricLabel || ''}`}
        className="relative w-full flex items-center gap-3 px-4 py-3 bg-card text-left active:bg-muted/40 transition-colors"
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
              status === 'offline' && 'bg-border',
            )}
          >
            <Avatar className="w-12 h-12 ring-2 ring-card">
              <AvatarImage src={friend.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                {(friend.displayName || '?').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <StatusIndicator
            status={status}
            className="absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-card"
          />
          {friend.isFavorite && (
            <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-card flex items-center justify-center">
              <Star className="w-2.5 h-2.5 fill-[hsl(var(--idle))] text-[hsl(var(--idle))]" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold truncate">{friend.displayName}</p>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {friend.customStatus || `@${friend.username}`}
          </p>
          {friend.metricLabel && (
            <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5">
              {friend.metricLabel}
            </p>
          )}
        </div>

        {rightSlot && <div className="shrink-0 ml-2 flex items-center gap-1.5">{rightSlot}</div>}
      </button>
    </div>
  );
}
