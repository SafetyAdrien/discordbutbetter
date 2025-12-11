import { cn } from '@/lib/utils';
import { 
  ChevronDown, 
  Hash, 
  Volume2, 
  MessageSquare, 
  Megaphone,
  Settings,
  Plus,
  LogOut,
  User,
  CheckCircle,
  Link,
  Bell,
  Trash2,
  MicOff,
  HeadphoneOff
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { ChannelSettingsModal } from '@/components/channel-settings/ChannelSettingsModal';
import { AccountSettingsModal } from '@/components/account-settings/AccountSettingsModal';
import { VoiceControls } from './VoiceControls';
import { copyToClipboard } from '@/lib/clipboard';
import { toast } from '@/hooks/use-toast';
import { useVoice, useVoiceParticipants } from '@/contexts/VoiceContext';

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
  onOpenServerSettings?: () => void;
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

export function ChannelList({ server, activeChannelId, onChannelSelect, onOpenServerSettings }: ChannelListProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const { profile, signOut, updateStatus } = useAuth();
  const { voiceState, joinChannel, leaveChannel, toggleMute, toggleDeafen, isConnected, speakingUsers } = useVoice();

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

  const handleCopyLink = (channelId: string) => {
    const link = `${window.location.origin}/channels/${server.id}/${channelId}`;
    copyToClipboard(link, 'Lien copié');
  };

  const handleMarkAsRead = (channelId: string) => {
    toast({ title: 'Marqué comme lu' });
  };

  const handleChannelClick = (channel: Channel) => {
    if (channel.type === 'voice') {
      // Join voice channel instantly
      joinChannel(channel.id, channel.name, server.name);
    } else {
      // Select text channel
      onChannelSelect(channel.id);
    }
  };

  return (
    <div className="w-60 bg-card flex flex-col border-r border-border">
      {/* Server Header */}
      <button 
        onClick={onOpenServerSettings}
        className="h-12 px-4 flex items-center justify-between border-b border-border hover:bg-muted cursor-pointer transition-colors w-full"
      >
        <h2 className="font-semibold text-foreground truncate">{server.name}</h2>
        <Settings className="w-4 h-4 text-muted-foreground" />
      </button>

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
                {category.channels.map((channel) => (
                  <ChannelItem
                    key={channel.id}
                    channel={channel}
                    serverId={server.id}
                    isActive={activeChannelId === channel.id}
                    isVoiceConnected={voiceState.channelId === channel.id}
                    speakingUsers={speakingUsers}
                    onChannelClick={() => handleChannelClick(channel)}
                    onCopyLink={() => handleCopyLink(channel.id)}
                    onMarkAsRead={() => handleMarkAsRead(channel.id)}
                    onOpenSettings={() => setSelectedChannelId(channel.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Voice Controls - Show when connected */}
      {isConnected && voiceState.channelName && (
        <VoiceControls
          channelName={voiceState.channelName}
          serverName={voiceState.serverName}
          isMuted={voiceState.isMuted}
          isDeafened={voiceState.isDeafened}
          onToggleMute={() => toggleMute()}
          onToggleDeafen={() => toggleDeafen()}
          onDisconnect={() => leaveChannel()}
        />
      )}

      {/* User Panel */}
      <div className="h-14 px-2 flex items-center gap-2 bg-background/50 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 flex-1 min-w-0 hover:bg-muted rounded-md p-1 transition-colors">
              <div className="relative">
                <Avatar className="w-8 h-8 ring-2 ring-primary/30">
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
            <DropdownMenuItem onClick={() => setShowAccountSettings(true)}>
              <User className="w-4 h-4 mr-2" />
              Mon profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button 
          onClick={() => setShowAccountSettings(true)}
          className="p-1.5 hover:bg-muted rounded-md transition-colors"
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {showAccountSettings && (
        <AccountSettingsModal onClose={() => setShowAccountSettings(false)} />
      )}

      {selectedChannelId && (
        <ChannelSettingsModal
          channelId={selectedChannelId}
          serverId={server.id}
          onClose={() => setSelectedChannelId(null)}
        />
      )}
    </div>
  );
}

// Separate component for channel item with voice participants
function ChannelItem({
  channel,
  serverId,
  isActive,
  isVoiceConnected,
  speakingUsers,
  onChannelClick,
  onCopyLink,
  onMarkAsRead,
  onOpenSettings,
}: {
  channel: Channel;
  serverId: string;
  isActive: boolean;
  isVoiceConnected: boolean;
  speakingUsers: Set<string>;
  onChannelClick: () => void;
  onCopyLink: () => void;
  onMarkAsRead: () => void;
  onOpenSettings: () => void;
}) {
  const Icon = channelIcons[channel.type];
  const isVoice = channel.type === 'voice';
  const { data: participants = [] } = useVoiceParticipants(isVoice ? channel.id : null);

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            onClick={onChannelClick}
            className={cn(
              'channel-item w-full group',
              isActive && !isVoice && 'active',
              isVoiceConnected && 'bg-[hsl(var(--online))]/10 border-l-2 border-[hsl(var(--online))]'
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
              <Settings 
                className="w-4 h-4 text-muted-foreground hover:text-foreground" 
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSettings();
                }}
              />
            </div>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={onMarkAsRead}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Marquer comme lu
          </ContextMenuItem>
          <ContextMenuItem onClick={onCopyLink}>
            <Link className="w-4 h-4 mr-2" />
            Copier le lien
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={onOpenSettings}>
            <Settings className="w-4 h-4 mr-2" />
            Modifier le channel
          </ContextMenuItem>
          <ContextMenuItem>
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem className="text-destructive focus:text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer le channel
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Voice Participants */}
      {isVoice && participants.length > 0 && (
        <div className="ml-6 mt-1 space-y-1">
          {participants.map((participant) => {
            const isSpeaking = speakingUsers.has(participant.user_id);
            return (
              <div 
                key={participant.id}
                className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground"
              >
                <Avatar className={cn(
                  "w-5 h-5 transition-all ring-1 ring-border",
                  isSpeaking && "ring-2 ring-[hsl(var(--online))] ring-offset-1 ring-offset-background"
                )}>
                  <AvatarImage src={participant.profile.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                    {participant.profile.display_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate flex-1 text-xs">
                  {participant.profile.display_name}
                </span>
                {participant.muted && (
                  <MicOff className="w-3 h-3 text-destructive" />
                )}
                {participant.deafened && (
                  <HeadphoneOff className="w-3 h-3 text-destructive" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
