import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Users, Inbox } from 'lucide-react';
import { DMList } from './DMList';
import { DMConversation } from './DMConversation';
import { FriendsPanel } from '@/components/friends/FriendsPanel';
import { InboxPanel } from '@/components/inbox/InboxPanel';
import { VoiceControls } from '@/components/layout/VoiceControls';
import { UserProfileCard } from '@/components/profile/UserProfileCard';
import { useVoiceState } from '@/hooks/useVoiceState';
import { AccountSettingsModal } from '@/components/account-settings/AccountSettingsModal';
import { useUnreadNotificationsCount } from '@/hooks/useNotifications';
import { Badge } from '@/components/ui/badge';
type DMView = 'friends' | 'inbox' | 'conversation';
interface DMPageProps {
  activeDMId: string | null;
  onConversationSelect: (conversationId: string) => void;
  onShowFriends: () => void;
}
export function DMPage({
  activeDMId,
  onConversationSelect,
  onShowFriends
}: DMPageProps) {
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const unreadCount = useUnreadNotificationsCount();
  const {
    voiceState,
    leaveChannel,
    toggleMute,
    toggleDeafen,
    isConnected
  } = useVoiceState();
  const getCurrentView = (): DMView => {
    if (showInbox) return 'inbox';
    if (activeDMId) return 'conversation';
    return 'friends';
  };
  const currentView = getCurrentView();
  const handleOpenDM = (conversationId: string) => {
    setShowInbox(false);
    onConversationSelect(conversationId);
  };
  const handleShowInbox = () => {
    setShowInbox(true);
  };
  const handleShowFriends = () => {
    setShowInbox(false);
    onShowFriends();
  };
  return <div className="flex-1 flex">
      {/* Left Sidebar - DM List */}
      <div className="w-60 bg-card flex flex-col border-r border-border">
        {/* Header */}
        <div className="h-12 px-4 flex items-center border-b border-border">
          <div className="relative w-full">
            <input type="text" placeholder="Trouver ou commencer une conversation" className="w-full px-2 py-1.5 text-sm bg-background rounded border-none focus:outline-none focus:ring-1 focus:ring-primary/50" />
          </div>
        </div>

        {/* Navigation */}
        <div className="p-2 space-y-1">
          {/* Inbox Button */}
          <button onClick={handleShowInbox} className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors', currentView === 'inbox' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')}>
            <div className="relative">
              <Inbox className="w-5 h-5" />
              {unreadCount > 0 && <Badge variant="destructive" className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>}
            </div>
            <span className="font-normal">Boîte de réception</span>
          </button>

          {/* Friends Button */}
          <button onClick={handleShowFriends} className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors', currentView === 'friends' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')}>
            <Users className="w-5 h-5" />
            <span className="font-normal">Amis</span>
          </button>
        </div>

        {/* Separator */}
        <div className="px-2 pt-4">
          <div className="h-px bg-border mb-3" />
          <h3 className="px-2 text-xs font-light text-muted-foreground capitalize tracking-wide mb-2">
            Messages privés
          </h3>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          <DMList activeConversationId={activeDMId} onConversationSelect={handleOpenDM} />
        </div>

        {/* Voice Controls */}
        {isConnected && voiceState.channelName && <VoiceControls channelName={voiceState.channelName} serverName={voiceState.serverName} isMuted={voiceState.isMuted} isDeafened={voiceState.isDeafened} onToggleMute={() => toggleMute.mutate()} onToggleDeafen={() => toggleDeafen.mutate()} onDisconnect={() => leaveChannel.mutate()} />}

        {/* User Panel */}
        <UserProfileCard onOpenSettings={() => setShowAccountSettings(true)} onOpenProfile={() => setShowAccountSettings(true)} />
      </div>

      {/* Main Content */}
      {currentView === 'inbox' ? <InboxPanel /> : currentView === 'friends' ? <FriendsPanel onOpenDM={handleOpenDM} /> : activeDMId ? <DMConversation conversationId={activeDMId} onBack={handleShowFriends} /> : null}

      {/* Modals */}
      {showAccountSettings && <AccountSettingsModal onClose={() => setShowAccountSettings(false)} />}
    </div>;
}