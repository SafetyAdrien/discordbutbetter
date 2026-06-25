import { useState, useEffect } from 'react';
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

export async function fetchMetadata(url: string): Promise<UrlMetadata | null> {
  const primed = primeFromPersisted(url);
  if (primed !== undefined) return primed;

  if (pendingRequests.has(url)) return pendingRequests.get(url)!;

  const promise = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-url-metadata', {
        body: { url },
      });
      if (error) {
        metadataCache.set(url, null);
        cacheSetAsync(cacheKey(url), { meta: null, fetchedAt: Date.now() });
        return null;
      }
      const payload = data?.title !== undefined ? data : data?.data;
      if (!payload || payload.error) {
        metadataCache.set(url, null);
        cacheSetAsync(cacheKey(url), { meta: null, fetchedAt: Date.now() });
        return null;
      }
      const metadata = payload as UrlMetadata;
      metadataCache.set(url, metadata);
      cacheSetAsync(cacheKey(url), { meta: metadata, fetchedAt: Date.now() });
      return metadata;
    } catch {
      metadataCache.set(url, null);
      cacheSetAsync(cacheKey(url), { meta: null, fetchedAt: Date.now() });
      return null;
    } finally {
      pendingRequests.delete(url);
    }
  })();

  pendingRequests.set(url, promise);
  return promise;
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
      return;
    }

    setIsLoading(true);
    let cancelled = false;
    fetchMetadata(url).then((result) => {
      if (cancelled) return;
      setData(result);
      setIsLoading(false);
    });
    return () => { cancelled = true; };
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
