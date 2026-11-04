import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import StreamlineThreads from '@/components/icons/StreamlineThreads';

/* Bouton "Voir le fil" de la barre de survol du message d'annonce d'un fil (video de reference). */
export function ViewThreadButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Voir le fil"
          onClick={onClick}
          className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md text-[#b5bac1] hover:bg-white/[0.08] hover:text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#5b63e4]"
        >
          <StreamlineThreads className="w-5 h-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">Voir le fil</TooltipContent>
    </Tooltip>
  );
}
