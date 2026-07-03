/**
 * Compact, URL-safe encoding of a custom-theme payload for sharing
 * inside chat messages.
 *
 *   [[nexuschat-theme:v1:<BASE64URL>]]
 *
 * The payload is a JSON object with short keys to keep the token small:
 *   { c: string[] hex, a: number 0-360, i: number 0-100, n?: string }
 */

export type SharedCustomTheme = {
  chips: string[];
  angle: number;
  intensity: number;
  name?: string;
};

type Compact = { c: string[]; a: number; i: number; n?: string };

const MARKER_PREFIX = '[[nexuschat-theme:v1:';
const MARKER_SUFFIX = ']]';

// Broad but forgiving matcher: base64url chars + optional segments.
export const THEME_MARKER_REGEX =
  /\[\[nexuschat-theme:v1:([A-Za-z0-9_\-=]+)\]\]/g;

function toBase64Url(input: string): string {
  const b64 = typeof btoa === 'function'
    ? btoa(unescape(encodeURIComponent(input)))
    : Buffer.from(input, 'utf-8').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') +
    '='.repeat((4 - (input.length % 4)) % 4);
  return typeof atob === 'function'
    ? decodeURIComponent(escape(atob(padded)))
    : Buffer.from(padded, 'base64').toString('utf-8');
}

export function encodeCustomTheme(theme: SharedCustomTheme): string {
  const compact: Compact = {
    c: theme.chips.slice(0, 3),
    a: Math.round(theme.angle),
    i: Math.round(theme.intensity),
  };
  if (theme.name && theme.name.trim()) compact.n = theme.name.trim().slice(0, 40);
  return `${MARKER_PREFIX}${toBase64Url(JSON.stringify(compact))}${MARKER_SUFFIX}`;
}

export function decodeCustomTheme(token: string): SharedCustomTheme | null {
  try {
    const parsed = JSON.parse(fromBase64Url(token)) as Compact;
    if (!Array.isArray(parsed.c) || parsed.c.length === 0) return null;
    const chips = parsed.c
      .filter((c) => typeof c === 'string' && /^#?[0-9a-f]{3,8}$/i.test(c))
      .map((c) => (c.startsWith('#') ? c : `#${c}`))
      .slice(0, 3);
    if (chips.length === 0) return null;
    return {
      chips,
      angle: Math.max(0, Math.min(360, Number(parsed.a) || 0)),
      intensity: Math.max(0, Math.min(100, Number(parsed.i) || 60)),
      name: typeof parsed.n === 'string' ? parsed.n : undefined,
    };
  } catch {
    return null;
  }
}

export function extractThemesFromContent(content: string): SharedCustomTheme[] {
  if (!content || content.indexOf(MARKER_PREFIX) === -1) return [];
  const themes: SharedCustomTheme[] = [];
  content.replace(THEME_MARKER_REGEX, (_full, payload: string) => {
    const t = decodeCustomTheme(payload);
    if (t) themes.push(t);
    return '';
  });
  return themes;
}

export function stripThemeMarkers(content: string): string {
  if (!content || content.indexOf(MARKER_PREFIX) === -1) return content;
  return content.replace(THEME_MARKER_REGEX, '').replace(/[ \t]+\n/g, '\n').trim();
}
