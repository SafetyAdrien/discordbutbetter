import { useMemo } from 'react';
import { Award } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useBadges, type Badge } from '@/hooks/useBadges';
import { useUserBadges } from '@/hooks/useUserBadges';

interface UserBadgeListProps {
  userId?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showEmpty?: boolean;
}

const SIZE_MAP = {
  sm: { box: 'w-5 h-5', img: 'w-4 h-4', gap: 'gap-1' },
  md: { box: 'w-7 h-7', img: 'w-5 h-5', gap: 'gap-1.5' },
  lg: { box: 'w-9 h-9', img: 'w-7 h-7', gap: 'gap-2' },
};

export function UserBadgeList({ userId, size = 'sm', className, showEmpty = false }: UserBadgeListProps) {
  const { data: catalog } = useBadges();
  const { data: rows } = useUserBadges(userId);

  const badges = useMemo<Badge[]>(() => {
    if (!catalog || !rows) return [];
    const ids = new Set(rows.map((r) => r.badge_id));
    return catalog.filter((b) => ids.has(b.id));
  }, [catalog, rows]);

  if (!badges.length) {
    if (!showEmpty) return null;
    return (
      <span className="text-xs text-muted-foreground">Aucun badge</span>
    );
  }

  const sz = SIZE_MAP[size];

  return (
    <div className={cn('flex items-center flex-wrap', sz.gap, className)}>
      {badges.map((b) => (
        <Tooltip key={b.id} delayDuration={0}>
          <TooltipTrigger asChild>
            <span
              className={cn(
                'inline-flex items-center justify-center rounded-md bg-background/40 border border-border/40',
                sz.box,
              )}
              style={{ color: b.color }}
            >
              {b.icon_url ? (
                <img src={b.icon_url} alt={b.name} className={cn(sz.img, 'object-contain')} />
              ) : (
                <Award className={sz.img} />
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px]">
            <div className="font-semibold" style={{ color: b.color }}>{b.name}</div>
            {b.description && (
              <div className="text-xs text-muted-foreground mt-0.5">{b.description}</div>
            )}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
