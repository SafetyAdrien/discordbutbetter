import { cn } from '@/lib/utils';

/*
 * "+" de la barre de saisie, dessine d'apres la reference (video 1,2x) : bras de ~17 px, trait de ~1,7 px, bouts francs.
 * Le glyphe Discord generique est nettement plus epais (environ 2,9 px).
 */
export function ComposerPlus({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={cn('w-5 h-5', className)} fill="none" stroke="currentColor" strokeWidth={1.7}>
      <path d="M10 1.65V18.35M1.65 10H18.35" />
    </svg>
  );
}
