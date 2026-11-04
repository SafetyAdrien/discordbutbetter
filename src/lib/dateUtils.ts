/**
 * Lightweight date helpers built on the native `Intl` API.
 *
 * The app pulled in `date-fns` (~138 KB) plus `date-fns/locale/fr` across 24
 * files, but only ever used 8 functions, always with the French locale. The
 * platform already ships these capabilities, so this module provides the same
 * signatures and is wired up through an alias in vite/tsconfig, dropping the
 * dependency from the entry chunk.
 *
 * All formatters are memoized: constructing an `Intl.DateTimeFormat` is
 * expensive relative to formatting a single date, and these run per message
 * row.
 */

type Tokens = string;

import { appLocale, appLocaleVersion } from '@/i18n/locale';

const isFrench = () => appLocale().startsWith('fr');

// Noms de mois / jours dans la langue active (le francais garde les tables
// ci-dessous, identiques a date-fns).
const nameCache = new Map<string, string[]>();
function intlNames(kind: 'month' | 'weekday', width: 'long' | 'short'): string[] {
  const key = `${appLocaleVersion()}:${kind}:${width}`;
  let v = nameCache.get(key);
  if (!v) {
    const f = new Intl.DateTimeFormat(appLocale(), kind === 'month' ? { month: width } : { weekday: width });
    v = kind === 'month'
      ? Array.from({ length: 12 }, (_, i) => f.format(new Date(2024, i, 1)))
      : Array.from({ length: 7 }, (_, i) => f.format(new Date(2024, 0, 7 + i)));
    nameCache.set(key, v);
  }
  return v;
}

const MONTHS_SHORT = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

const MONTHS_LONG = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

const DAYS_SHORT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const DAYS_LONG = [
  'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi',
];

const pad = (n: number) => String(n).padStart(2, '0');

/** Accepts a Date, an ISO string, or an epoch number. */
function toDate(input: Date | string | number): Date {
  if (input instanceof Date) return input;
  if (typeof input === 'number') return new Date(input);
  return new Date(input);
}

/**
 * Supports the subset of date-fns pattern tokens actually used in this app:
 * yyyy, yy, MMMM, MMM, MM, M, d, dd, EEEE, EEE, HH, H, mm, m, ss, s.
 */
export function format(
  date: Date | string | number,
  pattern: Tokens,
  _options?: unknown,
): string {
  const d = toDate(date);
  if (Number.isNaN(d.getTime())) return '';

  const pad2 = (n: number) => String(n).padStart(2, '0');
  const H = d.getHours();
  const m = d.getMinutes();
  const s = d.getSeconds();

  // Ordered longest-token-first so "MMMM" is not consumed as "MM".
  const replacements: Array<[RegExp, string]> = [
    [/\bYYYY\b|\byyyy\b/g, String(d.getFullYear())],
    [/\byy\b/g, pad2(d.getFullYear() % 100)],
    [/\bMMMM\b/g, (isFrench() ? MONTHS_LONG : intlNames('month', 'long'))[d.getMonth()]],
    [/\bMMM\b/g, (isFrench() ? MONTHS_SHORT : intlNames('month', 'short'))[d.getMonth()]],
    [/\bMM\b/g, pad2(d.getMonth() + 1)],
    [/\bM\b/g, String(d.getMonth() + 1)],
    [/\bEEEE\b/g, (isFrench() ? DAYS_LONG : intlNames('weekday', 'long'))[d.getDay()]],
    [/\bEEE\b/g, (isFrench() ? DAYS_SHORT : intlNames('weekday', 'short'))[d.getDay()]],
    [/\bdd\b/g, pad2(d.getDate())],
    [/\bd\b/g, String(d.getDate())],
    [/\bHH\b/g, pad2(H)],
    [/\bH\b/g, String(H)],
    [/\bmm\b/g, pad2(m)],
    [/\bm\b/g, String(m)],
    [/\bss\b/g, pad2(s)],
    [/\bs\b/g, String(s)],
  ];

  // Texte entre apostrophes ('à') : recopie tel quel, hors des jetons.
  const literals: string[] = [];
  let out = pattern.replace(/'([^']*)'/g, (_, lit: string) => {
    literals.push(lit === 'à' && !isFrench() ? 'at' : lit);
    return `\u0000${literals.length - 1}\u0000`;
  });
  // PPP is localized and not derivable from the token table.
  if (out.includes('PPP')) {
    out = out.replace(/\bPPP\b/g, formatLongDate(d));
  }
  for (const [re, value] of replacements) out = out.replace(re, value);
  return literals.length ? out.replace(/\u0000(\d+)\u0000/g, (_, i) => literals[Number(i)]) : out;
}

/** True when both dates fall on the same calendar day. */
export function isSameDay(a: Date | string | number, b: Date | string | number): boolean {
  const da = toDate(a);
  const db = toDate(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function isToday(date: Date | string | number): boolean {
  return isSameDay(date, new Date());
}

export function isYesterday(date: Date | string | number): boolean {
  const d = toDate(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(d, yesterday);
}

/** True when the date is strictly in the past. */
export function isPast(date: Date | string | number): boolean {
  return toDate(date).getTime() < Date.now();
}

/** True when the date is within the last 7 days (date-fns `isThisWeek`). */
export function isThisWeek(date: Date | string | number, _options?: unknown): boolean {
  const d = toDate(date);
  const now = new Date();
  // Start of the current week (Sunday), matching date-fns default weekStartsOn: 0.
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  return d.getTime() >= start.getTime() && d.getTime() <= now.getTime();
}

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 3600_000],
  ['month', 30 * 24 * 3600_000],
  ['week', 7 * 24 * 3600_000],
  ['day', 24 * 3600_000],
  ['hour', 3600_000],
  ['minute', 60_000],
  ['second', 1000],
];

let longDateFormatter: Intl.DateTimeFormat | null = null;
let longDateVersion = -1;

/**
 * `PPP` is date-fns' "long localized date" (e.g. "1er janvier 2024").
 * Handled as its own token before the generic replacements run.
 */
function formatLongDate(d: Date): string {
  if (!longDateFormatter || longDateVersion !== appLocaleVersion()) {
    longDateVersion = appLocaleVersion();
    longDateFormatter = new Intl.DateTimeFormat(appLocale(), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  return longDateFormatter.format(d);
}

let relativeFormatter: Intl.RelativeTimeFormat | null = null;
let relativeVersion = -1;

function getRelativeFormatter(): Intl.RelativeTimeFormat {
  if (!relativeFormatter || relativeVersion !== appLocaleVersion()) {
    relativeVersion = appLocaleVersion();
    relativeFormatter = new Intl.RelativeTimeFormat(appLocale(), { numeric: 'auto' });
  }
  return relativeFormatter;
}

/**
 * "il y a 3 minutes"-style formatting.
 *
 * date-fns defaults to adding "il y a " in French; Intl already includes the
 * equivalent phrasing for the locale, so no prefix is prepended.
 */
export function formatDistanceToNow(
  date: Date | string | number,
  options?: { addSuffix?: boolean; locale?: unknown },
): string {
  const diff = toDate(date).getTime() - Date.now();
  const abs = Math.abs(diff);
  // `addSuffix: false` is used where the UI supplies its own wording
  // ("il y a ..." in a fixed label), so we return the bare unit.
  const bare = options?.addSuffix === false;

  if (abs < 45_000) return isFrench() ? 'moins d’une minute' : getRelativeFormatter().format(0, 'minute');

  for (const [unit, ms] of RELATIVE_UNITS) {
    if (abs >= ms) {
      const value = Math.round(diff / ms);
      const formatted = getRelativeFormatter().format(value, unit);
      if (bare) return formatted.replace(/^(il y a |dans )\s*/i, '');
      return formatted;
    }
  }
  return getRelativeFormatter().format(Math.round(diff / 1000), 'second');
}

export const fr = {
  locale: 'fr',
  format,
};

// ---------------------------------------------------------------------------
// Calendar helpers used by CalendarChannel / ChannelEventModal.
// ---------------------------------------------------------------------------

/** Midnight of the given date (local time). */
export function startOfDay(date: Date | string | number): Date {
  const d = toDate(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/** Last millisecond of the given date (23:59:59.999). */
export function endOfDay(date: Date | string | number): Date {
  const d = toDate(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function startOfMonth(date: Date | string | number): Date {
  const d = toDate(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(date: Date | string | number): Date {
  const d = toDate(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function isSameMonth(a: Date | string | number, b: Date | string | number): boolean {
  const da = toDate(a);
  const db = toDate(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth();
}

/** date-fns addMonths: clamps to the last valid day of the target month. */
export function addMonths(date: Date | string | number, amount: number): Date {
  const d = toDate(date);
  const target = new Date(d.getFullYear(), d.getMonth() + amount, 1, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
  // Clamp the day (e.g. Jan 31 + 1 month => Feb 28/29, not Mar 3).
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d.getDate(), lastDay));
  return target;
}

/** date-fns subMonths: identical to addMonths with a negative amount. */
export function subMonths(date: Date | string | number, amount: number): Date {
  return addMonths(date, -amount);
}

/** True when `a` is strictly after `b`. */
export function isAfter(a: Date | string | number, b: Date | string | number): boolean {
  return toDate(a).getTime() > toDate(b).getTime();
}

/** Whole calendar days between two dates (b - a), ignoring the time of day. */
export function differenceInCalendarDays(
  later: Date | string | number,
  earlier: Date | string | number,
): number {
  const a = startOfDay(later).getTime();
  const b = startOfDay(earlier).getTime();
  return Math.round((a - b) / (24 * 3600_000));
}

interface DateInterval {
  start: Date;
  end: Date;
}

/**
 * Every day from `start` to `end` inclusive, using local midnight.
 * Mirrors date-fns' eachDayOfInterval for the ascending case used by the
 * calendar grid.
 */
export function eachDayOfInterval(interval: DateInterval): Date[] {
  const start = startOfDay(interval.start);
  const end = startOfDay(interval.end);
  const days: Date[] = [];

  const cursor = new Date(start);
  // Guard against a reversed interval, which date-fns also returns empty.
  while (cursor.getTime() <= end.getTime()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}