import type { SVGProps } from 'react';
import { createDiscordIcon } from './discord/createDiscordIcon';
import { diInbox } from './discord/discordIconData';

/** Boite de reception (planche Discord 2026). 23px = 19px d'encre, comme Discord. */
const Icon = createDiscordIcon(diInbox, 'DiscordInbox');

export function DiscordInbox(props: SVGProps<SVGSVGElement>) {
  return <Icon {...props} />;
}
