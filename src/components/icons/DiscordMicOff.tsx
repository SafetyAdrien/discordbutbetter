import type { SVGProps } from 'react';
import { createDiscordIcon } from './discord/createDiscordIcon';
import { diMicSlash } from './discord/discordIconData';

/** Icone de la planche Discord 2026 (MicSlash), meme API qu'un <svg>. */
const Icon = createDiscordIcon(diMicSlash, 'DiscordMicOff');

export function DiscordMicOff(props: SVGProps<SVGSVGElement>) {
  return <Icon {...props} />;
}
