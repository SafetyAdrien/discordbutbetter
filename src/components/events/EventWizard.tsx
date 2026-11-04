import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, MapPin, Pencil } from '@/components/icons/discord/lucide';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ImageCropEditor } from '@/components/ui/image-crop-editor';
import { StreamlineStage } from '@/components/icons/StreamlineStage';
import { StreamlineVoice } from '@/components/icons/StreamlineVoice';
import { CreateChannelModal } from '@/components/modals/CreateChannelModal';
import { useAuth } from '@/contexts/AuthContext';
import { useChannels } from '@/hooks/useChannels';
import { useServerEventMutations, type ServerEventInput } from '@/hooks/useServerEvents';
import { cn } from '@/lib/utils';
import {
  parseTimeInput,
  recurrenceOptions,
  timeSlots,
  type EventLocationType,
  type EventRecurrence,
  type ServerEvent,
} from '@/lib/serverEvents';
import { EventCard } from './EventCard';

import { appLocale } from '@/i18n/locale';
import { userKey } from '@/lib/userScope';
/*
 * "Creer un evenement" (video de reference), en trois etapes :
 *  1. Emplacement : salon de conference / salon vocal / ailleurs ;
 *  2. Infos de l'evenement : sujet, date (calendrier), heure (creneaux de
 *     15 min ou saisie libre), frequence, description, image de couverture ;
 *  3. Verification : apercu de la carte.
 * Sert aussi a "Modifier l'evenement" (toute la serie ou une occurrence :
 * l'occurrence est alors annulee et remplacee par un evenement unique).
 */

const STEPS = ["Emplacement", "Infos de l'événement", 'Vérification'] as const;
const PROMO_KEY = 'events:stage-promo-hidden';

const fieldCls =
  'w-full h-11 px-3 rounded-lg bg-[hsl(var(--search-background))] border border-white/[0.06] focus:border-primary text-base text-foreground placeholder:text-[hsl(var(--text-placeholder))] outline-none transition-colors';

export interface EventWizardEdit {
  event: ServerEvent;
  scope: 'series' | 'occurrence';
  occurrence?: Date;
}

interface EventWizardProps {
  open: boolean;
  serverId: string;
  onClose: () => void;
  onCreated?: (event: ServerEvent) => void;
  edit?: EventWizardEdit | null;
  /** Ouverture depuis un salon de conference : emplacement preselectionne. */
  preset?: { type: EventLocationType; channelId: string } | null;
}

const pad = (n: number) => String(n).padStart(2, '0');
const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function defaultStart(): Date {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  return d;
}

function readPromoHidden() {
  try {
    return localStorage.getItem(userKey(PROMO_KEY)) === '1';
  } catch {
    return false;
  }
}

/** Champ de date avec le calendrier de Discord (jours passes desactives). */
function DateField({ value, onChange, min }: { value: Date; onChange: (d: Date) => void; min: Date }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date(value.getFullYear(), value.getMonth(), 1));
  useEffect(() => {
    if (open) setMonth(new Date(value.getFullYear(), value.getMonth(), 1));
  }, [open, value]);
  const start = new Date(month);
  start.setDate(1 - ((month.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const minKey = toDateKey(min);
  const todayKey = toDateKey(new Date());
  const canPrev = month > new Date(min.getFullYear(), min.getMonth(), 1);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn(fieldCls, 'flex items-center justify-between text-left')}>
          {value.toLocaleDateString(appLocale(), { day: 'numeric', month: 'short', year: 'numeric' })}
          <CalendarDays className="w-5 h-5 text-[hsl(var(--icon-default))]" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[386px] p-0 bg-[hsl(var(--surface-card))] border-[hsl(var(--border-subtle))]">
        <div className="flex items-center justify-between px-4 py-4">
          <button type="button" aria-label="Mois précédent" disabled={!canPrev} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className={cn('w-5 h-5 flex items-center justify-center rounded bg-[hsl(var(--button-secondary))]', !canPrev && 'invisible')}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-sm font-bold text-white">{month.toLocaleDateString(appLocale(), { month: 'long', year: 'numeric' }).toUpperCase()}</span>
          <button type="button" aria-label="Mois suivant" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="w-5 h-5 flex items-center justify-center rounded bg-[hsl(var(--button-secondary))]">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="mx-6 grid grid-cols-7 border-t border-[hsl(var(--border-subtle))] text-center text-sm font-medium text-muted-foreground">
          {['LU', 'MA', 'ME', 'JE', 'VE', 'SA', 'DI'].map((d) => <span key={d} className="py-3">{d}</span>)}
        </div>
        <div className="mx-6 mb-4 grid grid-cols-7 border-l border-t border-[hsl(var(--background))]">
          {days.map((d) => {
            const key = toDateKey(d);
            const past = key < minKey;
            const inMonth = d.getMonth() === month.getMonth();
            const selected = key === toDateKey(value);
            return (
              <button
                key={key}
                type="button"
                disabled={past}
                onClick={() => {
                  onChange(d);
                  setOpen(false);
                }}
                className={cn(
                  'relative h-12 border-r border-b border-[hsl(var(--background))] text-sm font-medium transition-colors',
                  past ? 'bg-[hsl(var(--card))] text-muted-foreground/60 cursor-not-allowed' : 'bg-[hsl(var(--surface-card))] hover:bg-[hsl(var(--interactive-background-hover))]',
                  !past && (inMonth ? 'text-white' : 'text-muted-foreground'),
                  selected && 'bg-[hsl(var(--interactive-background-selected))] font-bold',
                  key === todayKey && 'after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[3px] after:bg-primary',
                )}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Heure : saisie libre + liste de creneaux de 15 min (comme Discord). */
function TimeField({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => setText(value), [value]);
  const slots = useMemo(() => timeSlots(), []);
  const filtered = useMemo(() => {
    const q = text.replace(/\D/g, '');
    if (!open || text === value || !q) return slots;
    return slots.filter((s) => s.replace(':', '').startsWith(q.padStart(q.length > 2 ? 4 : 2, '0').slice(0, q.length > 2 ? 4 : 2)) || s.startsWith(text));
  }, [text, value, open, slots]);
  useEffect(() => {
    if (!open) return;
    // La liste est montee apres l'ouverture du popover : on attend une frame.
    const id = requestAnimationFrame(() => {
      const list = listRef.current;
      if (!list) return;
      const idx = filtered.findIndex((s) => s >= value);
      const el = list.children[Math.max(0, idx)] as HTMLElement | undefined;
      if (el) list.scrollTop = el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2;
    });
    return () => cancelAnimationFrame(id);
  }, [open, filtered, value]);
  const commit = () => {
    const t = parseTimeInput(text);
    if (t) onChange(t);
    else setText(value);
  };
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) commit(); }}>
      <PopoverAnchor asChild>
        <div className={cn(fieldCls, 'flex items-center gap-2 cursor-text', open && 'border-primary')} onClick={() => setOpen(true)}>
          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commit();
                setOpen(false);
              }
            }}
            aria-label="Heure de début"
            className="flex-1 min-w-0 bg-transparent outline-none"
          />
          <ChevronDown className={cn('w-5 h-5 shrink-0 text-[hsl(var(--icon-default))] transition-transform', open && 'rotate-180')} />
        </div>
      </PopoverAnchor>
      <PopoverContent align="start" sideOffset={4} onOpenAutoFocus={(e) => e.preventDefault()} className="w-[var(--radix-popover-trigger-width)] p-1 bg-[hsl(var(--surface-card))] border-[hsl(var(--border-subtle))]">
        <div ref={listRef} className="max-h-[200px] overflow-y-auto scrollbar-thin">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                onChange(s);
                setOpen(false);
              }}
              className={cn('w-full h-10 px-3 rounded text-left text-base text-foreground hover:bg-[hsl(var(--interactive-background-hover))]', s === value && 'bg-[hsl(var(--interactive-background-selected))] text-white')}
            >
              {s}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Liste deroulante a la Discord (coche sur l'option choisie). */
function SelectField<T extends string>({ value, options, onChange, renderLabel, placeholder }: {
  value: T | '';
  options: { value: T; label: string; icon?: React.ReactNode }[];
  onChange: (v: T) => void;
  renderLabel?: (o: { value: T; label: string; icon?: React.ReactNode }) => React.ReactNode;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn(fieldCls, 'flex items-center gap-2 text-left', open && 'border-primary')}>
          <span className="flex-1 min-w-0 truncate flex items-center gap-2">
            {current ? (renderLabel ? renderLabel(current) : <>{current.icon}{current.label}</>) : <span className="text-[hsl(var(--text-placeholder))]">{placeholder}</span>}
          </span>
          <ChevronDown className={cn('w-5 h-5 shrink-0 text-[hsl(var(--icon-default))] transition-transform', open && 'rotate-180')} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4} className="w-[var(--radix-popover-trigger-width)] p-1 bg-[hsl(var(--surface-card))] border-[hsl(var(--border-subtle))]">
        <div className="max-h-[240px] overflow-y-auto scrollbar-thin">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={cn('w-full min-h-10 px-3 py-2 rounded flex items-center gap-2 text-left text-base text-foreground hover:bg-[hsl(var(--interactive-background-hover))]', o.value === value && 'bg-[hsl(var(--interactive-background-selected))] text-white')}
            >
              <span className="flex-1 min-w-0 flex items-center gap-2">{o.icon}{o.label}</span>
              {o.value === value && <Check className="w-4 h-4 shrink-0" strokeWidth={3} />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block mb-2 text-base font-medium text-foreground">
      {children} {required && <span className="text-destructive">*</span>}
    </label>
  );
}

export function EventWizard({ open, serverId, onClose, onCreated, edit, preset }: EventWizardProps) {
  const { user, profile } = useAuth();
  const { data: channelsData } = useChannels(open ? serverId : null);
  const allChannels = useMemo(
    () => (channelsData ? [...channelsData.orphanChannels, ...channelsData.categories.flatMap((c) => c.channels)] : []),
    [channelsData],
  );
  const stageChannels = allChannels.filter((c) => c.type === 'stage');
  const voiceChannels = allChannels.filter((c) => c.type === 'voice');
  const { uploadCover, create, update, cancelOccurrence } = useServerEventMutations(serverId);

  const [step, setStep] = useState(0);
  const [locationType, setLocationType] = useState<EventLocationType | null>(null);
  const [channelId, setChannelId] = useState('');
  const [place, setPlace] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<Date>(defaultStart);
  const [time, setTime] = useState(() => {
    const d = defaultStart();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [endDate, setEndDate] = useState<Date>(defaultStart);
  const [endTime, setEndTime] = useState('');
  const [recurrence, setRecurrence] = useState<EventRecurrence>('none');
  const [description, setDescription] = useState('');
  const [cover, setCover] = useState<{ url: string; blob?: Blob } | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [promoHidden, setPromoHidden] = useState(readPromoHidden);
  const [createStage, setCreateStage] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // (Re)initialisation a l'ouverture : creation, modification ou preselection.
  useEffect(() => {
    if (!open) return;
    setStep(edit ? 1 : preset ? 1 : 0);
    const src = edit?.event;
    const start = edit?.scope === 'occurrence' && edit.occurrence ? edit.occurrence : src ? new Date(src.starts_at) : defaultStart();
    setLocationType(src?.location_type ?? preset?.type ?? null);
    setChannelId(src?.channel_id ?? preset?.channelId ?? '');
    setPlace(src?.location ?? '');
    setTitle(src?.title ?? '');
    setDate(start);
    setTime(`${pad(start.getHours())}:${pad(start.getMinutes())}`);
    const end = src?.ends_at ? new Date(src.ends_at) : new Date(start.getTime() + 60 * 60 * 1000);
    setEndDate(end);
    setEndTime(`${pad(end.getHours())}:${pad(end.getMinutes())}`);
    setRecurrence(edit?.scope === 'occurrence' ? 'none' : src?.recurrence ?? 'none');
    setDescription(src?.description ?? '');
    setCover(src?.cover_url ? { url: src.cover_url } : null);
  }, [open, edit, preset]);

  const startsAt = useMemo(() => {
    const [h, m] = time.split(':').map(Number);
    const d = new Date(date);
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  }, [date, time]);
  const endsAt = useMemo(() => {
    if (locationType !== 'external') return null;
    const [h, m] = endTime.split(':').map(Number);
    const d = new Date(endDate);
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  }, [endDate, endTime, locationType]);

  const locationValid =
    (locationType === 'stage' || locationType === 'voice') ? !!channelId : locationType === 'external' ? !!place.trim() : false;
  const infoValid =
    !!title.trim() && startsAt.getTime() > Date.now() - 60_000 && (!endsAt || endsAt.getTime() > startsAt.getTime());
  const channelName = allChannels.find((c) => c.id === channelId)?.name ?? null;

  const close = () => {
    setStep(0);
    onClose();
  };

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    try {
      let coverUrl = cover?.url ?? null;
      if (cover?.blob) coverUrl = await uploadCover(cover.blob);
      const input: ServerEventInput = {
        title: title.trim(),
        description: description.trim() || null,
        location_type: locationType!,
        channel_id: locationType === 'external' ? null : channelId,
        location: locationType === 'external' ? place.trim() : null,
        starts_at: startsAt.toISOString(),
        recurrence,
        cover_url: coverUrl,
      };
      const withEnd = { ...input, ends_at: endsAt ? endsAt.toISOString() : null };
      if (edit?.scope === 'series') {
        await update.mutateAsync({ id: edit.event.id, patch: withEnd });
        close();
        return;
      }
      if (edit?.scope === 'occurrence' && edit.occurrence) cancelOccurrence(edit.event, edit.occurrence);
      const created = await create.mutateAsync(withEnd);
      if (!edit) onCreated?.(created);
      close();
    } catch {
      /* toast affiche par la mutation */
    } finally {
      setBusy(false);
    }
  };

  const recOptions = recurrenceOptions(startsAt);
  const previewEvent: ServerEvent = {
    id: 'preview',
    server_id: serverId,
    creator_id: user?.id ?? null,
    title: title.trim() || 'Sans titre',
    description: description.trim() || null,
    location_type: locationType ?? 'voice',
    channel_id: channelId || null,
    location: place.trim() || null,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt?.toISOString() ?? null,
    recurrence,
    cover_url: null,
    status: 'scheduled',
    canceled_occurrences: [],
    created_at: new Date().toISOString(),
  };

  const locationOptions: { value: EventLocationType; icon: React.ElementType; label: string; desc: string; disabled?: boolean }[] = [
    { value: 'stage', icon: StreamlineStage, label: 'Salon de conférence', desc: stageChannels.length ? 'Idéal pour les événements audio de communautés plus grandes.' : "Aucun salon n'est disponible.", disabled: stageChannels.length === 0 },
    { value: 'voice', icon: StreamlineVoice, label: 'Salon vocal', desc: "Rejoins tes ami(e)s en vocal, vidéo, partage d'écran et Go Live." },
    { value: 'external', icon: MapPin, label: 'Ailleurs', desc: 'Salon textuel, lien externe ou en personne.' },
  ];

  return (
    <>
      <Dialog open={open && !cropFile && !createStage} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-[576px] p-0 gap-0 overflow-hidden max-h-[92vh] flex flex-col">
          <div className="px-5 pt-5 pr-14 shrink-0">
            <div className="grid grid-cols-3 gap-2">
              {STEPS.map((label, i) => (
                <div key={label}>
                  <div className={cn('h-1 rounded-full transition-colors', i <= step ? 'bg-[#949cf7]' : 'bg-[hsl(var(--header-icon))]/60')} />
                  <p className={cn('mt-2 text-xs', i === step ? 'text-[#949cf7]' : 'text-muted-foreground')}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="px-5 pt-5 pb-2 overflow-y-auto scrollbar-thin flex-1 min-h-0">
            {step === 0 && (
              <div key="s0" className="animate-step-in">
                <DialogTitle className="text-2xl font-semibold text-white">Où se trouve ton événement ?</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-muted-foreground">Ainsi, personne ne se perd en chemin.</DialogDescription>
                <div role="radiogroup" className="mt-5 space-y-4">
                  {locationOptions.map(({ value, icon: Icon, label, desc, disabled }) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={locationType === value}
                      disabled={disabled}
                      onClick={() => {
                        setLocationType(value);
                        if (value === 'stage') setChannelId(stageChannels[0]?.id ?? '');
                        else if (value === 'voice') setChannelId(voiceChannels[0]?.id ?? '');
                      }}
                      className={cn('w-full flex items-start gap-3 text-left', disabled && 'opacity-50 cursor-not-allowed')}
                    >
                      <span className={cn('mt-0.5 w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center', locationType === value ? 'border-primary bg-white' : 'border-[hsl(var(--header-icon))]')}>
                        {locationType === value && <span className="w-3 h-3 rounded-full bg-primary" />}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-lg text-foreground leading-6">
                          <Icon className="w-5 h-5 shrink-0" />
                          {label}
                        </span>
                        <span className="block mt-0.5 text-sm text-muted-foreground">{desc}</span>
                      </span>
                    </button>
                  ))}
                </div>

                {(locationType === 'stage' || locationType === 'voice') && (
                  <div className="mt-5">
                    <Label required>Sélectionne un salon</Label>
                    <SelectField
                      value={channelId}
                      onChange={setChannelId}
                      placeholder="Choisis un salon"
                      options={(locationType === 'stage' ? stageChannels : voiceChannels).map((c) => ({
                        value: c.id,
                        label: c.name,
                        icon: locationType === 'stage' ? <StreamlineStage className="w-5 h-5" /> : <StreamlineVoice className="w-5 h-5" />,
                      }))}
                    />
                  </div>
                )}
                {locationType === 'voice' && !promoHidden && (
                  <div className="mt-6 rounded-lg bg-[hsl(var(--card))] overflow-hidden">
                    <div className="p-4">
                      <p className="text-base font-semibold text-white">Essaie d'utiliser un salon de conférence !</p>
                      <p className="mt-2 text-sm text-foreground">
                        Ils sont conçus pour les événements plus grands et permettent d'utiliser des fonctionnalités comme celle de lever la main ou de rendre muet automatiquement.
                      </p>
                      <p className="mt-2 text-xs text-foreground">Adapté aux : Questions-réponses FAQ Conversation Débat</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-3 border-t border-[hsl(var(--border-subtle))]">
                      <Button variant="secondary" size="sm" onClick={() => setCreateStage(true)}>Créer un salon de conférence</Button>
                      <button
                        type="button"
                        onClick={() => {
                          setPromoHidden(true);
                          try {
                            localStorage.setItem(userKey(PROMO_KEY), '1');
                          } catch {
                            /* stockage indisponible */
                          }
                        }}
                        className="px-3 h-8 text-sm font-medium text-white hover:underline"
                      >
                        Ne plus afficher
                      </button>
                    </div>
                  </div>
                )}
                {locationType === 'external' && (
                  <div className="mt-5">
                    <Label required>Saisis un emplacement</Label>
                    <input autoFocus value={place} maxLength={100} onChange={(e) => setPlace(e.target.value)} placeholder="Ajouter un lieu, un lien ou autre." className={fieldCls} />
                  </div>
                )}
              </div>
            )}

            {step === 1 && (
              <div key="s1" className="animate-step-in">
                <DialogTitle className="text-2xl font-semibold text-white">C'est quoi, ton événement ?</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-muted-foreground">Décris en détail ton événement.</DialogDescription>
                <div className="mt-4">
                  <Label required>Sujet de l'événement</Label>
                  <input autoFocus value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} placeholder="En quoi consiste ton événement ?" className={fieldCls} />
                </div>
                <div className="mt-6 grid grid-cols-2 gap-5">
                  <div>
                    <Label required>Date de début</Label>
                    <DateField value={date} min={new Date()} onChange={(d) => setDate(d)} />
                  </div>
                  <div>
                    <Label required>Heure de début</Label>
                    <TimeField value={time} onChange={setTime} />
                  </div>
                </div>
                {locationType === 'external' && (
                  <div className="mt-4 grid grid-cols-2 gap-5">
                    <div>
                      <Label required>Date de fin</Label>
                      <DateField value={endDate} min={date} onChange={(d) => setEndDate(d)} />
                    </div>
                    <div>
                      <Label required>Heure de fin</Label>
                      <TimeField value={endTime} onChange={setEndTime} />
                    </div>
                  </div>
                )}
                {startsAt.getTime() <= Date.now() - 60_000 && (
                  <p className="mt-2 text-xs text-destructive">L'heure de début doit être dans le futur.</p>
                )}
                {edit?.scope !== 'occurrence' && (
                  <div className="mt-4">
                    <Label required>Fréquence de l'événement</Label>
                    <SelectField<EventRecurrence> value={recurrence} onChange={setRecurrence} options={recOptions} />
                  </div>
                )}
                <div className="mt-4">
                  <Label>Description</Label>
                  <textarea
                    value={description}
                    maxLength={1000}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Donne un peu plus de détails sur ton événement. La syntaxe Markdown, les retours à la ligne et les liens sont pris en charge."
                    className={cn(fieldCls, 'h-[110px] py-3 resize-none')}
                  />
                </div>
                <div className="mt-4 pb-2">
                  <p className="text-base font-medium text-foreground">Image de couverture</p>
                  <p className="mt-0.5 mb-2 text-sm text-muted-foreground">Nous recommandons une image d'au moins 800 px de large et 320 px de haut.</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (f) setCropFile(f);
                    }}
                  />
                  {cover ? (
                    <>
                      <div className="relative rounded-lg overflow-hidden">
                        <img src={cover.url} alt="" className="w-full aspect-[2.5/1] object-cover" />
                        <button type="button" aria-label="Modifier l'image" onClick={() => fileRef.current?.click()} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white text-[#313338] flex items-center justify-center shadow">
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                      <Button size="sm" className="mt-3" onClick={() => setCover(null)}>Supprimer l'image</Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => fileRef.current?.click()}>Uploader une image de couverture</Button>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div key="s2" className="animate-step-in">
                <DialogTitle className="sr-only">Vérification</DialogTitle>
                <EventCard
                  event={previewEvent}
                  occurrence={startsAt}
                  now={new Date()}
                  channelName={channelName}
                  creator={user ? { id: user.id, name: profile?.display_name || profile?.username || 'Toi', avatar: profile?.avatar_url ?? null } : null}
                  interestedCount={0}
                  interested={false}
                  coverOverride={cover?.url ?? null}
                  preview
                />
                <p className="mt-8 text-center text-2xl font-semibold text-white">Voici un aperçu de ton événement.</p>
                <DialogDescription className="mt-2 mb-4 text-center text-base text-muted-foreground">
                  {locationType === 'external'
                    ? "N'oublie pas de démarrer l'événement à l'heure prévue."
                    : "Cet événement commencera automatiquement lorsqu'il sera l'heure."}
                </DialogDescription>
              </div>
            )}
          </div>

          <div className="px-5 py-5 flex items-center shrink-0">
            {step > 0 && !(edit && step === 1) && (
              <button type="button" onClick={() => setStep((s) => s - 1)} className="px-6 text-base font-medium text-white hover:underline">
                Retour
              </button>
            )}
            <div className="ml-auto flex gap-2">
              <Button variant="secondary" className="h-12 px-7 text-base" onClick={close}>Annuler</Button>
              {step < 2 ? (
                <Button className="h-12 px-7 text-base" disabled={step === 0 ? !locationValid : !infoValid} onClick={() => setStep((s) => s + 1)}>
                  Suivant
                </Button>
              ) : (
                <Button className="h-12 px-5 text-base" disabled={busy} onClick={submit}>
                  {edit ? 'Enregistrer' : 'Créer un événement'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ImageCropEditor
        open={!!cropFile}
        file={cropFile}
        aspect={2.5}
        onClose={() => setCropFile(null)}
        onApply={(blob, url) => {
          setCover({ url, blob });
          setCropFile(null);
        }}
      />

      {createStage && (
        <CreateChannelModal
          serverId={serverId}
          categoryId={null}
          categoryName=""
          initialType="stage"
          onClose={() => setCreateStage(false)}
          onCreated={(c) => {
            setLocationType('stage');
            setChannelId(c.id);
          }}
        />
      )}
    </>
  );
}
