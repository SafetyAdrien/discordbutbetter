import { forwardRef, useId, type CSSProperties, type SVGProps } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DISCORD_ICON_SIZE_PX, hasSizeClass, resolveIconSize } from '@/lib/icon-config';
import type { DiscordIconData } from './discordIconData';

/*
 * Fabrique un composant d'icone a partir d'une icone de la planche Discord.
 * Memes props que lucide-react (size, className, strokeWidth ignore...) pour
 * pouvoir remplacer une icone lucide sans toucher a l'appelant.
 *
 * Alignement strict des tailles : la taille reelle de l'icone Discord
 * canonique (20px, token `md`) est la valeur par defaut et toute taille
 * explicite (nombre en px ou token 'xs'..'xl') est resolue via
 * `resolveIconSize`. Priorite : prop `size` explicite (style inline) >
 * classe de taille de l'appelant (`w-*`/`h-*`/`size-*`, taille mesuree
 * pour son contexte sur les references) > taille canonique (20px).
 */

export interface DiscordIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
}

export function createDiscordIcon(data: DiscordIconData, displayName: string, opts: { rotate?: 90 | 180 | 270; flip?: boolean } = {}): LucideIcon {
  const [x, y, w, h] = data.vb.split(' ').map(Number);
  const transform = opts.rotate || opts.flip
    ? `${opts.rotate ? `rotate(${opts.rotate} ${x + w / 2} ${y + h / 2})` : ''}${opts.flip ? ` translate(${2 * x + w} 0) scale(-1 1)` : ''}`
    : null;
  const hasIds = data.body.includes(' id="');
  const Icon = forwardRef<SVGSVGElement, DiscordIconProps>(
    ({ size, className, strokeWidth, absoluteStrokeWidth, color, style, ...rest }, ref) => {
      const resolvedSize = resolveIconSize(size ?? DISCORD_ICON_SIZE_PX);
      // Taille dictee par les classes de l'appelant, sauf prop `size` explicite.
      const classSized = size === undefined && hasSizeClass(className);
      const uid = useId().replace(/:/g, '');
      // Ids (degrades) rendus uniques par instance : plusieurs icones identiques
      // dans la page ne doivent pas se voler leurs definitions.
      const body = hasIds ? data.body.replace(/id="([^"]+)"/g, `id="$1-${uid}"`).replace(/url\(#([^)]+)\)/g, `url(#$1-${uid})`) : data.body;
      const inner = transform ? `<g transform="${transform}">${body}</g>` : body;
      const resolvedStyle: CSSProperties = {
        ...style,
        ...(classSized ? null : { width: resolvedSize, height: resolvedSize }),
        ...(color ? { color } : null),
      };
      return (
        <svg
          ref={ref}
          xmlns="http://www.w3.org/2000/svg"
          viewBox={data.vb}
          fill="none"
          aria-hidden={rest['aria-label'] ? undefined : true}
          {...rest}
          className={cn('shrink-0', className)}
          style={resolvedStyle}
          width={resolvedSize}
          height={resolvedSize}
          dangerouslySetInnerHTML={{ __html: inner }}
        />
      );
    },
  );
  Icon.displayName = displayName;
  return Icon as unknown as LucideIcon;
}
