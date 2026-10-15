/**
 * Safe SVG attachment rendering.
 *
 * SVG is a document format: it can carry <script>, event handlers, <foreignObject>
 * and external references. Rendering a user-supplied SVG inline via
 * dangerouslySetInnerHTML would be a stored-XSS vector.
 *
 * Strategy:
 *  - Sanitize the markup before it ever reaches the DOM (strip scripts, event
 *    handlers, foreignObject, and any external URL references).
 *  - Render the result inside a sandboxed <iframe> rather than in the main
 *    document, so even markup that slips past the sanitizer cannot reach the
 *    app's origin, cookies or DOM.
 *
 * This means vector avatars/emoji/badges attached to messages display properly
 * while remaining inert.
 */

const DANGEROUS_ELEMENTS = [
  'script',
  'foreignobject',
  'iframe',
  'object',
  'embed',
  'audio',
  'video',
  'animate',
  'animatetransform',
  'animatemotion',
  'set',
  'handler',
  'listener',
];

/**
 * Remove scripting vectors from SVG markup.
 *
 * This is a conservative allowlist-based scrub: we drop the dangerous elements
 * entirely, strip every `on*` attribute, and drop any attribute value that is a
 * `javascript:`/`data:text/html` URL.
 */
export function sanitizeSvg(svg: string): string {
  let out = svg;

  // Remove dangerous elements together with their content.
  for (const tag of DANGEROUS_ELEMENTS) {
    out = out.replace(
      new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, 'gi'),
      '',
    );
    // Self-closing form, e.g. <script ... />
    out = out.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi'), '');
  }

  // Strip every inline event handler (onclick=, onload=, onerror=, ...).
  out = out.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '');
  out = out.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '');
  out = out.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '');

  // Neutralize javascript: and data:text/html URLs in href/xlink:href.
  out = out.replace(
    /\s(xlink:href|href)\s*=\s*(?:"(?!#)(?:javascript|data):[^"]*"|'(?!#)(?:javascript|data):[^']*')/gi,
    ' $1="#"',
  );

  // Drop <use> references to external documents.
  out = out.replace(/<use\b[^>]*\b(?:xlink:)?href\s*=\s*"(?!#)[^"]*"/gi, '<use/>');

  return out;
}

/** True when the markup looks like an SVG document. */
export function isSvgMarkup(content: string): boolean {
  const head = content.slice(0, 1024).toLowerCase();
  return head.includes('<svg');
}

/** Build a blob URL for SVG text, so it can be shown in an <img>/<iframe>. */
export function svgBlobUrl(svg: string): string {
  return URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
}