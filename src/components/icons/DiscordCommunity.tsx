import { useId, type SVGProps } from "react";
import { DISCORD_ICON_SIZE_PX } from "@/lib/icon-config";

/*
 * Badge "Communaute" de Discord : rosette festonnee claire avec une maison
 * evidee (on voit le fond au travers, y compris la pastille de survol de
 * l'en-tete). `houseClassName` dessine au contraire une maison pleine, pour
 * les endroits ou le badge est pose sur un fond colore (message systeme).
 */
export function DiscordCommunity({ houseClassName, size = DISCORD_ICON_SIZE_PX, ...props }: SVGProps<SVGSVGElement> & { houseClassName?: string; size?: number | string }) {
  const maskId = `community-house-${useId().replace(/:/g, "")}`;
  const resolvedSize = typeof size === 'number' ? size : DISCORD_ICON_SIZE_PX;
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props} width={resolvedSize} height={resolvedSize}>
      {houseClassName ? (
        <>
          <path d="M23.10 12.00 L22.96 12.72 L22.56 13.39 L22.00 13.99 L21.42 14.52 L20.92 15.03 L20.59 15.56 L20.45 16.17 L20.44 16.88 L20.48 17.67 L20.45 18.48 L20.25 19.24 L19.85 19.85 L19.24 20.25 L18.48 20.45 L17.67 20.48 L16.88 20.44 L16.17 20.45 L15.56 20.59 L15.03 20.92 L14.52 21.42 L13.99 22.00 L13.39 22.56 L12.72 22.96 L12.00 23.10 L11.28 22.96 L10.61 22.56 L10.01 22.00 L9.48 21.42 L8.97 20.92 L8.44 20.59 L7.83 20.45 L7.13 20.44 L6.33 20.48 L5.52 20.45 L4.76 20.25 L4.15 19.85 L3.75 19.24 L3.55 18.48 L3.52 17.67 L3.56 16.88 L3.55 16.17 L3.41 15.56 L3.08 15.03 L2.58 14.52 L2.00 13.99 L1.44 13.39 L1.04 12.72 L0.90 12.00 L1.04 11.28 L1.44 10.61 L2.00 10.01 L2.58 9.48 L3.08 8.97 L3.41 8.44 L3.55 7.83 L3.56 7.13 L3.52 6.33 L3.55 5.52 L3.75 4.76 L4.15 4.15 L4.76 3.75 L5.52 3.55 L6.33 3.52 L7.12 3.56 L7.83 3.55 L8.44 3.41 L8.97 3.08 L9.48 2.58 L10.01 2.00 L10.61 1.44 L11.28 1.04 L12.00 0.90 L12.72 1.04 L13.39 1.44 L13.99 2.00 L14.52 2.58 L15.03 3.08 L15.56 3.41 L16.17 3.55 L16.88 3.56 L17.67 3.52 L18.48 3.55 L19.24 3.75 L19.85 4.15 L20.25 4.76 L20.45 5.52 L20.48 6.33 L20.44 7.12 L20.45 7.83 L20.59 8.44 L20.92 8.97 L21.42 9.48 L22.00 10.01 L22.56 10.61 L22.96 11.28Z" />
          <path d="M12 6.6 6.4 11.3c-.4.3-.1.9.4.9h.9v4.6c0 .4.3.6.6.6h2.4v-3.2h2.6v3.2h2.4c.3 0 .6-.2.6-.6v-4.6h.9c.5 0 .8-.6.4-.9L12 6.6Z" className={houseClassName} />
        </>
      ) : (
        <>
          <mask id={maskId}>
            <rect width="24" height="24" fill="white" />
            <path d="M12 6.6 6.4 11.3c-.4.3-.1.9.4.9h.9v4.6c0 .4.3.6.6.6h2.4v-3.2h2.6v3.2h2.4c.3 0 .6-.2.6-.6v-4.6h.9c.5 0 .8-.6.4-.9L12 6.6Z" fill="black" />
          </mask>
          <path mask={`url(#${maskId})`} d="M23.10 12.00 L22.96 12.72 L22.56 13.39 L22.00 13.99 L21.42 14.52 L20.92 15.03 L20.59 15.56 L20.45 16.17 L20.44 16.88 L20.48 17.67 L20.45 18.48 L20.25 19.24 L19.85 19.85 L19.24 20.25 L18.48 20.45 L17.67 20.48 L16.88 20.44 L16.17 20.45 L15.56 20.59 L15.03 20.92 L14.52 21.42 L13.99 22.00 L13.39 22.56 L12.72 22.96 L12.00 23.10 L11.28 22.96 L10.61 22.56 L10.01 22.00 L9.48 21.42 L8.97 20.92 L8.44 20.59 L7.83 20.45 L7.13 20.44 L6.33 20.48 L5.52 20.45 L4.76 20.25 L4.15 19.85 L3.75 19.24 L3.55 18.48 L3.52 17.67 L3.56 16.88 L3.55 16.17 L3.41 15.56 L3.08 15.03 L2.58 14.52 L2.00 13.99 L1.44 13.39 L1.04 12.72 L0.90 12.00 L1.04 11.28 L1.44 10.61 L2.00 10.01 L2.58 9.48 L3.08 8.97 L3.41 8.44 L3.55 7.83 L3.56 7.13 L3.52 6.33 L3.55 5.52 L3.75 4.76 L4.15 4.15 L4.76 3.75 L5.52 3.55 L6.33 3.52 L7.12 3.56 L7.83 3.55 L8.44 3.41 L8.97 3.08 L9.48 2.58 L10.01 2.00 L10.61 1.44 L11.28 1.04 L12.00 0.90 L12.72 1.04 L13.39 1.44 L13.99 2.00 L14.52 2.58 L15.03 3.08 L15.56 3.41 L16.17 3.55 L16.88 3.56 L17.67 3.52 L18.48 3.55 L19.24 3.75 L19.85 4.15 L20.25 4.76 L20.45 5.52 L20.48 6.33 L20.44 7.12 L20.45 7.83 L20.59 8.44 L20.92 8.97 L21.42 9.48 L22.00 10.01 L22.56 10.61 L22.96 11.28Z" />
        </>
      )}
    </svg>
  );
}
