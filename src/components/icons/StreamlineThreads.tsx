import { createDiscordIcon } from './discord/createDiscordIcon';
import { diThreads } from './discord/discordIconData';

interface StreamlineThreadsProps {
  className?: string;
  size?: number | string;
}

const ThreadsIcon = createDiscordIcon(diThreads, 'Threads');

/** Icone "fils" de la planche Discord 2026. */
const StreamlineThreads: React.FC<StreamlineThreadsProps> = ({ className, size }) => <ThreadsIcon className={className} size={size} />;

export default StreamlineThreads;
