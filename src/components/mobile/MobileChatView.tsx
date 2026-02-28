import { ChevronLeft, Users } from 'lucide-react';
import { ChatArea } from '@/components/chat/ChatArea';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { MemberList } from '@/components/layout/MemberList';
import type { Message, User } from '@/types/app';
import type { MemberWithProfile } from '@/hooks/useMembers';

interface MobileChatViewProps {
  channel: {
    id: string;
    name: string;
    type: 'text' | 'voice' | 'forum' | 'announcement' | 'media' | 'calendar' | 'tasks' | 'stage';
    description?: string;
    server_id?: string;
  };
  messages: Message[];
  onSendMessage: (content: string, attachments?: any[]) => void;
  memberRoles: Map<string, MemberWithProfile['roles']>;
  members: { id: string; username: string; displayName: string; avatar?: string }[];
  memberListData: (User & { roles?: MemberWithProfile['roles'] })[];
  ownerId: string;
  serverId: string;
  onBack: () => void;
  onOpenDM: (id: string) => void;
  onSelectThread?: (threadId: string) => void;
  activeThreadId?: string | null;
  onCloseThread?: () => void;
}

export function MobileChatView({
  channel,
  messages,
  onSendMessage,
  memberRoles,
  members,
  memberListData,
  ownerId,
  serverId,
  onBack,
  onOpenDM,
  onSelectThread,
  activeThreadId,
  onCloseThread,
}: MobileChatViewProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-12 px-2 flex items-center gap-2 border-b border-border flex-shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate">{channel.name}</h2>
          {channel.description && (
            <p className="text-[10px] text-muted-foreground truncate">{channel.description}</p>
          )}
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <button className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
              <Users className="w-5 h-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0">
            <MemberList
              members={memberListData}
              ownerId={ownerId}
              serverId={serverId}
              onOpenDM={onOpenDM}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden">
        <ChatArea
          channel={channel}
          messages={messages}
          onSendMessage={onSendMessage}
          memberRoles={memberRoles}
          onOpenDM={onOpenDM}
          onToggleMembers={() => {}}
          showMembers={false}
          onSelectThread={onSelectThread}
          activeThreadId={activeThreadId}
          onCloseThread={onCloseThread}
          members={members}
        />
      </div>
    </div>
  );
}
