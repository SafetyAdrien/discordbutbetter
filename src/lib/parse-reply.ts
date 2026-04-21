/**
 * Utility to parse reply citations from message content.
 *
 * The current storage format embeds the reply as a markdown blockquote
 * at the very beginning of the message:
 *
 *   > **AuthorName:** Quoted preview...\n\n{actual body}
 *
 * This helper extracts the citation metadata so the UI can render a
 * dedicated `<RepliedLine />` component instead of a raw blockquote.
 */

export interface ParsedReply {
  reply: { author: string; preview: string } | null;
  body: string;
}

// Matches:  > **Author:** preview text\n<body>  OR  > **Author** : preview text\n<body>
// - Author cannot contain ":" or "*"
// - Colon may be inside or outside the bold marker
// - Allows ASCII ":" or fullwidth "："
// - Preview is the rest of the first line
// - Body is everything after one or more newlines
const REPLY_PATTERN = /^>\s\*\*([^:*\n]+?)\*\*\s*[:：]\s([^\n]+)\n+([\s\S]+)$/;

export function parseRepliedMessage(content: string): ParsedReply {
  if (!content) return { reply: null, body: content ?? "" };
  const match = content.match(REPLY_PATTERN);
  if (!match) return { reply: null, body: content };
  const [, author, rawPreview, body] = match;
  // Strip trailing "..." that the sender appended when truncating.
  const preview = rawPreview.replace(/\.{3,}$/, "").trim();
  return {
    reply: { author: author.trim(), preview },
    body,
  };
}
