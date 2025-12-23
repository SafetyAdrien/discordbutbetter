import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Users, Inbox, Menu } from 'lucide-react';
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
import { NewMessageModal } from './NewMessageModal';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

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
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
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
    setSidebarOpen(false);
    onShowFriends();
  };

  const handleOpenDMWithClose = (conversationId: string) => {
    setSidebarOpen(false);
    handleOpenDM(conversationId);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header - Search button triggers New Message Modal */}
      <div className="h-12 px-4 flex items-center border-b border-border">
        <button 
          onClick={() => setShowNewMessageModal(true)}
          className="w-full px-2 py-1.5 text-sm bg-background rounded text-muted-foreground text-left hover:bg-muted/50 transition-colors focus:outline-none focus:ring-1 focus:ring-primary/50"
        >
          Trouver ou commencer une conversation
        </button>
      </div>

      {/* Navigation - Friends first, then Inbox */}
      <div className="p-2 space-y-1">
        {/* Friends Button - Now first */}
        <button 
          onClick={handleShowFriends} 
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors', 
            currentView === 'friends' 
              ? 'bg-muted text-foreground' 
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          )}
        >
          <Users className="w-5 h-5" />
          <span className="font-normal">Amis</span>
        </button>

        {/* Inbox Button - Now second */}
        <button 
          onClick={() => { handleShowInbox(); setSidebarOpen(false); }} 
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors', 
            currentView === 'inbox' 
              ? 'bg-muted text-foreground' 
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          )}
        >
          <div className="relative">
            <Inbox className="w-5 h-5" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </div>
          <span className="font-normal">Boîte de réception</span>
        </button>
      </div>

      {/* Separator - Adjusted spacing */}
      <div className="px-2 pt-2 py-[5px]">
        <div className="h-px bg-border mb-2" />
        <h3 className="px-2 text-xs font-light text-muted-foreground capitalize tracking-wide mb-2">
          Messages privés
        </h3>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        <DMList activeConversationId={activeDMId} onConversationSelect={handleOpenDMWithClose} />
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
  
  return (
    <div className="flex-1 flex">
      {/* Mobile: Sheet sidebar */}
      {isMobile ? (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-60 p-0 bg-card">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      ) : (
        /* Desktop: Fixed sidebar */
        <div className="w-60 bg-card flex flex-col border-r border-border">
          <SidebarContent />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header with menu button */}
        {isMobile && (
          <div className="h-12 px-3 flex items-center gap-2 border-b border-border bg-card">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <span className="font-semibold text-sm">
              {currentView === 'inbox' ? 'Boîte de réception' : currentView === 'friends' ? 'Amis' : 'Messages'}
            </span>
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 flex overflow-hidden">
          {currentView === 'inbox' ? (
            <InboxPanel />
          ) : currentView === 'friends' ? (
            <FriendsPanel onOpenDM={handleOpenDM} />
          ) : activeDMId ? (
            <DMConversation conversationId={activeDMId} onBack={handleShowFriends} />
          ) : null}
        </div>
      </div>

      {/* Modals */}
      {showAccountSettings && (
        <AccountSettingsModal onClose={() => setShowAccountSettings(false)} />
      )}
      
      <NewMessageModal 
        open={showNewMessageModal}
        onClose={() => setShowNewMessageModal(false)}
        onSelectDM={handleOpenDM}
      />
    </div>
  );
}
