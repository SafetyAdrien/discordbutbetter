import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronLeft, Settings } from 'lucide-react';
import { StreamlineHash } from '@/components/icons/StreamlineHash';
import { StreamlineVoice } from '@/components/icons/StreamlineVoice';
import { StreamlineForum } from '@/components/icons/StreamlineForum';
import { StreamlineMegaphone } from '@/components/icons/StreamlineMegaphone';
import { StreamlineMedia } from '@/components/icons/StreamlineMedia';
import { StreamlineCalendar } from '@/components/icons/StreamlineCalendar';
import { StreamlineTasks } from '@/components/icons/StreamlineTasks';
import { StreamlineStage } from '@/components/icons/StreamlineStage';
import { useChannelUnreadCounts } from '@/hooks/useChannelUnreadCounts';

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

interface Channel {
  id: string;
  name: string;
  type: string;
  description?: string;
}

interface Category {
  id: string;
  name: string;
  channels: Channel[];
}

interface MobileChannelListViewProps {
  serverName: string;
  serverId: string;
  categories: Category[];
  orphanChannels?: Channel[];
  onBack: () => void;
  onChannelSelect: (channelId: string, channelType: string) => void;
  onOpenSettings?: () => void;
}

export function MobileChannelListView({
  serverName,
  serverId,
  categories,
  orphanChannels = [],
  onBack,
  onChannelSelect,
  onOpenSettings,
}: MobileChannelListViewProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const { channelUnreadInfo } = useChannelUnreadCounts(serverId);

  const toggleCategory = (id: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="h-12 px-3 flex items-center gap-2 border-b border-border">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="font-semibold text-sm flex-1 truncate">{serverName}</h2>
        {onOpenSettings && (
          <button onClick={onOpenSettings} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <Settings className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Orphan channels */}
        {orphanChannels.map(ch => {
          const Icon = channelIcons[ch.type] || StreamlineHash;
          const info = channelUnreadInfo[ch.id];
          return (
            <button
              key={ch.id}
              onClick={() => onChannelSelect(ch.id, ch.type)}
              className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-muted/50 transition-colors"
            >
              <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className={cn(
                "text-sm truncate flex-1 text-left",
                info?.hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
              )}>{ch.name}</span>
              {(info?.mentionCount ?? 0) > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] bg-destructive text-destructive-foreground rounded-full font-bold">
                  {info!.mentionCount}
                </span>
              )}
            </button>
          );
        })}

        {/* Categories */}
        {categories.map(cat => {
          const isCollapsed = collapsedCategories.has(cat.id);
          return (
            <div key={cat.id}>
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center gap-1 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
              >
                <ChevronDown className={cn("w-3 h-3 transition-transform", isCollapsed && "-rotate-90")} />
                {cat.name}
              </button>
              {!isCollapsed && cat.channels.map(ch => {
                const Icon = channelIcons[ch.type] || StreamlineHash;
                const info = channelUnreadInfo[ch.id];
                return (
                  <button
                    key={ch.id}
                    onClick={() => onChannelSelect(ch.id, ch.type)}
                    className="w-full flex items-center gap-2 px-5 py-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className={cn(
                      "text-sm truncate flex-1 text-left",
                      info?.hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>{ch.name}</span>
                    {(info?.mentionCount ?? 0) > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-destructive text-destructive-foreground rounded-full font-bold">
                        {info!.mentionCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
