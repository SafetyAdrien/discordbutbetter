import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Expose-Headers': 'x-cache, cache-control',
};

// ---- In-memory cache (per edge instance) ----
interface CacheEntry {
  payload: Record<string, unknown>;
  expiresAt: number; // epoch ms
}
const CACHE = new Map<string, CacheEntry>();
const CACHE_MAX = 500;
const TTL_OK_MS = (parseInt(Deno.env.get('URL_METADATA_TTL_OK_SEC') || '3600', 10)) * 1000;
const TTL_FAIL_MS = (parseInt(Deno.env.get('URL_METADATA_TTL_FAIL_SEC') || '300', 10)) * 1000;

function cacheGet(key: string): CacheEntry | null {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    CACHE.delete(key);
    return null;
  }
  // Touch (LRU): re-insert to bump order
  CACHE.delete(key);
  CACHE.set(key, entry);
  return entry;
}

function cacheSet(key: string, payload: Record<string, unknown>, ttlMs: number) {
  if (CACHE.size >= CACHE_MAX) {
    const oldest = CACHE.keys().next().value;
    if (oldest) CACHE.delete(oldest);
  }
  CACHE.set(key, { payload, expiresAt: Date.now() + ttlMs });
}

function jsonResponse(payload: Record<string, unknown>, status: number, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function cachedResponse(entry: CacheEntry) {
  const remaining = Math.max(0, Math.floor((entry.expiresAt - Date.now()) / 1000));
  return jsonResponse(entry.payload, 200, {
    'X-Cache': 'HIT',
    'Cache-Control': `public, max-age=${remaining}`,
  });
}

// ---- HTML helpers ----
function extractMeta(html: string, property: string): string | null {
  const propRegex = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i');
  const match = propRegex.exec(html);
  if (match) return match[1];
  const revRegex = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i');
  const revMatch = revRegex.exec(html);
  if (revMatch) return revMatch[1];
  return null;
}

function extractTitle(html: string): string | null {
  const match = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  return match ? match[1].trim() : null;
}

// ---- Retry helpers ----
function parseRetryAfterMs(header: string | null): number | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (/^\d+$/.test(trimmed)) {
    const secs = parseInt(trimmed, 10);
    if (secs >= 0 && secs <= 60) return secs * 1000;
    return null;
  }
  const date = Date.parse(trimmed);
  if (!isNaN(date)) {
    const delta = date - Date.now();
    if (delta > 0 && delta <= 60_000) return delta;
  }
  return null;
}

const MAX_ATTEMPTS = 3;
const BUDGET_MS = 5000;
const MAX_REDIRECTS = 5;

// ---- SSRF hostname validation (shared for initial URL + redirects) ----
function isPrivateHostname(rawHostname: string): boolean {
  if (!rawHostname) return true;
  // Strip IPv6 brackets
  let hostname = rawHostname.toLowerCase().replace(/^\[|\]$/g, '');

  // Reject numeric/octal/hex IPv4 representations (e.g. 2130706433, 0x7f000001, 0177.0.0.1)
  if (/^0x[0-9a-f]+$/i.test(hostname)) return true;
  if (/^\d+$/.test(hostname)) return true; // decimal IP as single integer
  // Octal-leading octets in dotted form: any octet starting with 0 and length > 1
  if (/^\d+(\.\d+){1,3}$/.test(hostname)) {
    const parts = hostname.split('.');
    for (const p of parts) {
      if (p.length > 1 && p.startsWith('0')) return true;
      if (/^0x/i.test(p)) return true;
    }
  }

  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('169.254.') ||
    hostname.startsWith('127.') ||
    hostname.startsWith('0.') ||
    hostname.startsWith('172.16.') || hostname.startsWith('172.17.') ||
    hostname.startsWith('172.18.') || hostname.startsWith('172.19.') ||
    hostname.startsWith('172.20.') || hostname.startsWith('172.21.') ||
    hostname.startsWith('172.22.') || hostname.startsWith('172.23.') ||
    hostname.startsWith('172.24.') || hostname.startsWith('172.25.') ||
    hostname.startsWith('172.26.') || hostname.startsWith('172.27.') ||
    hostname.startsWith('172.28.') || hostname.startsWith('172.29.') ||
    hostname.startsWith('172.30.') || hostname.startsWith('172.31.') ||
    /^fe80:/i.test(hostname) ||
    /^fd[0-9a-f]{2}:/i.test(hostname)
  ) {
    return true;
  }

  // CGNAT range 100.64.0.0/10 => 100.64.0.0 - 100.127.255.255
  const cgnat = /^100\.(\d{1,3})\./.exec(hostname);
  if (cgnat) {
    const second = parseInt(cgnat[1], 10);
    if (second >= 64 && second <= 127) return true;
  }

  return false;
}

function isSafeUrl(u: URL): boolean {
  if (!['http:', 'https:'].includes(u.protocol)) return false;
  if (isPrivateHostname(u.hostname)) return false;
  return true;
}

async function fetchWithRetry(target: string): Promise<Response | { upstreamStatus: number | null }> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const overallTimeout = setTimeout(() => controller.abort(), BUDGET_MS);

  const doFetch = async (url: string): Promise<Response | null> => {
    // Manual redirect handling — revalidate each hop against SSRF blocklist.
    let current = url;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetch(current, {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DiscordBot/2.0)',
          'Accept': 'text/html',
        },
      });

      if (res.status >= 300 && res.status < 400 && res.status !== 304) {
        const loc = res.headers.get('location');
        try { await res.body?.cancel(); } catch { /* noop */ }
        if (!loc) return res;
        let next: URL;
        try {
          next = new URL(loc, current);
        } catch {
          return null;
        }
        if (!isSafeUrl(next)) return null;
        current = next.toString();
        continue;
      }

      return res;
    }
    return null; // too many redirects
  };

  try {
    let lastStatus: number | null = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const res = await doFetch(target);
        if (!res) return { upstreamStatus: null };

        if (res.status === 429 || res.status === 503) {
          lastStatus = res.status;
          try { await res.body?.cancel(); } catch { /* noop */ }

          if (attempt === MAX_ATTEMPTS - 1) break;

          const retryAfterMs = parseRetryAfterMs(res.headers.get('retry-after'));
          const expBackoff = Math.min(2000, 300 * Math.pow(2, attempt));
          const jitter = expBackoff * (0.8 + Math.random() * 0.4);
          const waitMs = retryAfterMs !== null && retryAfterMs <= 4000 ? retryAfterMs : jitter;

          if (Date.now() - startedAt + waitMs >= BUDGET_MS) break;
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }

        return res;
      } catch (err) {
        if (controller.signal.aborted) return { upstreamStatus: lastStatus };
        if (attempt === MAX_ATTEMPTS - 1) return { upstreamStatus: lastStatus };
        const wait = Math.min(2000, 300 * Math.pow(2, attempt));
        if (Date.now() - startedAt + wait >= BUDGET_MS) return { upstreamStatus: lastStatus };
        await new Promise((r) => setTimeout(r, wait));
      }
    }
    return { upstreamStatus: lastStatus };
  } finally {
    clearTimeout(overallTimeout);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData?.user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return jsonResponse({ error: 'URL is required' }, 400);
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return jsonResponse({ error: 'Invalid URL' }, 400);
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return jsonResponse({ error: 'Invalid protocol' }, 400);
    }

    if (isPrivateHostname(parsedUrl.hostname)) {
      return jsonResponse({ error: 'Invalid URL' }, 400);
    }

    const cacheKey = parsedUrl.toString();

    // Cache lookup
    const cached = cacheGet(cacheKey);
    if (cached) return cachedResponse(cached);

    // Fetch with retries
    const result = await fetchWithRetry(parsedUrl.toString());

    if (!(result instanceof Response)) {
      const payload = {
        empty: true,
        error: result.upstreamStatus ? `HTTP ${result.upstreamStatus}` : 'Failed to fetch URL',
        fallback: true,
      };
      cacheSet(cacheKey, payload, TTL_FAIL_MS);
      return jsonResponse(payload, 200, { 'X-Cache': 'MISS' });
    }

    const response = result;

    if (!response.ok) {
      const payload = {
        empty: true,
        error: `HTTP ${response.status}`,
        fallback: response.status === 429 || response.status >= 500,
      };
      cacheSet(cacheKey, payload, TTL_FAIL_MS);
      return jsonResponse(payload, 200, { 'X-Cache': 'MISS' });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      const payload = { error: 'Not an HTML page', empty: true };
      cacheSet(cacheKey, payload, TTL_FAIL_MS);
      return jsonResponse(payload, 200, { 'X-Cache': 'MISS' });
    }

    // Read only first 50KB to avoid memory issues
    const reader = response.body?.getReader();
    let html = '';
    if (reader) {
      const decoder = new TextDecoder();
      let totalBytes = 0;
      while (totalBytes < 50000) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        totalBytes += value.length;
      }
      reader.cancel();
    }

    const title = extractMeta(html, 'og:title') || extractMeta(html, 'twitter:title') || extractTitle(html);
    const description = extractMeta(html, 'og:description') || extractMeta(html, 'twitter:description') || extractMeta(html, 'description');
    const image = extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image');
    const siteName = extractMeta(html, 'og:site_name') || parsedUrl.hostname;
    const themeColor = extractMeta(html, 'theme-color') || extractMeta(html, 'msapplication-TileColor') || extractMeta(html, 'og:theme_color');

    let resolvedImage: string | null = image;
    if (image && !image.startsWith('http')) {
      try {
        resolvedImage = new URL(image, parsedUrl.origin).toString();
      } catch {
        resolvedImage = null;
      }
    }

    const metadata = {
      title: title || null,
      description: description ? description.slice(0, 500) : null,
      image: resolvedImage || null,
      siteName: siteName || null,
      themeColor: themeColor || null,
    };

    if (!metadata.title && !metadata.description && !metadata.image) {
      const payload = { ...metadata, empty: true };
      cacheSet(cacheKey, payload, TTL_FAIL_MS);
      return jsonResponse(payload, 200, { 'X-Cache': 'MISS' });
    }

    cacheSet(cacheKey, metadata, TTL_OK_MS);
    return jsonResponse(metadata, 200, {
      'X-Cache': 'MISS',
      'Cache-Control': `public, max-age=${Math.floor(TTL_OK_MS / 1000)}`,
    });
  } catch (error) {
    console.error('Error:', error);
    return jsonResponse({ error: 'Internal error' }, 500);
  }
});
