import { createDiscordIcon } from './discord/createDiscordIcon';
import { diSummaries } from './discord/discordIconData';

interface StreamlineSummariesProps {
  className?: string;
}

const SummariesIcon = createDiscordIcon(diSummaries, 'Summaries');

/** Icone "resumes" de la planche Discord 2026. */
export default function StreamlineSummaries({ className }: StreamlineSummariesProps) {
  return <SummariesIcon className={className} />;
}
