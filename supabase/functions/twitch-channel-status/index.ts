// Twitch channel/stream status via the Twitch Helix API directly.
// Returns a normalized payload regardless of online/offline state.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const HELIX = 'https://api.twitch.tv/helix';
const OAUTH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';

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

// App access tokens are valid for ~60 days; cache in memory across warm invocations.
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAppAccessToken(clientId: string, clientSecret: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twitch OAuth ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  cachedToken = {
    token: json.access_token as string,
    expiresAt: Date.now() + (json.expires_in as number) * 1000,
  };
  return cachedToken.token;
}

async function helixGet(path: string, clientId: string, token: string) {
  const res = await fetch(`${HELIX}${path}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Client-Id': clientId,
    },
  });
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* noop */ }
  if (!res.ok) {
    throw new Error(`Twitch Helix ${res.status}: ${text.slice(0, 200)}`);
  }
  return json as { data?: Array<Record<string, unknown>> };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Require an authenticated caller to prevent unauthenticated abuse of the
    // Twitch API quota.
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

    const clientId = Deno.env.get('TWITCH_CLIENT_ID');
    const clientSecret = Deno.env.get('TWITCH_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
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

    const token = await getAppAccessToken(clientId, clientSecret);

    // 1) User lookup (profile + display name)
    const userResp = await helixGet(
      `/users?login=${encodeURIComponent(login)}`,
      clientId,
      token,
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
    const streamResp = await helixGet(
      `/streams?user_login=${encodeURIComponent(login)}`,
      clientId,
      token,
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
