import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ServerBadgeIcon } from '@/components/icons/ServerBadgeIcon';

/*
 * Badge devant le nom d'un serveur de communaute (video de reference) :
 * rosette claire, et au survol une carte centree "Serveur de communaute"
 * suivie de qui peut rejoindre le serveur. Les variantes de Discord liees aux
 * boosts (rosette rose + bandeau "Niveau | boosts") et aux partenaires
 * (rosette bleue) n'existent pas dans l'app.
 */
export function ServerHeaderBadge({ isPublic, className }: { isPublic: boolean; className?: string }) {
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <span className={cn("shrink-0 inline-flex", className)} aria-label="Serveur de communauté">
          <ServerBadgeIcon discoverable={isPublic} className="w-5 h-5" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={10} className="w-[232px] px-3 py-2.5 text-center">
        <p className="text-sm font-bold text-white">Serveur de communauté</p>
        <p className="mt-0.5 text-sm leading-[18px] text-[hsl(var(--muted-foreground))]">
          {isPublic
            ? 'Tout le monde peut rejoindre ce serveur.'
            : "Seules les personnes qui ont un lien d'invitation peuvent rejoindre ce serveur."}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
