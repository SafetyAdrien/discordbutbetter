import type { SVGProps } from 'react';
import { createDiscordIcon } from './discord/createDiscordIcon';
import { diSettings } from './discord/discordIconData';

/** Icone de la planche Discord 2026 (Settings), meme API qu'un <svg>. */
const Icon = createDiscordIcon(diSettings, 'DiscordSettings');

export function DiscordSettings(props: SVGProps<SVGSVGElement>) {
  return <Icon {...props} />;
}
