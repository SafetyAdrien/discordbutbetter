import type { SVGProps } from 'react';
import { createDiscordIcon } from './discord/createDiscordIcon';
import { diHeadphonesSlash } from './discord/discordIconData';

/** Icone de la planche Discord 2026 (HeadphonesSlash), meme API qu'un <svg>. */
const Icon = createDiscordIcon(diHeadphonesSlash, 'DiscordHeadphonesOff');

export function DiscordHeadphonesOff(props: SVGProps<SVGSVGElement>) {
  return <Icon {...props} />;
}
