import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { AccessToken } from 'npm:livekit-server-sdk@^2.17.0';
import { VideoGrant } from 'npm:livekit-server-sdk@^2.17.0';
import { corsHeaders as buildCorsHeaders, preflight } from '../_shared/cors.ts';



// Origin-restricted CORS (see _shared/cors.ts) — no more blanket '*'.
const corsHeaders = (req: Request) => buildCorsHeaders(req);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return preflight(req);
  }

  try {
    // Authenticate caller
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const livekitUrl = Deno.env.get('LIVEKIT_URL')!;
    const livekitApiKey = Deno.env.get('LIVEKIT_API_KEY')!;
    const livekitApiSecret = Deno.env.get('LIVEKIT_API_SECRET')!;

    if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
      return new Response(JSON.stringify({ error: 'LiveKit not configured on backend' }), {
        status: 500,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

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

    const body = await req.json().catch(() => ({}));
    const channelId = body?.channelId;
    // SECURITY: Always use server-verified user ID. Never trust client-supplied identity.
    const identity = userData.user.id;

    if (!channelId || typeof channelId !== 'string') {
      return new Response(JSON.stringify({ error: 'channelId is required' }), {
        status: 400,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    // SECURITY: the LiveKit room name is DERIVED server-side from the channel id.
    // It is never accepted from the client — otherwise any authenticated user
    // could request a token for an arbitrary room and join someone else's call.
    const room = `channel:${channelId}`;

    // Authorize: the caller must actually be able to connect to this voice channel.
    // `has_channel_permission` is SECURITY DEFINER, so this works even though the
    // `channels` table is not directly readable by every authenticated user.
    const { data: allowed, error: permError } = await supabaseAuth.rpc('has_channel_permission', {
      _user_id: identity,
      _channel_id: channelId,
      _permission: 'connect_voice',
    });

    if (permError || allowed !== true) {
      console.error('livekit-token: permission denied', { channelId, identity, permError });
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    // Name/metadata are cosmetic only; identity + room are already server-controlled.
    const name = body?.name || userData.user.user_metadata?.display_name || userData.user.email || identity;
    const metadata = body?.metadata;

    // Admin grants are never trusted from the client. If admin capabilities are
    // ever needed, derive them server-side by checking the caller's permissions
    // on the channel/server that owns this room.
    const videoGrant: VideoGrant = {
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      room: room,
    };


    const token = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity,
      name,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    });
    token.addGrant(videoGrant);

    const jwt = await token.toJwt();

    return new Response(
      JSON.stringify({ token: jwt, url: livekitUrl }),
      { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('LiveKit token error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
