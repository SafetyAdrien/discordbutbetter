import type { SVGProps } from 'react';
import { createDiscordIcon } from './discord/createDiscordIcon';
import { diHeadphones } from './discord/discordIconData';

/** Icone de la planche Discord 2026 (Headphones), meme API qu'un <svg>. */
const Icon = createDiscordIcon(diHeadphones, 'DiscordHeadphones');

export function DiscordHeadphones(props: SVGProps<SVGSVGElement>) {
  return <Icon {...props} />;
}
