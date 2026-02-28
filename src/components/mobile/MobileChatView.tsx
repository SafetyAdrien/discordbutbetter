import { ChevronLeft, Users, Info, Bell, Pin, BellRing, BellOff, AtSign } from 'lucide-react';
import { ChatArea } from '@/components/chat/ChatArea';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MemberList } from '@/components/layout/MemberList';
import { StreamlineHash } from '@/components/icons/StreamlineHash';
import StreamlineThreads from '@/components/icons/StreamlineThreads';
import ThreadsPopover from '@/components/threads/ThreadsPopover';
import { Button } from '@/components/ui/button';
import { StreamlineVoice } from '@/components/icons/StreamlineVoice';
import { StreamlineForum } from '@/components/icons/StreamlineForum';
import { StreamlineMegaphone } from '@/components/icons/StreamlineMegaphone';
import { StreamlineMedia } from '@/components/icons/StreamlineMedia';
import { StreamlineCalendar } from '@/components/icons/StreamlineCalendar';
import { StreamlineTasks } from '@/components/icons/StreamlineTasks';
import { StreamlineStage } from '@/components/icons/StreamlineStage';
import type { Message, User } from '@/types/app';
import type { MemberWithProfile } from '@/hooks/useMembers';

const channelIcons: Record<string, React.ElementType> = {
  text: StreamlineHash,
  voice: StreamlineVoice,
  forum: StreamlineForum,
  announcement: StreamlineMegaphone,
  media: StreamlineMedia,
  calendar: StreamlineCalendar,
  tasks: StreamlineTasks,
  stage: StreamlineStage,
};

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
  const ChannelIcon = channelIcons[channel.type] || StreamlineHash;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-12 px-2 flex items-center gap-1.5 border-b border-border flex-shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>

        <ChannelIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate">{channel.name}</h2>
        </div>

        {/* Channel info popover */}
        {channel.description && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                <Info className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" className="w-72">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ChannelIcon className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm">{channel.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{channel.description}</p>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Members sheet */}
        <Sheet>
          <SheetTrigger asChild>
            <button className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
              <Users className="w-5 h-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0">
            {/* Action icons relocated from ChatArea header */}
            <div className="flex items-center gap-1 px-3 py-2 border-b border-border">
              {/* Notifications */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Bell className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="start" className="w-56 p-3">
                  <h4 className="font-semibold text-foreground mb-3 text-sm">Notifications</h4>
                  <div className="space-y-1">
                    <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted/50 transition-colors text-sm">
                      <BellRing className="w-4 h-4 text-muted-foreground" />
                      <span>Tous les messages</span>
                    </button>
                    <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted/50 transition-colors text-sm">
                      <AtSign className="w-4 h-4 text-muted-foreground" />
                      <span>Mentions uniquement</span>
                    </button>
                    <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted/50 transition-colors text-sm">
                      <BellOff className="w-4 h-4 text-muted-foreground" />
                      <span>Aucun</span>
                    </button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Pinned Messages */}
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Pin className="w-4 h-4" />
              </Button>

              {/* Threads */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <StreamlineThreads className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="start" className="w-80 p-0">
                  <ThreadsPopover channelId={channel.id} onSelectThread={(threadId) => onSelectThread?.(threadId)} />
                </PopoverContent>
              </Popover>
            </div>

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
