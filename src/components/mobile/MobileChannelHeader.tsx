import { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { StreamlineHash } from '@/components/icons/StreamlineHash';
import { StreamlineVoice } from '@/components/icons/StreamlineVoice';
import { StreamlineForum } from '@/components/icons/StreamlineForum';
import { StreamlineMegaphone } from '@/components/icons/StreamlineMegaphone';
import { StreamlineMedia } from '@/components/icons/StreamlineMedia';
import { StreamlineCalendar } from '@/components/icons/StreamlineCalendar';
import { StreamlineTasks } from '@/components/icons/StreamlineTasks';
import { StreamlineStage } from '@/components/icons/StreamlineStage';

const channelIcons: Record<string, React.ElementType> = {
  text: StreamlineHash,
  voice: StreamlineVoice,
  forum: StreamlineForum,
  announcement: StreamlineMegaphone,
  media: StreamlineMedia,
  calendar: StreamlineCalendar,
  tasks: StreamlineTasks,
  stage: StreamlineStage,
};

interface Props {
  channelName: string;
  channelType: string;
  onlineCount?: number;
  onBack: () => void;
  onOpenDetails?: () => void;
  rightSlot?: ReactNode;
}

/**
 * Unified mobile channel header used by text, voice and stage channels.
 * Visually mirrors the chat header (back + icon + name + chevron + online count + right actions).
 */
export function MobileChannelHeader({
  channelName,
  channelType,
  onlineCount,
  onBack,
  onOpenDetails,
  rightSlot,
}: Props) {
  const Icon = channelIcons[channelType] || StreamlineHash;

  return (
    <div
      className="min-h-16 py-2 px-1.5 flex items-center gap-1 bg-[hsl(var(--surface-1))] flex-shrink-0 rounded-b-2xl"
      style={{ boxShadow: 'var(--shadow-elevation-1)' }}
    >
      <button
        onClick={onBack}
        aria-label="Retour"
        title="Retour"
        className="p-2 rounded-full active:bg-primary/10 transition-all duration-200 flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        type="button"
        onClick={onOpenDetails}
        className="flex-1 min-w-0 flex items-center gap-2.5 px-1 py-1.5 rounded-xl active:bg-primary/8 transition-colors text-left"
        aria-label={`Détails du salon ${channelName}`}
      >
        <div className="w-9 h-9 rounded-full bg-muted/40 flex items-center justify-center flex-shrink-0">
          <Icon className="w-[22px] h-[22px] text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-center gap-0.5 min-w-0">
            <h2 className="font-semibold text-sm truncate">{channelName}</h2>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 -ml-0.5" />
          </div>
          {typeof onlineCount === 'number' && (
            <div className="flex items-center gap-1 mt-0.5 text-[11px] text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--online))]" />
              <span className="tabular-nums">{onlineCount}</span>
              <span>En ligne</span>
            </div>
          )}
        </div>
      </button>

      {rightSlot && <div className="flex items-center gap-1 flex-shrink-0">{rightSlot}</div>}
    </div>
  );
}
