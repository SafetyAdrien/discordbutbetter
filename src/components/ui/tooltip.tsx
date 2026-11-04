import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipPortal = TooltipPrimitive.Portal;

/*
 * Infobulle (videos de reference) : bulle de 8px de rayon, fond #393a41 et
 * filet a 6% de blanc (blanc + ombre en theme clair), texte 14px / 500 avec
 * 12px de marge laterale, petite pointe vers la cible. Apparition quasi
 * instantanee : fondu de ~70 ms, sans zoom ni glissement.
 */
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & { arrow?: boolean }
>(({ className, sideOffset = 8, arrow = true, children, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      collisionPadding={8}
      className={cn(
        "z-[9999] rounded-lg border border-[color:var(--tooltip-border)] bg-[hsl(var(--tooltip-bg))] px-3 py-[5px] text-sm font-medium leading-[18px] text-[hsl(var(--tooltip-fg))] shadow-[0_8px_16px_rgba(0,0,0,0.24)] animate-in fade-in-0 duration-75 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-75",
        className,
      )}
      {...props}
    >
      {children}
      {arrow && <TooltipPrimitive.Arrow width={10} height={5} className="fill-[hsl(var(--tooltip-bg))]" />}
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/** Raccourci clavier sous le titre ("Retour" + ALT ←) : pastilles de 20px. */
function TooltipShortcut({ keys }: { keys: string[] }) {
  return (
    <div className="mt-1.5 flex items-center justify-center gap-1">
      {keys.map((k) => (
        <kbd
          key={k}
          className="h-5 min-w-[22px] px-1.5 rounded bg-black/20 border border-white/[0.06] text-[11px] font-bold leading-5 text-center text-[hsl(var(--tooltip-fg))] font-sans"
        >
          {k}
        </kbd>
      ))}
    </div>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, TooltipPortal, TooltipShortcut };
