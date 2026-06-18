import { useState } from 'react';
import { useCalendarEvents, CalendarEvent } from '@/hooks/useCalendarEvents';
import { Button } from '@/components/ui/button';
import { Calendar, Globe, Lock, Pencil, Trash2 } from 'lucide-react';
import { CreateEventModal } from './CreateEventModal';

function fmtDateTime(date: string, time: string): string {
  try {
    const d = new Date(`${date}T${time}`);
    return d.toLocaleString('fr-FR', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return `${date} ${time.slice(0, 5)}`;
  }
}

interface EventListBelowProps {
  userId?: string;
  readOnly?: boolean;
}

export function EventListBelow({ userId, readOnly = false }: EventListBelowProps = {}) {
  const { events, remove } = useCalendarEvents(userId);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);

  const sorted = [...events].sort((a, b) => {
    const ka = `${a.event_date}T${a.event_time}`;
    const kb = `${b.event_date}T${b.event_time}`;
    return ka.localeCompare(kb);
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {readOnly ? `Évènements (${sorted.length})` : `Mes évènements (${sorted.length})`}
        </h4>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <Calendar className="w-6 h-6 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-xs text-muted-foreground">
            {readOnly ? 'Aucun évènement public.' : 'Aucun évènement. Cliquez sur une case du calendrier pour en créer un.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {sorted.map((evt) => (
            <li
              key={evt.id}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2"
            >
              <div
                className="w-2.5 h-10 rounded-full shrink-0"
                style={{ backgroundColor: evt.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold truncate">{evt.title}</p>
                  {evt.is_public ? (
                    <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                  ) : (
                    <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {fmtDateTime(evt.event_date, evt.event_time)}
                </p>
                {evt.description && (
                  <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5">{evt.description}</p>
                )}
              </div>
              {!readOnly && (
                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(evt)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => remove.mutate(evt.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <CreateEventModal
        open={!!editing}
        onOpenChange={(v) => { if (!v) setEditing(null); }}
        editing={editing}
      />
    </div>
  );
}
