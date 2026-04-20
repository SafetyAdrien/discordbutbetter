import { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, Clock, MapPin, Users, CalendarDays, List as ListIcon } from 'lucide-react';
import { StreamlineCalendar } from '@/components/icons/StreamlineCalendar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isAfter, isToday as isDateToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useHasChannelPermission } from '@/hooks/useUserChannelPermissions';
import { useBreakpoint } from '@/hooks/useBreakpoint';

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
}

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
  attendees?: number;
  color: string;
}

export function CalendarChannel({ channel, onToggleMembers, showMembers }: CalendarChannelProps) {
  const { isMobile } = useBreakpoint();
  // Permissions
  const { data: canCreateEvents = true } = useHasChannelPermission(channel.id, 'create_events');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>(isMobile ? 'agenda' : 'month');

  const events: CalendarEvent[] = [];

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startPadding = (monthStart.getDay() + 6) % 7;
  const paddedDays = Array(startPadding).fill(null).concat(days);

  const eventsForDate = (date: Date) =>
    events.filter((e) => isSameDay(e.startDate, date));

  const upcomingEvents = events
    .filter((e) => isAfter(e.startDate, new Date()) || isDateToday(e.startDate))
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  return (
    <div className="flex-1 flex flex-col bg-[hsl(var(--surface-2)/0.3)] min-w-0 w-full overflow-x-hidden">
      <div className="h-12 px-2 sm:px-4 flex items-center gap-2 sm:gap-4 flex-shrink-0 bg-[hsl(var(--surface-2))] w-full" style={{ borderBottom: "1px solid hsl(var(--border) / 0.5)", boxShadow: "var(--shadow-elevation-1)", borderRadius: "0 0 var(--radius-xl) var(--radius-xl)" }}>
        <div className="flex items-center gap-2 min-w-0 flex-shrink">
          <StreamlineCalendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <h2 className="font-semibold text-foreground truncate">{channel.name}</h2>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 ml-auto flex-shrink-0">
          {/* View toggle */}
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setViewMode('month')}
              className={cn(
                'p-1.5 transition-colors',
                viewMode === 'month' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              )}
              aria-label="Vue mois"
            >
              <CalendarDays className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={cn(
                'p-1.5 transition-colors',
                viewMode === 'agenda' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              )}
              aria-label="Vue agenda"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
          {canCreateEvents && (
            <Button size="sm" className="hidden sm:inline-flex">
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Nouvel événement</span>
            </Button>
          )}
          {onToggleMembers && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={onToggleMembers}
                  className={cn(showMembers && "bg-surface-hover")}
                >
                  <Users className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showMembers ? "Masquer les membres" : "Afficher les membres"}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {viewMode === 'agenda' ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {upcomingEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <StreamlineCalendar className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Aucun événement à venir</h3>
              <p className="text-muted-foreground text-sm max-w-md mb-4">
                Créez un événement pour planifier des activités avec votre serveur.
              </p>
              {canCreateEvents && (
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvel événement
                </Button>
              )}
            </div>
          ) : (
            upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="p-4 rounded-2xl bg-[hsl(var(--surface-1))] border-l-4"
                style={{ borderColor: event.color }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-muted/40 flex-shrink-0">
                    <span className="text-xs font-medium text-muted-foreground uppercase">
                      {format(event.startDate, 'MMM', { locale: fr })}
                    </span>
                    <span className="text-lg font-bold leading-none">
                      {format(event.startDate, 'd')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium truncate">{event.title}</h5>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(event.startDate, 'HH:mm')}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </span>
                      )}
                      {event.attendees && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {event.attendees}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <>


      {/* Calendar Navigation */}
      <div className="px-2 sm:px-4 py-3 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="font-semibold min-w-[100px] sm:min-w-[150px] text-center capitalize text-sm sm:text-base">
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </h3>
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())} className="text-xs sm:text-sm">
          <span className="hidden sm:inline">Aujourd'hui</span>
          <span className="sm:hidden">Auj.</span>
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {paddedDays.map((day, index) => {
            if (!day) {
              return <div key={`pad-${index}`} className="aspect-square" />;
            }

            const dayEvents = eventsForDate(day);
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  'aspect-square p-1 rounded-lg transition-colors flex flex-col',
                  isToday && 'bg-primary/10',
                  isSelected && 'ring-2 ring-primary',
                  !isSameMonth(day, currentMonth) && 'opacity-30',
                  'hover:bg-muted'
                )}
              >
                <span className={cn(
                  'text-sm font-medium',
                  isToday && 'text-primary'
                )}>
                  {format(day, 'd')}
                </span>
                {dayEvents.length > 0 && (
                  <div className="flex-1 space-y-0.5 overflow-hidden">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className="text-[10px] truncate px-1 rounded"
                        style={{ backgroundColor: event.color + '30', color: event.color }}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-muted-foreground px-1">
                        +{dayEvents.length - 2}
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected date events */}
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
                  <div
                    key={event.id}
                    className="p-3 bg-background rounded-md border-l-4"
                    style={{ borderColor: event.color }}
                  >
                    <h5 className="font-medium">{event.title}</h5>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {event.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(event.startDate, 'HH:mm')}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </span>
                      )}
                      {event.attendees && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {event.attendees} participants
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
