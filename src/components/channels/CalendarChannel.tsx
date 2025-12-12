import { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, Clock, MapPin, Users } from 'lucide-react';
import { StreamlineCalendar } from '@/components/icons/StreamlineCalendar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const events: CalendarEvent[] = [];

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startPadding = (monthStart.getDay() + 6) % 7;
  const paddedDays = Array(startPadding).fill(null).concat(days);

  const eventsForDate = (date: Date) => 
    events.filter((e) => isSameDay(e.startDate, date));

  return (
    <div className="flex-1 flex flex-col bg-background min-w-0">
      <div className="h-12 px-4 flex items-center gap-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <StreamlineCalendar className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">{channel.name}</h2>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Nouvel événement
          </Button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="font-semibold min-w-[150px] text-center capitalize">
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
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
          Aujourd'hui
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
