import { onScopeUserChange } from '@/lib/userScope';
import { supabase } from '@/integrations/supabase/client';

/*
 * Emojis de serveur dans le texte. Un emoji est ecrit `<:nom:serveur/fichier.png>` (`<a:...>` s'il est anime) :
 * le chemin du fichier dans le bucket public "server-emojis" suffit a l'afficher, y compris pour quelqu'un qui n'est
 * pas membre du serveur (MP, salons ou l'emoji est cite). Le serveur d'origine se lit dans le chemin.
 */

export const CUSTOM_EMOJI_SOURCE = String.raw`<(a?):([A-Za-z0-9_]{2,32}):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9._-]+)>`;
export const customEmojiRegex = () => new RegExp(CUSTOM_EMOJI_SOURCE, 'g');

const BUCKET = 'server-emojis';
const PUBLIC_MARK = `/object/public/${BUCKET}/`;

export interface CustomEmojiRef {
  name: string;
  animated: boolean;
  /** "serveur/fichier.ext" dans le bucket. */
  path: string;
  serverId: string;
  url: string;
}

export function customEmojiUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export function parseCustomEmoji(animated: string, name: string, path: string): CustomEmojiRef {
  return { name, animated: animated === 'a', path, serverId: path.split('/')[0], url: customEmojiUrl(path) };
}

/** Chemin dans le bucket d'une URL publique d'emoji, ou null si l'image vient d'ailleurs. */
export function emojiPathFromUrl(url: string): string | null {
  const i = url.indexOf(PUBLIC_MARK);
  if (i === -1) return null;
  const path = decodeURIComponent(url.slice(i + PUBLIC_MARK.length).split('?')[0]);
  return /^[0-9a-f-]{36}\/[A-Za-z0-9._-]+$/.test(path) ? path : null;
}

/** Texte a ecrire pour un emoji de serveur (`:nom:` si son image n'est pas dans le bucket public). */
export function emojiToken(e: { name: string; url: string }): string {
  const path = emojiPathFromUrl(e.url);
  if (!path) return `:${e.name}:`;
  return `<${/\.gif$/i.test(path) ? 'a' : ''}:${e.name}:${path}>`;
}

/* Registre des emojis utilisables par l'utilisateur (tous ses serveurs) : sert a convertir `:nom:` ecrit a la main. */
const registry = new Map<string, { name: string; url: string }>();
// Le registre est en memoire : il ne doit jamais survivre au changement de compte.
onScopeUserChange(() => registry.clear());
export function registerEmojis(list: { name: string; url: string }[]) {
  for (const e of list) if (!registry.has(e.name.toLowerCase())) registry.set(e.name.toLowerCase(), e);
}

/** Emoji de serveur connu sous ce nom (insensible a la casse), ou undefined. */
export const lookupEmoji = (name: string) => registry.get(name.toLowerCase());

/** Remplace les `:nom:` qui designent un emoji de serveur connu par son jeton. */
export function resolveShortcodes(text: string): string {
  if (registry.size === 0 || text.indexOf(':') === -1) return text;
  // On n'y touche pas dans les blocs de code, les liens ni a l'interieur d'un jeton deja ecrit.
  return text
    .split(/(```[\s\S]*?```|`[^`\n]*`|<a?:[^>\n]*>|https?:\/\/\S+)/g)
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part.replace(/(?<![\w:]):([A-Za-z0-9_]{2,32}):(?![\w:])/g, (m, name: string) => {
            const e = registry.get(name.toLowerCase());
            return e ? emojiToken(e) : m;
          }),
    )
    .join('');
}

/** Message ne contenant que des emojis (au plus 27) : affiches en grand. */
export function isJumboEmojiOnly(content: string): boolean {
  const stripped = content.replace(customEmojiRegex(), '\u0001').replace(/\s+/g, '');
  if (!stripped) return false;
  const units = stripped.match(/\u0001|\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}️?|[\u{1F3FB}-\u{1F3FF}])*|[\u{1F1E6}-\u{1F1FF}]{2}|[#*0-9]️?⃣/gu);
  return !!units && units.join('') === stripped && units.length <= 27;
}
