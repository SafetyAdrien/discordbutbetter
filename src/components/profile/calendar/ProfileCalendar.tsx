import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCalendarEvents, CalendarEvent } from '@/hooks/useCalendarEvents';
import { CreateEventModal } from './CreateEventModal';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 7h..22h
const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Monday=0
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

interface ProfileCalendarProps {
  userId?: string;
  readOnly?: boolean;
}

export function ProfileCalendar({ userId, readOnly = false }: ProfileCalendarProps = {}) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);

  const { events } = useCalendarEvents(userId);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const eventsBySlot = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const hour = parseInt(e.event_time.slice(0, 2), 10);
      const k = `${e.event_date}_${hour}`;
      const arr = map.get(k) || [];
      arr.push(e);
      map.set(k, arr);
    }
    return map;
  }, [events]);

  const goPrev = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };
  const goNext = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };
  const goToday = () => setWeekStart(startOfWeek(new Date()));

  const openCreate = (date: string, hour: number) => {
    setEditing(null);
    setSelectedSlot({ date, time: `${String(hour).padStart(2, '0')}:00` });
    setModalOpen(true);
  };

  const openEdit = (evt: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(evt);
    setSelectedSlot(null);
    setModalOpen(true);
  };

  const monthLabel = weekStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const today = fmtDate(new Date());

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold capitalize">{monthLabel}</h3>
          <p className="text-[11px] text-muted-foreground">
            Semaine du {weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={goToday} className="h-7 text-xs">Aujourd'hui</Button>
          <Button variant="ghost" size="icon" onClick={goPrev} className="h-7 w-7"><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={goNext} className="h-7 w-7"><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Days header — diagonal labels */}
        <div className="grid border-b border-border bg-muted/30" style={{ gridTemplateColumns: '44px repeat(7, 1fr)' }}>
          <div className="h-12" />
          {days.map((d, i) => {
            const iso = fmtDate(d);
            const isToday = iso === today;
            return (
              <div key={i} className="h-12 relative flex items-end justify-center pb-1 overflow-hidden">
                <div
                  className={cn(
                    'origin-bottom-left -rotate-45 whitespace-nowrap text-[11px] font-semibold leading-none translate-x-1',
                    isToday ? 'text-primary' : 'text-foreground',
                  )}
                  style={{ transformOrigin: '0% 100%' }}
                >
                  {DAY_NAMES[i]} {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Hour rows */}
        <div className="max-h-[380px] overflow-y-auto">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="grid border-b border-border/40 last:border-b-0"
              style={{ gridTemplateColumns: '44px repeat(7, 1fr)' }}
            >
              <div className="text-[10px] font-mono text-muted-foreground text-right pr-1.5 pt-1 select-none">
                {hour}h
              </div>
              {days.map((d, di) => {
                const iso = fmtDate(d);
                const k = `${iso}_${hour}`;
                const slotEvents = eventsBySlot.get(k) || [];
                const isToday = iso === today;
                return (
                  <button
                    key={di}
                    type="button"
                    onClick={() => openCreate(iso, hour)}
                    className={cn(
                      'relative h-10 border-l border-border/40 transition-colors hover:bg-primary/5 group text-left p-0.5 space-y-0.5 overflow-hidden',
                      isToday && 'bg-primary/[0.03]',
                    )}
                  >
                    {slotEvents.length === 0 && (
                      <Plus className="w-3 h-3 text-muted-foreground/0 group-hover:text-muted-foreground/40 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-colors" />
                    )}
                    {slotEvents.slice(0, 2).map((evt) => (
                      <div
                        key={evt.id}
                        onClick={(e) => openEdit(evt, e)}
                        className="w-full truncate text-[10px] font-semibold px-1 py-0.5 rounded leading-tight cursor-pointer hover:brightness-110"
                        style={{ backgroundColor: `${evt.color}33`, color: evt.color, borderLeft: `2px solid ${evt.color}` }}
                        title={evt.title}
                      >
                        {evt.title}
                      </div>
                    ))}
                    {slotEvents.length > 2 && (
                      <div className="text-[9px] text-muted-foreground px-1">+{slotEvents.length - 2}</div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <CreateEventModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialDate={selectedSlot?.date}
        initialTime={selectedSlot?.time}
        editing={editing}
      />
    </div>
  );
}
