import { CalendarDays, Check, Bell, MapPin, MoreHorizontal, Share, Users } from '@/components/icons/discord/lucide';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ComingSoonBadge } from '@/components/server-settings/SettingsUI';
import { StreamlineVoice } from '@/components/icons/StreamlineVoice';
import { StreamlineStage } from '@/components/icons/StreamlineStage';
import { cn } from '@/lib/utils';
import {
  formatEventExact,
  formatEventWhen,
  formatOccurrence,
  isOccurrenceLive,
  recurrenceSummary,
  type ServerEvent,
} from '@/lib/serverEvents';

/*
 * Carte d'evenement de Discord : couverture, "Commence dans 17 min" +
 * "Recommence chaque vendredi", createur et nombre d'interesses, titre,
 * description, puis l'emplacement et les actions ("...", Partager,
 * Interesse(e)). Utilisee dans la liste, l'apercu du createur et le detail.
 */

export interface EventPerson {
  id: string;
  name: string;
  avatar: string | null;
}

export function EventLocation({ event, channelName, className }: { event: Pick<ServerEvent, 'location_type' | 'location'>; channelName?: string | null; className?: string }) {
  const Icon = event.location_type === 'stage' ? StreamlineStage : event.location_type === 'voice' ? StreamlineVoice : MapPin;
  const label = event.location_type === 'external' ? event.location ?? '' : channelName ?? 'Salon supprimé';
  const isUrl = event.location_type === 'external' && /^https?:\/\//i.test(label);
  return (
    <span className={cn('flex items-center gap-1.5 min-w-0 text-base text-foreground', className)}>
      <Icon className="w-5 h-5 shrink-0" />
      {isUrl ? (
        <a href={label} target="_blank" rel="noopener noreferrer" className="truncate text-[hsl(var(--text-link))] hover:underline" onClick={(e) => e.stopPropagation()}>
          {label}
        </a>
      ) : (
        <span className="truncate">{label}</span>
      )}
    </span>
  );
}

export function EventWhen({ occurrence, event, now }: { occurrence: Date; event: Pick<ServerEvent, 'recurrence' | 'starts_at' | 'status' | 'location_type'>; now: Date }) {
  const active = isOccurrenceLive(event, occurrence, now);
  const soon = active || occurrence.getTime() - now.getTime() < 60 * 60 * 1000;
  const summary = recurrenceSummary(event.recurrence, new Date(event.starts_at));
  return (
    <div className="flex items-start gap-2 min-w-0">
      <CalendarDays className={cn('w-5 h-5 shrink-0 mt-px', active ? 'text-[hsl(var(--online))]' : 'text-[#949cf7]')} />
      <div className="min-w-0 leading-tight">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn('text-sm font-semibold', active ? 'text-[hsl(var(--online))]' : soon ? 'text-[#949cf7]' : 'text-[hsl(var(--muted-foreground))]')}>
              {formatEventWhen(occurrence, now, active)}
            </span>
          </TooltipTrigger>
          <TooltipContent><p>{formatEventExact(occurrence, now)}</p></TooltipContent>
        </Tooltip>
        {summary && <p className="text-xs text-foreground">{summary}</p>}
      </div>
    </div>
  );
}

export function InterestedButton({ interested, onClick, disabled }: { interested: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-base font-medium transition-colors disabled:opacity-50',
        interested
          ? 'bg-[hsl(var(--invite-join))] hover:bg-[hsl(var(--invite-join-hover))] text-white'
          : 'bg-[hsl(var(--button-secondary))] hover:bg-[hsl(var(--interactive-background-selected))] text-white',
      )}
    >
      {interested ? <Check className="w-4 h-4" strokeWidth={3} /> : <Bell className="w-4 h-4" />}
      Intéressé(e)
    </button>
  );
}

export interface EventMenuActions {
  canManage: boolean;
  onAddToCalendar: (target: 'google' | 'ics' | 'yahoo' | 'outlook') => void;
  onStart?: () => void;
  onEnd?: () => void;
  onEditSeries?: () => void;
  onEditOccurrence?: () => void;
  onCancelOccurrence?: () => void;
  onCancelSeries?: () => void;
  onCopyLink: (scope: 'series' | 'occurrence') => void;
  onCopyId: () => void;
  onCopyRecurrenceId?: () => void;
  recurring: boolean;
  active: boolean;
}

/** Menu "..." d'un evenement ou d'une occurrence de la serie. */
export function EventActionsMenu({ actions, trigger, align = 'start' }: { actions: EventMenuActions; trigger: React.ReactNode; align?: 'start' | 'end' }) {
  const a = actions;
  const danger = 'text-[#f57976] focus:text-white focus:bg-destructive';
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-[300px] p-2" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="h-10 text-base">Ajouter au calendrier</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="p-2 w-[220px]">
            <DropdownMenuItem className="h-10 text-base" onSelect={() => a.onAddToCalendar('google')}>Ajouter à l'agenda Google</DropdownMenuItem>
            <DropdownMenuItem className="h-10 text-base" onSelect={() => a.onAddToCalendar('ics')}>Télécharger le fichier ICS</DropdownMenuItem>
            <DropdownMenuItem className="h-10 text-base" onSelect={() => a.onAddToCalendar('yahoo')}>Ajouter à Yahoo</DropdownMenuItem>
            <DropdownMenuItem className="h-10 text-base" onSelect={() => a.onAddToCalendar('outlook')}>Ajouter à Outlook</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {a.canManage && (a.active ? (
          <DropdownMenuItem className="h-10 text-base" onSelect={a.onEnd}>Terminer l'événement</DropdownMenuItem>
        ) : (
          <DropdownMenuItem className="h-10 text-base" onSelect={a.onStart}>Commencer l'événement</DropdownMenuItem>
        ))}
        {a.canManage && (a.recurring ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="h-10 text-base">Modifier l'événement</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="p-2 w-[300px]">
              <DropdownMenuItem className="h-10 text-base" onSelect={a.onEditOccurrence}>Modifier cet événement</DropdownMenuItem>
              <DropdownMenuItem className="h-10 text-base" onSelect={a.onEditSeries}>Modifier tous les événements de cette série</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : (
          <DropdownMenuItem className="h-10 text-base" onSelect={a.onEditSeries}>Modifier l'événement</DropdownMenuItem>
        ))}
        {a.canManage && (a.recurring ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className={cn('h-10 text-base', danger)}>Annuler l'événement</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="p-2 w-[340px]">
              <DropdownMenuItem className={cn('h-10 text-base', danger)} onSelect={a.onCancelOccurrence}>Annuler cet événement</DropdownMenuItem>
              <DropdownMenuItem className={cn('h-10 text-base', danger)} onSelect={a.onCancelSeries}>Annuler tous les événements de cette série</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : (
          <DropdownMenuItem className={cn('h-10 text-base', danger)} onSelect={a.onCancelSeries}>Annuler l'événement</DropdownMenuItem>
        ))}
        {a.recurring ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="h-10 text-base">Copier le lien d'événement</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="p-2 w-[280px]">
              <DropdownMenuItem className="h-10 text-base" onSelect={() => a.onCopyLink('occurrence')}>Copier le lien de cet événement</DropdownMenuItem>
              <DropdownMenuItem className="h-10 text-base" onSelect={() => a.onCopyLink('series')}>Copier le lien de la série</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : (
          <DropdownMenuItem className="h-10 text-base" onSelect={() => a.onCopyLink('series')}>Copier le lien d'événement</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className={cn('h-10 text-base', danger)}>
          Signaler l'événement <span className="ml-auto"><ComingSoonBadge /></span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="h-10 text-base gap-2" onSelect={a.onCopyId}>
          <IdBadge /> Copier l'identifiant de l'événement
        </DropdownMenuItem>
        {a.recurring && a.onCopyRecurrenceId && (
          <DropdownMenuItem className="h-10 text-base gap-2" onSelect={a.onCopyRecurrenceId}>
            <IdBadge /> Copier l'ID de récurrence
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function IdBadge() {
  return <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[hsl(var(--icon-default))] text-[9px] font-black text-[hsl(var(--popover))]">ID</span>;
}

export function EventSeriesList({
  event,
  occurrences,
  now,
  menuFor,
  onMore,
  moreLabel = 'Voir les événements à venir',
}: {
  event: ServerEvent;
  occurrences: Date[];
  now: Date;
  menuFor: (occurrence: Date) => EventMenuActions;
  onMore?: () => void;
  moreLabel?: string;
}) {
  if (event.recurrence === 'none' || occurrences.length === 0) return null;
  return (
    <div className="px-5 py-4 border-t border-[hsl(var(--border-subtle))]">
      <p className="mb-2 text-sm font-medium text-white">Série d'événements</p>
      <div className="max-h-[132px] overflow-y-auto scrollbar-thin -mx-2">
        {occurrences.map((occ, i) => {
          const label = i === 0 ? formatEventWhen(occ, now, isOccurrenceLive(event, occ, now)) : formatOccurrence(occ);
          const first = i === 0 && occ.getTime() - now.getTime() < 60 * 60 * 1000;
          return (
            <div key={occ.toISOString()} className="group/occ flex items-center gap-2 h-[42px] px-2 rounded-lg hover:bg-[hsl(var(--interactive-background-hover))]">
              <CalendarDays className="w-5 h-5 shrink-0 text-[#949cf7]" />
              <span className={cn('flex-1 text-sm font-semibold', first ? 'text-[#949cf7]' : 'text-white')}>{label}</span>
              <EventActionsMenu
                actions={menuFor(occ)}
                align="end"
                trigger={
                  <button type="button" aria-label="Plus d'options" className="p-1 rounded text-[hsl(var(--icon-default))] hover:text-white">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                }
              />
            </div>
          );
        })}
      </div>
      {onMore && (
        <button type="button" onClick={onMore} className="mt-2 w-full text-center text-base text-[hsl(var(--text-link))] hover:underline">
          {moreLabel}
        </button>
      )}
    </div>
  );
}

export function EventCard({
  event,
  occurrence,
  now,
  channelName,
  creator,
  interestedCount,
  interested,
  onToggleInterested,
  onShare,
  onOpen,
  menu,
  coverOverride,
  preview = false,
  children,
}: {
  event: ServerEvent;
  occurrence: Date;
  now: Date;
  channelName?: string | null;
  creator?: EventPerson | null;
  interestedCount: number;
  interested: boolean;
  onToggleInterested?: () => void;
  onShare?: () => void;
  onOpen?: () => void;
  menu?: EventMenuActions;
  coverOverride?: string | null;
  /** Apercu de l'assistant : pas d'actions. */
  preview?: boolean;
  children?: React.ReactNode;
}) {
  const cover = coverOverride !== undefined ? coverOverride : event.cover_url;
  return (
    <div
      className={cn('rounded-lg overflow-hidden bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-subtle))]', onOpen && 'cursor-pointer')}
      onClick={onOpen}
    >
      {cover && <img src={cover} alt="" className="w-full aspect-[2.5/1] max-h-[196px] object-cover" />}
      <div className="px-5 pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <EventWhen occurrence={occurrence} event={event} now={now} />
          </div>
          {creator && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="shrink-0">
                  {creator.avatar ? (
                    <img src={creator.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] text-white">{creator.name.charAt(0)}</span>
                  )}
                </span>
              </TooltipTrigger>
              <TooltipContent><p>Création : {creator.name}</p></TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="shrink-0 inline-flex items-center gap-1 h-6 px-2 rounded-full bg-[hsl(var(--background))] text-sm font-medium text-white">
                <Users className="w-3.5 h-3.5" />
                {interestedCount}
              </span>
            </TooltipTrigger>
            <TooltipContent><p>{interestedCount} {interestedCount > 1 ? 'personnes intéressées' : 'personne intéressée'}</p></TooltipContent>
          </Tooltip>
        </div>
        <p className="mt-3 text-xl font-medium text-white break-words leading-6">{event.title}</p>
        {event.description && <p className="mt-2 text-sm text-foreground whitespace-pre-wrap break-words line-clamp-3">{event.description}</p>}
      </div>
      <div className="flex items-center gap-2 px-5 py-3 border-t border-[hsl(var(--border-subtle))]">
        <EventLocation event={event} channelName={channelName} className="flex-1" />
        {!preview && menu && (
          <EventActionsMenu
            actions={menu}
            trigger={
              <button type="button" aria-label="Plus d'options" className="h-9 w-9 flex items-center justify-center rounded-lg bg-[hsl(var(--button-secondary))] hover:bg-[hsl(var(--interactive-background-selected))] text-white">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            }
          />
        )}
        {!preview && onShare && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[hsl(var(--button-secondary))] hover:bg-[hsl(var(--interactive-background-selected))] text-base font-medium text-white"
          >
            <Share className="w-4 h-4" />
            Partager
          </button>
        )}
        {!preview && onToggleInterested && <InterestedButton interested={interested} onClick={onToggleInterested} />}
      </div>
      {children}
    </div>
  );
}

