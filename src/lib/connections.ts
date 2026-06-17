import {
  Twitter,
  Instagram,
  Youtube,
  Twitch,
  Github,
  Gitlab,
  Facebook,
  Linkedin,
  Music2,
  Gamepad2,
  Globe,
  MessageCircle,
  Cloud,
  AtSign,
  type LucideIcon,
} from 'lucide-react';

export interface ConnectionProvider {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Optional URL builder from raw value (username / domain). */
  toUrl?: (value: string) => string;
  /** Whether the value is typically a domain (true) or @username (false). */
  isDomain?: boolean;
  placeholder: string;
}

/**
 * Supported social/connection providers (TikTok and Snapchat intentionally excluded).
 */
export const CONNECTION_PROVIDERS: ConnectionProvider[] = [
  { id: 'twitter',     label: 'X / Twitter',   icon: Twitter,       toUrl: v => `https://x.com/${stripAt(v)}`,             placeholder: '@username' },
  { id: 'instagram',   label: 'Instagram',     icon: Instagram,     toUrl: v => `https://instagram.com/${stripAt(v)}`,     placeholder: '@username' },
  { id: 'youtube',     label: 'YouTube',       icon: Youtube,       toUrl: v => `https://youtube.com/@${stripAt(v)}`,      placeholder: '@channel' },
  { id: 'twitch',      label: 'Twitch',        icon: Twitch,        toUrl: v => `https://twitch.tv/${stripAt(v)}`,         placeholder: 'username' },
  { id: 'spotify',     label: 'Spotify',       icon: Music2,        toUrl: v => `https://open.spotify.com/user/${stripAt(v)}`, placeholder: 'username' },
  { id: 'github',      label: 'GitHub',        icon: Github,        toUrl: v => `https://github.com/${stripAt(v)}`,        placeholder: 'username' },
  { id: 'gitlab',      label: 'GitLab',        icon: Gitlab,        toUrl: v => `https://gitlab.com/${stripAt(v)}`,        placeholder: 'username' },
  { id: 'reddit',      label: 'Reddit',        icon: MessageCircle, toUrl: v => `https://reddit.com/user/${stripAt(v)}`,   placeholder: 'username' },
  { id: 'linkedin',    label: 'LinkedIn',      icon: Linkedin,      toUrl: v => `https://linkedin.com/in/${stripAt(v)}`,   placeholder: 'username' },
  { id: 'steam',       label: 'Steam',         icon: Gamepad2,      toUrl: v => `https://steamcommunity.com/id/${stripAt(v)}`, placeholder: 'username' },
  { id: 'playstation', label: 'PlayStation',   icon: Gamepad2,                                                              placeholder: 'PSN ID' },
  { id: 'xbox',        label: 'Xbox',          icon: Gamepad2,                                                              placeholder: 'Gamertag' },
  { id: 'battlenet',   label: 'Battle.net',    icon: Gamepad2,                                                              placeholder: 'BattleTag#0000' },
  { id: 'epicgames',   label: 'Epic Games',    icon: Gamepad2,                                                              placeholder: 'Epic username' },
  { id: 'facebook',    label: 'Facebook',      icon: Facebook,      toUrl: v => `https://facebook.com/${stripAt(v)}`,      placeholder: 'username' },
  { id: 'discord',     label: 'Discord',       icon: MessageCircle,                                                         placeholder: 'username' },
  { id: 'bluesky',     label: 'Bluesky',       icon: Cloud,         toUrl: v => `https://bsky.app/profile/${stripAt(v)}`,  placeholder: 'handle.bsky.social', isDomain: true },
  { id: 'mastodon',    label: 'Mastodon',      icon: AtSign,                                                                placeholder: '@user@instance.social', isDomain: true },
  { id: 'threads',     label: 'Threads',       icon: AtSign,        toUrl: v => `https://threads.net/@${stripAt(v)}`,      placeholder: '@username' },
  { id: 'website',     label: 'Site web',      icon: Globe,         toUrl: v => (v.startsWith('http') ? v : `https://${v}`), isDomain: true, placeholder: 'exemple.com' },
];

export const CONNECTION_PROVIDERS_BY_ID: Record<string, ConnectionProvider> = Object.fromEntries(
  CONNECTION_PROVIDERS.map(p => [p.id, p]),
);

export interface ConnectionStats {
  /** Total number of posts/tweets/videos on this account (declared). */
  posts_count?: number;
  /** Number of followers/subscribers (declared). */
  followers_count?: number;
  /** Number of accounts followed (declared). */
  following_count?: number;
  /** Account is officially verified (blue check) on the platform. */
  is_verified?: boolean;
  /** ISO date string of account creation on the external platform. */
  account_created_at?: string;
}

export interface ProfileConnection {
  provider: string;
  value: string;
  /** Declarative stats used for server-side eligibility rules (priority providers only). */
  stats?: ConnectionStats;
}

/** Providers that support server-side eligibility rules. */
export const STAT_ENABLED_PROVIDERS = new Set(['twitter', 'instagram', 'bluesky', 'youtube']);

function stripAt(v: string): string {
  return v.replace(/^@/, '').trim();
}

/** Display label for a connection: domain for website-ish, @username otherwise. */
export function formatConnectionDisplay(c: ProfileConnection): string {
  const p = CONNECTION_PROVIDERS_BY_ID[c.provider];
  const raw = c.value.trim();
  if (!p) return raw;
  if (p.isDomain) return raw.replace(/^https?:\/\//, '');
  return raw.startsWith('@') ? raw : `@${raw}`;
}

export function getConnectionUrl(c: ProfileConnection): string | null {
  const p = CONNECTION_PROVIDERS_BY_ID[c.provider];
  if (!p?.toUrl) return null;
  return p.toUrl(c.value);
}

/** Compact number formatting: 1234 -> "1.2K". */
export function formatStatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}K`;
  return `${(n / 1_000_000).toFixed(n < 10_000_000 ? 1 : 0).replace(/\.0$/, '')}M`;
}

/** Whole years elapsed since account creation. */
export function accountAgeYears(iso?: string): number | null {
  if (!iso) return null;
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return null;
  return Math.max(0, Math.floor((Date.now() - d) / (365.25 * 24 * 3600 * 1000)));
}
