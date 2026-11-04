import { Lock } from '@/components/icons/discord/lucide';
import type { ForumTag } from '@/hooks/useForumTags';
import { cn } from '@/lib/utils';
import { ForumEmoji } from './ForumEmoji';

/*
 * Pastille de tag (videos de reference) : emoji eventuel + nom, fond gris ;
 * selectionnee, contour et texte bleutes. Les tags moderes portent un cadenas.
 */
export function ForumTagChip({
  tag,
  selected = false,
  onClick,
  size = 'md',
  className,
}: {
  tag: Pick<ForumTag, 'name' | 'emoji_name' | 'moderated'>;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const Comp = onClick ? 'button' : 'span';
  return (
    <Comp
      {...(onClick ? { type: 'button' as const, onClick, 'aria-pressed': selected } : {})}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap transition-colors',
        size === 'sm' ? 'h-5 px-2 text-xs' : 'h-7 px-3 text-sm',
        selected
          ? 'bg-[#5865f2]/20 text-[#c9cdfb] ring-[1.5px] ring-inset ring-[#5865f2]'
          : 'bg-[hsl(var(--button-secondary))] text-white ring-1 ring-inset ring-transparent',
        onClick && !selected && 'hover:ring-white/20',
        className,
      )}
    >
      {tag.emoji_name && <ForumEmoji emoji={tag.emoji_name} className={size === 'sm' ? 'text-[11px]' : 'text-sm'} />}
      <span translate="no">{tag.name}</span>
      {tag.moderated && <Lock className={size === 'sm' ? 'w-2.5 h-2.5 opacity-70' : 'w-3 h-3 opacity-70'} />}
    </Comp>
  );
}
