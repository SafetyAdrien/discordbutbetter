import { useEffect, useMemo, useState } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, ChevronLeft, ChevronRight, Clock, MapPin, Users, CalendarDays, List as ListIcon, Pencil, Trash2, Copy } from 'lucide-react';
import { StreamlineCalendar } from '@/components/icons/StreamlineCalendar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay,
  addMonths, subMonths, isAfter, isToday as isDateToday, differenceInCalendarDays, startOfDay, endOfDay,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { useHasChannelPermission } from '@/hooks/useUserChannelPermissions';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useChannelCalendarEvents, type ChannelCalendarEvent } from '@/hooks/useChannelCalendarEvents';
import { ChannelEventModal } from '@/components/channels/calendar/ChannelEventModal';
import { canvasHasTransparentPixels, findOpaqueBounds, sourceMayHaveTransparency } from '@/components/channels/calendar/thumbnailAlpha';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/clipboard';

interface Channel {
  id: string;
  name: string;
  type: string;
  description?: string;
}

export interface CalendarChannelProps {
  channel: Channel;
  onToggleMembers?: () => void;
  showMembers?: boolean;
  /** Hide the internal header bar when a parent shell already renders one. */
  hideHeader?: boolean;
  /** Incremented externally (e.g. by mobile header) to request a jump to today. */
  jumpToTodaySignal?: number;
}

export function CalendarChannel({ channel, onToggleMembers, showMembers, hideHeader = false, jumpToTodaySignal }: CalendarChannelProps) {
  const { isMobile } = useBreakpoint();
  const { data: canManageEvents = false } = useHasChannelPermission(channel.id, 'manage_events');
  // Tout membre voyant le salon peut créer un événement (gate RLS = view_channel).
  const canCreate = true;

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>(isMobile ? 'agenda' : 'month');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState<Date | null>(null);
  const [editing, setEditing] = useState<ChannelCalendarEvent | null>(null);
  const [serverId, setServerId] = useState<string | null>(null);

  // Jump-to-today: react to external trigger from parent header.
  useEffect(() => {
    if (jumpToTodaySignal === undefined) return;
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  }, [jumpToTodaySignal]);



  const { events, remove } = useChannelCalendarEvents(channel.id);

  // In-app reminders: schedule a toast for each event with a reminder set.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const now = Date.now();
    events.forEach((e) => {
      if (e.reminder_minutes == null) return;
      const fireAt = new Date(e.starts_at).getTime() - e.reminder_minutes * 60_000;
      const delay = fireAt - now;
      if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
        timers.push(setTimeout(() => {
          toast.message(`⏰ ${e.title}`, {
            description: `Commence dans ${e.reminder_minutes} minute(s)`,
          });
        }, delay));
      }
    });
    return () => { timers.forEach(clearTimeout); };
  }, [events]);

  // Resolve server_id for the channels dropdown in modal
  useEffect(() => {
    let cancel = false;
    supabase.from('channels').select('server_id').eq('id', channel.id).maybeSingle().then(({ data }) => {
      if (!cancel) setServerId(data?.server_id ?? null);
    });
    return () => { cancel = true; };
  }, [channel.id]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = (monthStart.getDay() + 6) % 7;
  const paddedDays: (Date | null)[] = (Array(startPadding).fill(null) as (Date | null)[]).concat(days);

  const eventsForDate = (date: Date): ChannelCalendarEvent[] =>
    events.filter((e) => {
      const s = startOfDay(new Date(e.starts_at));
      const en = endOfDay(new Date(e.ends_at));
      return date >= s && date <= en;
    });

  const upcoming = useMemo(
    () =>
      [...events]
        .filter((e) => isAfter(new Date(e.ends_at), new Date()) || isDateToday(new Date(e.starts_at)))
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
    [events]
  );

  const openCreate = (date?: Date | null) => {
    setEditing(null);
    setModalInitialDate(date ?? null);
    setModalOpen(true);
  };
  const openEdit = (e: ChannelCalendarEvent) => {
    setEditing(e);
    setModalInitialDate(null);
    setModalOpen(true);
  };

  const canEditEvent = (e: ChannelCalendarEvent) => canManageEvents || e.created_by === e.created_by; // creator check enforced by RLS
  const handleDelete = async (e: ChannelCalendarEvent) => {
    try { await remove.mutateAsync(e.id); } catch { /* toast handled */ }
  };

  return (
    <div className="flex-1 flex flex-col bg-[hsl(var(--surface-2)/0.3)] min-w-0 w-full overflow-x-hidden">
      {!hideHeader && (
      <div className="h-12 px-2 sm:px-4 flex items-center gap-2 sm:gap-4 flex-shrink-0 bg-[hsl(var(--surface-2))] w-full" style={{ borderBottom: "1px solid hsl(var(--border) / 0.5)", boxShadow: "var(--shadow-elevation-1)", borderRadius: "0 0 var(--radius-xl) var(--radius-xl)" }}>
        <div className="flex items-center gap-2 min-w-0 flex-shrink">
          <StreamlineCalendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <h2 className="font-semibold text-foreground truncate">{channel.name}</h2>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 ml-auto flex-shrink-0">
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setViewMode('month')}
              className={cn('p-1.5 transition-colors', viewMode === 'month' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
              aria-label="Vue mois"
            >
              <CalendarDays className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={cn('p-1.5 transition-colors', viewMode === 'agenda' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
              aria-label="Vue agenda"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
          {canCreate && (
            <Button size="sm" className="hidden sm:inline-flex" onClick={() => openCreate(selectedDate)}>
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Nouvel événement</span>
            </Button>
          )}
          {onToggleMembers && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="iconSm" onClick={onToggleMembers} className={cn(showMembers && "bg-surface-hover")}>
                  <Users className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showMembers ? "Masquer les membres" : "Afficher les membres"}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      )}

      {viewMode === 'agenda' ? (
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {upcoming.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <StreamlineCalendar className="w-10 h-10 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Aucun événement à venir</h3>
                  <p className="text-muted-foreground text-sm max-w-md mb-4">
                    Créez un événement pour planifier des activités avec votre serveur.
                  </p>
                  {canCreate && (
                    <Button onClick={() => openCreate(new Date())}>
                      <Plus className="w-4 h-4 mr-2" /> Nouvel événement
                    </Button>
                  )}
                </div>
              ) : (
                upcoming.map((event) => (
                  <EventAgendaCard key={event.id} event={event} canManage={canManageEvents} onEdit={openEdit} onDelete={handleDelete} />
                ))
              )}
            </div>
          </ContextMenuTrigger>
          {canCreate && (
            <ContextMenuContent>
              <ContextMenuItem onClick={() => openCreate(new Date())}>
                <Plus className="w-4 h-4 mr-2" /> Nouvel événement
              </ContextMenuItem>
            </ContextMenuContent>
          )}
        </ContextMenu>
      ) : (
        <>
          <div className="px-2 sm:px-4 py-3 border-b border-border flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 sm:gap-2">
              <Button variant="ghost" size="iconSm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h3 className="font-semibold min-w-[100px] sm:min-w-[150px] text-center capitalize text-sm sm:text-base">
                {format(currentMonth, 'MMMM yyyy', { locale: fr })}
              </h3>
              <Button variant="ghost" size="iconSm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())} className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Aujourd'hui</span>
              <span className="sm:hidden">Auj.</span>
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {paddedDays.map((day, index) => {
                if (!day) return (
                  <div
                    key={`pad-${index}`}
                    className="aspect-square rounded-lg bg-[hsl(var(--surface-1))]/40"
                  />
                );

                const dayEvents = eventsForDate(day);
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const thumbEvent = dayEvents.find((e) => !!e.thumbnail_url) ?? null;
                const featured = dayEvents[0] ?? null;

                return (
                  <ContextMenu key={day.toISOString()}>
                    <ContextMenuTrigger asChild>
                      <button
                        onClick={() => setSelectedDate(day)}
                        onDoubleClick={() => canCreate && featured && openEdit(featured)}
                        className={cn(
                          'relative aspect-square rounded-lg transition-colors flex flex-col text-left overflow-hidden',
                          'bg-[hsl(var(--surface-1))] hover:bg-[hsl(var(--surface-2))]',
                          isToday && !thumbEvent && 'bg-primary/10',
                          isSelected && 'ring-2 ring-primary',
                          !isSameMonth(day, currentMonth) && 'opacity-60'
                        )}
                      >
                        {thumbEvent && (
                          <DayThumbnail url={thumbEvent.thumbnail_url!} />
                        )}
                        <span
                          className={cn(
                            'relative z-10 text-sm font-medium px-1 pt-0.5',
                            thumbEvent ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : isToday && 'text-primary'
                          )}
                        >
                          {format(day, 'd')}
                        </span>
                        {thumbEvent ? (
                          <div className="relative z-10 mt-auto w-full px-1 pb-1 text-center">
                            <div className="text-[11px] font-semibold text-white truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                              {thumbEvent.title}
                            </div>
                            {dayEvents.length > 1 && (
                              <div className="text-[10px] text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                +{dayEvents.length - 1}
                              </div>
                            )}
                          </div>
                        ) : (
                          dayEvents.length > 0 && (
                            <div className="flex-1 space-y-0.5 overflow-hidden w-full mt-0.5 px-1">
                              {dayEvents.slice(0, 2).map((event) => (
                                <DayCellEvent key={event.id} event={event} onClick={() => openEdit(event)} />
                              ))}
                              {dayEvents.length > 2 && (
                                <div className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 2}</div>
                              )}
                            </div>
                          )
                        )}
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      {canCreate && (
                        <ContextMenuItem onClick={() => openCreate(day)}>
                          <Plus className="w-4 h-4 mr-2" /> Nouvel événement
                        </ContextMenuItem>
                      )}
                      {dayEvents.length > 0 && <ContextMenuSeparator />}
                      {dayEvents.map((e) => (
                        <ContextMenuItem key={e.id} onClick={() => openEdit(e)}>
                          <Pencil className="w-4 h-4 mr-2" /> Modifier « {e.title} »
                        </ContextMenuItem>
                      ))}
                      {dayEvents.map((e) => (
                        (canManageEvents || true) && (
                          <ContextMenuItem
                            key={`del-${e.id}`}
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(e)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Supprimer « {e.title} »
                          </ContextMenuItem>
                        )
                      ))}
                    </ContextMenuContent>
                  </ContextMenu>
                );
              })}
            </div>

            {selectedDate && (
              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <h4 className="font-semibold mb-3 capitalize">
                  {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
                </h4>
                {eventsForDate(selectedDate).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun événement ce jour</p>
                ) : (
                  <div className="space-y-2">
                    {eventsForDate(selectedDate).map((event) => (
                      <EventDetailCard key={event.id} event={event} canManage={canManageEvents} onEdit={openEdit} onDelete={handleDelete} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <ChannelEventModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        channelId={channel.id}
        serverId={serverId}
        initialDate={modalInitialDate}
        editing={editing}
      />
    </div>
  );
}

/**
 * Day cell thumbnail. Detects transparent PNGs and crops them to the bounding
 * box of their opaque pixels so the shape itself fills the card without gaps.
 * Opaque images keep the dark bottom gradient for the title legibility.
 */
export function DayThumbnail({ url }: { url: string }) {
  const [hasAlpha, setHasAlpha] = useState(() => sourceMayHaveTransparency(url));
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    const mayHaveAlpha = sourceMayHaveTransparency(url);
    setCroppedUrl(null);
    setHasAlpha(mayHaveAlpha);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const sampleSize = 64;
        const scale = Math.min(1, sampleSize / Math.max(img.naturalWidth, img.naturalHeight));
        const sw = Math.max(1, Math.round(img.naturalWidth * scale));
        const sh = Math.max(1, Math.round(img.naturalHeight * scale));
        const sample = document.createElement('canvas');
        sample.width = sw;
        sample.height = sh;
        const sctx = sample.getContext('2d');
        if (!sctx) return;
        sctx.drawImage(img, 0, 0, sw, sh);
        const data = sctx.getImageData(0, 0, sw, sh).data;
        const transparent = canvasHasTransparentPixels(data);
        if (cancel) return;
        setHasAlpha(transparent);
        if (!transparent) return;

        // Compute opaque-pixel bounding box on the sample.
        const bounds = findOpaqueBounds(data, sw, sh);
        if (!bounds) return; // Fully transparent image — keep as-is.

        // Map sample bbox back to original coordinates without padding: the goal
        // is to remove every transparent gap around the extracted shape.
        const ox = Math.max(0, Math.floor(bounds.x / scale));
        const oy = Math.max(0, Math.floor(bounds.y / scale));
        const ow = Math.min(img.naturalWidth - ox, Math.ceil(bounds.width / scale));
        const oh = Math.min(img.naturalHeight - oy, Math.ceil(bounds.height / scale));
        if (ow <= 0 || oh <= 0) return;

        const out = document.createElement('canvas');
        out.width = ow;
        out.height = oh;
        const octx = out.getContext('2d');
        if (!octx) return;
        octx.drawImage(img, ox, oy, ow, oh, 0, 0, ow, oh);
        const cropped = out.toDataURL('image/png');
        if (!cancel) setCroppedUrl(cropped);
      } catch {
        // CORS-tainted canvas — keep PNG/WebP/SVG treated as transparent-capable,
        // avoiding any dark overlay even when client-side cropping is blocked.
        if (!cancel) setHasAlpha(mayHaveAlpha);
      }
    };
    img.src = url;
    return () => { cancel = true; };
  }, [url]);

  return (
    <>
      <img
        src={croppedUrl ?? url}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center"
      />
      {!hasAlpha && (
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/50 to-transparent pointer-events-none" />
      )}
    </>
  );
}


/**
 * Day cell event chip (fallback when no thumbnail).
 */
function DayCellEvent({ event, onClick }: { event: ChannelCalendarEvent; onClick: () => void }) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="rounded overflow-hidden cursor-pointer bg-primary/15"
      role="button"
      tabIndex={0}
    >
      <div className="text-[10px] truncate px-1 text-primary">
        {event.title}
      </div>
    </div>
  );
}

function EventAgendaCard({
  event, canManage, onEdit, onDelete,
}: { event: ChannelCalendarEvent; canManage: boolean; onEdit: (e: ChannelCalendarEvent) => void; onDelete: (e: ChannelCalendarEvent) => void }) {
  const start = new Date(event.starts_at);
  const end = new Date(event.ends_at);
  const multiDay = differenceInCalendarDays(end, start) > 0;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="rounded-2xl bg-[hsl(var(--surface-1))] border-l-4 overflow-hidden cursor-pointer"
          style={{ borderColor: event.color }}
          onClick={() => onEdit(event)}
        >
          {event.thumbnail_url && (
            <div className="w-full aspect-square overflow-hidden">
              <img src={event.thumbnail_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-muted/40 flex-shrink-0">
                <span className="text-xs font-medium text-muted-foreground uppercase">{format(start, 'MMM', { locale: fr })}</span>
                <span className="text-lg font-bold leading-none">{format(start, 'd')}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="font-medium truncate">{event.title}</h5>
                {event.description && (
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{event.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {event.all_day
                      ? (multiDay ? `${format(start, 'd MMM', { locale: fr })} → ${format(end, 'd MMM', { locale: fr })}` : 'Toute la journée')
                      : `${format(start, 'HH:mm')} – ${format(end, multiDay ? "d MMM HH:mm" : 'HH:mm', { locale: fr })}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onEdit(event)}>
          <Pencil className="w-4 h-4 mr-2" /> Modifier
        </ContextMenuItem>
        <ContextMenuItem onClick={() => { copyToClipboard(event.id); toast.success('ID copié'); }}>
          <Copy className="w-4 h-4 mr-2" /> Copier l'ID
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete(event)}
        >
          <Trash2 className="w-4 h-4 mr-2" /> Supprimer
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function EventDetailCard({
  event, canManage, onEdit, onDelete,
}: { event: ChannelCalendarEvent; canManage: boolean; onEdit: (e: ChannelCalendarEvent) => void; onDelete: (e: ChannelCalendarEvent) => void }) {
  const start = new Date(event.starts_at);
  const end = new Date(event.ends_at);
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="p-3 bg-background rounded-md border-l-4 cursor-pointer"
          style={{ borderColor: event.color }}
          onClick={() => onEdit(event)}
        >
          <h5 className="font-medium">{event.title}</h5>
          {event.description && (
            <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {event.all_day ? 'Toute la journée' : `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`}
            </span>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onEdit(event)}>
          <Pencil className="w-4 h-4 mr-2" /> Modifier
        </ContextMenuItem>
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete(event)}
        >
          <Trash2 className="w-4 h-4 mr-2" /> Supprimer
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
