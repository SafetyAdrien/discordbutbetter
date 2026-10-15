/**
 * Shared CORS helpers for the Supabase edge functions.
 *
 * The functions previously hardcoded `Access-Control-Allow-Origin: '*'` while
 * allowing the `authorization` header. That removes the origin boundary: any
 * page on the internet can drive these endpoints with a bearer token it
 * obtained anywhere (e.g. via an XSS on another origin).
 *
 * `ALLOWED_ORIGINS` should list the app's real origins. When it is empty we
 * fall back to refusing cross-origin browser calls rather than allowing all.
 */
export function corsHeaders(req: Request, allowedOrigins: string[] = allowedOriginList()): Record<string, string> {
  const origin = req.headers.get('Origin');

  // Same-origin / server-to-server calls have no Origin header: allow them.
  const allowOrigin =
    !origin || allowedOrigins.includes(origin) ? origin ?? '*' : null;

  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (allowOrigin) headers['Access-Control-Allow-Origin'] = allowOrigin;
  return headers;
}

export function allowedOriginList(): string[] {
  return (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Standard preflight response. Returns 403 for disallowed origins. */
export function preflight(req: Request): Response {
  const headers = corsHeaders(req);
  if (!headers['Access-Control-Allow-Origin']) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
  return new Response(null, { headers });
}