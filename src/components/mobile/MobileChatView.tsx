import { useState, ReactNode } from 'react';
import { ChevronLeft, Users, Info, Bell, Pin, BellRing, BellOff, AtSign, Search, X } from 'lucide-react';
import { ChatArea } from '@/components/chat/ChatArea';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MemberList } from '@/components/layout/MemberList';
import { StreamlineHash } from '@/components/icons/StreamlineHash';
import StreamlineThreads from '@/components/icons/StreamlineThreads';
import StreamlineSummaries from '@/components/icons/StreamlineSummaries';
import ThreadsPopover from '@/components/threads/ThreadsPopover';
import { Button } from '@/components/ui/button';
import { StreamlineVoice } from '@/components/icons/StreamlineVoice';
import { StreamlineForum } from '@/components/icons/StreamlineForum';
import { StreamlineMegaphone } from '@/components/icons/StreamlineMegaphone';
import { StreamlineMedia } from '@/components/icons/StreamlineMedia';
import { StreamlineCalendar } from '@/components/icons/StreamlineCalendar';
import { StreamlineTasks } from '@/components/icons/StreamlineTasks';
import { StreamlineStage } from '@/components/icons/StreamlineStage';
import { usePinnedMessages } from '@/hooks/usePinnedMessages';
import { GlobalSearchModal } from '@/components/modals/GlobalSearchModal';
import { SummariesBar } from '@/components/summaries/SummariesBar';
import { useSummaries } from '@/hooks/useSummaries';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { FollowChannelModal } from '@/components/channels/announcement/FollowChannelModal';
import { FollowSuccessModal } from '@/components/channels/announcement/FollowSuccessModal';
import { usePermissions } from '@/hooks/usePermissions';
import { useMultipleChannelPermissions } from '@/hooks/useUserChannelPermissions';
import { useServers } from '@/hooks/useServers';
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
  /** If provided, renders custom content instead of ChatArea (e.g. AnnouncementChannel) */
  renderCustomContent?: () => ReactNode;
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
  renderCustomContent,
}: MobileChatViewProps) {
  const ChannelIcon = channelIcons[channel.type] || StreamlineHash;
  const [showSearch, setShowSearch] = useState(false);
  const [showSummaries, setShowSummaries] = useState(false);
  const [followModalOpen, setFollowModalOpen] = useState(false);
  const [followSuccessOpen, setFollowSuccessOpen] = useState(false);

  // Announcement follow permission
  const isAnnouncement = channel.type === 'announcement';
  const { isGod, hasPermission: hasServerPermission } = usePermissions(channel.server_id || null);
  const isAdminOrOwner = isGod || hasServerPermission('administrator');
  const { can: canPerm } = useMultipleChannelPermissions(channel.id, isAnnouncement ? ['follow_announcements'] : []);
  const canFollowAnnouncements = isAnnouncement && (isAdminOrOwner || canPerm('follow_announcements'));

  // Server info for follow modal
  const { data: servers = [] } = useServers();
  const currentServer = servers.find(s => s.id === serverId);
  const serverName = currentServer?.name || '';
  const serverIcon = currentServer?.icon_url || undefined;

  // Pinned messages
  const { data: pinnedMessages = [] } = usePinnedMessages(channel.id);

  // Summaries
  const {
    activeTopic,
    isDropdownOpen,
    toggleDropdown,
    selectTopic,
    markAsRead,
    summaries,
    isLoading: isSummariesLoading,
    generateSummaries,
    isGenerating,
    showLikedOnly,
    toggleLikedFilter,
    toggleLike,
    likedCount,
  } = useSummaries(channel.id);

  return (
    <div className="flex flex-col h-full">
      {/* Header - Material You elevated surface */}
      <div className="h-13 px-2 flex items-center gap-1.5 bg-[hsl(var(--surface-1))] flex-shrink-0 rounded-b-2xl" style={{ boxShadow: 'var(--shadow-elevation-1)' }}>
        <button onClick={onBack} className="p-2 rounded-full hover:bg-primary/8 transition-all duration-200 flex-shrink-0" style={{ transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)' }}>
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="w-8 h-8 rounded-full bg-primary/8 flex items-center justify-center flex-shrink-0">
          <ChannelIcon className="w-4 h-4 text-primary" />
        </div>

        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <h2 className="font-semibold text-sm truncate">{channel.name}</h2>
          {canFollowAnnouncements && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFollowModalOpen(true)}
              className="text-xs font-medium flex-shrink-0 rounded-full bg-primary/8 hover:bg-primary/15 text-primary h-6 px-2.5"
            >
              Suivre
            </Button>
          )}
        </div>

        {/* Action icons - Material pill buttons */}
        <div className="flex items-center gap-0">
          {channel.description && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="p-2 rounded-full hover:bg-muted transition-all duration-200 text-muted-foreground">
                  <Info className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" collisionPadding={8} className="w-72 rounded-2xl">
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

          {/* Pinned messages */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="p-2 rounded-full hover:bg-muted transition-all duration-200 text-muted-foreground relative">
                <Pin className="w-4 h-4" />
                {pinnedMessages.length > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] px-0.5 flex items-center justify-center text-[9px] font-bold bg-destructive text-destructive-foreground rounded-full">
                    {pinnedMessages.length}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" collisionPadding={8} className="w-[calc(100vw-2rem)] max-w-80 p-0 rounded-2xl">
              <div className="p-3 border-b border-border">
                <h4 className="font-semibold text-sm">Messages épinglés</h4>
              </div>
              <ScrollArea className="max-h-64">
                {pinnedMessages.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground text-center">Aucun message épinglé</p>
                ) : (
                  <div className="p-2 space-y-1">
                    {pinnedMessages.map((pm: any) => (
                      <div key={pm.id} className="p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <Avatar className="w-5 h-5">
                            {pm.message?.author?.avatar_url && <AvatarImage src={pm.message.author.avatar_url} />}
                            <AvatarFallback className="text-[10px]">
                              {pm.message?.author?.display_name?.slice(0, 2) || '??'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">{pm.message?.author?.display_name || 'Inconnu'}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{pm.message?.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {/* Threads */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="p-2 rounded-full hover:bg-muted transition-all duration-200 text-muted-foreground">
                <StreamlineThreads className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" collisionPadding={8} className="w-[calc(100vw-2rem)] max-w-80 p-0 rounded-2xl">
              <ThreadsPopover channelId={channel.id} onSelectThread={(threadId) => onSelectThread?.(threadId)} />
            </PopoverContent>
          </Popover>

          {/* Summaries */}
          <button
            onClick={() => setShowSummaries(!showSummaries)}
            className="p-2 rounded-full hover:bg-muted transition-all duration-200 text-muted-foreground"
          >
            <StreamlineSummaries className="w-4 h-4" />
          </button>

          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="p-2 rounded-full hover:bg-muted transition-all duration-200 text-muted-foreground">
                <Bell className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" collisionPadding={8} className="w-56 p-3 rounded-2xl">
              <h4 className="font-semibold text-foreground mb-3 text-sm">Notifications</h4>
              <div className="space-y-0.5">
                <button className="flex items-center gap-2 w-full px-3 py-2 rounded-xl hover:bg-muted/50 transition-colors text-sm">
                  <BellRing className="w-4 h-4 text-muted-foreground" />
                  <span>Tous les messages</span>
                </button>
                <button className="flex items-center gap-2 w-full px-3 py-2 rounded-xl hover:bg-muted/50 transition-colors text-sm">
                  <AtSign className="w-4 h-4 text-muted-foreground" />
                  <span>Mentions uniquement</span>
                </button>
                <button className="flex items-center gap-2 w-full px-3 py-2 rounded-xl hover:bg-muted/50 transition-colors text-sm">
                  <BellOff className="w-4 h-4 text-muted-foreground" />
                  <span>Aucun</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Members sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <button className="p-2 rounded-full hover:bg-muted transition-all duration-200 text-muted-foreground">
                <Users className="w-4 h-4" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-80 p-0 rounded-l-2xl [&>button.absolute]:hidden">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground ml-1">Membres</h3>
                <SheetClose asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 mr-0.5 rounded-full">
                    <X className="w-4 h-4" />
                  </Button>
                </SheetClose>
              </div>
              {channel.description && (
                <>
                  <div className="px-3 py-2">
                    <p className="text-xs text-muted-foreground">{channel.description}</p>
                  </div>
                  <Separator />
                </>
              )}
              <MemberList
                members={memberListData}
                ownerId={ownerId}
                serverId={serverId}
                onOpenDM={onOpenDM}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Summaries Bar (collapsible) */}
      {showSummaries && (
        <SummariesBar
          activeTopic={activeTopic}
          isDropdownOpen={isDropdownOpen}
          summaries={summaries}
          onToggleDropdown={toggleDropdown}
          onSelectTopic={(topic) =>
            selectTopic(topic, (messageId) => {
              window.dispatchEvent(
                new CustomEvent("summary:jump-to-message", {
                  detail: { channelId: channel.id, messageId },
                })
              );
            })
          }
          onMarkAsRead={markAsRead}
          onGenerateSummaries={generateSummaries}
          isGenerating={isGenerating}
          isLoading={isSummariesLoading}
          showLikedOnly={showLikedOnly}
          onToggleLikedFilter={toggleLikedFilter}
          onToggleLike={toggleLike}
          likedCount={likedCount}
        />
      )}

      {/* Chat Area or Custom Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {renderCustomContent ? renderCustomContent() : (
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
        )}
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal
        open={showSearch}
        onClose={() => setShowSearch(false)}
        serverId={serverId}
      />

      {/* Follow Channel Modal (announcement only) */}
      {isAnnouncement && (
        <>
          <FollowChannelModal
            open={followModalOpen}
            onClose={() => setFollowModalOpen(false)}
            sourceChannelId={channel.id}
            sourceChannelName={channel.name}
            sourceServerName={serverName}
            sourceServerIcon={serverIcon}
            onSuccess={() => {
              setFollowModalOpen(false);
              setFollowSuccessOpen(true);
            }}
          />
          <FollowSuccessModal
            open={followSuccessOpen}
            onClose={() => setFollowSuccessOpen(false)}
          />
        </>
      )}
    </div>
  );
}
