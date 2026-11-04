import { Hash, Volume2, Megaphone } from '@/components/icons/discord/lucide';
import StreamlineThreads from '@/components/icons/StreamlineThreads';
import { cn } from '@/lib/utils';

export function channelGlyph(type: string | null | undefined, className = 'w-4 h-4') {
  if (type === 'voice' || type === 'stage') return <Volume2 className={className} />;
  if (type === 'announcement') return <Megaphone className={className} />;
  return <Hash className={className} />;
}

/** Tuile de 40px : icone du serveur (ou initiales) avec une pastille du type de salon en bas a droite. */
export function SourceTile({ iconUrl, label, badge, className }: { iconUrl?: string | null; label: string; badge?: React.ReactNode; className?: string }) {
  return (
    <span className={cn('relative inline-flex h-10 w-10 shrink-0', className)}>
      {iconUrl ? (
        <img src={iconUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
      ) : (
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4a4a54] text-[13px] font-semibold text-[#dbdee1]">{label.slice(0, 2).toUpperCase()}</span>
      )}
      {badge && <span className="absolute -bottom-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#3b3b45] text-[#dbdee1] ring-2 ring-[#3b3b45] [&>svg]:h-3 [&>svg]:w-3">{badge}</span>}
    </span>
  );
}

export const ThreadGlyph = ({ className = 'w-5 h-5' }: { className?: string }) => <StreamlineThreads className={className} />;
