import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  AtSign,
  MessageSquare,
  AlertTriangle,
  MessagesSquare,
  Check,
  ChevronDown,
  Trash2,
  Save,
  X,
} from 'lucide-react';
import { useServers } from '@/hooks/useServers';
import { useFrequentDMContacts } from '@/hooks/useFrequentDMContacts';
import { useFavoriteFriendIds } from '@/hooks/useFavoriteFriends';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import type { NotifKind } from '@/hooks/useUnifiedNotifications';

export type Period = 'today' | 'week' | 'month' | 'all';

export interface NotifFilters {
  kinds: Set<NotifKind>;
  serverId: string | null; // null = any, '__dm__' = DMs only, otherwise serverId
  userId: string | null;   // DM peer userId filter
  period: Period;
}

export const DEFAULT_FILTERS: NotifFilters = {
  kinds: new Set<NotifKind>(),
  serverId: null,
  userId: null,
  period: 'all',
};

export function hasActiveFilters(f: NotifFilters): boolean {
  return f.kinds.size > 0 || f.serverId !== null || f.userId !== null || f.period !== 'all';
}

const STORAGE_KEY = 'mobile.notifFilters.v1';

export function loadSavedFilters(): NotifFilters {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_FILTERS, kinds: new Set() };
    const parsed = JSON.parse(raw);
    return {
      kinds: new Set<NotifKind>(Array.isArray(parsed.kinds) ? parsed.kinds : []),
      serverId: parsed.serverId ?? null,
      userId: parsed.userId ?? null,
      period: parsed.period ?? 'all',
    };
  } catch {
    return { ...DEFAULT_FILTERS, kinds: new Set() };
  }
}

function persistFilters(f: NotifFilters) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        kinds: Array.from(f.kinds),
        serverId: f.serverId,
        userId: f.userId,
        period: f.period,
      })
    );
  } catch {}
}

const KIND_OPTIONS: { id: NotifKind; label: string; icon: React.ElementType }[] = [
  { id: 'mention', label: 'Mentions', icon: AtSign },
  { id: 'reply', label: 'Réponses', icon: MessageSquare },
  { id: 'system', label: 'Système', icon: AlertTriangle },
  { id: 'dm', label: 'Messages privés', icon: MessagesSquare },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: NotifFilters;
  onChange: (next: NotifFilters) => void;
}

export function NotificationsFilterSheet({ open, onOpenChange, filters, onChange }: Props) {
  const { data: servers = [] } = useServers();
  const { data: contacts = [] } = useFrequentDMContacts();
  const { data: favoriteIds = [] } = useFavoriteFriendIds();

  const [openSection, setOpenSection] = useState<'type' | 'user' | 'server' | null>('type');

  // Sort DM contacts: favorites first, then by week activity
  const favSet = new Set(favoriteIds);
  const sortedContacts = [...contacts].sort((a, b) => {
    const af = favSet.has(a.userId) ? 1 : 0;
    const bf = favSet.has(b.userId) ? 1 : 0;
    if (af !== bf) return bf - af;
    return b.countWeek - a.countWeek;
  });

  const toggleKind = (k: NotifKind) => {
    haptics.light();
    const next = new Set(filters.kinds);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    onChange({ ...filters, kinds: next });
  };

  const setServer = (id: string | null) => {
    haptics.light();
    onChange({ ...filters, serverId: id, userId: null });
  };

  const setUser = (id: string | null) => {
    haptics.light();
    onChange({ ...filters, userId: id, serverId: id ? '__dm__' : filters.serverId });
  };

  const reset = () => {
    haptics.medium();
    const cleared: NotifFilters = { ...DEFAULT_FILTERS, kinds: new Set() };
    onChange(cleared);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    toast.success('Filtres réinitialisés');
  };

  const save = () => {
    haptics.medium();
    persistFilters(filters);
    toast.success('Filtres sauvegardés');
    onOpenChange(false);
  };

  // Close on Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onOpenChange(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  const activeCount =
    filters.kinds.size +
    (filters.serverId && filters.serverId !== '__dm__' ? 1 : 0) +
    (filters.serverId === '__dm__' && !filters.userId ? 1 : 0) +
    (filters.userId ? 1 : 0) +
    (filters.period !== 'all' ? 1 : 0);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]"
          />
          <motion.div
            key="popup"
            initial={{ opacity: 0, scale: 0.9, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -6 }}
            transition={{ type: 'spring', stiffness: 520, damping: 32 }}
            style={{
              transformOrigin: 'top right',
              boxShadow:
                '0 24px 60px -12px rgba(0,0,0,0.6), 0 0 0 1px hsl(var(--border))',
            }}
            className="fixed top-12 right-3 w-[290px] max-h-[460px] z-[61] rounded-2xl bg-background overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold">Filtres</span>
                {activeCount > 0 && (
                  <span className="min-w-[16px] h-4 px-1 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">
                    {activeCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <HeaderIconBtn label="Réinitialiser" onClick={reset}>
                  <Trash2 className="w-3.5 h-3.5" />
                </HeaderIconBtn>
                <HeaderIconBtn label="Sauvegarder" onClick={save} variant="primary">
                  <Save className="w-3.5 h-3.5" />
                </HeaderIconBtn>
                <HeaderIconBtn label="Fermer" onClick={() => onOpenChange(false)}>
                  <X className="w-3.5 h-3.5" />
                </HeaderIconBtn>
              </div>
            </div>

            {/* Sections */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <Section
                label="Type"
                count={filters.kinds.size}
                open={openSection === 'type'}
                onToggle={() => setOpenSection(openSection === 'type' ? null : 'type')}
              >
                <div className="flex flex-wrap gap-1.5 px-3 pb-3">
                  {KIND_OPTIONS.map((o) => {
                    const Icon = o.icon;
                    const active = filters.kinds.has(o.id);
                    return (
                      <button
                        key={o.id}
                        onClick={() => toggleKind(o.id)}
                        className={cn(
                          'flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-colors',
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-[hsl(var(--surface-2))] text-foreground/80'
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </Section>

              <Section
                label="Utilisateur"
                count={filters.userId ? 1 : 0}
                open={openSection === 'user'}
                onToggle={() => setOpenSection(openSection === 'user' ? null : 'user')}
              >
                <div className="px-2 pb-2 space-y-0.5">
                  <PickerRow
                    label="Tous les utilisateurs"
                    active={filters.userId === null}
                    onClick={() => setUser(null)}
                  />
                  {sortedContacts.length === 0 ? (
                    <div className="px-3 py-2 text-[11px] text-muted-foreground">
                      Aucun contact récent
                    </div>
                  ) : (
                    sortedContacts.slice(0, 12).map((c) => {
                      const isFav = favSet.has(c.userId);
                      return (
                        <PickerRow
                          key={c.userId}
                          label={c.displayName || c.username}
                          sublabel={isFav ? 'Favori' : `${c.countWeek} msg / 7j`}
                          icon={
                            c.avatarUrl ? (
                              <img
                                src={c.avatarUrl}
                                alt=""
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">
                                {(c.displayName || c.username).charAt(0).toUpperCase()}
                              </div>
                            )
                          }
                          accent={isFav}
                          active={filters.userId === c.userId}
                          onClick={() => setUser(c.userId)}
                        />
                      );
                    })
                  )}
                </div>
              </Section>

              <Section
                label="Serveur"
                count={filters.serverId && filters.serverId !== '__dm__' ? 1 : 0}
                open={openSection === 'server'}
                onToggle={() => setOpenSection(openSection === 'server' ? null : 'server')}
              >
                <div className="px-2 pb-2 space-y-0.5">
                  <PickerRow
                    label="Tous les serveurs"
                    active={filters.serverId === null}
                    onClick={() => setServer(null)}
                  />
                  <PickerRow
                    label="Messages privés uniquement"
                    icon={<MessagesSquare className="w-4 h-4 text-muted-foreground" />}
                    active={filters.serverId === '__dm__' && !filters.userId}
                    onClick={() => setServer('__dm__')}
                  />
                  {servers.length === 0 ? (
                    <div className="px-3 py-2 text-[11px] text-muted-foreground">
                      Aucun serveur
                    </div>
                  ) : (
                    servers.map((s) => (
                      <PickerRow
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
                    ))
                  )}
                </div>
              </Section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function HeaderIconBtn({
  children,
  onClick,
  label,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  variant?: 'primary';
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        'h-7 w-7 rounded-full flex items-center justify-center transition-colors',
        variant === 'primary'
          ? 'bg-primary text-primary-foreground active:bg-primary/90'
          : 'text-muted-foreground active:bg-muted/60'
      )}
    >
      {children}
    </button>
  );
}

function Section({
  label,
  count,
  open,
  onToggle,
  children,
}: {
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border/40 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 active:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/80">
            {label}
          </span>
          {count > 0 && (
            <span className="min-w-[14px] h-3.5 px-1 rounded-full bg-primary/15 text-primary text-[9px] font-bold flex items-center justify-center">
              {count}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-muted-foreground transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PickerRow({
  label,
  sublabel,
  icon,
  active,
  accent,
  onClick,
}: {
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  active: boolean;
  accent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left',
        active ? 'bg-primary/15 text-primary' : 'active:bg-muted/50'
      )}
    >
      {icon && <div className="shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className={cn('text-xs font-medium truncate', accent && !active && 'text-foreground')}>
          {label}
        </div>
        {sublabel && (
          <div className="text-[10px] text-muted-foreground truncate">{sublabel}</div>
        )}
      </div>
      {active && <Check className="w-3.5 h-3.5 shrink-0" />}
    </button>
  );
}
