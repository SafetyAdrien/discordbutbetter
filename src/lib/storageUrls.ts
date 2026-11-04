import { supabase } from '@/integrations/supabase/client';

/**
 * Liens signes des buckets prives (pieces jointes, miniatures d'evenements
 * de calendrier) : ils sont enregistres avec une duree de vie de 7 jours dans
 * les lignes (messages, posts media...). Passe ce delai, l'image ou la video
 * ne s'affichait plus. `refreshSignedUrls` parcourt les donnees d'une requete,
 * re-signe en un seul appel par bucket les liens expires (ou proches de
 * l'etre) et les remplace. Les droits d'acces restent ceux de RLS : un membre
 * qui a perdu l'acces ne peut plus re-signer.
 */

const SIGNED_RE = /\/storage\/v1\/object\/sign\/([^/?#]+)\/([^?#]+)\?token=([^&#]+)/;
/** On re-signe si le lien expire dans moins de 6 h. */
const MARGIN_MS = 6 * 60 * 60 * 1000;
const TTL_S = 60 * 60 * 24 * 7;

interface SignedRef {
  bucket: string;
  path: string;
  expiresAt: number | null;
}

export function parseSignedUrl(url: string): SignedRef | null {
  const m = url.match(SIGNED_RE);
  if (!m) return null;
  let expiresAt: number | null = null;
  try {
    const payload = JSON.parse(atob(m[3].split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.exp === 'number') expiresAt = payload.exp * 1000;
  } catch {
    /* jeton illisible : on le considere comme expire */
  }
  return { bucket: decodeURIComponent(m[1]), path: decodeURIComponent(m[2]), expiresAt };
}

export function needsRefresh(url: string, now = Date.now()): boolean {
  const ref = parseSignedUrl(url);
  return !!ref && (ref.expiresAt === null || ref.expiresAt - now < MARGIN_MS);
}

// Liens deja re-signes pendant la session (evite de re-signer a chaque refetch).
const cache = new Map<string, { url: string; expiresAt: number }>();

function collect(value: unknown, out: Set<string>, depth = 0) {
  if (depth > 8 || value == null) return;
  if (typeof value === 'string') {
    if (value.includes('/object/sign/') && needsRefresh(value)) out.add(value);
    return;
  }
  if (Array.isArray(value)) value.forEach((v) => collect(v, out, depth + 1));
  else if (typeof value === 'object') Object.values(value as Record<string, unknown>).forEach((v) => collect(v, out, depth + 1));
}

function replace<T>(value: T, map: Map<string, string>, depth = 0): T {
  if (depth > 8 || value == null) return value;
  if (typeof value === 'string') return (map.get(value) ?? value) as T;
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((v) => {
      const r = replace(v, map, depth + 1);
      if (r !== v) changed = true;
      return r;
    });
    return (changed ? next : value) as T;
  }
  if (typeof value === 'object') {
    let changed = false;
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const r = replace(v, map, depth + 1);
      if (r !== v) changed = true;
      next[k] = r;
    }
    return (changed ? next : value) as T;
  }
  return value;
}

/** Re-signe les liens expires presents n'importe ou dans `data`. */
export async function refreshSignedUrls<T>(data: T): Promise<T> {
  const stale = new Set<string>();
  collect(data, stale);
  if (stale.size === 0) return data;

  const now = Date.now();
  const map = new Map<string, string>();
  const byBucket = new Map<string, { url: string; path: string }[]>();
  for (const url of stale) {
    const cached = cache.get(url);
    if (cached && cached.expiresAt - now > MARGIN_MS) {
      map.set(url, cached.url);
      continue;
    }
    const ref = parseSignedUrl(url)!;
    const list = byBucket.get(ref.bucket) ?? [];
    list.push({ url, path: ref.path });
    byBucket.set(ref.bucket, list);
  }

  await Promise.all(
    [...byBucket.entries()].map(async ([bucket, items]) => {
      const { data: signed, error } = await supabase.storage.from(bucket).createSignedUrls(items.map((i) => i.path), TTL_S);
      if (error || !signed) return;
      signed.forEach((s, i) => {
        if (!s.signedUrl) return;
        map.set(items[i].url, s.signedUrl);
        cache.set(items[i].url, { url: s.signedUrl, expiresAt: now + TTL_S * 1000 });
      });
    }),
  );

  return map.size ? replace(data, map) : data;
}
