import { cn } from '@/lib/utils';

/** Barre verte d'insertion de 3px dans l'espace entre deux tuiles (n'ecarte pas la liste). */
export function DropBar({ edge, wide }: { edge: 'before' | 'after'; wide?: boolean }) {
  return (
    <div
      className={cn(
        'absolute left-1/2 -translate-x-1/2 z-30 h-1 rounded-full bg-[hsl(var(--dnd-line))] pointer-events-none',
        'w-[60px]',
        edge === 'before' ? '-top-[6px]' : '-bottom-[6px]',
      )}
    />
  );
}

/** Pastille verte au bord gauche d'une cible de regroupement. */
export function MergeDot({ className }: { className?: string }) {
  return <span className={cn('absolute -left-[7px] top-1/2 -translate-y-1/2 w-[15px] h-[15px] rounded-full bg-[hsl(var(--dnd-line))] pointer-events-none z-10', className)} />;
}

