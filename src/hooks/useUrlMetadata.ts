import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';

export interface UrlMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  themeColor: string | null;
}

interface CachedEntry {
  meta: UrlMetadata | null;
  fetchedAt: number;
}

// TTLs
const POSITIVE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const NEGATIVE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Global in-memory cache (fast path)
const metadataCache = new Map<string, UrlMetadata | null>();
const pendingRequests = new Map<string, Promise<UrlMetadata | null>>();

// Observers notified when metadata for a url changes locally (fetch / realtime).
type Listener = (url: string, meta: UrlMetadata | null) => void;
const listeners = new Set<Listener>();
function notify(url: string, meta: UrlMetadata | null) {
  listeners.forEach((l) => {
    try { l(url, meta); } catch { /* noop */ }
  });
}

function cacheKey(url: string) {
  return `url-meta:${url}`;
}

function readPersisted(url: string): UrlMetadata | null | undefined {
  const entry = cacheGetSync<CachedEntry>(cacheKey(url));
  if (!entry || typeof entry.fetchedAt !== 'number') return undefined;
  const age = Date.now() - entry.fetchedAt;
  const ttl = entry.meta ? POSITIVE_TTL_MS : NEGATIVE_TTL_MS;
  if (age > ttl) return undefined;
  return entry.meta;
}

function primeFromPersisted(url: string): UrlMetadata | null | undefined {
  if (metadataCache.has(url)) return metadataCache.get(url)!;
  const persisted = readPersisted(url);
  if (persisted !== undefined) {
    metadataCache.set(url, persisted);
    return persisted;
  }
  return undefined;
}

// Realtime broadcast — every client publishes successful lookups so others
// hydrate instantly without re-fetching the edge function.
let broadcastChannel: ReturnType<typeof supabase.channel> | null = null;
let broadcastChannelRefs = 0;
function ensureBroadcastChannel() {
  if (broadcastChannel) return broadcastChannel;
  broadcastChannel = supabase.channel('url-meta-broadcast', {
    config: { broadcast: { self: false } },
  });
  broadcastChannel
    .on('broadcast', { event: 'meta' }, ({ payload }) => {
      if (!payload || typeof payload.url !== 'string') return;
      const meta = (payload.meta ?? null) as UrlMetadata | null;
      metadataCache.set(payload.url, meta);
      cacheSetAsync(cacheKey(payload.url), { meta, fetchedAt: Date.now() });
      notify(payload.url, meta);
    })
    .subscribe();
  return broadcastChannel;
}

function broadcastMeta(url: string, meta: UrlMetadata | null) {
  if (!broadcastChannel) return;
  broadcastChannel.send({ type: 'broadcast', event: 'meta', payload: { url, meta } });
}

export function useUrlMetadataRealtime(): void {
  useEffect(() => {
    ensureBroadcastChannel();
    broadcastChannelRefs += 1;
    return () => {
      broadcastChannelRefs -= 1;
      if (broadcastChannelRefs <= 0 && broadcastChannel) {
        supabase.removeChannel(broadcastChannel);
        broadcastChannel = null;
        broadcastChannelRefs = 0;
      }
    };
  }, []);
}

export async function fetchMetadata(url: string): Promise<UrlMetadata | null> {
  const primed = primeFromPersisted(url);
  if (primed !== undefined) return primed;

  if (pendingRequests.has(url)) return pendingRequests.get(url)!;

  const promise = (async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        metadataCache.set(url, null);
        notify(url, null);
        return null;
      }
      const { data, error } = await supabase.functions.invoke('fetch-url-metadata', {
        body: { url },
      });
      if (error) {
        metadataCache.set(url, null);
        cacheSetAsync(cacheKey(url), { meta: null, fetchedAt: Date.now() });
        notify(url, null);
        return null;
      }
      const payload = data?.title !== undefined ? data : data?.data;
      if (!payload || payload.error) {
        metadataCache.set(url, null);
        cacheSetAsync(cacheKey(url), { meta: null, fetchedAt: Date.now() });
        notify(url, null);
        return null;
      }
      const metadata = payload as UrlMetadata;
      metadataCache.set(url, metadata);
      cacheSetAsync(cacheKey(url), { meta: metadata, fetchedAt: Date.now() });
      notify(url, metadata);
      broadcastMeta(url, metadata);
      return metadata;
    } catch {
      metadataCache.set(url, null);
      cacheSetAsync(cacheKey(url), { meta: null, fetchedAt: Date.now() });
      notify(url, null);
      return null;
    } finally {
      pendingRequests.delete(url);
    }
  })();

  pendingRequests.set(url, promise);
  return promise;
}

// Background bulk preload — used on channel/server open to warm the cache so
// LinkEmbed renders synchronously when the user scrolls into view.
export function prefetchUrls(urls: Iterable<string>): void {
  for (const url of urls) {
    if (!url) continue;
    if (primeFromPersisted(url) !== undefined) continue;
    if (pendingRequests.has(url)) continue;
    fetchMetadata(url);
  }
}

export function useUrlMetadata(url: string | null) {
  const initial = url ? primeFromPersisted(url) : undefined;
  const [data, setData] = useState<UrlMetadata | null>(initial ?? null);
  const [isLoading, setIsLoading] = useState(url ? initial === undefined : false);

  useEffect(() => {
    if (!url) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const primed = primeFromPersisted(url);
    if (primed !== undefined) {
      setData(primed);
      setIsLoading(false);
    } else {
      setIsLoading(true);
      fetchMetadata(url);
    }

    // Subscribe to local + realtime updates for this url.
    const listener: Listener = (u, meta) => {
      if (u !== url) return;
      setData(meta);
      setIsLoading(false);
    };
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, [url]);

  return { data, isLoading };
}

// Utility to extract URLs from message content
export function extractUrls(content: string): string[] {
  const maskedLinkRegex = /\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;
  const messageLinkRegex = /https?:\/\/(?:discord\.com|discordapp\.com)\/channels\//;

  const urls: string[] = [];

  let maskedMatch: RegExpExecArray | null;
  while ((maskedMatch = maskedLinkRegex.exec(content)) !== null) {
    urls.push(maskedMatch[1]);
  }

  const strippedContent = content.replace(maskedLinkRegex, '$1');

  const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
  let match: RegExpExecArray | null;
  while ((match = urlRegex.exec(strippedContent)) !== null) {
    let url = match[1];
    url = url.replace(/[.,!?;:]+$/, '');
    while (url.endsWith(')')) {
      const opens = (url.match(/\(/g) || []).length;
      const closes = (url.match(/\)/g) || []).length;
      if (closes > opens) {
        url = url.slice(0, -1);
      } else {
        break;
      }
    }
    if (!messageLinkRegex.test(url)) {
      urls.push(url);
    }
  }

  return [...new Set(urls)].slice(0, 5);
}
