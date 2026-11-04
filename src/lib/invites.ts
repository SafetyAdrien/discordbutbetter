import { supabase } from '@/integrations/supabase/client';

/**
 * Invitations affichees en carte dans le chat, comme Discord :
 *  - liens de l'app (`<origine>/invite/<code>`) -> RPC get_invite_preview
 *    (repli sur get_invite_details si la migration n'est pas appliquee) ;
 *  - liens Discord (`discord.gg/<code>`, `discord.com/invite/<code>`) -> API
 *    publique d'invitation de Discord (CORS ouvert), sans authentification.
 */

export const OPEN_SERVER_EVENT = 'app:open-server';
/** Ouvre l'accueil, onglet Amis (boite de reception > demandes d'amis). */
export const OPEN_FRIENDS_EVENT = 'app:open-friends';

export type InviteSource = 'app' | 'discord';

export interface InviteRef {
  source: InviteSource;
  code: string;
  /** Lien tel qu'ecrit dans le message (cle de dedoublonnage). */
  url: string;
}

export interface InviteTrait {
  label: string;
  /** Emoji unicode, ou URL d'emoji personnalise. */
  emoji?: string;
  emojiUrl?: string;
}

export interface InvitePreview {
  source: InviteSource;
  code: string;
  serverId: string;
  name: string;
  iconUrl: string | null;
  bannerUrl: string | null;
  description: string | null;
  memberCount: number;
  onlineCount: number | null;
  createdAt: Date | null;
  community: boolean;
  /** Niveau de boost Discord (0-3). */
  boostTier: number;
  tag: { label: string; badgeUrl: string | null } | null;
  game: { name: string; iconUrl: string | null } | null;
  traits: InviteTrait[];
  /** Expiree ou nombre d'utilisations atteint. */
  unusable: boolean;
}

const CODE = '([A-Za-z0-9-]{2,32})';
const DISCORD_RE = new RegExp(
  `(?:https?:\\/\\/)?(?:www\\.)?(?:discord\\.gg|discord(?:app)?\\.com\\/invite)\\/${CODE}(?![\\w/-])`,
  'gi',
);

function appInviteRe(): RegExp | null {
  if (typeof window === 'undefined') return null;
  const origin = window.location.origin.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  return new RegExp(`${origin}\\/invite\\/${CODE}(?![\\w/-])`, 'gi');
}

/** Invitations presentes dans un message (5 max, sans doublon). */
export function extractInvites(content: string): InviteRef[] {
  const out: InviteRef[] = [];
  const seen = new Set<string>();
  const push = (source: InviteSource, code: string, url: string) => {
    const key = `${source}:${code.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ source, code, url });
  };
  // Pas d'invitation dans les blocs de code.
  const text = content.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]*`/g, ' ');
  const app = appInviteRe();
  if (app) for (const m of text.matchAll(app)) push('app', m[1], m[0]);
  for (const m of text.matchAll(DISCORD_RE)) push('discord', m[1], m[0]);
  return out.slice(0, 5);
}

/** L'URL est-elle une invitation (pour ne pas lui ajouter d'apercu de lien) ? */
export function isInviteUrl(url: string): boolean {
  return extractInvites(url).length > 0;
}

/** Date de creation d'un serveur Discord a partir de son identifiant (snowflake). */
export function snowflakeDate(id: string): Date | null {
  try {
    return new Date(Number((BigInt(id) >> 22n) + 1420070400000n));
  } catch {
    return null;
  }
}

let shortcodes: Promise<Record<string, string>> | null = null;
function loadShortcodes() {
  shortcodes ??= import('@/data/emojiShortcodes.json').then((m) => m.default as Record<string, string>);
  return shortcodes;
}

const CDN = 'https://cdn.discordapp.com';

interface DiscordInvite {
  guild?: {
    id: string;
    name: string;
    icon: string | null;
    banner: string | null;
    splash: string | null;
    description: string | null;
    features: string[];
    premium_tier?: number;
  };
  approximate_member_count?: number;
  approximate_presence_count?: number;
  expires_at?: string | null;
  profile?: {
    member_count?: number;
    online_count?: number;
    description?: string | null;
    tag?: string | null;
    badge_hash?: string | null;
    game_application_ids?: string[];
    traits?: { emoji_id: string | null; emoji_name: string | null; emoji_animated?: boolean; label: string; position: number }[];
  };
}

async function fetchDiscordInvite(code: string): Promise<InvitePreview | null> {
  const res = await fetch(`https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true&with_expiration=true`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Discord ${res.status}`);
  const d = (await res.json()) as DiscordInvite;
  const g = d.guild;
  if (!g) return null;
  const p = d.profile;

  const iconUrl = g.icon ? `${CDN}/icons/${g.id}/${g.icon}.${g.icon.startsWith('a_') ? 'gif' : 'webp'}?size=160` : null;
  const bannerUrl = g.banner
    ? `${CDN}/banners/${g.id}/${g.banner}.webp?size=600`
    : g.splash
      ? `${CDN}/splashes/${g.id}/${g.splash}.webp?size=600`
      : null;

  let game: InvitePreview['game'] = null;
  const appId = p?.game_application_ids?.[0];
  if (appId) {
    try {
      const r = await fetch(`https://discord.com/api/v10/applications/${appId}/rpc`);
      if (r.ok) {
        const a = (await r.json()) as { name: string; icon: string | null };
        game = { name: a.name, iconUrl: a.icon ? `${CDN}/app-icons/${appId}/${a.icon}.png?size=64` : null };
      }
    } catch {
      /* jeu facultatif */
    }
  }

  let traits: InviteTrait[] = [];
  if (p?.traits?.length) {
    const map = await loadShortcodes().catch(() => ({}) as Record<string, string>);
    traits = [...p.traits]
      .sort((a, b) => a.position - b.position)
      .map((t) => {
        if (t.emoji_id) return { label: t.label, emojiUrl: `${CDN}/emojis/${t.emoji_id}.${t.emoji_animated ? 'gif' : 'webp'}?size=32` };
        if (!t.emoji_name) return { label: t.label };
        // Discord renvoie soit le nom court ("handshake"), soit l'emoji lui-meme.
        return { label: t.label, emoji: map[t.emoji_name] ?? (/^[\x20-\x7e]+$/.test(t.emoji_name) ? undefined : t.emoji_name) };
      });
  }

  return {
    source: 'discord',
    code,
    serverId: g.id,
    name: g.name,
    iconUrl,
    bannerUrl,
    description: p?.description ?? g.description,
    memberCount: p?.member_count ?? d.approximate_member_count ?? 0,
    onlineCount: p?.online_count ?? d.approximate_presence_count ?? null,
    createdAt: snowflakeDate(g.id),
    community: g.features.includes('COMMUNITY'),
    boostTier: g.premium_tier ?? 0,
    tag: p?.tag ? { label: p.tag, badgeUrl: p.badge_hash ? `${CDN}/guild-tag-badges/${g.id}/${p.badge_hash}.png?size=32` : null } : null,
    game,
    traits,
    unusable: !!d.expires_at && new Date(d.expires_at) < new Date(),
  };
}

interface AppPreviewRow {
  server_id: string;
  server_name: string;
  server_icon_url: string | null;
  server_banner_url?: string | null;
  server_description: string | null;
  server_created_at?: string | null;
  member_count: number;
  online_count?: number | null;
  community_enabled?: boolean | null;
  is_expired: boolean;
  is_maxed: boolean;
}

async function fetchAppInvite(code: string): Promise<InvitePreview | null> {
  let { data, error }: { data: unknown; error: unknown } = await supabase.rpc('get_invite_preview', { invite_code: code });
  if (error) {
    // Migration get_invite_preview pas encore appliquee : apercu reduit.
    ({ data, error } = await supabase.rpc('get_invite_details', { invite_code: code }));
  }
  if (error) throw error;
  const row = (data as AppPreviewRow[] | null)?.[0];
  if (!row) return null;
  return {
    source: 'app',
    code,
    serverId: row.server_id,
    name: row.server_name,
    iconUrl: row.server_icon_url,
    bannerUrl: row.server_banner_url ?? null,
    description: row.server_description,
    memberCount: Number(row.member_count) || 0,
    onlineCount: row.online_count == null ? null : Number(row.online_count),
    createdAt: row.server_created_at ? new Date(row.server_created_at) : null,
    community: !!row.community_enabled,
    boostTier: 0,
    tag: null,
    game: null,
    traits: [],
    unusable: row.is_expired || row.is_maxed,
  };
}

export function fetchInvitePreview(ref: Pick<InviteRef, 'source' | 'code'>): Promise<InvitePreview | null> {
  return ref.source === 'discord' ? fetchDiscordInvite(ref.code) : fetchAppInvite(ref.code);
}

/** Salon vocal : ouvre "Inviter des amis" / "Quel est le sujet de la discussion ?" depuis la vue du salon. */
export const OPEN_VOICE_INVITE_EVENT = 'app:open-voice-invite';
export const OPEN_VOICE_STATUS_EVENT = 'app:open-voice-status';
