import { useEffect, useMemo, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Calendar as CalendarIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { X } from '@/components/icons/discord/lucide';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TIME_SLOTS, combineDateTime, parseTime } from '@/lib/reminders';
import { cn } from '@/lib/utils';

/*
 * "Definir le rappel personnalise" (video de reference) : Date (selecteur de calendrier) et Heure (champ avec liste
 * de creneaux de 15 minutes, saisie libre acceptee), puis Annuler / Enregistrer. Enregistrer reste inactif tant que
 * l'heure n'est pas valide ou que l'instant choisi est passe.
 */

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Date | null;
  onSave: (at: Date) => void;
}

const fmtDate = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

export function ReminderTimeModal({ open, onOpenChange, initial, onSave }: Props) {
  const [date, setDate] = useState(() => new Date());
  const [time, setTime] = useState('');
  const [listOpen, setListOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const base = initial ?? new Date();
    setDate(base);
    setTime(initial ? `${String(base.getHours()).padStart(2, '0')}:${String(base.getMinutes()).padStart(2, '0')}` : '');
    setListOpen(false);
  }, [open, initial]);

  const parsed = parseTime(time);
  const at = parsed ? combineDateTime(date, parsed) : null;
  const valid = !!at && at.getTime() > Date.now();

  const shown = useMemo(() => {
    const q = time.trim();
    const list = q ? TIME_SLOTS.filter((s) => s.startsWith(q) || s.replace(':', '').startsWith(q.replace(':', ''))) : TIME_SLOTS;
    // Heure saisie hors creneaux (ex. 11:53) : proposee en tete.
    return parsed && !list.includes(parsed) ? [parsed, ...list] : list;
  }, [time, parsed]);

  const save = () => {
    if (!at || !valid) return;
    onSave(at);
    onOpenChange(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[120] bg-black/85 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-100" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[130] -translate-x-1/2 -translate-y-1/2 w-[576px] max-w-[calc(100vw-32px)] rounded-xl bg-[#383840] border border-white/[0.08] p-6 shadow-[0_8px_16px_rgba(0,0,0,0.24)] outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] duration-100"
        >
          <DialogPrimitive.Title className="text-xl leading-6 font-semibold text-white">Définir le rappel personnalisé</DialogPrimitive.Title>
          <DialogPrimitive.Close aria-label="Fermer" className="absolute top-5 right-5 w-6 h-6 flex items-center justify-center text-[hsl(var(--icon-default))] hover:text-white">
            <X className="w-5 h-5" />
          </DialogPrimitive.Close>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-2 text-base font-medium text-white">Date <span className="text-[#f23f42]">*</span></label>
              <Popover open={calOpen} onOpenChange={setCalOpen}>
                <PopoverTrigger asChild>
                  <button type="button" aria-label="Choisir la date" className="w-full h-[46px] px-3 rounded-lg bg-[#2f2f37] border border-white/[0.06] hover:border-white/15 flex items-center justify-between text-base text-white transition-colors">
                    {fmtDate(date)}
                    <CalendarIcon className="w-5 h-5 text-[hsl(var(--icon-default))]" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="z-[140] w-auto p-2 rounded-lg bg-[#2f2f37] border border-white/[0.08]">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => { if (d) { setDate(d); setCalOpen(false); } }}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="relative">
              <label htmlFor="reminder-time" className="block mb-2 text-base font-medium text-white">Heure <span className="text-[#f23f42]">*</span></label>
              <div className={cn('flex items-center h-[46px] rounded-lg bg-[#2f2f37] border transition-colors', listOpen ? 'border-[#5b63e4]' : 'border-white/[0.06] hover:border-white/15')}>
                <input
                  id="reminder-time"
                  value={time}
                  onChange={(e) => { setTime(e.target.value); setListOpen(true); }}
                  onFocus={() => setListOpen(true)}
                  onBlur={() => setTimeout(() => setListOpen(false), 120)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (listOpen && !valid && shown[0]) { setTime(shown[0]); setListOpen(false); } else save(); } if (e.key === 'Escape' && listOpen) { e.stopPropagation(); setListOpen(false); } }}
                  placeholder="Sélection…"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Heure"
                  aria-invalid={!!time && !parsed}
                  className="flex-1 min-w-0 h-full px-3 bg-transparent outline-none text-base text-white placeholder:text-[#9b9ba8]"
                />
                <button type="button" tabIndex={-1} aria-label="Afficher les heures" onMouseDown={(e) => { e.preventDefault(); setListOpen((o) => !o); }} className="w-10 h-full flex items-center justify-center text-white">
                  {listOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
              {listOpen && (
                <div ref={listRef} role="listbox" aria-label="Heures" className="absolute left-0 right-0 top-full mt-1 z-20 max-h-[190px] overflow-y-auto scrollbar-thin rounded-lg bg-[#2f2f37] border border-white/[0.08] shadow-[0_8px_16px_rgba(0,0,0,0.35)] py-1">
                  {shown.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">Aucune heure.</p>}
                  {shown.map((s) => (
                    <button
                      key={s}
                      type="button"
                      role="option"
                      aria-selected={s === parsed}
                      onMouseDown={(e) => { e.preventDefault(); setTime(s); setListOpen(false); }}
                      className={cn('w-full h-10 px-3 text-left text-base text-white hover:bg-white/[0.07]', s === parsed && 'bg-white/[0.08]')}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => onOpenChange(false)} className="h-[46px] rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-base font-medium text-white transition-colors">Annuler</button>
            <button type="button" onClick={save} disabled={!valid} className="h-[46px] rounded-lg bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 disabled:pointer-events-none text-base font-medium text-white transition-colors">Enregistrer</button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
