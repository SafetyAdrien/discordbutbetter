import { useState } from 'react';
import { Users, Inbox, Plus, Search } from 'lucide-react';
import { DMList } from '@/components/dm/DMList';
import { FriendsPanel } from '@/components/friends/FriendsPanel';
import { InboxPanel } from '@/components/inbox/InboxPanel';
import { DMConversation } from '@/components/dm/DMConversation';
import { NewMessageModal } from '@/components/dm/NewMessageModal';
import { useUnreadNotificationsCount } from '@/hooks/useNotifications';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface MobileHomeViewProps {
  activeDMId: string | null;
  onConversationSelect: (id: string) => void;
  onShowFriends: () => void;
}

export function MobileHomeView({ activeDMId, onConversationSelect, onShowFriends }: MobileHomeViewProps) {
  const [view, setView] = useState<'list' | 'friends' | 'inbox'>('list');
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
        <div className="h-12 px-4 flex items-center border-b border-border">
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
        <div className="h-12 px-4 flex items-center border-b border-border">
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
      <div className="h-12 px-4 flex items-center border-b border-border">
        <h2 className="font-semibold text-sm flex-1">Messages</h2>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une conversation..."
            className="pl-9 h-9 bg-input text-sm"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-3 pb-2 flex gap-2">
        <button
          onClick={() => setView('friends')}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm flex-1"
        >
          <Users className="w-4 h-4" />
          Amis
        </button>
        <button
          onClick={() => setView('inbox')}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm flex-1 relative"
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

      {/* FAB - New Message - positioned above bottom nav */}
      <button
        onClick={() => setShowNewMessage(true)}
        className="absolute bottom-4 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors z-10"
      >
        <Plus className="w-6 h-6" />
      </button>

      {showNewMessage && (
        <NewMessageModal
          onClose={() => setShowNewMessage(false)}
          onOpenDM={onConversationSelect}
        />
      )}
    </div>
  );
}
