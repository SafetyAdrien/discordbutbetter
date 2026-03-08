import { useState } from 'react';
import { Users, Inbox, Search, UsersRound } from 'lucide-react';
import { DMList } from '@/components/dm/DMList';
import { FriendsPanel } from '@/components/friends/FriendsPanel';
import { InboxPanel } from '@/components/inbox/InboxPanel';
import { DMConversation } from '@/components/dm/DMConversation';
import { NewMessageModal } from '@/components/dm/NewMessageModal';
import { NewDMSheet } from '@/components/dm/NewDMSheet';
import { CreateGroupModal } from '@/components/dm/CreateGroupModal';
import { useUnreadNotificationsCount } from '@/hooks/useNotifications';
import { Badge } from '@/components/ui/badge';

interface MobileHomeViewProps {
  activeDMId: string | null;
  onConversationSelect: (id: string) => void;
  onShowFriends: () => void;
}

export function MobileHomeView({ activeDMId, onConversationSelect, onShowFriends }: MobileHomeViewProps) {
  const [view, setView] = useState<'list' | 'friends' | 'inbox'>('list');
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const unreadCount = useUnreadNotificationsCount();

  // If a DM is selected, show the conversation full-screen
  if (activeDMId) {
    return (
      <DMConversation
        conversationId={activeDMId}
        onBack={() => {
          onShowFriends();
        }}
      />
    );
  }

  if (view === 'friends') {
    return (
      <div className="flex flex-col h-full">
        <div className="h-12 px-4 flex items-center border-b border-border bg-[hsl(var(--surface-header))]">
          <button onClick={() => setView('list')} className="text-sm text-muted-foreground mr-3">←</button>
          <h2 className="font-semibold text-sm">Amis</h2>
        </div>
        <div className="flex-1 overflow-hidden">
          <FriendsPanel onOpenDM={(id) => { setView('list'); onConversationSelect(id); }} />
        </div>
      </div>
    );
  }

  if (view === 'inbox') {
    return (
      <div className="flex flex-col h-full">
        <div className="h-12 px-4 flex items-center border-b border-border bg-[hsl(var(--surface-header))]">
          <button onClick={() => setView('list')} className="text-sm text-muted-foreground mr-3">←</button>
          <h2 className="font-semibold text-sm">Boîte de réception</h2>
        </div>
        <div className="flex-1 overflow-hidden">
          <InboxPanel />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-12 px-4 flex items-center border-b border-border bg-[hsl(var(--surface-header))]">
        <h2 className="font-semibold text-sm flex-1">Messages</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            title="Rechercher"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            title="Créer un groupe"
          >
            <UsersRound className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-3 py-2 flex gap-2">
        <button
          onClick={() => setView('friends')}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[hsl(var(--surface-2))] hover:bg-[hsl(var(--surface-3))] transition-colors text-sm flex-1"
        >
          <Users className="w-4 h-4" />
          Amis
        </button>
        <button
          onClick={() => setView('inbox')}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[hsl(var(--surface-2))] hover:bg-[hsl(var(--surface-3))] transition-colors text-sm flex-1 relative"
        >
          <Inbox className="w-4 h-4" />
          Inbox
          {unreadCount > 0 && (
            <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </button>
      </div>

      {/* DM List */}
      <div className="flex-1 overflow-y-auto">
        <DMList activeConversationId={activeDMId} onConversationSelect={onConversationSelect} />
      </div>

      {/* FAB - New Message */}
      <button
        onClick={() => setShowNewMessage(true)}
        className="fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px))] right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors z-10"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <line x1="12" y1="8" x2="12" y2="14" />
          <line x1="9" y1="11" x2="15" y2="11" />
        </svg>
      </button>

      {showNewMessage && (
        <NewDMSheet
          onClose={() => setShowNewMessage(false)}
          onOpenDM={onConversationSelect}
        />
      )}

      {showSearch && (
        <NewMessageModal
          onClose={() => setShowSearch(false)}
          onOpenDM={onConversationSelect}
        />
      )}

      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onOpenDM={onConversationSelect}
        />
      )}
    </div>
  );
}
