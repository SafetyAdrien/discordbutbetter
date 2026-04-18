import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Force a title to land in the 20-30 chars window
function normalizeTitle(raw: string): string {
  let t = (raw || '').trim().replace(/\s+/g, ' ');
  if (t.length > 30) t = t.slice(0, 30).trimEnd();
  if (t.length < 20) {
    // Pad with a soft suffix so we hit the minimum without lying about content
    const pad = ' (discussion)';
    if (t.length === 0) t = 'Discussion du salon';
    if ((t + pad).length <= 30 && t.length < 20) t = (t + pad).slice(0, 30);
    while (t.length < 20) t = t + '.';
  }
  return t;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { channelId } = await req.json();
    if (!channelId) {
      return new Response(
        JSON.stringify({ error: 'channelId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuth = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: channelAccess, error: accessError } = await supabaseAuth
      .from('channels')
      .select('id, server_id')
      .eq('id', channelId)
      .single();

    if (accessError || !channelAccess) {
      return new Response(
        JSON.stringify({ error: 'Channel not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseService = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { data: messages, error: messagesError } = await supabaseAuth
      .from('messages')
      .select(`id, content, created_at, author_id, profiles:author_id (display_name)`)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (messagesError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch messages' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ summaries: [], message: 'No messages to summarize' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Chronological order; index = position in this array (used for first_message_index)
    const ordered = [...messages].reverse();
    const formattedMessages = ordered
      .map((m: any, i: number) => `[#${i}] [${m.profiles?.display_name || 'Utilisateur'}]: ${m.content}`)
      .join('\n');

    const participants = [...new Set(ordered.map((m: any) => m.profiles?.display_name).filter(Boolean))];

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Tu es un assistant qui analyse des conversations et identifie les SUJETS PRÉCIS abordés.

Chaque message est préfixé par son index sous la forme [#N]. Pour chaque sujet distinct détecté :
- "title" : le sujet PRÉCIS (pas générique). Évite "Discussion technique", préfère "Bug login Google OAuth", "Sortie de Cyberpunk 2", "Choix du serveur vocal". Le titre DOIT faire entre 20 et 30 caractères (espaces compris). Pas de guillemets, pas d'emoji.
- "summary" : 1-2 phrases factuelles décrivant ce qui a été dit.
- "message_count" : nombre approximatif de messages liés à ce sujet.
- "first_message_index" : l'index N (entier) du PREMIER message [#N] qui lance ce sujet.

Réponds UNIQUEMENT avec un JSON valide :
{
  "topics": [
    { "title": "...", "summary": "...", "message_count": 10, "first_message_index": 0 }
  ]
}

Maximum 5 sujets. Si rien de notable, retourne { "topics": [] }.`
          },
          {
            role: 'user',
            content: `Voici les messages à analyser:\n\n${formattedMessages}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      return new Response(
        JSON.stringify({ summaries: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let topics: any[] = [];
    try {
      let cleanContent = aiContent.trim();
      if (cleanContent.startsWith('```json')) cleanContent = cleanContent.slice(7);
      else if (cleanContent.startsWith('```')) cleanContent = cleanContent.slice(3);
      if (cleanContent.endsWith('```')) cleanContent = cleanContent.slice(0, -3);
      const parsed = JSON.parse(cleanContent.trim());
      topics = parsed.topics || [];
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, 'Content:', aiContent);
      topics = [];
    }

    const savedSummaries = [];
    for (const topic of topics) {
      const idx = Number.isInteger(topic.first_message_index) ? topic.first_message_index : 0;
      const safeIdx = Math.max(0, Math.min(idx, ordered.length - 1));
      const startMessageId = ordered[safeIdx]?.id ?? ordered[0]?.id;

      const { data: saved, error: saveError } = await supabaseService
        .from('channel_summaries')
        .insert({
          channel_id: channelId,
          title: normalizeTitle(topic.title),
          summary: topic.summary,
          message_count: topic.message_count || 0,
          start_message_id: startMessageId,
          end_message_id: ordered[ordered.length - 1]?.id,
          participants: participants.slice(0, 5),
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving summary:', saveError);
      } else {
        savedSummaries.push(saved);
      }
    }

    return new Response(
      JSON.stringify({ summaries: savedSummaries }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in summarize-channel function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
