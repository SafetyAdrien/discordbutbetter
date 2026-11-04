/*
 * Rappels de messages : choix rapides du menu "Creer un rappel" (dans 30 m, 1 h, 4 h, demain 9 h, lundi 9 h),
 * format relatif ("dans 2 minutes", "en retard") et creneaux de 15 minutes du choix d'heure.
 */

export interface ReminderPreset {
  id: string;
  label: string;
  at: (now: Date) => Date;
}

const atNine = (d: Date) => {
  const x = new Date(d);
  x.setHours(9, 0, 0, 0);
  return x;
};

export const REMINDER_PRESETS: ReminderPreset[] = [
  { id: '30m', label: 'dans 30 m', at: (n) => new Date(n.getTime() + 30 * 60_000) },
  { id: '1h', label: 'dans 1 h', at: (n) => new Date(n.getTime() + 3_600_000) },
  { id: '4h', label: 'dans 4 h', at: (n) => new Date(n.getTime() + 4 * 3_600_000) },
  { id: 'tomorrow', label: 'Demain à 9 h 00', at: (n) => atNine(new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1)) },
  {
    id: 'monday',
    label: 'Lundi à 9 h 00',
    at: (n) => {
      // Prochain lundi (jamais aujourd'hui).
      const add = ((8 - n.getDay()) % 7) || 7;
      return atNine(new Date(n.getFullYear(), n.getMonth(), n.getDate() + add));
    },
  },
];

/** "dans 2 minutes", "dans 1 heure", "dans 3 jours" ; "en retard" si l'echeance est passee. */
export function relativeReminder(at: Date | string, now = new Date()): { text: string; overdue: boolean } {
  const ms = new Date(at).getTime() - now.getTime();
  if (ms <= 0) return { text: 'Rappel en retard', overdue: true };
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 60) return { text: `Rappel dans ${min} minute${min > 1 ? 's' : ''}`, overdue: false };
  const h = Math.round(min / 60);
  if (h < 24) return { text: `Rappel dans ${h} heure${h > 1 ? 's' : ''}`, overdue: false };
  const d = Math.round(h / 24);
  return { text: `Rappel dans ${d} jour${d > 1 ? 's' : ''}`, overdue: false };
}

/** Creneaux de 15 minutes : "00:00" ... "23:45". */
export const TIME_SLOTS: string[] = Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`);

/** Accepte "9:5", "09:05", "930", "9h30" -> "09:30" ; null si invalide. */
export function parseTime(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})\s*(?:[:hH]\s*(\d{1,2})?)?$/) ?? raw.trim().match(/^(\d{1,2})(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = m[2] === undefined ? 0 : Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
}

export function combineDateTime(date: Date, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}
