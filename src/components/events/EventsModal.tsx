import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Link2, MoreHorizontal } from '@/components/icons/discord/lucide';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreateInviteModal } from '@/components/modals/CreateInviteModal';
import { useAuth } from '@/contexts/AuthContext';
import { useChannels } from '@/hooks/useChannels';
import { useMembers } from '@/hooks/useMembers';
import { usePermissions } from '@/hooks/usePermissions';
import { useDefaultInviteCode, inviteExpiryLabel } from '@/hooks/useInvites';
import { isInterested, useServerEventMutations, useServerEvents, type ServerEventInterest } from '@/hooks/useServerEvents';
import { copyToClipboard } from '@/lib/clipboard';
import { cn } from '@/lib/utils';
import {
  buildIcs,
  formatEventExact,
  googleCalendarUrl,
  outlookCalendarUrl,
  recurrenceSummary,
  upcomingOccurrences,
  yahooCalendarUrl,
  type ServerEvent,
} from '@/lib/serverEvents';
import { EventActionsMenu, EventCard, EventLocation, EventSeriesList, InterestedButton, type EventMenuActions, type EventPerson } from './EventCard';
import { EventWizard, type EventWizardEdit } from './EventWizard';

/*
 * Fenetre "Evenements" de Discord (video de reference) :
 *  - en-tete "N evenement(s)" + "Creer un evenement" ;
 *  - liste des cartes, ou "Aucun evenement a venir." ;
 *  - detail d'un evenement (onglets Infos / personnes interessees) ;
 *  - "Je ne suis pas interesse(e) par..." pour une serie ;
 *  - "Tout est ok. Maintenant partage ton evenement !" avec confettis.
 */

interface EventsModalProps {
  serverId: string;
  open: boolean;
  onClose: () => void;
  /** Ouvre directement l'assistant (menu du serveur "Creer un evenement"). */
  startWithWizard?: boolean;
  /** Emplacement preselectionne (depuis un salon de conference). */
  preset?: { type: 'stage' | 'voice'; channelId: string } | null;
  onOpenRoles?: () => void;
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => {
        const angle = (i / 70) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 260 + Math.random() * 260;
        const colors = ['#5865f2', '#eb459e', '#fee75c', '#57f287', '#ed4245', '#3ba5ff', '#ffffff'];
        return {
          tx: `${Math.cos(angle) * dist}px`,
          ty: `${Math.sin(angle) * dist * 0.7 + 120}px`,
          rot: `${Math.random() * 720 - 360}deg`,
          color: colors[i % colors.length],
          w: 6 + Math.random() * 8,
          h: 4 + Math.random() * 6,
          delay: Math.random() * 120,
          round: i % 3 === 0,
        };
      }),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-[105] flex items-center justify-center" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className={cn('absolute animate-confetti', p.round ? 'rounded-full' : 'rounded-[2px]')}
          style={{
            width: p.w,
            height: p.h,
            background: p.color,
            animationDelay: `${p.delay}ms`,
            ['--tx' as string]: p.tx,
            ['--ty' as string]: p.ty,
            ['--rot' as string]: p.rot,
          }}
        />
      ))}
    </div>
  );
}

function EventCreatedDialog({ serverId, event, onClose }: { serverId: string; event: ServerEvent; onClose: () => void }) {
  const { code, expiresAt } = useDefaultInviteCode(serverId);
  const [copied, setCopied] = useState(false);
  const link = code ? `${window.location.origin}/invite/${code}?event=${event.id}` : '';
  return (
    <>
      <Confetti />
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden">
          <div className="px-6 pt-8 pb-5 text-center">
            <div className="relative mx-auto w-[76px] h-[76px] rounded-full bg-[hsl(var(--background))] flex items-center justify-center">
              <CalendarDays className="w-8 h-8 text-white" />
              <span className="absolute -left-3 bottom-1 text-[#fee75c] text-lg">✦</span>
              <span className="absolute -right-2 -top-1 text-[#3ba5ff] text-sm">✧</span>
            </div>
            <DialogTitle className="mt-5 text-2xl font-semibold text-white leading-8">Tout est ok. Maintenant partage ton événement !</DialogTitle>
            <DialogDescription className="mt-3 text-base text-foreground">
              Copie le lien ci-dessous pour inviter les gens à participer à ton événement. Ce lien peut aussi faire office de lien d'invitation au serveur.
            </DialogDescription>
          </div>
          <div className="px-6 pb-6">
            <div className="flex items-center gap-2 p-1 pl-3 rounded-lg bg-[hsl(var(--search-background))] border border-white/[0.06]">
              <input readOnly value={link || 'Création du lien…'} className="flex-1 min-w-0 bg-transparent text-base text-foreground outline-none truncate" />
              <Button
                size="sm"
                disabled={!link}
                onClick={() => {
                  copyToClipboard(link, 'Lien copié !');
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className={cn('h-9 min-w-[96px]', copied && 'bg-[#248046] hover:bg-[#248046]')}
              >
                {copied ? 'Copié' : 'Copier'}
              </Button>
            </div>
            <p className="mt-2 text-xs text-foreground">{code ? inviteExpiryLabel(expiresAt) : ' '}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NotInterestedDialog({ onClose, onConfirm }: { onClose: () => void; onConfirm: (scope: 'series' | 'occurrence') => void }) {
  const [scope, setScope] = useState<'series' | 'occurrence'>('series');
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px] p-6 gap-0">
        <DialogTitle className="text-xl font-semibold text-white pr-8">Je ne suis pas intéressé(e) par...</DialogTitle>
        <DialogDescription className="sr-only">Choisis les occurrences concernées</DialogDescription>
        <div role="radiogroup" className="mt-6 space-y-3">
          {([['series', 'Tous les événements de cette série'], ['occurrence', 'Uniquement cet événement']] as const).map(([v, label]) => (
            <button key={v} type="button" role="radio" aria-checked={scope === v} onClick={() => setScope(v)} className="flex items-center gap-3 text-base text-foreground">
              <span className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center', scope === v ? 'border-primary bg-white' : 'border-[hsl(var(--header-icon))]')}>
                {scope === v && <span className="w-3 h-3 rounded-full bg-primary" />}
              </span>
              {label}
            </button>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <Button variant="secondary" className="h-12 text-base" onClick={onClose}>Annuler</Button>
          <Button className="h-12 text-base" onClick={() => onConfirm(scope)}>OK</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function EventsModal({ serverId, open, onClose, startWithWizard, preset, onOpenRoles }: EventsModalProps) {
  const { user } = useAuth();
  const { upcoming, interests } = useServerEvents(open ? serverId : null);
  const mutations = useServerEventMutations(serverId);
  const { hasPermission } = usePermissions(serverId);
  const { data: members = [] } = useMembers(open ? serverId : null);
  const { data: channelsData } = useChannels(open ? serverId : null);
  const { code } = useDefaultInviteCode(serverId, open);

  const [wizard, setWizard] = useState<{ open: boolean; edit?: EventWizardEdit | null }>({ open: !!startWithWizard });
  const [created, setCreated] = useState<ServerEvent | null>(null);
  const createdRef = useRef(false);
  useEffect(() => {
    if (open && startWithWizard) {
      createdRef.current = false;
      setWizard({ open: true, edit: null });
    }
  }, [open, startWithWizard]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'people'>('info');
  const [notInterested, setNotInterested] = useState<{ eventId: string; occurrence: Date } | null>(null);
  const [share, setShare] = useState<{ event: ServerEvent; locationLabel: string } | null>(null);
  const [showAllFor, setShowAllFor] = useState<string | null>(null);

  const now = new Date();
  const channelName = (id: string | null) =>
    id && channelsData ? [...channelsData.orphanChannels, ...channelsData.categories.flatMap((c) => c.channels)].find((c) => c.id === id)?.name ?? null : null;
  const person = (userId: string | null): EventPerson | null => {
    const m = members.find((x) => x.user.id === userId);
    return m ? { id: m.user.id, name: m.nickname || m.user.display_name || m.user.username, avatar: m.user.avatar_url } : null;
  };
  const canCreate = hasPermission('create_events');
  const canManage = (e: ServerEvent) =>
    e.creator_id === user?.id || hasPermission('edit_events') || hasPermission('moderate_events');
  const interestedUsers = (e: ServerEvent, occ: Date) =>
    interests.filter((i) => i.event_id === e.id && isInterested(interests, e.id, i.user_id, occ));
  const myInterest = (e: ServerEvent): ServerEventInterest | undefined =>
    interests.find((i) => i.event_id === e.id && i.user_id === user?.id);

  const eventLink = (e: ServerEvent, occ?: Date) =>
    code ? `${window.location.origin}/invite/${code}?event=${e.id}${occ ? `&occurrence=${encodeURIComponent(occ.toISOString())}` : ''}` : '';
  const locationLabel = (e: ServerEvent) => (e.location_type === 'external' ? e.location ?? '' : channelName(e.channel_id) ?? '');

  const toggleInterest = (e: ServerEvent, occ: Date) => {
    const mine = myInterest(e);
    if (!mine) return mutations.setInterested.mutate({ eventId: e.id, interested: true });
    if (!isInterested(interests, e.id, user?.id, occ)) {
      // L'occurrence etait ignoree : on la reactive.
      return mutations.setInterested.mutate({ eventId: e.id, interested: true });
    }
    if (e.recurrence === 'none') return mutations.setInterested.mutate({ eventId: e.id, interested: false });
    setNotInterested({ eventId: e.id, occurrence: occ });
  };

  const menuFor = (e: ServerEvent, occ: Date, isFirst: boolean): EventMenuActions => {
    const payload = () => ({
      title: e.title,
      description: e.description,
      location: locationLabel(e),
      start: occ,
      end: e.ends_at ? new Date(new Date(e.ends_at).getTime() - new Date(e.starts_at).getTime() + occ.getTime()) : undefined,
      recurrence: isFirst ? e.recurrence : ('none' as const),
      uid: `${e.id}@discord-but-better`,
      url: eventLink(e) || undefined,
    });
    return {
      canManage: canManage(e),
      recurring: e.recurrence !== 'none',
      active: e.status === 'active' && occ.getTime() <= now.getTime(),
      onAddToCalendar: (target) => {
        const p = payload();
        if (target === 'ics') {
          const blob = new Blob([buildIcs(p)], { type: 'text/calendar;charset=utf-8' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `${e.title.replace(/[^\w-]+/g, '_') || 'evenement'}.ics`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          return;
        }
        const url = target === 'google' ? googleCalendarUrl(p) : target === 'yahoo' ? yahooCalendarUrl(p) : outlookCalendarUrl(p);
        window.open(url, '_blank', 'noopener,noreferrer');
      },
      onStart: () => mutations.update.mutate({ id: e.id, patch: { status: 'active' } }),
      onEnd: () =>
        e.recurrence === 'none'
          ? mutations.update.mutate({ id: e.id, patch: { status: 'completed' } })
          : mutations.update.mutate({ id: e.id, patch: { status: 'scheduled', canceled_occurrences: [...e.canceled_occurrences, occ.toISOString()] } }),
      onEditSeries: () => setWizard({ open: true, edit: { event: e, scope: 'series' } }),
      onEditOccurrence: () => setWizard({ open: true, edit: { event: e, scope: 'occurrence', occurrence: occ } }),
      onCancelOccurrence: () => mutations.cancelOccurrence(e, occ),
      onCancelSeries: () => mutations.update.mutate({ id: e.id, patch: { status: 'canceled' } }),
      onCopyLink: (scope) => {
        const link = eventLink(e, scope === 'occurrence' ? occ : undefined);
        if (link) copyToClipboard(link, 'Lien copié !');
      },
      onCopyId: () => copyToClipboard(e.id, 'Identifiant copié !'),
      onCopyRecurrenceId: () => copyToClipboard(occ.toISOString(), 'ID de récurrence copié !'),
    };
  };

  const detail = detailId ? upcoming.find((u) => u.event.id === detailId) : null;
  const listOpen = open && !wizard.open && !created && !detail && !notInterested && !share;

  const seriesOccurrences = (e: ServerEvent, base: Date[]) =>
    showAllFor === e.id ? upcomingOccurrences(e, now, 12) : base;

  return (
    <>
      <Dialog open={listOpen} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-[724px] p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
          <div className="flex items-center gap-4 px-8 pt-5 pb-4 pr-14 shrink-0">
            <span className="flex items-center gap-2 text-lg font-semibold text-white">
              <CalendarDays className="w-6 h-6 text-[hsl(var(--icon-default))]" />
              <DialogTitle className="text-lg font-semibold text-white">
                {upcoming.length ? `${upcoming.length} événement${upcoming.length > 1 ? 's' : ''}` : 'Événements'}
              </DialogTitle>
            </span>
            {canCreate && (
              <>
                <span className="w-px h-6 bg-[hsl(var(--border-subtle))]" />
                <Button size="sm" className="h-9" onClick={() => setWizard({ open: true, edit: null })}>Créer un événement</Button>
              </>
            )}
          </div>
          <DialogDescription className="sr-only">Événements à venir du serveur</DialogDescription>
          {upcoming.length === 0 ? (
            <div className="h-[420px] flex flex-col items-center justify-center text-center px-8">
              <p className="text-2xl font-semibold text-white">Aucun événement à venir.</p>
              <p className="mt-3 text-base text-foreground">Programme un événement pour n'importe quelle activité prévue sur ton serveur.</p>
              <p className="mt-1 text-base text-foreground">
                Tu peux autoriser d'autres personnes à créer des événements dans{' '}
                {onOpenRoles ? (
                  <button type="button" onClick={onOpenRoles} className="font-semibold text-[hsl(var(--text-link))] hover:underline">Paramètres du serveur &gt; Rôles</button>
                ) : (
                  <span className="font-semibold text-[hsl(var(--text-link))]">Paramètres du serveur &gt; Rôles</span>
                )}
                .
              </p>
            </div>
          ) : (
            <div className="px-8 pb-8 space-y-4 overflow-y-auto scrollbar-thin">
              {upcoming.map(({ event: e, occurrences }) => {
                const occ = occurrences[0];
                return (
                  <EventCard
                    key={e.id}
                    event={e}
                    occurrence={occ}
                    now={now}
                    channelName={channelName(e.channel_id)}
                    creator={person(e.creator_id)}
                    interestedCount={interestedUsers(e, occ).length}
                    interested={isInterested(interests, e.id, user?.id, occ)}
                    onToggleInterested={() => toggleInterest(e, occ)}
                    onShare={() => setShare({ event: e, locationLabel: locationLabel(e) })}
                    onOpen={() => {
                      setDetailId(e.id);
                      setDetailTab('info');
                    }}
                    menu={menuFor(e, occ, true)}
                  >
                    <div onClick={(ev) => ev.stopPropagation()}>
                      <EventSeriesList
                        event={e}
                        occurrences={seriesOccurrences(e, occurrences)}
                        now={now}
                        menuFor={(o) => menuFor(e, o, false)}
                        onMore={showAllFor === e.id ? undefined : () => setShowAllFor(e.id)}
                      />
                    </div>
                  </EventCard>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Detail d'un evenement */}
      {detail && !wizard.open && !notInterested && !share && (
        <Dialog open onOpenChange={(o) => !o && setDetailId(null)}>
          <DialogContent className="sm:max-w-[816px] p-0 gap-0 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-7 pt-7 pr-14 shrink-0">
              <DialogTitle className="text-xl font-semibold text-white break-words">{detail.event.title}</DialogTitle>
              <DialogDescription className="sr-only">Détails de l'événement</DialogDescription>
            </div>
            <div className="overflow-y-auto scrollbar-thin flex-1 min-h-0">
              {detail.event.cover_url && (
                <div className="px-7 pt-5">
                  <img src={detail.event.cover_url} alt="" className="w-full aspect-[2.5/1] object-cover rounded-lg" />
                </div>
              )}
              <div className="mt-4 px-7 flex gap-8 border-b border-[hsl(var(--border-subtle))]">
                {(['info', 'people'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDetailTab(t)}
                    className={cn('pb-3 text-base font-medium border-b-2 -mb-px transition-colors', detailTab === t ? 'text-white border-white' : 'text-muted-foreground border-transparent hover:text-foreground')}
                  >
                    {t === 'info'
                      ? "Infos de l'événement"
                      : `${interestedUsers(detail.event, detail.occurrences[0]).length} personnes intéressées`}
                  </button>
                ))}
              </div>
              {detailTab === 'info' ? (
                <div className="px-7 py-4">
                  <div className="space-y-3">
                    <p className="flex items-start gap-2 text-base text-foreground">
                      <CalendarDays className="w-5 h-5 shrink-0 mt-0.5 text-[#949cf7]" />
                      <span>
                        <span className="text-white font-medium">{formatEventExact(detail.occurrences[0], now)}</span>
                        {recurrenceSummary(detail.event.recurrence, new Date(detail.event.starts_at)) && (
                          <span className="block text-sm text-muted-foreground">{recurrenceSummary(detail.event.recurrence, new Date(detail.event.starts_at))}</span>
                        )}
                      </span>
                    </p>
                    <EventLocation event={detail.event} channelName={channelName(detail.event.channel_id)} />
                    {person(detail.event.creator_id) && (
                      <p className="flex items-center gap-2 text-base text-muted-foreground">
                        {person(detail.event.creator_id)!.avatar ? (
                          <img src={person(detail.event.creator_id)!.avatar!} alt="" className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-primary" />
                        )}
                        Création : {person(detail.event.creator_id)!.name}
                      </p>
                    )}
                    {detail.event.description && <p className="pt-1 text-base text-foreground whitespace-pre-wrap break-words">{detail.event.description}</p>}
                  </div>
                  <div className="-mx-7 mt-4">
                    <EventSeriesList
                      event={detail.event}
                      occurrences={seriesOccurrences(detail.event, detail.occurrences)}
                      now={now}
                      menuFor={(o) => menuFor(detail.event, o, false)}
                      onMore={showAllFor === detail.event.id ? undefined : () => setShowAllFor(detail.event.id)}
                    />
                  </div>
                </div>
              ) : (
                <div className="px-7 py-4 min-h-[120px]">
                  {interestedUsers(detail.event, detail.occurrences[0]).map((i) => {
                    const p = person(i.user_id);
                    if (!p) return null;
                    return (
                      <div key={i.user_id} className="flex items-center gap-3 h-11">
                        {p.avatar ? <img src={p.avatar} alt="" className="w-8 h-8 rounded-full object-cover" /> : <span className="w-8 h-8 rounded-full bg-primary" />}
                        <span className="text-base font-medium text-white">{p.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="px-7 py-5 flex items-center justify-end gap-2 shrink-0 border-t border-[hsl(var(--border-subtle))]">
              <EventActionsMenu
                actions={menuFor(detail.event, detail.occurrences[0], true)}
                align="end"
                trigger={
                  <button type="button" aria-label="Plus d'options" className="h-11 w-11 flex items-center justify-center rounded-lg bg-[hsl(var(--button-secondary))] hover:bg-[hsl(var(--interactive-background-selected))] text-white">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                }
              />
              <button
                type="button"
                onClick={() => {
                  const l = eventLink(detail.event);
                  if (l) copyToClipboard(l, 'Lien copié !');
                }}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-[hsl(var(--button-secondary))] hover:bg-[hsl(var(--interactive-background-selected))] text-base font-medium text-white"
              >
                <Link2 className="w-5 h-5" />
                Copier le lien
              </button>
              <InterestedButton
                interested={isInterested(interests, detail.event.id, user?.id, detail.occurrences[0])}
                onClick={() => toggleInterest(detail.event, detail.occurrences[0])}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {notInterested && (
        <NotInterestedDialog
          onClose={() => setNotInterested(null)}
          onConfirm={(scope) => {
            const ev = upcoming.find((u) => u.event.id === notInterested.eventId)?.event;
            const mine = ev ? myInterest(ev) : undefined;
            if (scope === 'series' || !mine) mutations.setInterested.mutate({ eventId: notInterested.eventId, interested: false });
            else mutations.skipOccurrence.mutate({ interest: mine, occurrence: notInterested.occurrence });
            setNotInterested(null);
          }}
        />
      )}

      {share && (
        <CreateInviteModal
          serverId={serverId}
          event={{ id: share.event.id, locationLabel: share.locationLabel }}
          onClose={() => setShare(null)}
        />
      )}

      <EventWizard
        open={open && wizard.open}
        serverId={serverId}
        edit={wizard.edit ?? null}
        preset={wizard.edit ? null : preset}
        onClose={() => {
          setWizard({ open: false });
          if (startWithWizard && !createdRef.current) onClose();
        }}
        onCreated={(e) => {
          createdRef.current = true;
          setCreated(e);
        }}
      />

      {created && (
        <EventCreatedDialog
          serverId={serverId}
          event={created}
          onClose={() => {
            setCreated(null);
            if (startWithWizard) onClose();
          }}
        />
      )}
    </>
  );
}

