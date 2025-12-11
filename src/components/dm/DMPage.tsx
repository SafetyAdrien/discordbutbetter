import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Users, MessageCircle } from 'lucide-react';
import { DMList } from './DMList';
import { DMConversation } from './DMConversation';
import { FriendsPanel } from '@/components/friends/FriendsPanel';
import { VoiceControls } from '@/components/layout/VoiceControls';
import { useVoiceState } from '@/hooks/useVoiceState';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AccountSettingsModal } from '@/components/account-settings/AccountSettingsModal';
import { Settings, LogOut, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

type DMView = 'friends' | 'conversation';

interface DMPageProps {
  activeDMId: string | null;
  onConversationSelect: (conversationId: string) => void;
  onShowFriends: () => void;
}

export function DMPage({ activeDMId, onConversationSelect, onShowFriends }: DMPageProps) {
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const { profile, signOut, updateStatus } = useAuth();
  const { voiceState, leaveChannel, toggleMute, toggleDeafen, isConnected } = useVoiceState();

  const currentView: DMView = activeDMId ? 'conversation' : 'friends';

  const handleOpenDM = (conversationId: string) => {
    onConversationSelect(conversationId);
  };

  return (
    <div className="flex-1 flex">
      {/* Left Sidebar - DM List */}
      <div className="w-60 bg-card flex flex-col border-r border-border">
        {/* Header */}
        <div className="h-12 px-4 flex items-center border-b border-border">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Trouver ou commencer une conversation"
              className="w-full px-2 py-1.5 text-sm bg-background rounded border-none focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="p-2">
          <button
            onClick={onShowFriends}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
              currentView === 'friends' 
                ? 'bg-muted text-foreground' 
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            <Users className="w-5 h-5" />
            <span className="font-medium">Amis</span>
          </button>
        </div>

        {/* DM List Section */}
        <div className="px-2 pt-4">
          <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Messages privés
          </h3>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          <DMList
            activeConversationId={activeDMId}
            onConversationSelect={handleOpenDM}
          />
        </div>

        {/* Voice Controls */}
        {isConnected && voiceState.channelName && (
          <VoiceControls
            channelName={voiceState.channelName}
            serverName={voiceState.serverName}
            isMuted={voiceState.isMuted}
            isDeafened={voiceState.isDeafened}
            onToggleMute={() => toggleMute.mutate()}
            onToggleDeafen={() => toggleDeafen.mutate()}
            onDisconnect={() => leaveChannel.mutate()}
          />
        )}

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
              <DropdownMenuItem onClick={() => setShowAccountSettings(true)}>
                <User className="w-4 h-4 mr-2" />
                Mon profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut} className="text-destructive">
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
      </div>

      {/* Main Content */}
      {currentView === 'friends' ? (
        <FriendsPanel onOpenDM={handleOpenDM} />
      ) : activeDMId ? (
        <DMConversation 
          conversationId={activeDMId} 
          onBack={onShowFriends}
        />
      ) : null}

      {/* Modals */}
      {showAccountSettings && (
        <AccountSettingsModal onClose={() => setShowAccountSettings(false)} />
      )}
    </div>
  );
}
