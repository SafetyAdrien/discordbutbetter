import { useMemo } from 'react';
import { Award } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useBadges, type Badge } from '@/hooks/useBadges';
import { useUserBadges } from '@/hooks/useUserBadges';
import { useBirthdayGrantYears } from '@/hooks/useBirthdayGrants';
import { useIsBirthday } from '@/hooks/useBirthday';

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
  const { data: catalog, isFetching: catalogFetching } = useBadges();
  const { data: rows, isFetching: rowsFetching } = useUserBadges(userId);
  const birthdayYears = useBirthdayGrantYears(userId);
  const isBirthday = useIsBirthday(userId);

  const badges = useMemo<Badge[]>(() => {
    if (!catalog || !rows) return [];
    const ids = new Set(rows.map((r) => r.badge_id));
    const owned = catalog.filter((b) => ids.has(b.id));
    if (isBirthday && !owned.some((b) => b.key === 'birthday')) {
      const bd = catalog.find((b) => b.key === 'birthday');
      if (bd) return [bd, ...owned];
    }
    return owned;
  }, [catalog, rows, isBirthday]);

  const sz = SIZE_MAP[size];

  // No data yet: render nothing (cache-first fills instantly; avoid skeleton flash)
  if (!catalog || !rows) {
    if (showEmpty && !catalogFetching && !rowsFetching) {
      return <span className="text-xs text-muted-foreground">Aucun badge</span>;
    }
    return null;
  }


  if (!badges.length) {
    if (!showEmpty) return null;
    return (
      <span className="text-xs text-muted-foreground">Aucun badge</span>
    );
  }


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
              ) : b.key === 'birthday' ? (
                <span className={cn(sz.img, 'flex items-center justify-center leading-none')} style={{ fontSize: size === 'lg' ? '20px' : size === 'md' ? '15px' : '12px' }}>🎂</span>
              ) : (
                <Award className={sz.img} />
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[240px]">
            <div className="font-semibold" style={{ color: b.color }}>{b.name}</div>
            {b.key !== 'birthday' && b.description && (
              <div className="text-xs text-muted-foreground mt-0.5">{b.description}</div>
            )}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
