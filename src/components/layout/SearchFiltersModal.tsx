import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar as CalendarIcon, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Plus, Trash2, X, XCircle } from '@/components/icons/discord/lucide';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserAvatarImage } from '@/components/ui/user-avatar-image';
import { cn } from '@/lib/utils';
import {
  AUTHOR_OPTIONS,
  HAS_OPTIONS,
  countFilters,
  emptyParsedSearch,
  type ParsedSearch,
  type SearchAuthor,
  type SearchDateMode,
  type SearchHas,
} from '@/lib/searchQuery';
import { StreamlineHash } from '@/components/icons/StreamlineHash';
import { AUTHOR_ICONS, HAS_ICONS, channelTypeIcon } from './searchIcons';

import { appLocale } from '@/i18n/locale';
/*
 * Fenetre "Filtres" de la recherche (video de reference) : un champ par
 * critere avec pastilles et liste a cases a cocher, dates "Avant le / Apres
 * le / Le" avec calendrier, type d'auteur, epingle. Elle lit et rend la meme
 * structure que la barre de recherche (ParsedSearch).
 */

interface MemberLite {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
}

interface ChannelLite {
  id: string;
  name: string;
  type: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: ParsedSearch;
  members: MemberLite[];
  channels: ChannelLite[];
  onApply: (value: ParsedSearch) => void;
}

const DATE_MODES: { value: SearchDateMode; label: string }[] = [
  { value: 'before', label: 'Avant le' },
  { value: 'after', label: 'Après le' },
  { value: 'during', label: 'Le' },
];

const fieldBox =
  'flex items-center gap-1.5 min-h-10 w-full rounded-lg border bg-[hsl(var(--search-background))] pl-2.5 pr-2 py-1 cursor-text transition-colors';

function Field({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-base font-semibold text-white">{title}</p>
      <p className="mb-2 text-sm text-muted-foreground">{hint}</p>
      {children}
    </div>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        'w-5 h-5 shrink-0 rounded flex items-center justify-center border transition-colors',
        checked ? 'bg-primary border-primary text-white' : 'border-[hsl(var(--header-icon))]',
      )}
    >
      {checked && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
    </span>
  );
}

interface Option {
  value: string;
  label: string;
  icon: React.ReactNode;
  keywords?: string;
}

/** Champ a pastilles avec liste deroulante a cases a cocher. */
function ChipSelect({
  placeholder,
  options,
  selected,
  onChange,
}: {
  placeholder: string;
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const f = filter.trim().toLowerCase();
  const shown = options.filter((o) => !f || o.label.toLowerCase().includes(f) || o.keywords?.toLowerCase().includes(f));
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setFilter('');
      }}
    >
      <PopoverTrigger asChild>
        <div
          role="combobox"
          aria-expanded={open}
          tabIndex={-1}
          onClick={() => requestAnimationFrame(() => inputRef.current?.focus())}
          className={cn(fieldBox, open ? 'border-primary' : 'border-white/[0.06] hover:border-white/[0.12]')}
        >
          <div className="flex flex-1 min-w-0 flex-wrap items-center gap-1">
            {selected.map((v) => {
              const o = options.find((x) => x.value === v);
              return (
                <span key={v} className="inline-flex items-center gap-1 h-6 pl-1.5 pr-1 rounded bg-[hsl(var(--button-secondary))] text-sm text-white">
                  {o?.icon}
                  <span className="max-w-[140px] truncate">{o?.label ?? v}</span>
                  <button
                    type="button"
                    aria-label={`Retirer ${o?.label ?? v}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(v);
                    }}
                    className="text-[hsl(var(--header-icon))] hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              );
            })}
            <input
              ref={inputRef}
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !filter && selected.length) onChange(selected.slice(0, -1));
                if (e.key === 'Enter' && shown[0]) {
                  e.preventDefault();
                  toggle(shown[0].value);
                }
              }}
              placeholder={selected.length ? '' : placeholder}
              className="flex-1 min-w-[60px] h-7 bg-transparent text-base text-foreground placeholder:text-[hsl(var(--text-placeholder))] outline-none"
            />
          </div>
          {open ? <ChevronUp className="w-5 h-5 shrink-0 text-foreground" /> : <ChevronDown className="w-5 h-5 shrink-0 text-foreground" />}
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-[--radix-popover-trigger-width] p-1 max-h-[220px] overflow-y-auto scrollbar-thin bg-[hsl(var(--search-background))] border-white/[0.06]"
      >
        {shown.length === 0 && <p className="px-2 py-3 text-center text-sm text-muted-foreground">Aucun résultat</p>}
        {shown.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            className="w-full flex items-center gap-2.5 h-9 px-2 rounded text-left text-base text-foreground hover:bg-[hsl(var(--interactive-background-hover))]"
          >
            <span className="shrink-0 text-[hsl(var(--icon-default))]">{o.icon}</span>
            <span className="flex-1 min-w-0 truncate">{o.label}</span>
            <Checkbox checked={selected.includes(o.value)} />
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/** Calendrier compact du filtre de date (mois en capitales, semaine du lundi). */
function MiniCalendar({ value, onChange }: { value: string | null; onChange: (iso: string) => void }) {
  const today = new Date();
  const initial = value ? new Date(`${value}T12:00:00`) : today;
  const [month, setMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const start = new Date(month);
  start.setDate(1 - ((month.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const label = month.toLocaleDateString(appLocale(), { month: 'long', year: 'numeric' }).toUpperCase();

  return (
    <div className="w-[280px] p-3">
      <div className="flex items-center justify-between mb-2">
        <button type="button" aria-label="Mois précédent" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="p-1 rounded hover:bg-[hsl(var(--interactive-background-hover))]">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-white">{label}</span>
        <button type="button" aria-label="Mois suivant" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="p-1 rounded hover:bg-[hsl(var(--interactive-background-hover))]">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs font-semibold text-muted-foreground mb-1">
        {['LU', 'MA', 'ME', 'JE', 'VE', 'SA', 'DI'].map((d) => <span key={d} className="py-1">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d) => {
          const key = iso(d);
          const inMonth = d.getMonth() === month.getMonth();
          const isToday = key === iso(today);
          const isSel = key === value;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={cn(
                'relative h-8 rounded text-sm transition-colors',
                inMonth ? 'text-foreground' : 'text-muted-foreground/50',
                isSel ? 'bg-primary text-white' : 'hover:bg-[hsl(var(--interactive-background-hover))]',
                isToday && !isSel && 'font-semibold text-white after:absolute after:left-2 after:right-2 after:bottom-0.5 after:h-0.5 after:rounded after:bg-primary',
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SearchFiltersModal({ open, onOpenChange, initial, members, channels, onApply }: Props) {
  const [value, setValue] = useState<ParsedSearch>(initial);
  useEffect(() => {
    if (open) setValue(initial);
  }, [open, initial]);

  const total = countFilters(value);
  const set = <K extends keyof ParsedSearch>(k: K, v: ParsedSearch[K]) => setValue((prev) => ({ ...prev, [k]: v }));

  const memberOptions: Option[] = useMemo(
    () =>
      members.map((m) => ({
        value: m.username,
        label: m.username,
        keywords: m.displayName,
        icon: m.avatar ? (
          <UserAvatarImage src={m.avatar} alt={m.displayName} ownerId={m.id} className="w-5 h-5 rounded-full" />
        ) : (
          <Avatar className="w-5 h-5"><AvatarFallback className="text-[9px]">{m.displayName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
        ),
      })),
    [members],
  );
  const channelOptions: Option[] = useMemo(
    () =>
      channels.map((c) => {
        const Icon = channelTypeIcon[c.type] ?? StreamlineHash;
        return { value: c.name, label: c.name, icon: <Icon className="w-5 h-5" /> };
      }),
    [channels],
  );
  const hasOptions: Option[] = HAS_OPTIONS.map((o) => {
    const Icon = HAS_ICONS[o.value];
    return { value: o.value, label: o.label, icon: <Icon className="w-5 h-5" /> };
  });
  const authorOptions: Option[] = AUTHOR_OPTIONS.map((o) => {
    const Icon = AUTHOR_ICONS[o.value];
    return { value: o.value, label: o.label, icon: <Icon className="w-5 h-5" /> };
  });

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[440px] p-0 gap-0 overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="px-4 pt-4 pb-2">
          <DialogTitle className="text-xl font-semibold text-white">Filtres</DialogTitle>
          <DialogDescription className="sr-only">Affiner la recherche de messages</DialogDescription>
        </div>

        <div className="max-h-[min(60vh,560px)] overflow-y-auto scrollbar-thin px-4 pb-4 space-y-5">
          <Field title="De" hint="Envoyé par un ou plusieurs des utilisateurs sélectionnés">
            <ChipSelect placeholder="p. ex. : adrien_moulin" options={memberOptions} selected={value.from} onChange={(v) => set('from', v)} />
          </Field>
          <Field title="Dans" hint="Envoyé dans un ou plusieurs des salons sélectionnés">
            <ChipSelect placeholder="p.ex. général" options={channelOptions} selected={value.in} onChange={(v) => set('in', v)} />
          </Field>
          <Field title="Contient" hint="Inclut un ou plusieurs des types de données sélectionnés">
            <ChipSelect placeholder="N'importe quel contenu" options={hasOptions} selected={value.has} onChange={(v) => set('has', v as SearchHas[])} />
          </Field>
          <Field title="Mentions" hint="Mentionne un ou plusieurs des utilisateurs sélectionnés">
            <ChipSelect placeholder="p. ex. : adrien_moulin" options={memberOptions} selected={value.mentions} onChange={(v) => set('mentions', v)} />
          </Field>

          <Field title="Date" hint="La date d'envoi du message">
            <div className="space-y-2">
              {value.dates.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    aria-label="Type de date"
                    value={d.mode}
                    onChange={(e) => set('dates', value.dates.map((x, j) => (j === i ? { ...x, mode: e.target.value as SearchDateMode } : x)))}
                    className="h-10 w-[110px] shrink-0 rounded-lg bg-[hsl(var(--search-background))] border border-white/[0.06] px-2 text-base text-foreground outline-none"
                  >
                    {DATE_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex-1 min-w-0 h-10 flex items-center justify-between gap-2 rounded-lg bg-[hsl(var(--search-background))] border border-white/[0.06] px-3 text-base text-foreground"
                      >
                        <span className="truncate">
                          {new Date(`${d.date}T12:00:00`).toLocaleDateString(appLocale(), { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <CalendarIcon className="w-5 h-5 shrink-0 text-[hsl(var(--icon-default))]" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0 bg-[hsl(var(--popover))]">
                      <MiniCalendar
                        value={d.date}
                        onChange={(iso) => set('dates', value.dates.map((x, j) => (j === i ? { ...x, date: iso } : x)))}
                      />
                    </PopoverContent>
                  </Popover>
                  <button
                    type="button"
                    aria-label="Retirer la date"
                    onClick={() => set('dates', value.dates.filter((_, j) => j !== i))}
                    className="p-1 shrink-0 text-[hsl(var(--icon-default))] hover:text-destructive"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
              {value.dates.length < 2 && (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => set('dates', [...value.dates, { mode: value.dates[0]?.mode === 'before' ? 'after' : 'before', date: todayIso }])}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter une date
                </Button>
              )}
            </div>
          </Field>

          <Field title="Type d'auteur" hint="Envoyé par un ou plusieurs des types d'auteurs sélectionnés">
            <ChipSelect placeholder="p. ex. : Bot" options={authorOptions} selected={value.authors} onChange={(v) => set('authors', v as SearchAuthor[])} />
          </Field>

          <Field title="Épinglé" hint="Si le message est épinglé ou non">
            <div className="relative">
              <select
                aria-label="Épinglé"
                value={value.pinned === null ? '' : String(value.pinned)}
                onChange={(e) => set('pinned', e.target.value === '' ? null : e.target.value === 'true')}
                className={cn(
                  'appearance-none h-10 w-full rounded-lg bg-[hsl(var(--search-background))] border px-3 pr-16 text-base outline-none',
                  value.pinned === null ? 'text-[hsl(var(--text-placeholder))] border-white/[0.06]' : 'text-foreground border-primary',
                )}
              >
                <option value="">p. ex. : Vrai</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
              {value.pinned !== null && (
                <button type="button" aria-label="Effacer" onClick={() => set('pinned', null)} className="absolute right-9 top-1/2 -translate-y-1/2 text-[hsl(var(--icon-default))] hover:text-white">
                  <XCircle className="w-4 h-4" />
                </button>
              )}
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground" />
            </div>
          </Field>
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-4 bg-[hsl(var(--card))]">
          <button
            type="button"
            disabled={total === 0}
            onClick={() => setValue({ ...emptyParsedSearch(), text: value.text })}
            className="text-sm font-medium text-[hsl(var(--text-link))] hover:underline disabled:text-muted-foreground disabled:no-underline"
          >
            Effacer les filtres{total > 0 ? ` (${total})` : ''}
          </button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button
              disabled={total === 0 && countFilters(initial) === 0}
              onClick={() => {
                onApply(value);
                onOpenChange(false);
              }}
            >
              Appliquer les filtres
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
