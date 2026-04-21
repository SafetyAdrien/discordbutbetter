import { useState } from 'react';
import { MobileDMHomeView } from '@/components/mobile/dm/MobileDMHomeView';
import { MobileDMConversation } from '@/components/mobile/dm/MobileDMConversation';
import { InboxPanel } from '@/components/inbox/InboxPanel';

interface MobileHomeViewProps {
  activeDMId: string | null;
  onConversationSelect: (id: string) => void;
  onShowFriends: () => void;
}

export function MobileHomeView({ activeDMId, onConversationSelect, onShowFriends }: MobileHomeViewProps) {
  const [showInbox, setShowInbox] = useState(false);

  // Conversation full-screen
  if (activeDMId) {
    return (
      <MobileDMConversation
        conversationId={activeDMId}
        onBack={() => onConversationSelect('')}
      />
    );
  }

  if (showInbox) {
    return (
      <div className="flex flex-col h-full">
        <div className="h-12 px-4 flex items-center border-b border-border bg-[hsl(var(--surface-header))]">
          <button onClick={() => setShowInbox(false)} className="text-sm text-muted-foreground mr-3" aria-label="Retour">←</button>
          <h2 className="font-semibold text-sm">Boîte de réception</h2>
        </div>
        <div className="flex-1 overflow-hidden">
          <InboxPanel />
        </div>
      </div>
    );
  }

  return (
    <MobileDMHomeView
      activeDMId={activeDMId}
      onConversationSelect={onConversationSelect}
      onShowFriends={onShowFriends}
      onShowInbox={() => setShowInbox(true)}
    />
  );
}
