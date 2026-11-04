/*
 * Statut personnalise. Le texte est stocke tel quel dans `profiles.custom_status`
 * sous la forme "<emoji> <texte>" (emoji unicode ou `:nom:` pour un emoji de serveur),
 * ce qui garde compatibles toutes les surfaces qui affichent deja la chaine.
 * `custom_status_expires_at` porte l'effacement automatique (NULL = jamais).
 */

export interface CustomStatusParts {
  emoji: string;
  text: string;
}

const EMOJI_HEAD = /^(:[\w-]{2,32}:|(?:\p{Regional_Indicator}{2}|[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}‍️⃣]+))\s*/u;

export function splitCustomStatus(value: string | null | undefined): CustomStatusParts {
  const v = (value ?? '').trim();
  const m = EMOJI_HEAD.exec(v);
  if (!m) return { emoji: '', text: v };
  return { emoji: m[1], text: v.slice(m[0].length) };
}

export function joinCustomStatus({ emoji, text }: CustomStatusParts): string | null {
  const t = text.trim();
  if (emoji && t) return `${emoji} ${t}`;
  return emoji || t || null;
}

export type ClearAfter = '24h' | '4h' | '1h' | '30m' | 'never';

export const CLEAR_AFTER_OPTIONS: { value: ClearAfter; label: string; ms: number | null }[] = [
  { value: '24h', label: '24 heures', ms: 24 * 3_600_000 },
  { value: '4h', label: '4 heures', ms: 4 * 3_600_000 },
  { value: '1h', label: '1 heure', ms: 3_600_000 },
  { value: '30m', label: '30 minutes', ms: 30 * 60_000 },
  { value: 'never', label: 'Ne pas supprimer', ms: null },
];

const hhmm = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "23:42" aujourd'hui, "demain à 22:42" le lendemain, sinon "le 3 nov. à 22:42". */
export function formatClearTime(target: Date, now = new Date()): string {
  if (sameDay(target, now)) return hhmm(target);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (sameDay(target, tomorrow)) return `demain à ${hhmm(target)}`;
  return `le ${target.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à ${hhmm(target)}`;
}

export function expiryFor(choice: ClearAfter, now = new Date()): Date | null {
  const ms = CLEAR_AFTER_OPTIONS.find((o) => o.value === choice)?.ms;
  return ms == null ? null : new Date(now.getTime() + ms);
}

export function isCustomStatusExpired(expiresAt: string | null | undefined, now = Date.now()): boolean {
  return !!expiresAt && new Date(expiresAt).getTime() <= now;
}
