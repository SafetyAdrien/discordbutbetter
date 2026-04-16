const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
    return new Response('ok', { headers: corsHeaders });
  }

  try {

  try {
    const { templateCode } = await req.json();

    if (!templateCode || typeof templateCode !== 'string') {
      return new Response(
        JSON.stringify({ error: 'templateCode is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract code from URL or use directly
    let code = templateCode.trim();
    // Handle discord.new/XXXX or https://discord.new/XXXX
    const urlMatch = code.match(/discord\.new\/([a-zA-Z0-9]+)/);
    if (urlMatch) {
      code = urlMatch[1];
    }
    // Handle https://discord.com/template/XXXX
    const templateMatch = code.match(/discord\.com\/template\/([a-zA-Z0-9]+)/);
    if (templateMatch) {
      code = templateMatch[1];
    }

    // Validate code format
    if (!/^[a-zA-Z0-9]+$/.test(code)) {
      return new Response(
        JSON.stringify({ error: 'Invalid template code format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(`https://discord.com/api/v10/guilds/templates/${code}`);

    if (!response.ok) {
      const text = await response.text();
      console.error('Discord API error:', response.status, text);
      return new Response(
        JSON.stringify({ error: 'Template not found or inaccessible' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const template = await response.json();
    const guild = template.serialized_source_guild;

    if (!guild) {
      return new Response(
        JSON.stringify({ error: 'Invalid template structure' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build categories map (Discord uses channel type 4 for categories)
    const categories: Record<string, { name: string; position: number; channels: any[] }> = {};
    const orphanChannels: any[] = [];

    // First pass: collect categories
    for (const ch of guild.channels || []) {
      if (ch.type === 4) {
        categories[ch.id] = {
          name: ch.name,
          position: ch.position ?? 0,
          channels: [],
        };
      }
    }

    // Second pass: collect channels
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

    // Sort channels inside categories
    const sortedCategories = Object.values(categories)
      .sort((a, b) => a.position - b.position)
      .map(cat => ({
        name: cat.name,
        channels: cat.channels.sort((a: any, b: any) => a.position - b.position),
      }));

    // Map roles (exclude @everyone which is id "0" in templates)
    const roles = (guild.roles || [])
      .filter((r: any) => r.id !== 0 && r.name !== '@everyone')
      .sort((a: any, b: any) => (b.position ?? 0) - (a.position ?? 0))
      .map((r: any) => ({
        name: r.name,
        color: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : null,
        hoist: r.hoist ?? false,
      }));

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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
