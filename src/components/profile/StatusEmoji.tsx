import { useAllServerAssets } from '@/hooks/useAllServerAssets';
import { splitCustomStatus } from '@/lib/customStatus';
import { cn } from '@/lib/utils';

/*
 * Emoji d'un statut personnalise : caractere unicode tel quel, ou `:nom:` resolu
 * parmi les emojis des serveurs de l'utilisateur (meme source que le selecteur).
 */
export function StatusEmoji({ emoji, className }: { emoji: string; className?: string }) {
  const custom = emoji.startsWith(':') && emoji.endsWith(':');
  const { emojis } = useAllServerAssets(custom);
  if (!emoji) return null;
  if (!custom) {
    return (
      <span aria-hidden className={cn('inline-block shrink-0 leading-none align-middle', className)} style={{ fontFamily: '"Twemoji Mozilla","Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif' }}>
        {emoji}
      </span>
    );
  }
  const name = emoji.slice(1, -1);
  const found = emojis.find((e) => e.name === name);
  if (!found) return <span className={cn('shrink-0 text-muted-foreground', className)}>{emoji}</span>;
  return <img src={found.url} alt={emoji} draggable={false} className={cn('inline-block shrink-0 object-contain align-middle', className)} />;
}

/** Texte d'un statut personnalise sur une ligne (liste des membres) : emoji puis texte. */
export function MemberStatusText({ value }: { value: string }) {
  const { emoji, text } = splitCustomStatus(value);
  return (
    <>
      {emoji && <StatusEmoji emoji={emoji} className="w-4 h-4 mr-1 text-[13px]" />}
      {text}
    </>
  );
}
