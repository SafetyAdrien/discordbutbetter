import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Bell, AtSign, MessageSquare, AlertTriangle, MessagesSquare, Check } from 'lucide-react';
import { useServers } from '@/hooks/useServers';
import { haptics } from '@/lib/haptics';
import type { NotifKind } from '@/hooks/useUnifiedNotifications';

export type Period = 'today' | 'week' | 'month' | 'all';

export interface NotifFilters {
  kinds: Set<NotifKind>;
  serverId: string | null; // null = any, '__dm__' = DMs only
  period: Period;
}

export const DEFAULT_FILTERS: NotifFilters = {
  kinds: new Set<NotifKind>(),
  serverId: null,
  period: 'all',
};

export function hasActiveFilters(f: NotifFilters): boolean {
  return f.kinds.size > 0 || f.serverId !== null || f.period !== 'all';
}

const KIND_OPTIONS: { id: NotifKind; label: string; icon: React.ElementType }[] = [
  { id: 'mention', label: 'Mentions', icon: AtSign },
  { id: 'reply', label: 'Réponses', icon: MessageSquare },
  { id: 'system', label: 'Système', icon: AlertTriangle },
  { id: 'dm', label: 'Messages privés', icon: MessagesSquare },
];

const PERIOD_OPTIONS: { id: Period; label: string }[] = [
  { id: 'today', label: "Aujourd'hui" },
  { id: 'week', label: '7 jours' },
  { id: 'month', label: '30 jours' },
  { id: 'all', label: 'Tout' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: NotifFilters;
  onChange: (next: NotifFilters) => void;
}

export function NotificationsFilterSheet({ open, onOpenChange, filters, onChange }: Props) {
  const { data: servers = [] } = useServers();

  const toggleKind = (k: NotifKind) => {
    haptics.light();
    const next = new Set(filters.kinds);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    onChange({ ...filters, kinds: next });
  };

  const setServer = (id: string | null) => {
    haptics.light();
    onChange({ ...filters, serverId: id });
  };

  const setPeriod = (p: Period) => {
    haptics.light();
    onChange({ ...filters, period: p });
  };

  const reset = () => {
    haptics.medium();
    onChange({ ...DEFAULT_FILTERS, kinds: new Set() });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-border bg-background p-0 max-h-[85vh] flex flex-col"
      >
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <SheetHeader className="px-5 pt-2 pb-3 flex-row items-center justify-between">
          <SheetTitle className="text-lg">Filtrer</SheetTitle>
          <button
            onClick={reset}
            className="text-xs font-medium text-muted-foreground active:text-foreground"
          >
            Réinitialiser
          </button>
        </SheetHeader>

        <div className="overflow-y-auto px-5 pb-6 space-y-6">
          {/* Type */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Type
            </h3>
            <div className="flex flex-wrap gap-2">
              {KIND_OPTIONS.map((o) => {
                const Icon = o.icon;
                const active = filters.kinds.has(o.id);
                return (
                  <button
                    key={o.id}
                    onClick={() => toggleKind(o.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-[hsl(var(--surface-2))] text-foreground/80'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {o.label}
                    {active && <Check className="w-3 h-3 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Source */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Source
            </h3>
            <div className="space-y-1.5">
              <SourceRow
                label="Toutes les sources"
                icon={<Bell className="w-4 h-4 text-muted-foreground" />}
                active={filters.serverId === null}
                onClick={() => setServer(null)}
              />
              <SourceRow
                label="Messages privés uniquement"
                icon={<MessagesSquare className="w-4 h-4 text-muted-foreground" />}
                active={filters.serverId === '__dm__'}
                onClick={() => setServer('__dm__')}
              />
              {servers.length > 0 && (
                <div className="pt-1">
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-3 py-1">
                    Serveurs
                  </h4>
                  {servers.map((s) => (
                    <SourceRow
                      key={s.id}
                      label={s.name}
                      icon={
                        s.icon_url ? (
                          <img
                            src={s.icon_url}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                        )
                      }
                      active={filters.serverId === s.id}
                      onClick={() => setServer(s.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Period */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Période
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {PERIOD_OPTIONS.map((p) => {
                const active = filters.period === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPeriod(p.id)}
                    className={cn(
                      'py-2 rounded-xl text-xs font-medium transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-[hsl(var(--surface-2))] text-foreground/80'
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="border-t border-border p-4 bg-background">
          <button
            onClick={() => onOpenChange(false)}
            className="w-full h-11 rounded-full bg-primary text-primary-foreground font-semibold text-sm active:bg-primary/90"
          >
            Voir les résultats
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SourceRow({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left',
        active ? 'bg-primary/15 text-primary' : 'active:bg-muted/50'
      )}
    >
      <div className="shrink-0">{icon}</div>
      <span className="flex-1 text-sm font-medium truncate">{label}</span>
      {active && <Check className="w-4 h-4 shrink-0" />}
    </button>
  );
}
