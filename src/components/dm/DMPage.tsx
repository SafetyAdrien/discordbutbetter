import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Users, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DMList } from './DMList';
import { DMConversation } from './DMConversation';
import { FriendsPanel } from '@/components/friends/FriendsPanel';
import { VoiceControls } from '@/components/layout/VoiceControls';
import { UserProfileCard } from '@/components/profile/UserProfileCard';
import { useVoiceState } from '@/hooks/useVoiceState';
import { AccountSettingsModal } from '@/components/account-settings/AccountSettingsModal';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { Sheet, SheetContent } from '@/components/ui/sheet';

type DMView = 'friends' | 'conversation';

interface DMPageProps {
  activeDMId: string | null;
  onConversationSelect: (conversationId: string) => void;
  onShowFriends: () => void;
  onOpenSidebar?: () => void;
  showSidebarButton?: boolean;
}

export function DMPage({
  activeDMId,
  onConversationSelect,
  onShowFriends,
  onOpenSidebar,
  showSidebarButton = false,
}: DMPageProps) {
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [dmListDrawerOpen, setDmListDrawerOpen] = useState(false);
  const { showChannelSidebar, isMobile, isTablet } = useResponsiveLayout();
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
    setDmListDrawerOpen(false);
  };

  // DM List Sidebar Content
  const DMListSidebar = () => (
    <div className="w-60 bg-card flex flex-col border-r border-border h-full">
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
          onClick={() => {
            onShowFriends();
            setDmListDrawerOpen(false);
          }} 
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors', 
            currentView === 'friends' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
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
  );

  // Show sidebar in drawer on tablet/mobile
  const showDMListInDrawer = !showChannelSidebar;

  return (
    <div className="flex-1 flex">
      {/* Hamburger button for mobile/tablet */}
      {(showSidebarButton || showDMListInDrawer) && (
        <div className="absolute top-0 left-0 z-40 h-12 flex items-center px-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
              if (showSidebarButton) {
                onOpenSidebar?.();
              } else {
                setDmListDrawerOpen(true);
              }
            }}
            className="lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Left Sidebar - DM List */}
      {showChannelSidebar ? (
        <DMListSidebar />
      ) : (
        <Sheet open={dmListDrawerOpen} onOpenChange={setDmListDrawerOpen}>
          <SheetContent side="left" className="w-fit p-0 border-r border-border">
            <DMListSidebar />
          </SheetContent>
        </Sheet>
      )}

      {/* Main Content */}
      <div className="flex-1 relative">
        {currentView === 'friends' ? (
          <FriendsPanel onOpenDM={handleOpenDM} />
        ) : activeDMId ? (
          <DMConversation conversationId={activeDMId} onBack={onShowFriends} />
        ) : null}
      </div>

      {/* Modals */}
      {showAccountSettings && <AccountSettingsModal onClose={() => setShowAccountSettings(false)} />}
    </div>
  );
}