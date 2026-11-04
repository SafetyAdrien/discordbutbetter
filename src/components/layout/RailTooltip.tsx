import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

/*
 * Infobulle du rail de serveurs (videos de reference) : meme bulle que les
 * autres infobulles mais plus grande (texte 15px / 600, 8px de marge haute et
 * basse), a droite de la tuile avec la pointe vers elle. Les noms de dossier
 * se replient a ~180px de large.
 */
export function RailTooltipContent({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        side="right"
        sideOffset={12}
        className={cn(
          'z-[9999] max-w-[180px] rounded-lg border border-[color:var(--tooltip-border)] bg-[hsl(var(--tooltip-bg))] px-3 py-2 text-[15px] leading-[19px] text-[hsl(var(--tooltip-fg))] shadow-[0_8px_16px_rgba(0,0,0,0.24)]',
          'animate-in fade-in-0 duration-75 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-75',
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow width={10} height={5} className="fill-[hsl(var(--tooltip-bg))]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}
