/**
 * Provider URL parsing for rich embeds (YouTube, Twitch).
 * Pure functions — no side effects, easily testable.
 */

export type YouTubeKind = 'video' | 'short' | 'live';
export interface YouTubeParsed {
  kind: YouTubeKind;
  id: string;
  start?: number; // seconds
}

export type TwitchKind = 'stream' | 'clip' | 'vod';
export interface TwitchParsed {
  kind: TwitchKind;
  /** channel login for 'stream', video id for 'vod', clip slug for 'clip' */
  value: string;
  start?: number; // seconds (VOD only)
}

function parseTimeParam(raw: string | null): number | undefined {
  if (!raw) return undefined;
  // Accepts "90", "90s", "1m30s", "1h2m3s"
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);
  const m = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
  if (!m) return undefined;
  const h = parseInt(m[1] || '0', 10);
  const min = parseInt(m[2] || '0', 10);
  const s = parseInt(m[3] || '0', 10);
  const total = h * 3600 + min * 60 + s;
  return total > 0 ? total : undefined;
}

export function parseYouTube(rawUrl: string): YouTubeParsed | null {
  let u: URL;
  try { u = new URL(rawUrl); } catch { return null; }
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  const start = parseTimeParam(u.searchParams.get('t') || u.searchParams.get('start'));

  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0];
    if (!id) return null;
    return { kind: 'video', id, start };
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    if (u.pathname === '/watch') {
      const id = u.searchParams.get('v');
      if (!id) return null;
      return { kind: 'video', id, start };
    }
    const shortsMatch = u.pathname.match(/^\/shorts\/([\w-]{6,})/);
    if (shortsMatch) return { kind: 'short', id: shortsMatch[1], start };
    const liveMatch = u.pathname.match(/^\/live\/([\w-]{6,})/);
    if (liveMatch) return { kind: 'live', id: liveMatch[1], start };
    const embedMatch = u.pathname.match(/^\/embed\/([\w-]{6,})/);
    if (embedMatch) return { kind: 'video', id: embedMatch[1], start };
  }

  return null;
}

const TWITCH_RESERVED_PATHS = new Set([
  'directory', 'videos', 'p', 'team', 'jobs', 'turbo', 'subscriptions',
  'inventory', 'wallet', 'drops', 'friends', 'settings', 'login', 'signup',
  'search', 'downloads', 'store', 'communities', 'creatorcamp', 'security',
  'about', 'press', 'help', 'legal', 'oauth2', 'embed',
]);

export function parseTwitch(rawUrl: string): TwitchParsed | null {
  let u: URL;
  try { u = new URL(rawUrl); } catch { return null; }
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  const start = parseTimeParam(u.searchParams.get('t'));

  if (host === 'clips.twitch.tv') {
    const slug = u.pathname.slice(1).split('/')[0];
    if (!slug) return null;
    return { kind: 'clip', value: slug };
  }

  if (host !== 'twitch.tv' && host !== 'm.twitch.tv') return null;

  const parts = u.pathname.split('/').filter(Boolean);
  if (parts.length === 0) return null;

  // /videos/{id}
  if (parts[0] === 'videos' && parts[1]) {
    if (/^\d+$/.test(parts[1])) return { kind: 'vod', value: parts[1], start };
    return null;
  }

  // /{channel}/clip/{slug}
  if (parts.length >= 3 && parts[1] === 'clip' && parts[2]) {
    return { kind: 'clip', value: parts[2] };
  }

  // /{channel}  (stream)
  if (parts.length === 1 && !TWITCH_RESERVED_PATHS.has(parts[0].toLowerCase())) {
    const login = parts[0].toLowerCase();
    if (/^[a-z0-9_]{3,25}$/.test(login)) {
      return { kind: 'stream', value: login };
    }
  }

  return null;
}

export type SmartEmbedProvider =
  | { provider: 'youtube'; parsed: YouTubeParsed }
  | { provider: 'twitch'; parsed: TwitchParsed }
  | null;

export function detectProvider(url: string): SmartEmbedProvider {
  const yt = parseYouTube(url);
  if (yt) return { provider: 'youtube', parsed: yt };
  const tw = parseTwitch(url);
  if (tw) return { provider: 'twitch', parsed: tw };
  return null;
}
