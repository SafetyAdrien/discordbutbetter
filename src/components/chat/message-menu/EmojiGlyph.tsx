import { cn } from '@/lib/utils';
import { useAllServerAssets } from '@/hooks/useAllServerAssets';
import { customEmojiRegex, lookupEmoji, parseCustomEmoji } from '@/lib/customEmoji';

/** Emoji unicode rendu avec la meme pile de polices que le reste de l'application (Twemoji en premier).
 *  Un emoji de serveur (`<:nom:id/fichier.png>` ou `:nom:`) est rendu uniquement sous forme d'image, jamais avec son nom. */
/** `:nom:` enregistre sans jeton : retrouve l'image dans les emojis de serveur (jamais le nom a l'ecran). */
function ShortcodeGlyph({ name, className }: { name: string; className?: string }) {
  const { emojis } = useAllServerAssets(true);
  const found = lookupEmoji(name) ?? emojis.find((e) => e.name.toLowerCase() === name.toLowerCase());
  return found
    ? <img aria-hidden alt="" src={found.url} draggable={false} className={cn('inline-block h-5 w-5 object-contain', className)} />
    : <span aria-hidden className={cn('inline-block h-5 w-5', className)} />;
}

export function EmojiGlyph({ emoji, className }: { emoji: string; className?: string }) {
  const m = customEmojiRegex().exec(emoji);
  const url: string | null = m ? parseCustomEmoji(m[1], m[2], m[3]).url : null;
  const short = !url ? /^:([A-Za-z0-9_]{2,32}):$/.exec(emoji) : null;
  if (short) return <ShortcodeGlyph name={short[1]} className={className} />;
  if (url) {
    return <img aria-hidden alt="" src={url} draggable={false} className={cn('inline-block h-5 w-5 object-contain', className)} />;
  }
  return (
    <span aria-hidden className={cn('inline-block leading-none', className)} style={{ fontFamily: '"Twemoji Mozilla","Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif' }}>
      {emoji}
    </span>
  );
}
