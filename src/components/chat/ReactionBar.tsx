import { useMemo } from 'react';
import { SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EmojiStickerPicker } from '@/components/chat/EmojiStickerPicker';
import { useAuth } from '@/contexts/AuthContext';

interface ReactionLike {
  user_id: string;
  emoji: string;
}

interface ReactionBarProps {
  reactions: ReactionLike[];
  onToggle: (emoji: string) => void;
  serverId?: string | null;
  showAddButton?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function ReactionBar({
  reactions,
  onToggle,
  serverId = null,
  showAddButton = true,
  className,
  size = 'md',
}: ReactionBarProps) {
  const { user } = useAuth();

  const grouped = useMemo(() => {
    const map: Record<string, { count: number; userReacted: boolean }> = {};
    reactions.forEach((r) => {
      if (!map[r.emoji]) map[r.emoji] = { count: 0, userReacted: false };
      map[r.emoji].count++;
      if (r.user_id === user?.id) map[r.emoji].userReacted = true;
    });
    return map;
  }, [reactions, user?.id]);

  const hasAny = Object.keys(grouped).length > 0;
  if (!hasAny && !showAddButton) return null;

  const pillClasses = size === 'sm'
    ? 'h-6 px-1.5 gap-1 text-xs'
    : 'h-7 px-2 gap-1.5 text-sm';

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {Object.entries(grouped).map(([emoji, { count, userReacted }]) => (
        <Tooltip key={emoji} delayDuration={300}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggle(emoji); }}
              className={cn(
                'inline-flex items-center rounded-full border transition-colors',
                pillClasses,
                userReacted
                  ? 'bg-primary/15 border-primary/40 text-primary'
                  : 'bg-muted/50 border-transparent hover:bg-muted'
              )}
            >
              <span className="leading-none">{emoji}</span>
              <span className="font-medium tabular-nums leading-none">{count}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {userReacted ? 'Vous avez réagi' : `${count} réaction${count > 1 ? 's' : ''}`}
          </TooltipContent>
        </Tooltip>
      ))}
      {showAddButton && (
        <EmojiStickerPicker
          serverId={serverId}
          onEmojiSelect={(emoji) => onToggle(emoji)}
          trigger={
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'inline-flex items-center justify-center rounded-full bg-muted/40 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground',
                size === 'sm' ? 'h-6 w-6' : 'h-7 w-7'
              )}
              aria-label="Ajouter une réaction"
            >
              <SmilePlus className={iconSize} />
            </button>
          }
        />
      )}
    </div>
  );
}
