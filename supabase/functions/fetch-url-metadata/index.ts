import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders as buildCorsHeaders, preflight } from '../_shared/cors.ts';


// ---- In-memory cache (per edge instance) ----
interface CacheEntry {
  payload: Record<string, unknown>;
  expiresAt: number; // epoch ms
}

// Origin-restricted CORS (see _shared/cors.ts) — no more blanket '*'.
const corsHeaders = (req: Request) => ({
  ...buildCorsHeaders(req),
  'Access-Control-Expose-Headers': 'x-cache, cache-control',
});

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
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json', ...extraHeaders },
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

/**
 * True if the given hostname is a literal IPv4/IPv6 address that is private,
 * loopback, link-local or otherwise unroutable.
 *
 * `isPrivateHostname` above only inspects the hostname STRING. That is not
 * enough: a public hostname can resolve to 169.254.169.254 (cloud metadata),
 * which is the classic DNS-rebinding SSRF bypass. This function is applied to
 * the RESOLVED addresses of the target.
 */
function isPrivateIp(ip: string): boolean {
  // IPv4
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (v4) {
    const [a, b] = [parseInt(v4[1], 10), parseInt(v4[2], 10)];
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local / metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast / reserved
    return false;
  }

  // IPv6
  const addr = ip.toLowerCase().split('%')[0]; // drop zone id
  if (addr === '::1' || addr === '::') return true;
  if (addr.startsWith('fe80')) return true; // link-local
  if (/^f[cd][0-9a-f]{0,2}:/.test(addr)) return true; // unique local fc00::/7
  // IPv4-mapped (::ffff:a.b.c.d) — check the embedded IPv4
  const mapped = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(addr);
  if (mapped) return isPrivateIp(mapped[1]);
  return false;
}

/** Resolve a hostname and reject it if ANY address is private. */
async function isSafeResolvedUrl(u: URL): Promise<boolean> {
  if (!['http:', 'https:'].includes(u.protocol)) return false;
  if (isPrivateHostname(u.hostname)) return false;

  let addrs: string[];
  try {
    const result = await Deno.resolveDns(u.hostname, 'A').catch(() => []);
    const result6 = await Deno.resolveDns(u.hostname, 'AAAA').catch(() => []);
    addrs = [...result, ...result6].map((a) => a as string);
  } catch {
    // Resolution failed — we cannot prove it is safe, so refuse.
    return false;
  }

  // Literal IP hostnames never appear in DNS results.
  if (addrs.length === 0) return isPrivateIp(u.hostname) === false;

  return !addrs.some((a) => isPrivateIp(a));
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
        // Re-validate each redirect hop against the resolved-address blocklist.
        if (!(await isSafeResolvedUrl(next))) return null;
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
    return preflight(req);
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

    // Validate the hostname AND every resolved address (DNS-rebinding guard).
    if (!(await isSafeResolvedUrl(parsedUrl))) {
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
