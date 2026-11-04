import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { DiscordInbox as Inbox } from '@/components/icons/DiscordInbox';
import { Check, X, CheckCheck, Bell, ChevronDown, ChevronRight, Phone, Star, Clock } from '@/components/icons/discord/lucide';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MentionBadge } from '@/components/ui/MentionBadge';
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useDeleteNotification,
  useRespondToDeletionRequest,
  type ServerNotification,
} from '@/hooks/useNotifications';
import { useUnifiedNotifications, type UnifiedNotification } from '@/hooks/useUnifiedNotifications';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { useMarkChannelAsRead } from '@/hooks/useMarkChannelAsRead';
import { format, isToday, isYesterday } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { InboxBookIllustration } from './InboxIllustrations';
import { RemindersTab } from '@/components/reminders/RemindersTab';
import { useOverdueReminders } from '@/hooks/useReminders';
import { userKey } from '@/lib/userScope';

/*
 * Boite de reception (video de reference, Discord Desktop) : en-tete avec
 * "tout marquer comme lu" et "demandes d'amis", quatre onglets au
 * soulignement anime, bandeau "Reste a jour dans tes messages" (ferme par
 * "Compris !"), notifications groupees par salon avec leurs actions, et les
 * etats vides illustres de "Messages marques" et "Rappels" (pas encore de
 * backend : le contenu d'exemple est purement decoratif).
 */

type Tab = 'unread' | 'mentions' | 'saved' | 'reminders';

const TABS: { id: Tab; label: string }[] = [
  { id: 'unread', label: 'Messages non lus' },
  { id: 'mentions', label: 'Mentions' },
  { id: 'saved', label: 'Messages marqués' },
  { id: 'reminders', label: 'Rappels' },
];

const BANNER_KEY = 'inbox:banner-dismissed';
const readBanner = () => {
  try {
    return localStorage.getItem(userKey(BANNER_KEY)) === '1';
  } catch {
    return false;
  }
};

export function InboxPanel({ onOpenFriends, onClose }: { onOpenFriends?: () => void; onClose?: () => void }) {
  const { items, isLoading } = useUnifiedNotifications();
  const markAllRead = useMarkAllNotificationsAsRead();
  const markRead = useMarkNotificationAsRead();
  const deleteNotification = useDeleteNotification();
  const respondToDeletion = useRespondToDeletionRequest();
  const { markAsRead: markDMRead } = useUnreadCounts();
  const markChannelRead = useMarkChannelAsRead();

  const [tab, setTab] = useState<Tab>('unread');
  const [bannerHidden, setBannerHidden] = useState(readBanner);
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  // Le soulignement glisse d'un onglet a l'autre.
  useLayoutEffect(() => {
    const el = tabRefs.current[tab];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [tab]);

  const unread = useMemo(() => items.filter((n) => n.isUnread), [items]);
  const mentions = useMemo(() => items.filter((n) => n.kind === 'mention' || n.kind === 'reply'), [items]);
  const unreadCount = unread.length;
  const overdueReminders = useOverdueReminders().length;

  const markItemRead = (n: UnifiedNotification) => {
    if (n.source === 'channel_mention' && n.channelId) void markChannelRead(n.channelId, n.serverId);
    else if (n.source === 'dm' && n.conversationId) markDMRead.mutate(n.conversationId);
    else if (n.source === 'server_notification' && n.isUnread) markRead.mutate((n.raw as ServerNotification).id);
  };

  const markGroupRead = (group: UnifiedNotification[]) => group.forEach(markItemRead);

  const handleMarkAllRead = () => {
    markAllRead.mutate();
    const seenChannels = new Set<string>();
    const seenDMs = new Set<string>();
    items.forEach((item) => {
      if (item.source === 'channel_mention' && item.channelId && !seenChannels.has(item.channelId)) {
        seenChannels.add(item.channelId);
        void markChannelRead(item.channelId, item.serverId);
      }
      if (item.source === 'dm' && item.conversationId && item.isUnread && !seenDMs.has(item.conversationId)) {
        seenDMs.add(item.conversationId);
        markDMRead.mutate(item.conversationId);
      }
    });
  };

  const handleDelete = (n: UnifiedNotification) => {
    if (n.source === 'server_notification') deleteNotification.mutate((n.raw as ServerNotification).id);
    else markItemRead(n);
  };

  const dismissBanner = () => {
    setBannerHidden(true);
    try {
      localStorage.setItem(userKey(BANNER_KEY), '1');
    } catch {
      /* stockage indisponible */
    }
  };

  const squareBtn = (label: string, onClick: (() => void) | undefined, icon: React.ReactNode, disabled = false) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          disabled={disabled}
          className="h-[38px] w-[38px] rounded-lg bg-[hsl(var(--button-secondary))] text-white flex items-center justify-center transition-colors hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100"
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );

  const list = tab === 'unread' ? unread : tab === 'mentions' ? mentions : [];

  return (
    <div className="flex flex-col max-h-[700px] min-h-[320px] text-foreground">
      {/* En-tete */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-2">
        <Inbox className="w-[22px] h-[22px] text-white" />
        <h2 className="text-xl font-semibold text-white">Boîte de réception</h2>
        <div className="ml-auto flex items-center gap-2">
          {tab !== 'reminders' && tab !== 'saved' &&
            squareBtn('Tout marquer comme lu', handleMarkAllRead, <CheckCheck className="w-5 h-5" />, markAllRead.isPending || unreadCount === 0)}
          {squareBtn('Voir les demandes d\'amis', () => { onOpenFriends?.(); onClose?.(); }, <Phone className="w-5 h-5" />, !onOpenFriends)}
        </div>
      </div>

      {/* Onglets */}
      <div role="tablist" className="relative flex items-center gap-1 px-4 border-b border-[hsl(var(--border-subtle))]">
        {TABS.map((t) => (
          <button
            key={t.id}
            ref={(el) => (tabRefs.current[t.id] = el)}
            role="tab"
            aria-selected={tab === t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'h-[51px] px-3 text-[15px] font-medium transition-colors',
              tab === t.id ? 'text-[#949cf7]' : 'text-[hsl(var(--interactive-text-default))] hover:text-white',
            )}
          >
            {t.label}
            {t.id === 'reminders' && overdueReminders > 0 && tab !== 'reminders' && <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-[#f23f42] align-middle" />}
            {t.id === 'unread' && unreadCount > 0 && tab !== 'unread' && <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-white align-middle" />}
          </button>
        ))}
        {indicator && (
          <span
            aria-hidden="true"
            className="absolute bottom-0 h-0.5 rounded-full bg-[#949cf7] transition-[transform,width] duration-200 ease-out"
            style={{ width: indicator.width, transform: `translateX(${indicator.left}px)` }}
          />
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin" key={tab}>
        <div className="animate-fade-in">
          {tab === 'unread' && !bannerHidden && (
            <div className="m-5 mb-3 flex gap-4 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border-subtle))] p-4">
              <span className="h-12 w-12 shrink-0 rounded-full bg-[hsl(var(--button-secondary))] flex items-center justify-center text-[hsl(var(--icon-default))]">
                <Inbox className="w-6 h-6" />
              </span>
              <div className="min-w-0">
                <p className="text-base font-semibold text-white">Reste à jour dans tes messages !</p>
                <p className="mt-0.5 text-[15px] leading-5 text-foreground">
                  Les messages non lus de tous tes salons (qui ne sont pas muets) apparaîtront ici. Le moment est venu de vider cette boîte de réception !
                </p>
                <Button onClick={dismissBanner} className="mt-3 h-8 px-3">
                  Compris !
                </Button>
              </div>
            </div>
          )}

          {(tab === 'unread' || tab === 'mentions') && (
            isLoading ? (
              <div className="flex items-center justify-center p-10">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : list.length === 0 ? (
              <div className="flex flex-col items-center text-center px-10 py-14">
                <p className="text-lg font-semibold text-white">
                  {tab === 'unread' ? 'Tout est lu !' : 'Aucune mention'}
                </p>
                <p className="mt-1 max-w-[360px] text-sm text-muted-foreground">
                  {tab === 'unread'
                    ? 'Tu n’as aucun message non lu pour le moment.'
                    : 'Les messages où l’on te mentionne ou te répond apparaîtront ici.'}
                </p>
              </div>
            ) : (
              <InboxGroups
                items={list}
                onMarkGroupRead={markGroupRead}
                onMarkRead={markItemRead}
                onDelete={handleDelete}
                onRespond={(id, accept) => respondToDeletion.mutate({ notificationId: id, accept })}
                isResponding={respondToDeletion.isPending}
              />
            )
          )}

          {tab === 'saved' && (
            <EmptyState
              art={<InboxBookIllustration className="h-24 w-28" />}
              title="Collectionne tes souvenirs favoris"
              text={<>Fais un clic droit sur n’importe quel message et sélectionne <b className="font-semibold text-white">Marquer un message</b>. Retrouve-le ici, personne d’autre ne le verra.</>}
              demoMenu={['Marquer un message', 'Créer un rappel']}
              soon
            />
          )}
          {tab === 'reminders' && <RemindersTab onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ art, title, text, demoMenu, soon }: { art: React.ReactNode; title: string; text: React.ReactNode; demoMenu: string[]; soon?: boolean }) {
  return (
    <div className="flex flex-col items-center px-8 pt-10 pb-8">
      {art}
      <h3 className="mt-5 text-[26px] leading-8 font-semibold text-white text-center">{title}</h3>
      <p className="mt-3 max-w-[620px] text-center text-sm leading-[18px] text-foreground">{text}</p>
      {soon && <p className="mt-2 text-xs text-muted-foreground">Bientôt disponible</p>}
      {/* Exemple illustratif, comme dans Discord (non interactif). */}
      <div aria-hidden="true" className="relative mt-8 w-full max-w-[632px] rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border-subtle))] p-4 pointer-events-none select-none">
        <div className="flex gap-4">
          <span className="h-12 w-12 shrink-0 rounded-full bg-primary/30 flex items-center justify-center text-xl">🤖</span>
          <div className="min-w-0">
            <p className="text-base font-semibold text-white">Wumpus <span className="ml-1 text-xs font-normal text-muted-foreground">11:36</span></p>
            <p className="text-base text-foreground">Les billets de concert seront en vente vendredi à 10 h !</p>
            <p className="text-base text-foreground">attends, tu as vu ça ?</p>
            <p className="text-base text-foreground">la liste des morceaux pour ce soir</p>
          </div>
        </div>
        <div className="absolute right-6 top-[62px] w-[208px] rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border-subtle))] p-1.5 shadow-xl">
          {demoMenu.map((m, i) => (
            <div key={m} className={cn('flex items-center gap-2 h-8 px-2 rounded text-sm text-white', i === 1 && 'bg-[hsl(var(--interactive-background-hover))]')}>
              {i === 0 ? <Star className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              {m}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface GroupsProps {
  items: UnifiedNotification[];
  onMarkGroupRead: (g: UnifiedNotification[]) => void;
  onMarkRead: (n: UnifiedNotification) => void;
  onDelete: (n: UnifiedNotification) => void;
  onRespond: (id: string, accept: boolean) => void;
  isResponding: boolean;
}

function groupKey(n: UnifiedNotification) {
  return n.channelId ?? n.conversationId ?? `${n.source}:${n.serverId ?? n.userId ?? n.id}`;
}

function InboxGroups({ items, onMarkGroupRead, onMarkRead, onDelete, onRespond, isResponding }: GroupsProps) {
  const groups = useMemo(() => {
    const map = new Map<string, UnifiedNotification[]>();
    for (const n of items) {
      const k = groupKey(n);
      map.set(k, [...(map.get(k) ?? []), n]);
    }
    return [...map.entries()].map(([k, g]) => ({ key: k, items: g.sort((a, b) => a.createdAt.localeCompare(b.createdAt)) }));
  }, [items]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  useEffect(() => setCollapsed(new Set()), [items.length === 0]);

  const toggle = (k: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const dayLabel = (iso: string) => {
    const d = new Date(iso);
    return isToday(d) ? "Aujourd'hui" : isYesterday(d) ? 'Hier' : format(d, 'd MMMM yyyy');
  };

  return (
    <div className="px-5 pb-5 space-y-3">
      {groups.map((g) => {
        const head = g.items[0];
        const isCollapsed = collapsed.has(g.key);
        const mentionTotal = g.items.reduce((s, n) => s + (n.mentionCount || 0), 0);
        return (
          <section key={g.key} className="rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border-subtle))] overflow-hidden">
            <header className="flex items-center gap-3 px-4 py-3">
              <button type="button" aria-label={isCollapsed ? 'Développer' : 'Réduire'} onClick={() => toggle(g.key)} className="text-[hsl(var(--icon-default))] hover:text-white">
                <ChevronRight className={cn('w-4 h-4 transition-transform duration-150', !isCollapsed && 'rotate-90')} />
              </button>
              <Avatar className="h-9 w-9 rounded-lg">
                <AvatarImage src={head.serverIconUrl || head.avatarUrl || undefined} />
                <AvatarFallback className="rounded-lg bg-primary/20 text-primary text-sm">{head.fallback || '?'}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-base font-semibold text-white">
                  <span translate="no" className="truncate">{head.channelName ? `# ${head.channelName}` : head.title}</span>
                  {mentionTotal > 0 && <MentionBadge count={mentionTotal} size="sm" />}
                </p>
                <p translate="no" className="text-xs text-muted-foreground truncate">
                  {head.serverName ?? 'Messages privés'}
                  {head.channelName && head.serverName ? ` › ${head.channelName}` : ''}
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-label="Paramètres de notification" aria-disabled className="h-8 w-8 rounded-md text-[hsl(var(--icon-default))] flex items-center justify-center cursor-default">
                    <Bell className="w-[18px] h-[18px]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Paramètres de notification — Bientôt disponible</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-label="Marquer comme lu" onClick={() => onMarkGroupRead(g.items)} className="h-8 w-8 rounded-md text-[hsl(var(--icon-default))] hover:text-white hover:bg-[hsl(var(--interactive-background-hover))] flex items-center justify-center">
                    <Check className="w-[18px] h-[18px]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Marquer comme lu</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-label={isCollapsed ? 'Développer' : 'Réduire'} onClick={() => toggle(g.key)} className="h-8 w-8 rounded-md text-[hsl(var(--icon-default))] hover:text-white hover:bg-[hsl(var(--interactive-background-hover))] flex items-center justify-center">
                    <ChevronDown className={cn('w-[18px] h-[18px] transition-transform duration-150', isCollapsed && '-rotate-90')} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">{isCollapsed ? 'Développer' : 'Réduire'}</TooltipContent>
              </Tooltip>
            </header>

            {!isCollapsed && (
              <div className="px-4 pb-3 animate-fade-in">
                {g.items.map((n, i) => {
                  const prev = g.items[i - 1];
                  const newDay = !prev || dayLabel(prev.createdAt) !== dayLabel(n.createdAt);
                  const raw = n.source === 'server_notification' ? (n.raw as ServerNotification) : null;
                  const deletion = raw?.type === 'deletion_request' || raw?.type === 'server_deletion_request';
                  return (
                    <div key={n.id}>
                      {newDay && (
                        <div className="my-2 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="h-px flex-1 bg-[hsl(var(--border-subtle))]" />
                          <span className="rounded-full border border-[hsl(var(--border-subtle))] px-2 py-0.5">{dayLabel(n.createdAt)}</span>
                          <span className="h-px flex-1 bg-[hsl(var(--border-subtle))]" />
                        </div>
                      )}
                      <div className="group flex gap-3 rounded-md px-1 py-1.5 hover:bg-[hsl(var(--interactive-background-hover))]">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={n.avatarUrl || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary">{n.fallback || '?'}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-baseline gap-2">
                            <span translate="no" className="text-base font-medium text-white">{n.title}</span>
                            <span className="text-xs text-muted-foreground">{format(new Date(n.createdAt), 'dd/MM/yyyy HH:mm')}</span>
                          </p>
                          <p translate="no" className="text-[15px] leading-5 text-foreground break-words">{n.message}</p>
                          {deletion && raw?.status === 'pending' && (
                            <div className="mt-2 flex gap-2">
                              <Button size="sm" className="bg-[#248046] hover:bg-[#1a6334] text-white" onClick={() => onRespond(raw.id, true)} disabled={isResponding}>
                                <Check className="w-4 h-4 mr-1" /> Accepter
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => onRespond(raw.id, false)} disabled={isResponding}>
                                <X className="w-4 h-4 mr-1" /> Refuser
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {n.isUnread && (
                            <button type="button" aria-label="Marquer comme lu" onClick={() => onMarkRead(n)} className="h-7 w-7 rounded text-[hsl(var(--icon-default))] hover:text-white flex items-center justify-center">
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button type="button" aria-label="Supprimer" onClick={() => onDelete(n)} className="h-7 w-7 rounded text-[hsl(var(--icon-default))] hover:text-white flex items-center justify-center">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
