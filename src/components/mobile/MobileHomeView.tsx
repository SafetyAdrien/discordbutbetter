import { MobileDMHomeView } from '@/components/mobile/dm/MobileDMHomeView';
import { MobileDMConversation } from '@/components/mobile/dm/MobileDMConversation';

interface MobileHomeViewProps {
  activeDMId: string | null;
  onConversationSelect: (id: string) => void;
  onShowFriends: () => void;
}

export function MobileHomeView({ activeDMId, onConversationSelect }: MobileHomeViewProps) {
  // Conversation full-screen
  if (activeDMId) {
    return (
      <MobileDMConversation
        conversationId={activeDMId}
        onBack={() => onConversationSelect('')}
      />
    );
  }

  return (
    <MobileDMHomeView
      activeDMId={activeDMId}
      onConversationSelect={onConversationSelect}
    />
  );
}
