// Proxies Giphy search/trending so the API key never reaches the client.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders as buildCorsHeaders, preflight } from '../_shared/cors.ts';



// Origin-restricted CORS (see _shared/cors.ts) — no more blanket '*'.
const corsHeaders = (req: Request) => buildCorsHeaders(req);

const GIPHY_API = 'https://api.giphy.com/v1/gifs';

interface RequestBody {
  query?: string;
  offset?: number;
  limit?: number;
}

interface NormalizedGif {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
}

function normalize(data: Array<Record<string, any>>): NormalizedGif[] {
  return data.map((g) => {
    const images = g.images || {};
    const full = images.downsized_medium || images.fixed_height || images.original || {};
    const preview = images.fixed_width_small || images.preview_gif || images.fixed_height_small || full;
    return {
      id: String(g.id),
      title: (g.title as string) || '',
      url: (full.url as string) || '',
      previewUrl: (preview.url as string) || (full.url as string) || '',
      width: parseInt(full.width as string, 10) || 0,
      height: parseInt(full.height as string, 10) || 0,
    };
  }).filter((g) => g.url);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight(req);

  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GIPHY_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'missing_credentials' }), {
        status: 500,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const query = (body.query || '').trim().slice(0, 100);
    const limit = Math.min(Math.max(body.limit ?? 24, 1), 50);
    const offset = Math.max(body.offset ?? 0, 0);

    const params = new URLSearchParams({
      api_key: apiKey,
      limit: String(limit),
      offset: String(offset),
      rating: 'pg-13',
      lang: 'fr',
    });

    const endpoint = query
      ? `${GIPHY_API}/search?${params.toString()}&q=${encodeURIComponent(query)}`
      : `${GIPHY_API}/trending?${params.toString()}`;

    const res = await fetch(endpoint);
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* noop */ }

    if (!res.ok) {
      console.error('Giphy API error:', res.status, text.slice(0, 200));
      return new Response(JSON.stringify({ error: 'giphy_error' }), {
        status: 502,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const results = normalize(json?.data || []);
    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=120' },
    });
  } catch (err) {
    console.error('giphy-search error', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
