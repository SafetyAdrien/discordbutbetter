import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';
import { DMList } from './DMList';
import { DMConversation } from './DMConversation';
import { FriendsPanel } from '@/components/friends/FriendsPanel';
import { VoiceControls } from '@/components/layout/VoiceControls';
import { UserProfileCard } from '@/components/profile/UserProfileCard';
import { useVoiceState } from '@/hooks/useVoiceState';
import { AccountSettingsModal } from '@/components/account-settings/AccountSettingsModal';

type DMView = 'friends' | 'conversation';
interface DMPageProps {
  activeDMId: string | null;
  onConversationSelect: (conversationId: string) => void;
  onShowFriends: () => void;
  isMobile?: boolean;
}
export function DMPage({
  activeDMId,
  onConversationSelect,
  onShowFriends,
  isMobile = false
}: DMPageProps) {
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const {
    voiceState,
    leaveChannel,
    toggleMute,
    toggleDeafen,
    isConnected
  } = useVoiceState();
  const currentView: DMView = activeDMId ? 'conversation' : 'friends';
  const handleOpenDM = (conversationId: string) => {
    onConversationSelect(conversationId);
  };
  // Mobile: Only show the main content area (sidebar is in drawer)
  if (isMobile) {
    return (
      <div className="flex-1 flex flex-col">
        {currentView === 'friends' ? (
          <FriendsPanel onOpenDM={handleOpenDM} />
        ) : activeDMId ? (
          <DMConversation conversationId={activeDMId} onBack={onShowFriends} />
        ) : null}
        
        {showAccountSettings && <AccountSettingsModal onClose={() => setShowAccountSettings(false)} />}
      </div>
    );
  }

  // Desktop: Full layout with sidebar
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
          <h3 className="px-2 text-xs font-semibold text-muted-foreground capitalize tracking-wide mb-2">
            Messages privés
          </h3>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          <DMList activeConversationId={activeDMId} onConversationSelect={handleOpenDM} />
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
        <UserProfileCard 
          onOpenSettings={() => setShowAccountSettings(true)}
          onOpenProfile={() => setShowAccountSettings(true)}
        />
      </div>

      {/* Main Content */}
      {currentView === 'friends' ? (
        <FriendsPanel onOpenDM={handleOpenDM} />
      ) : activeDMId ? (
        <DMConversation conversationId={activeDMId} onBack={onShowFriends} />
      ) : null}

      {/* Modals */}
      {showAccountSettings && <AccountSettingsModal onClose={() => setShowAccountSettings(false)} />}
    </div>
  );
}