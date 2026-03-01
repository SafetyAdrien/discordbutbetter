import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UrlMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  themeColor: string | null;
}

// Global in-memory cache
const metadataCache = new Map<string, UrlMetadata | null>();
const pendingRequests = new Map<string, Promise<UrlMetadata | null>>();

async function fetchMetadata(url: string): Promise<UrlMetadata | null> {
  if (metadataCache.has(url)) return metadataCache.get(url)!;
  
  // Deduplicate in-flight requests
  if (pendingRequests.has(url)) return pendingRequests.get(url)!;

  const promise = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-url-metadata', {
        body: { url },
      });
      if (error || data?.error) {
        metadataCache.set(url, null);
        return null;
      }
      const metadata = data as UrlMetadata;
      metadataCache.set(url, metadata);
      return metadata;
    } catch {
      metadataCache.set(url, null);
      return null;
    } finally {
      pendingRequests.delete(url);
    }
  })();

  pendingRequests.set(url, promise);
  return promise;
}

export function useUrlMetadata(url: string | null) {
  const [data, setData] = useState<UrlMetadata | null>(url ? metadataCache.get(url) ?? null : null);
  const [isLoading, setIsLoading] = useState(url ? !metadataCache.has(url) : false);

  useEffect(() => {
    if (!url) {
      setData(null);
      setIsLoading(false);
      return;
    }

    if (metadataCache.has(url)) {
      setData(metadataCache.get(url)!);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetchMetadata(url).then((result) => {
      setData(result);
      setIsLoading(false);
    });
  }, [url]);

  return { data, isLoading };
}

// Utility to extract URLs from message content
export function extractUrls(content: string): string[] {
  const urlRegex = /(https?:\/\/[^\s<>\])"]+)/g;
  const maskedLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const messageLinkRegex = /https?:\/\/(?:discord\.com|discordapp\.com)\/channels\//;
  
  // Collect masked link URLs to exclude
  const maskedUrls = new Set<string>();
  let maskedMatch;
  while ((maskedMatch = maskedLinkRegex.exec(content)) !== null) {
    maskedUrls.add(maskedMatch[2]);
  }

  const urls: string[] = [];
  let match;
  while ((match = urlRegex.exec(content)) !== null) {
    const url = match[1];
    // Skip masked link URLs and Discord message links (already have embeds)
    if (!maskedUrls.has(url) && !messageLinkRegex.test(url)) {
      urls.push(url);
    }
  }
  return [...new Set(urls)].slice(0, 5);
}
