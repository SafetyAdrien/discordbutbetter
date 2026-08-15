import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { AccessToken } from 'npm:livekit-server-sdk@^2.17.0';
import { VideoGrant } from 'npm:livekit-server-sdk@^2.17.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate caller
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    const body = await req.json().catch(() => ({}));
    const room = body?.room;
    // SECURITY: Always use server-verified user ID. Never trust client-supplied identity.
    const identity = userData.user.id;
    const name = body?.name || userData.user.user_metadata?.display_name || userData.user.email || identity;
    const metadata = body?.metadata;

    if (!room || typeof room !== 'string') {
      return new Response(JSON.stringify({ error: 'room is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('LiveKit token error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
