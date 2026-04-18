import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EmojiStickerPicker } from '@/components/chat/EmojiStickerPicker';
import { useAuth } from '@/contexts/AuthContext';
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

const MAX_PREVIEW_USERS = 3;

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

  const pillClasses = size === 'sm'
    ? 'h-6 px-1.5 gap-1 text-xs'
    : 'h-7 px-2 gap-1.5 text-sm';

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {Object.entries(grouped).map(([emoji, { count, userReacted, userIds }]) => {
        const previewIds = userIds.slice(0, MAX_PREVIEW_USERS);
        const remaining = count - previewIds.length;

        return (
          <HoverCard key={emoji} openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggle(emoji); }}
                className={cn(
                  'inline-flex items-center rounded-full border transition-colors',
                  pillClasses,
                  userReacted
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'bg-muted/50 border-transparent hover:bg-muted',
                )}
              >
                <span className="leading-none">{emoji}</span>
                <span className="font-medium tabular-nums leading-none">{count}</span>
              </button>
            </HoverCardTrigger>
            <HoverCardContent side="top" align="start" className="w-auto min-w-[180px] max-w-[260px] p-2">
              <div className="flex items-center gap-1.5 pb-2 mb-1.5 border-b border-border/40">
                <span className="text-base leading-none">{emoji}</span>
                <span className="text-xs text-muted-foreground">
                  {count} réaction{count > 1 ? 's' : ''}
                </span>
              </div>
              <ul className="space-y-1">
                {previewIds.map((uid) => {
                  const profile = profiles?.[uid];
                  const name = profile?.display_name ?? '…';
                  return (
                    <li key={uid} className="flex items-center gap-2">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={profile?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[9px]">
                          {name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium truncate">
                        {uid === user?.id ? 'Vous' : name}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {remaining > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewReactors?.(emoji);
                  }}
                  className="mt-2 w-full text-left text-xs text-primary hover:underline"
                >
                  et {remaining} autre{remaining > 1 ? 's' : ''} — Voir plus
                </button>
              )}
            </HoverCardContent>
          </HoverCard>
        );
      })}
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
                size === 'sm' ? 'h-6 w-6' : 'h-7 w-7',
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
