
import { appLocale } from '@/i18n/locale';/**
 * Evenements de serveur "a la Discord" : recurrence, occurrences, libelles
 * et liens d'agenda. Fonctions pures (testees dans __tests__/serverEvents).
 */

export type EventRecurrence = 'none' | 'weekly' | 'biweekly' | 'monthly_nth' | 'yearly' | 'daily' | 'weekdays';
export type EventLocationType = 'stage' | 'voice' | 'external';
export type EventStatus = 'scheduled' | 'active' | 'completed' | 'canceled';

export interface ServerEvent {
  id: string;
  server_id: string;
  creator_id: string | null;
  title: string;
  description: string | null;
  location_type: EventLocationType;
  channel_id: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  recurrence: EventRecurrence;
  cover_url: string | null;
  status: EventStatus;
  canceled_occurrences: string[];
  created_at: string;
}

const DAY = 24 * 60 * 60 * 1000;
/** Une occurrence passee reste visible une heure (comme un evenement sans fin). */
export const OCCURRENCE_GRACE_MS = 60 * 60 * 1000;

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const ORDINALS = ['premier', 'deuxième', 'troisième', 'quatrième', 'cinquième'];
const RRULE_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/** Rang du jour de la semaine dans le mois (1 = premier vendredi du mois). */
export function nthWeekdayOfMonth(d: Date): number {
  return Math.ceil(d.getDate() / 7);
}

/** Options du menu "Frequence de l'evenement" pour une date de debut. */
export function recurrenceOptions(start: Date): { value: EventRecurrence; label: string }[] {
  const day = WEEKDAYS[start.getDay()];
  const nth = ORDINALS[nthWeekdayOfMonth(start) - 1];
  const dayMonth = start.toLocaleDateString(appLocale(), { day: 'numeric', month: 'short' });
  return [
    { value: 'none', label: 'Ne recommence pas' },
    { value: 'weekly', label: `Toutes les semaines, le ${day}` },
    { value: 'biweekly', label: `Un ${day} sur deux` },
    { value: 'monthly_nth', label: `Tous les mois, le ${nth} ${day} du mois` },
    { value: 'yearly', label: `Tous les ans, le ${dayMonth}` },
    { value: 'daily', label: 'Tous les jours' },
    { value: 'weekdays', label: 'Tous les jours de la semaine (du lundi au vendredi)' },
  ];
}

/** Sous-titre de la carte : "Recommence chaque vendredi". */
export function recurrenceSummary(recurrence: EventRecurrence, start: Date): string | null {
  const day = WEEKDAYS[start.getDay()];
  switch (recurrence) {
    case 'weekly': return `Recommence chaque ${day}`;
    case 'biweekly': return `Recommence un ${day} sur deux`;
    case 'monthly_nth': return `Recommence le ${ORDINALS[nthWeekdayOfMonth(start) - 1]} ${day} du mois`;
    case 'yearly': return `Recommence chaque année le ${start.toLocaleDateString(appLocale(), { day: 'numeric', month: 'long' })}`;
    case 'daily': return 'Recommence chaque jour';
    case 'weekdays': return 'Recommence chaque jour de la semaine';
    default: return null;
  }
}

function addMonthsNth(start: Date, months: number): Date | null {
  const nth = nthWeekdayOfMonth(start);
  const d = new Date(start);
  d.setDate(1);
  d.setMonth(start.getMonth() + months);
  const offset = (start.getDay() - d.getDay() + 7) % 7;
  d.setDate(1 + offset + (nth - 1) * 7);
  // Un "cinquieme vendredi" n'existe pas tous les mois.
  return d.getMonth() === (start.getMonth() + months) % 12 ? d : null;
}

/** k-ieme occurrence theorique (k = 0 : la date de debut), null si inexistante. */
function occurrenceAt(start: Date, recurrence: EventRecurrence, k: number): Date | null {
  const d = new Date(start);
  switch (recurrence) {
    case 'none': return k === 0 ? d : null;
    case 'daily': d.setDate(d.getDate() + k); return d;
    case 'weekly': d.setDate(d.getDate() + 7 * k); return d;
    case 'biweekly': d.setDate(d.getDate() + 14 * k); return d;
    case 'yearly': {
      d.setFullYear(start.getFullYear() + k);
      return d.getDate() === start.getDate() ? d : null; // 29 fevrier
    }
    case 'monthly_nth': return addMonthsNth(start, k);
    case 'weekdays': {
      // k-ieme jour ouvre a partir du debut
      let n = 0;
      const cur = new Date(start);
      while (cur.getDay() === 0 || cur.getDay() === 6) cur.setDate(cur.getDate() + 1);
      while (n < k) {
        cur.setDate(cur.getDate() + 1);
        if (cur.getDay() !== 0 && cur.getDay() !== 6) n++;
      }
      return cur;
    }
  }
}

/**
 * Prochaines occurrences (non annulees) a partir de `from`, `count` max.
 * Une occurrence commencee depuis moins d'une heure compte encore.
 */
export function upcomingOccurrences(
  event: Pick<ServerEvent, 'starts_at' | 'recurrence' | 'canceled_occurrences' | 'status'>,
  from: Date = new Date(),
  count = 4,
): Date[] {
  if (event.status === 'canceled' || event.status === 'completed') return [];
  const start = new Date(event.starts_at);
  const canceled = new Set(event.canceled_occurrences.map((c) => new Date(c).getTime()));
  const out: Date[] = [];
  const threshold = from.getTime() - OCCURRENCE_GRACE_MS;
  // Saut grossier pour ne pas iterer des annees d'occurrences passees.
  const step: Record<EventRecurrence, number> = { none: 1, daily: DAY, weekdays: DAY, weekly: 7 * DAY, biweekly: 14 * DAY, monthly_nth: 28 * DAY, yearly: 365 * DAY };
  let k = event.recurrence === 'none' ? 0 : Math.max(0, Math.floor((threshold - start.getTime()) / step[event.recurrence]) - 2);
  if (event.recurrence === 'weekdays') k = Math.floor(k * 5 / 7);
  let lastPast: Date | null = null;
  for (let guard = 0; out.length < count && guard < 1000; guard++, k++) {
    if (event.recurrence === 'none' && k > 0) break;
    const occ = occurrenceAt(start, event.recurrence, k);
    if (!occ || canceled.has(occ.getTime())) continue;
    if (occ.getTime() < threshold) {
      lastPast = occ;
      continue;
    }
    out.push(occ);
  }
  // Evenement demarre a la main : l'occurrence en cours reste en tete.
  if (event.status === 'active' && lastPast && (out.length === 0 || out[0].getTime() > from.getTime())) {
    out.unshift(lastPast);
    out.length = Math.min(out.length, count);
  }
  return out;
}

/** En cours : demarre a la main, ou automatiquement pour un salon vocal / de conference. */
export function isOccurrenceLive(event: Pick<ServerEvent, 'status' | 'location_type'>, occurrence: Date, now: Date) {
  return occurrence.getTime() <= now.getTime() && (event.status === 'active' || event.location_type !== 'external');
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "ven. oct. 30 · 08:35" (format de la serie d'evenements de Discord). */
export function formatOccurrence(d: Date): string {
  const wd = d.toLocaleDateString(appLocale(), { weekday: 'short' });
  const mo = d.toLocaleDateString(appLocale(), { month: 'short' });
  return `${wd} ${mo} ${d.getDate()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Libelle principal : "Commence dans 17 min", "Aujourd'hui a 09:35", ... */
export function formatEventWhen(d: Date, now: Date = new Date(), active = false): string {
  if (active) return 'En cours';
  const diff = d.getTime() - now.getTime();
  if (diff <= 0) return 'Commence bientôt';
  if (diff < 60 * 60 * 1000) return `Commence dans ${Math.max(1, Math.round(diff / 60000))} min`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, now)) return `Aujourd'hui à ${time}`;
  const tomorrow = new Date(now.getTime() + DAY);
  if (sameDay(d, tomorrow)) return `Demain à ${time}`;
  return formatOccurrence(d);
}

/** Infobulle exacte : "Aujourd'hui a 09:35" ou "vendredi 30 octobre 2026 08:35". */
export function formatEventExact(d: Date, now: Date = new Date()): string {
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (d.toDateString() === now.toDateString()) return `Aujourd'hui à ${time}`;
  return `${d.toLocaleDateString(appLocale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} ${time}`;
}

export function rrule(recurrence: EventRecurrence, start: Date): string | null {
  switch (recurrence) {
    case 'daily': return 'FREQ=DAILY';
    case 'weekly': return 'FREQ=WEEKLY';
    case 'biweekly': return 'FREQ=WEEKLY;INTERVAL=2';
    case 'monthly_nth': return `FREQ=MONTHLY;BYDAY=${nthWeekdayOfMonth(start)}${RRULE_DAYS[start.getDay()]}`;
    case 'yearly': return 'FREQ=YEARLY';
    case 'weekdays': return 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';
    default: return null;
  }
}

/** 20261023T073500Z */
export function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export interface CalendarPayload {
  title: string;
  description: string | null;
  location: string;
  start: Date;
  /** Une heure par defaut (Discord ne fixe pas de fin). */
  end?: Date;
  recurrence: EventRecurrence;
  uid: string;
  url?: string;
}

const endOf = (p: CalendarPayload) => p.end ?? new Date(p.start.getTime() + 60 * 60 * 1000);
const details = (p: CalendarPayload) => [p.description, p.url].filter(Boolean).join('\n\n');

export function googleCalendarUrl(p: CalendarPayload): string {
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: p.title,
    dates: `${icsDate(p.start)}/${icsDate(endOf(p))}`,
    details: details(p),
    location: p.location,
  });
  const r = rrule(p.recurrence, p.start);
  if (r) q.set('recur', `RRULE:${r}`);
  return `https://calendar.google.com/calendar/render?${q}`;
}

export function yahooCalendarUrl(p: CalendarPayload): string {
  const q = new URLSearchParams({
    v: '60',
    title: p.title,
    st: icsDate(p.start),
    et: icsDate(endOf(p)),
    desc: details(p),
    in_loc: p.location,
  });
  return `https://calendar.yahoo.com/?${q}`;
}

export function outlookCalendarUrl(p: CalendarPayload): string {
  const q = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: p.title,
    startdt: p.start.toISOString(),
    enddt: endOf(p).toISOString(),
    body: details(p),
    location: p.location,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${q}`;
}

const icsEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (m) => `\\${m}`);

export function buildIcs(p: CalendarPayload): string {
  const r = rrule(p.recurrence, p.start);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Discord but Better//Evenements//FR',
    'BEGIN:VEVENT',
    `UID:${p.uid}`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(p.start)}`,
    `DTEND:${icsDate(endOf(p))}`,
    ...(r ? [`RRULE:${r}`] : []),
    `SUMMARY:${icsEscape(p.title)}`,
    ...(details(p) ? [`DESCRIPTION:${icsEscape(details(p))}`] : []),
    ...(p.location ? [`LOCATION:${icsEscape(p.location)}`] : []),
    ...(p.url ? [`URL:${p.url}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/** Creneaux de 15 minutes pour le menu "Heure de debut". */
export function timeSlots(): string[] {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m += 15) out.push(`${pad(h)}:${pad(m)}`);
  return out;
}

/** "9", "930", "9:3", "09h30" -> "09:30" (saisie libre du champ heure). */
export function parseTimeInput(raw: string): string | null {
  const s = raw.trim().replace(/h/i, ':');
  const m = s.match(/^(\d{1,2})(?::?(\d{1,2}))?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2].length === 1 ? `${m[2]}0` : m[2]) : 0;
  if (h > 23 || min > 59) return null;
  return `${pad(h)}:${pad(min)}`;
}
