const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function extractMeta(html: string, property: string): string | null {
  // Try og: / twitter: property attribute
  const propRegex = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i');
  const match = propRegex.exec(html);
  if (match) return match[1];
  // Try reversed order: content before property
  const revRegex = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i');
  const revMatch = revRegex.exec(html);
  if (revMatch) return revMatch[1];
  return null;
}

function extractTitle(html: string): string | null {
  const match = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  return match ? match[1].trim() : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let response: Response;
    try {
      response = await fetch(parsedUrl.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DiscordBot/2.0)',
          'Accept': 'text/html',
        },
      });
    } catch (e) {
      clearTimeout(timeout);
      return new Response(JSON.stringify({ error: 'Failed to fetch URL' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    clearTimeout(timeout);

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `HTTP ${response.status}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only process HTML
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return new Response(JSON.stringify({ error: 'Not an HTML page' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    // Extract metadata
    const title = extractMeta(html, 'og:title') || extractMeta(html, 'twitter:title') || extractTitle(html);
    const description = extractMeta(html, 'og:description') || extractMeta(html, 'twitter:description') || extractMeta(html, 'description');
    const image = extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image');
    const siteName = extractMeta(html, 'og:site_name') || parsedUrl.hostname;
    const themeColor = extractMeta(html, 'theme-color');

    // Resolve relative image URL
    let resolvedImage = image;
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

    // Don't return empty metadata
    if (!metadata.title && !metadata.description && !metadata.image) {
      return new Response(JSON.stringify({ error: 'No metadata found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(metadata), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
