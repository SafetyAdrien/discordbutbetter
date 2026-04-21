import { useCallback, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Reply, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useLongPress } from '@/hooks/useLongPress';
import { MarkdownText } from '@/lib/markdown';
import { MessageAttachments, type StoredAttachment } from '@/components/chat/MessageAttachments';
import { LinkEmbeds } from '@/components/chat/LinkEmbed';
import { ReactionBar } from '@/components/chat/ReactionBar';
import { RepliedLine } from '@/components/chat/RepliedLine';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { DMReaction } from '@/hooks/useDMReactions';
import type { RepliedMessageRef } from '@/types/app';

export interface BubbleMessage {
  id: string;
  content: string;
  createdAt: string | null;
  editedAt: string | null;
  isOwn: boolean;
  isPending?: boolean;
  attachments: StoredAttachment[];
  repliedMessage?: RepliedMessageRef | null;
  author: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
  } | null;
}

interface Props {
  message: BubbleMessage;
  showAvatar: boolean;   // first of a burst from this author
  showAuthorName: boolean; // groups only — show name above first bubble
  isLastOfBurst: boolean;
  isGroup: boolean;
  reactions: DMReaction[];
  currentUserId: string | null;
  onReply: (m: BubbleMessage) => void;
  onLongPress: (m: BubbleMessage) => void;
  onToggleReaction: (messageId: string, emoji: string, reactions: DMReaction[]) => void;
  onAvatarTap?: (authorId: string) => void;
  onJumpToMessage?: (messageId: string) => void;
}

const SWIPE_THRESHOLD = 64;
const SWIPE_MAX = 80;

export function MobileMessageBubble({
  message,
  showAvatar,
  showAuthorName,
  isLastOfBurst,
  isGroup,
  reactions,
  currentUserId,
  onReply,
  onLongPress,
  onToggleReaction,
  onAvatarTap,
  onJumpToMessage,
}: Props) {
  const reduced = useReducedMotion();
  const [translateX, setTranslateX] = useState(0);
  const [showTimestamp, setShowTimestamp] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const horizontalLock = useRef<boolean | null>(null);
  const movedRef = useRef(false);
  const committedRef = useRef(false);

  const longPress = useLongPress({
    onLongPress: () => {
      if (movedRef.current) return;
      onLongPress(message);
    },
    delay: 420,
  });

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      longPress.onTouchStart(e);
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      horizontalLock.current = null;
      movedRef.current = false;
      committedRef.current = false;
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
        horizontalLock.current = Math.abs(dx) > Math.abs(dy) * 1.3;
      }
      if (!horizontalLock.current) {
        longPress.onTouchMove();
        return;
      }
      movedRef.current = true;
      longPress.onTouchMove();

      // Allow rightward swipe-to-reply on incoming, leftward on own
      const dir = message.isOwn ? -1 : 1;
      const projected = dx * dir;
      if (projected <= 0) {
        setTranslateX(0);
        return;
      }
      const eased = Math.min(SWIPE_MAX, Math.pow(projected, 0.92));
      setTranslateX(eased * dir);
      if (!committedRef.current && eased >= SWIPE_THRESHOLD) {
        committedRef.current = true;
        haptics.selection();
      }
    },
    [longPress, message.isOwn],
  );

  const handleTouchEnd = useCallback(() => {
    longPress.onTouchEnd();
    const tx = Math.abs(translateX);
    if (tx >= SWIPE_THRESHOLD) {
      haptics.light();
      onReply(message);
    }
    setTranslateX(0);
    startX.current = null;
    startY.current = null;
    horizontalLock.current = null;
  }, [longPress, translateX, message, onReply]);

  const handleClick = () => {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    setShowTimestamp((v) => !v);
  };

  const ts =
    message.createdAt && format(new Date(message.createdAt), "HH:mm", { locale: fr });
  const editedTs =
    message.editedAt && format(new Date(message.editedAt), "d MMM HH:mm", { locale: fr });

  const hasReactions = reactions.length > 0;

  return (
    <div
      className={cn(
        'relative px-3 select-none',
        isLastOfBurst ? 'mb-2' : 'mb-0.5',
      )}
    >
      {/* Reply icon revealed during swipe */}
      <div
        aria-hidden
        className={cn(
          'absolute inset-y-0 flex items-center pointer-events-none',
          message.isOwn ? 'right-0 pr-3' : 'left-0 pl-3',
        )}
        style={{ opacity: Math.min(1, Math.abs(translateX) / SWIPE_THRESHOLD) }}
      >
        <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center">
          <Reply className="w-4 h-4" />
        </div>
      </div>

      <div
        className={cn('flex gap-2 items-end', message.isOwn ? 'justify-end' : 'justify-start')}
        style={{
          transform: reduced ? undefined : `translate3d(${translateX}px, 0, 0)`,
          transition: translateX === 0 ? 'transform 220ms cubic-bezier(0.2, 0, 0, 1)' : 'none',
        }}
      >
        {/* Avatar (received only, last of burst position via showAvatar) */}
        {!message.isOwn && (
          <div className="w-8 shrink-0">
            {showAvatar ? (
              <button
                type="button"
                onClick={() => message.author && onAvatarTap?.(message.author.id)}
                aria-label={`Profil de ${message.author?.displayName ?? ''}`}
                className="block"
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={message.author?.avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {(message.author?.displayName || '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
            ) : (
              <div className="w-8 h-8" aria-hidden />
            )}
          </div>
        )}

        <div
          className={cn(
            'flex flex-col min-w-0',
            message.isOwn ? 'items-end' : 'items-start',
            'max-w-[78%]',
          )}
        >
          {/* Author name (groups only, first of burst) */}
          {!message.isOwn && isGroup && showAuthorName && (
            <span className="text-[11px] text-muted-foreground font-medium mb-0.5 px-2">
              {message.author?.displayName}
            </span>
          )}

          {/* Replied line (Discord-like, faithful) */}
          {message.repliedMessage && (
            <div className={cn('w-full mb-0.5', message.isOwn ? 'self-end' : 'self-start')}>
              <RepliedLine
                repliedMessage={message.repliedMessage}
                onJump={onJumpToMessage}
                indent={message.isOwn ? 24 : 28}
              />
            </div>
          )}

          <button
            type="button"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            onClick={handleClick}
            className={cn(
              'text-left text-[15px] leading-snug whitespace-pre-wrap break-words',
              'px-3 py-2 rounded-2xl',
              message.isOwn
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : 'bg-[hsl(var(--surface-2))] text-foreground rounded-bl-md',
              message.isPending && 'opacity-70',
              !message.content && message.attachments.length > 0 && 'p-1',
            )}
            aria-label={`Message de ${message.author?.displayName ?? 'vous'}`}
          >
            {message.content && (
              <MarkdownText content={message.content} />
            )}
            {message.attachments.length > 0 && (
              <div className={cn(message.content ? 'mt-2' : '')}>
                <MessageAttachments attachments={message.attachments} />
              </div>
            )}
            {message.content && (
              <div className="mt-2">
                <LinkEmbeds content={message.content} />
              </div>
            )}
          </button>

          {hasReactions && (
            <div className={cn('mt-1', message.isOwn ? 'self-end' : 'self-start')}>
              <ReactionBar
                reactions={reactions.map((r) => ({ user_id: r.user_id, emoji: r.emoji }))}
                onToggle={(emoji) => onToggleReaction(message.id, emoji, reactions)}
                size="sm"
                showAddButton={false}
              />
            </div>
          )}

          {(showTimestamp || message.editedAt) && (
            <span
              className={cn(
                'text-[10px] text-muted-foreground mt-0.5 px-1',
                message.isOwn ? 'text-right' : 'text-left',
              )}
            >
              {ts}
              {message.editedAt && (
                <span className="ml-1 inline-flex items-center gap-0.5">
                  <Pencil className="w-2.5 h-2.5" />
                  modifié{editedTs ? ` · ${editedTs}` : ''}
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
