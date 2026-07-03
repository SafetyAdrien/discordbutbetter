import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract and validate authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
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
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create authenticated Supabase client using the user's JWT to respect RLS
    const supabaseAuth = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    // First, verify the user has access to this channel by checking RLS
    // This query will fail if the user is not a member of the server
    const { data: channelAccess, error: accessError } = await supabaseAuth
      .from('channels')
      .select('id, server_id')
      .eq('id', channelId)
      .single();

    if (accessError || !channelAccess) {
      console.error('Channel access denied or not found:', accessError);
      return new Response(
        JSON.stringify({ error: 'Channel not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User has access to channel ${channelId} in server ${channelAccess.server_id}`);

    // Use service role client only for operations that need it (saving summaries)
    // but we've already verified access above
    const supabaseService = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch recent messages from the channel (last 100 messages)
    // Use the authenticated client to respect RLS
    const { data: messages, error: messagesError } = await supabaseAuth
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        author_id,
        profiles:author_id (display_name)
      `)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
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

    // Format messages for AI
    const formattedMessages = messages
      .reverse() // Chronological order
      .map((m: any) => `[${m.profiles?.display_name || 'Utilisateur'}]: ${m.content}`)
      .join('\n');

    // Get unique participants
    const participants = [...new Set(messages.map((m: any) => m.profiles?.display_name).filter(Boolean))];

    console.log(`Summarizing ${messages.length} messages from channel ${channelId}`);

    // Call Lovable AI to generate summaries
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
            content: `Tu es un assistant qui analyse des conversations et génère des résumés structurés.
            
Analyse les messages suivants et identifie les principaux sujets de discussion. Pour chaque sujet, génère:
- Un titre court et descriptif (max 5 mots)
- Un résumé concis (1-2 phrases)
- Le nombre approximatif de messages sur ce sujet

Réponds UNIQUEMENT avec un JSON valide dans ce format exact:
{
  "topics": [
    {
      "title": "Titre du sujet",
      "summary": "Résumé du sujet",
      "message_count": 10
    }
  ]
}

Maximum 5 sujets. Si la conversation est trop courte ou sans sujet clair, retourne un tableau vide.`
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
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ summaries: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse AI response
    let topics = [];
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanContent = aiContent.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      
      const parsed = JSON.parse(cleanContent.trim());
      topics = parsed.topics || [];
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, 'Content:', aiContent);
      topics = [];
    }

    // Save summaries to database using service role (since we've already verified access)
    const savedSummaries = [];
    for (const topic of topics) {
      const { data: saved, error: saveError } = await supabaseService
        .from('channel_summaries')
        .insert({
          channel_id: channelId,
          title: topic.title,
          summary: topic.summary,
          message_count: topic.message_count || 0,
          start_message_id: messages[messages.length - 1]?.id,
          end_message_id: messages[0]?.id,
          participants: participants.slice(0, 5), // Limit to 5 participants
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving summary:', saveError);
      } else {
        savedSummaries.push(saved);
      }
    }

    console.log(`Generated ${savedSummaries.length} summaries for channel ${channelId}`);

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
