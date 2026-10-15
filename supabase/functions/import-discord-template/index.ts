import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders as buildCorsHeaders, preflight } from '../_shared/cors.ts';



// Origin-restricted CORS (see _shared/cors.ts) — no more blanket '*'.
const corsHeaders = (req: Request) => buildCorsHeaders(req);

const DISCORD_TYPE_MAP: Record<number, string> = {
  0: 'text',
  2: 'voice',
  4: 'category', // internal use
  5: 'announcement',
  13: 'stage',
  15: 'forum',
};

function mapChannelType(discordType: number): string {
  return DISCORD_TYPE_MAP[discordType] || 'text';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return preflight(req);
  }

  try {
    // Require an authenticated caller before touching Discord APIs or storage.
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }
    const supabaseUrlAuth = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseAuth = createClient(supabaseUrlAuth, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const { templateCode } = await req.json();


    if (!templateCode || typeof templateCode !== 'string') {
      return new Response(
        JSON.stringify({ error: 'templateCode is required' }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // Extract code from URL or use directly
    let code = templateCode.trim();
    const urlMatch = code.match(/discord\.new\/([a-zA-Z0-9]+)/);
    if (urlMatch) {
      code = urlMatch[1];
    }
    const templateMatch = code.match(/discord\.com\/template\/([a-zA-Z0-9]+)/);
    if (templateMatch) {
      code = templateMatch[1];
    }

    if (!/^[a-zA-Z0-9]+$/.test(code)) {
      return new Response(
        JSON.stringify({ error: 'Invalid template code format' }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(`https://discord.com/api/v10/guilds/templates/${code}`);

    if (!response.ok) {
      const text = await response.text();
      console.error('Discord API error:', response.status, text);
      return new Response(
        JSON.stringify({ error: 'Template not found or inaccessible' }),
        { status: 404, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const template = await response.json();
    const guild = template.serialized_source_guild;

    if (!guild) {
      return new Response(
        JSON.stringify({ error: 'Invalid template structure' }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // Build categories map
    const categories: Record<string, { name: string; position: number; channels: any[] }> = {};
    const orphanChannels: any[] = [];

    for (const ch of guild.channels || []) {
      if (ch.type === 4) {
        categories[ch.id] = {
          name: ch.name,
          position: ch.position ?? 0,
          channels: [],
        };
      }
    }

    for (const ch of guild.channels || []) {
      if (ch.type === 4) continue;
      const mapped = {
        name: ch.name,
        type: mapChannelType(ch.type),
        position: ch.position ?? 0,
      };
      if (ch.parent_id && categories[ch.parent_id]) {
        categories[ch.parent_id].channels.push(mapped);
      } else {
        orphanChannels.push(mapped);
      }
    }

    const sortedCategories = Object.values(categories)
      .sort((a, b) => a.position - b.position)
      .map(cat => ({
        name: cat.name,
        channels: cat.channels.sort((a: any, b: any) => a.position - b.position),
      }));

    const roles = (guild.roles || [])
      .filter((r: any) => r.id !== 0 && r.name !== '@everyone')
      .sort((a: any, b: any) => (b.position ?? 0) - (a.position ?? 0))
      .map((r: any) => ({
        name: r.name,
        color: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : null,
        hoist: r.hoist ?? false,
      }));

    // Discord's guild template API never includes the server's icon or banner
    // (serialized_source_guild has no icon_hash/banner_hash/splash_hash field) —
    // fetching those requires a bot installed on the source guild, which we don't have here.
    const result = {
      name: template.name,
      description: template.description || guild.description || null,
      serverName: guild.name,
      categories: sortedCategories,
      orphanChannels,
      roles,
      usageCount: template.usage_count ?? 0,
      creator: template.creator ? {
        username: template.creator.username,
      } : null,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
