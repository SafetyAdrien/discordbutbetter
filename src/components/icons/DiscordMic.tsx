import type { SVGProps } from 'react';
import { createDiscordIcon } from './discord/createDiscordIcon';
import { diMicAlt } from './discord/discordIconData';

/** Icone de la planche Discord 2026 (MicAlt), meme API qu'un <svg>. */
const Icon = createDiscordIcon(diMicAlt, 'DiscordMic');

export function DiscordMic(props: SVGProps<SVGSVGElement>) {
  return <Icon {...props} />;
}
