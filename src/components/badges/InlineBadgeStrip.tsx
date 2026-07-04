import { useMemo } from 'react';
import { Award } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useBadges, type Badge } from '@/hooks/useBadges';
import { useUserBadges } from '@/hooks/useUserBadges';
import { useBirthdayGrantYears } from '@/hooks/useBirthdayGrants';
import { useIsBirthday } from '@/hooks/useBirthday';

interface InlineBadgeStripProps {
  userId?: string | null;
  max?: number;
  className?: string;
  /** 'plain' (default) for card backgrounds; 'overlay' adds a translucent pill for banners. */
  variant?: 'plain' | 'overlay';
}

/**
 * Compact right-aligned badge strip for profile headers.
 * Shows up to `max` badge icons with tooltips, plus a "+N" overflow chip.
 */
export function InlineBadgeStrip({ userId, max = 5, className, variant = 'plain' }: InlineBadgeStripProps) {
  const { data: catalog } = useBadges();
  const { data: rows } = useUserBadges(userId);
  const birthdayYears = useBirthdayGrantYears(userId);
  const isBirthday = useIsBirthday(userId);

  const badges = useMemo<Badge[]>(() => {
    if (!catalog || !rows) return [];
    const ids = new Set(rows.map((r) => r.badge_id));
    const owned = catalog
      .filter((b) => ids.has(b.id))
      .sort((a, b) => a.sort_order - b.sort_order);
    if (isBirthday && !owned.some((b) => b.key === 'birthday')) {
      const bd = catalog.find((b) => b.key === 'birthday');
      if (bd) return [bd, ...owned];
    }
    return owned;
  }, [catalog, rows, isBirthday]);

  if (!badges.length) return null;

  const visible = badges.slice(0, max);
  const hidden = badges.slice(max);

  return (
    <div
      className={cn(
        'flex items-center gap-1 flex-wrap justify-end',
        variant === 'overlay' &&
          'bg-black/40 backdrop-blur-sm rounded-full px-2 py-1 shadow-md',
        className,
      )}
    >
      {visible.map((b) => {
        const isBirthday = b.key === 'birthday';
        return (
          <Tooltip key={b.id} delayDuration={0}>
            <TooltipTrigger asChild>
              <span
                className="inline-flex items-center justify-center rounded-md bg-background/40 border border-border/40 w-6 h-6"
                style={{ color: b.color }}
              >
                {b.icon_url ? (
                  <img src={b.icon_url} alt={b.name} className="w-4 h-4 object-contain" />
                ) : isBirthday ? (
                  <span className="text-[13px] leading-none">🎂</span>
                ) : (
                  <Award className="w-4 h-4" />
                )}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[180px] px-2 py-1">
              <div className="text-xs font-semibold" style={{ color: b.color }}>{b.name}</div>
              {b.description && (
                <div className="text-[10px] text-muted-foreground mt-0.5">{b.description}</div>
              )}
              {isBirthday && birthdayYears.length > 0 && (
                <div className="text-[10px] text-muted-foreground mt-1">
                  Célébré en {birthdayYears.join(', ')}
                </div>
              )}
            </TooltipContent>

          </Tooltip>
        );
      })}
      {hidden.length > 0 && (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center justify-center rounded-md bg-background/40 border border-border/40 w-6 h-6 text-[10px] font-semibold text-muted-foreground">
              +{hidden.length}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px]">
            <div className="text-xs">
              {hidden.map((h) => h.name).join(', ')}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
