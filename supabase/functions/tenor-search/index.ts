import { corsHeaders } from "@supabase/supabase-js/cors";

const TENOR_API_BASE = "https://tenor.googleapis.com/v2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("TENOR_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "TENOR_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const url = new URL(req.url);
    const query = url.searchParams.get("q")?.trim() ?? "";
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "24", 10) || 24, 50);
    const pos = url.searchParams.get("pos") ?? "";

    const endpoint = query ? "search" : "featured";
    const params = new URLSearchParams({
      key: apiKey,
      client_key: "lovable-discord",
      limit: String(limit),
      media_filter: "gif,tinygif",
      contentfilter: "high",
    });
    if (query) params.set("q", query);
    if (pos) params.set("pos", pos);

    const tenorRes = await fetch(`${TENOR_API_BASE}/${endpoint}?${params.toString()}`);
    if (!tenorRes.ok) {
      const text = await tenorRes.text();
      return new Response(
        JSON.stringify({ error: "Tenor request failed", detail: text }),
        { status: tenorRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const data = await tenorRes.json();

    const results = (data.results ?? []).map((item: any) => {
      const gif = item.media_formats?.gif;
      const tinygif = item.media_formats?.tinygif;
      return {
        id: item.id,
        title: item.content_description ?? item.title ?? "",
        url: gif?.url ?? tinygif?.url,
        preview: tinygif?.url ?? gif?.url,
        width: gif?.dims?.[0] ?? null,
        height: gif?.dims?.[1] ?? null,
      };
    }).filter((r: any) => r.url);

    return new Response(
      JSON.stringify({ results, next: data.next ?? null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("tenor-search error", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
