import { forwardRef, useMemo, type ButtonHTMLAttributes } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { IconSmile } from '@/components/chat/message-menu/MessageMenuIcons';
import { emojiShortcode } from '@/lib/emojiNames';
import { EmojiStickerPicker } from '@/components/chat/EmojiStickerPicker';
import { useAuth } from '@/contexts/AuthContext';
import { EmojiGlyph } from '@/components/chat/message-menu/EmojiGlyph';
import { emojiToken } from '@/lib/customEmoji';
import { supabase } from '@/integrations/supabase/client';

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
  onViewReactors?: (emoji?: string) => void;
}


/** Declencheur du selecteur : doit transmettre la ref et les props de Radix (Popover/Slot), d'ou le forwardRef. */
const AddReactionButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>((props, ref) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        ref={ref}
        type="button"
        aria-label="Ajouter une réaction"
        {...props}
        onClick={(e) => { e.stopPropagation(); props.onClick?.(e); }}
        className="inline-flex h-8 w-[34px] items-center justify-center rounded-lg bg-white/[0.04] text-[#b5bac1] transition-colors hover:bg-white/[0.08] hover:text-white"
      >
        <IconSmile className="h-5 w-5" />
      </button>
    </TooltipTrigger>
    <TooltipContent side="top">Ajouter une réaction</TooltipContent>
  </Tooltip>
));
AddReactionButton.displayName = 'AddReactionButton';

export function ReactionBar({
  reactions,
  onToggle,
  serverId = null,
  showAddButton = true,
  className,
  size = 'md',
  onViewReactors,
}: ReactionBarProps) {
  const { user } = useAuth();

  const grouped = useMemo(() => {
    const map: Record<string, { count: number; userReacted: boolean; userIds: string[] }> = {};
    reactions.forEach((r) => {
      if (!map[r.emoji]) map[r.emoji] = { count: 0, userReacted: false, userIds: [] };
      map[r.emoji].count++;
      map[r.emoji].userIds.push(r.user_id);
      if (r.user_id === user?.id) map[r.emoji].userReacted = true;
    });
    return map;
  }, [reactions, user?.id]);

  const allUserIds = useMemo(() => {
    return Array.from(new Set(reactions.map((r) => r.user_id))).sort();
  }, [reactions]);

  const { data: profiles } = useQuery({
    queryKey: ['reaction-profiles-batch', allUserIds.join(',')],
    queryFn: async () => {
      if (allUserIds.length === 0) return {};
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', allUserIds);
      if (error) throw error;
      const map: Record<string, { display_name: string; username: string; avatar_url: string | null }> = {};
      data?.forEach((p) => {
        map[p.id] = { display_name: p.display_name, username: p.username, avatar_url: p.avatar_url };
      });
      return map;
    },
    enabled: allUserIds.length > 0,
    staleTime: 60_000,
  });

  const hasAny = Object.keys(grouped).length > 0;
  if (!hasAny && !showAddButton) return null;

  const names = (userIds: string[]) => {
    const n = userIds.map((uid) => profiles?.[uid]?.display_name ?? '…');
    if (n.length === 1) return `${n[0]} a réagi avec`;
    if (n.length <= 3) return `${n.slice(0, -1).join(', ')} et ${n[n.length - 1]} ont réagi avec`;
    const rest = n.length - 3;
    return `${n.slice(0, 3).join(', ')} et ${rest} autre${rest > 1 ? 's' : ''} ont réagi avec`;
  };

  return (
    <div className={cn('message-reactions flex flex-wrap items-center gap-1', className)}>
      {Object.entries(grouped).map(([emoji, { count, userReacted, userIds }]) => (
        <Tooltip key={emoji}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggle(emoji); }}
              className={cn(
                'inline-flex h-8 items-center gap-2 rounded-lg border pl-1.5 pr-2 text-sm font-semibold leading-none transition-colors',
                userReacted
                  ? 'border-[#6269d8] bg-[rgba(88,101,242,0.25)] text-[#dfe1fb]'
                  : 'border-transparent bg-white/[0.06] text-[#dbdee1] hover:border-white/[0.12]',
              )}
            >
              <EmojiGlyph emoji={emoji} className="text-[20px]" />
              <span className="tabular-nums">{count}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="flex items-center gap-3 px-3 py-[18px]">
            <EmojiGlyph emoji={emoji} className="!h-12 !w-12 text-[44px]" />
            <span translate="no" className="text-sm font-medium leading-[18px]">{names(userIds)} {emojiShortcode(emoji)}</span>
          </TooltipContent>
        </Tooltip>
      ))}
      {showAddButton && (
        <EmojiStickerPicker
          serverId={serverId}
          onEmojiSelect={(emoji, custom) => onToggle(custom ? emojiToken(custom) : emoji)}
          trigger={<AddReactionButton />}
        />
      )}
    </div>
  );
}
