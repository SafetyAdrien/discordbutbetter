import { useState } from 'react';
import { cn } from '@/lib/utils';

/* "Salon de spoiler" : le contenu reste flou jusqu'a ce que la personne choisisse de l'afficher (clic ou Entree). */
export function SpoilerGate({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = useState(false);
  if (shown) return <>{children}</>;
  return (
    <button
      type="button"
      onClick={() => setShown(true)}
      aria-label="Afficher le message masqué (spoiler)"
      className={cn('relative block text-left rounded-md overflow-hidden cursor-pointer')}
    >
      <span aria-hidden className="block select-none blur-[6px] pointer-events-none">{children}</span>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold uppercase tracking-wide text-white bg-black/30">Spoiler</span>
    </button>
  );
}
