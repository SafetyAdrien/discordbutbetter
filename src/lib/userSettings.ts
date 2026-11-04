import { appLocale } from '@/i18n/locale';
import { onScopeUserChange, userKey } from '@/lib/userScope';
/**
 * Parametres utilisateur : valeurs par defaut, fusion et magasin global.
 *
 * Le document complet vit dans `user_settings.settings` (jsonb). Il est
 * garde en memoire et en localStorage (application immediate au demarrage,
 * avant meme la reponse de Supabase), et lisible hors de React
 * (`getUserSettings()`), par exemple pour formater une heure.
 */

export type SpoilerMode = 'click' | 'hover' | 'always';
export type ThemeVariant = 'dark' | 'darker' | 'onyx';
export type Density = 'compact' | 'default' | 'spacious';
export type RoleColorMode = 'names' | 'beside' | 'none';
export type TimeFormat = 'auto' | '12' | '24';
export type InputProfile = 'isolation' | 'studio' | 'custom';

/** Un favori (salon, fil ou MP) : instantane des libelles pour l'afficher sans recharger l'element. */
export interface FavoriteItem {
  id: string;
  kind: 'channel' | 'thread' | 'dm';
  ref_id: string;
  server_id: string | null;
  /** Fil : salon parent. */
  channel_id: string | null;
  name: string;
  /** Pseudo choisi dans les favoris ("Changer le pseudo"), propre aux favoris. */
  nickname: string | null;
  /** Nom du serveur (salon, fil) ou pseudo (MP). */
  sub: string | null;
  icon_url: string | null;
  /** Type du salon ('text', 'voice'...) pour choisir l'icone. */
  ch_type: string | null;
  category_id: string | null;
}
export interface FavoriteCategory {
  id: string;
  name: string;
}

export interface UserSettings {
  /** Relations avec les autres utilisateurs : pseudos d'amis (visibles par toi seul) et comptes ignores. */
  relations: {
    nicknames: { id: string; nick: string }[];
    ignored: string[];
  };
  dms: {
    /** MP epingles en haut de la liste. */
    pinned: string[];
    /** MP fermes ("Fermer le MP") : retires de la liste jusqu'a leur reouverture. */
    hidden: string[];
    /** Bandeau "Tu cherches des comptes bloques ou ignores ?" ferme. */
    hide_blocked_banner: boolean;
    /** MP rendus muets (`until` : fin en ms, null = jusqu'a reactivation). */
    muted: { id: string; until: number | null }[];
  };
  favorites: {
    /** "Afficher les serveurs favoris" (Apparence) : bouton etoile du rail. */
    enabled: boolean;
    hide_suggestions: boolean;
    categories: FavoriteCategory[];
    items: FavoriteItem[];
  };
  appearance: {
    theme_variant: ThemeVariant;
    show_link_media: boolean;
    show_uploaded_media: boolean;
    show_embeds: boolean;
    show_reactions: boolean;
    spoilers: SpoilerMode;
    markdown_preview: boolean;
    send_button: boolean;
    dm_search: 'selected' | 'all';
  };
  accessibility: {
    /** Zoom de l'application de bureau, en % (50-200). */
    zoom: number;
    font_size: number;
    underline_links: boolean;
    density: Density;
    group_spacing: number;
    saturation: number;
    saturation_custom_colors: boolean;
    high_contrast: boolean;
    role_colors: RoleColorMode;
    reduced_motion: boolean;
    sync_reduced_motion: boolean;
    tts_rate: number;
  };
  voice: {
    input_profile: InputProfile;
    camera_device: string;
    soundboard_volume: number;
    stream_overlay: boolean;
  };
  privacy: {
    allow_server_dms: boolean;
    friend_requests: { everyone: boolean; friends_of_friends: boolean; server_members: boolean };
    profile_sharing: 'all' | 'small' | 'friends';
    activity_share: boolean;
    activity_servers: 'all' | 'small' | 'none';
  };
  language: {
    /** Code de src/i18n/languages.ts ("fr", "en-US"...). */
    locale: string;
    time_format: TimeFormat;
  };
  developer: {
    dev_mode: boolean;
  };
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  relations: { nicknames: [], ignored: [] },
  dms: { pinned: [], hidden: [], hide_blocked_banner: false, muted: [] },
  favorites: { enabled: true, hide_suggestions: false, categories: [], items: [] },
  appearance: {
    theme_variant: 'dark',
    show_link_media: true,
    show_uploaded_media: true,
    show_embeds: true,
    show_reactions: true,
    spoilers: 'click',
    markdown_preview: true,
    send_button: false,
    dm_search: 'selected',
  },
  accessibility: {
    zoom: 100,
    font_size: 16,
    underline_links: false,
    density: 'default',
    group_spacing: 16,
    saturation: 100,
    saturation_custom_colors: false,
    high_contrast: false,
    role_colors: 'names',
    reduced_motion: false,
    sync_reduced_motion: true,
    tts_rate: 1,
  },
  voice: {
    input_profile: 'custom',
    camera_device: 'default',
    soundboard_volume: 100,
    stream_overlay: false,
  },
  privacy: {
    allow_server_dms: true,
    friend_requests: { everyone: true, friends_of_friends: true, server_members: true },
    profile_sharing: 'small',
    activity_share: true,
    activity_servers: 'all',
  },
  language: { locale: 'fr', time_format: 'auto' },
  developer: { dev_mode: true },
};

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Fusion profonde : `patch` l'emporte, les cles inconnues sont ignorees. */
export function mergeSettings<T>(base: T, patch: unknown): T {
  if (!isObject(base) || !isObject(patch)) return base;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (!(k in base)) continue;
    const cur = (base as Record<string, unknown>)[k];
    if (isObject(cur)) out[k] = mergeSettings(cur, v);
    else if (v !== undefined && typeof v === typeof cur) out[k] = v;
  }
  return out as T;
}

const LS_KEY = 'user-settings:v1';
type Listener = () => void;
const listeners = new Set<Listener>();

function readLocal(): UserSettings {
  try {
    const raw = localStorage.getItem(userKey(LS_KEY));
    return raw ? mergeSettings(DEFAULT_USER_SETTINGS, JSON.parse(raw)) : DEFAULT_USER_SETTINGS;
  } catch {
    return DEFAULT_USER_SETTINGS;
  }
}

let current: UserSettings = typeof window === 'undefined' ? DEFAULT_USER_SETTINGS : readLocal();

// Les reglages sont propres a un compte : au changement de compte on recharge ceux du nouveau (ou les valeurs par defaut).
onScopeUserChange(() => {
  current = readLocal();
  listeners.forEach((l) => l());
});

export function getUserSettings(): UserSettings {
  return current;
}

export function subscribeUserSettings(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setUserSettings(next: UserSettings) {
  current = next;
  try {
    localStorage.setItem(userKey(LS_KEY), JSON.stringify(next));
  } catch {
    /* stockage indisponible */
  }
  listeners.forEach((l) => l());
}

export function patchUserSettings(patch: DeepPartial<UserSettings>): UserSettings {
  const next = mergeSettings(current, patch);
  setUserSettings(next);
  return next;
}

/** "14:05" ou "2:05 PM" selon le format choisi dans Langue et heure. */
export function formatClock(date: Date): string {
  const f = current.language.time_format;
  return date.toLocaleTimeString(appLocale(), {
    hour: '2-digit',
    minute: '2-digit',
    ...(f === 'auto' ? {} : { hour12: f === '12' }),
  });
}
