import { StatusEmoji } from '@/components/profile/StatusEmoji';
import { cn } from '@/lib/utils';

/*
 * Emoji d'un tag ou de la reaction par defaut d'un post : caractere unicode, ou emoji personnalise d'un serveur
 * (stocke sous la forme `:nom:`) affiche comme image. Sans ce rendu, un emoji de serveur apparaissait en texte brut
 * (« :nomEmoji: ») et debordait du champ ou de la pastille.
 */
export function ForumEmoji({ emoji, className }: { emoji: string; className?: string }) {
  return <StatusEmoji emoji={emoji} className={cn('h-[1.1em] w-[1.1em] text-[1.05em] text-center', className)} />;
}
