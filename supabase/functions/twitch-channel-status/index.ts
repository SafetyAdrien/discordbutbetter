// Twitch channel/stream status via the Lovable connector gateway (Helix).
// Returns a normalized payload regardless of online/offline state.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GATEWAY = 'https://connector-gateway.lovable.dev/twitch';

interface RequestBody {
  login?: string;
}

interface NormalizedStatus {
  isLive: boolean;
  title: string | null;
  game: string | null;
  viewers: number | null;
  thumbnail: string | null;
  startedAt: string | null;
  profileImage: string | null;
  displayName: string | null;
  login: string;
}

async function gatewayGet(path: string, lovableKey: string, twitchKey: string) {
  const res = await fetch(`${GATEWAY}${path}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': twitchKey,
    },
  });
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* noop */ }
  if (!res.ok) {
    throw new Error(`Twitch gateway ${res.status}: ${text.slice(0, 200)}`);
  }
  return json as { data?: Array<Record<string, unknown>> };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Require an authenticated caller to prevent unauthenticated abuse of the
    // Twitch and Lovable AI credits (rate-limit / quota exhaustion).
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    const twitchKey = Deno.env.get('TWITCH_API_KEY');
    if (!lovableKey || !twitchKey) {
      return new Response(JSON.stringify({ error: 'missing_credentials' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const login = (body.login || '').trim().toLowerCase();
    if (!login || !/^[a-z0-9_]{3,25}$/.test(login)) {
      return new Response(JSON.stringify({ error: 'invalid_login' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1) User lookup (profile + display name)
    const userResp = await gatewayGet(
      `/users?login=${encodeURIComponent(login)}`,
      lovableKey,
      twitchKey,
    );
    const user = userResp.data?.[0] as Record<string, unknown> | undefined;
    if (!user) {
      const payload: NormalizedStatus = {
        isLive: false,
        title: null, game: null, viewers: null, thumbnail: null, startedAt: null,
        profileImage: null, displayName: null, login,
      };
      return new Response(JSON.stringify(payload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2) Stream lookup
    const streamResp = await gatewayGet(
      `/streams?user_login=${encodeURIComponent(login)}`,
      lovableKey,
      twitchKey,
    );
    const stream = streamResp.data?.[0] as Record<string, unknown> | undefined;

    const payload: NormalizedStatus = {
      isLive: !!stream,
      title: (stream?.title as string) ?? null,
      game: (stream?.game_name as string) ?? null,
      viewers: typeof stream?.viewer_count === 'number' ? (stream.viewer_count as number) : null,
      thumbnail: (stream?.thumbnail_url as string) ?? null,
      startedAt: (stream?.started_at as string) ?? null,
      profileImage: (user.profile_image_url as string) ?? null,
      displayName: (user.display_name as string) ?? null,
      login,
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
    });
  } catch (err) {
    console.error('twitch-channel-status error', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

