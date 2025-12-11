import { Server, Category, Channel } from '@/types/app';
import { cn } from '@/lib/utils';
import { 
  ChevronDown, 
  Hash, 
  Volume2, 
  MessageSquare, 
  Megaphone,
  Settings,
  Plus,
  Users
} from 'lucide-react';
import { useState } from 'react';

interface ChannelListProps {
  server: Server;
  activeChannelId: string | null;
  onChannelSelect: (channelId: string) => void;
}

const channelIcons = {
  text: Hash,
  voice: Volume2,
  forum: MessageSquare,
  announcement: Megaphone,
};

export function ChannelList({ server, activeChannelId, onChannelSelect }: ChannelListProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <div className="w-60 bg-card flex flex-col border-r border-border">
      {/* Server Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border hover:bg-surface-hover cursor-pointer transition-colors">
        <h2 className="font-semibold text-foreground truncate">{server.name}</h2>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-2">
        {server.categories.map((category) => (
          <div key={category.id} className="mb-2">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category.id)}
              className="flex items-center gap-1 px-2 py-1 w-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ChevronDown
                className={cn(
                  'w-3 h-3 transition-transform',
                  collapsedCategories.includes(category.id) && '-rotate-90'
                )}
              />
              <span className="uppercase tracking-wide">{category.name}</span>
              <Plus className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            {/* Channel List */}
            {!collapsedCategories.includes(category.id) && (
              <div className="mt-1 px-2 space-y-0.5">
                {category.channels.map((channel) => {
                  const Icon = channelIcons[channel.type];
                  const isActive = activeChannelId === channel.id;
                  const isVoice = channel.type === 'voice';

                  return (
                    <button
                      key={channel.id}
                      onClick={() => onChannelSelect(channel.id)}
                      className={cn(
                        'channel-item w-full group',
                        isActive && 'active'
                      )}
                    >
                      <Icon className={cn(
                        'w-4 h-4 flex-shrink-0',
                        isVoice && 'text-status-online'
                      )} />
                      <span className="truncate flex-1 text-left">{channel.name}</span>
                      
                      {channel.unreadCount && channel.unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                          {channel.unreadCount}
                        </span>
                      )}

                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Settings className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* User Panel */}
      <div className="h-14 px-2 flex items-center gap-2 bg-background/50 border-t border-border">
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-gradient-gaming flex items-center justify-center">
            <span className="text-sm">🎮</span>
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-status-online rounded-full border-2 border-background" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">CyberPunk</p>
          <p className="text-xs text-muted-foreground truncate">En ligne</p>
        </div>
        <button className="p-1.5 hover:bg-surface-hover rounded-md transition-colors">
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
