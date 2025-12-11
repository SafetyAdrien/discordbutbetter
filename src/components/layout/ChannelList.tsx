import { cn } from '@/lib/utils';
import { 
  ChevronDown, 
  Hash, 
  Volume2, 
  MessageSquare, 
  Megaphone,
  Settings,
  Plus,
  LogOut
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'forum' | 'announcement';
  description?: string;
  unreadCount?: number;
}

interface Category {
  id: string;
  name: string;
  channels: Channel[];
}

interface Server {
  id: string;
  name: string;
  ownerId: string;
  categories: Category[];
}

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

const statusColors = {
  online: 'bg-[hsl(var(--online))]',
  idle: 'bg-[hsl(var(--idle))]',
  dnd: 'bg-[hsl(var(--dnd))]',
  offline: 'bg-[hsl(var(--offline))]',
};

const statusLabels = {
  online: 'En ligne',
  idle: 'Inactif',
  dnd: 'Ne pas déranger',
  offline: 'Hors ligne',
};

export function ChannelList({ server, activeChannelId, onChannelSelect }: ChannelListProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
  const { profile, signOut, updateStatus } = useAuth();

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="w-60 bg-card flex flex-col border-r border-border">
      {/* Server Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border hover:bg-muted cursor-pointer transition-colors">
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
                        isVoice && 'text-[hsl(var(--online))]'
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 flex-1 min-w-0 hover:bg-muted rounded-md p-1 transition-colors">
              <div className="relative">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-sm">
                    {profile?.display_name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background',
                  statusColors[profile?.status || 'offline']
                )} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate">{profile?.display_name || 'Chargement...'}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {profile?.custom_status || statusLabels[profile?.status || 'offline']}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{profile?.display_name}</p>
              <p className="text-xs text-muted-foreground">@{profile?.username}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => updateStatus('online')}>
              <div className={cn('w-2.5 h-2.5 rounded-full mr-2', statusColors.online)} />
              En ligne
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateStatus('idle')}>
              <div className={cn('w-2.5 h-2.5 rounded-full mr-2', statusColors.idle)} />
              Inactif
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateStatus('dnd')}>
              <div className={cn('w-2.5 h-2.5 rounded-full mr-2', statusColors.dnd)} />
              Ne pas déranger
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateStatus('offline')}>
              <div className={cn('w-2.5 h-2.5 rounded-full mr-2', statusColors.offline)} />
              Invisible
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
