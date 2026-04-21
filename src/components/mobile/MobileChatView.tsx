import { useState, ReactNode } from 'react';
import { ChevronLeft, Users, Pin, Bell, Search, X, MoreVertical, Rss } from 'lucide-react';
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
import { MobileMoreActionsSheet, MobileMoreAction } from '@/components/mobile/MobileMoreActionsSheet';
import { MobileChannelDetailSheet } from '@/components/mobile/MobileChannelDetailSheet';
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
    type: 'text' | 'voice' | 'forum' | 'announcement' | 'media' | 'calendar' | 'tasks' | 'stage' | 'link';
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
  const [detailOpen, setDetailOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [threadsOpen, setThreadsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);

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

  // Members count
  const memberCount = memberListData.length;

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

  // Build kebab actions
  const moreActions: MobileMoreAction[] = [
    {
      id: 'search',
      label: 'Rechercher',
      icon: Search,
      onSelect: () => setShowSearch(true),
    },
    {
      id: 'pinned',
      label: pinnedMessages.length > 0 ? `Messages épinglés (${pinnedMessages.length})` : 'Messages épinglés',
      icon: Pin,
      onSelect: () => setPinnedOpen(true),
    },
    {
      id: 'threads',
      label: 'Fils de discussion',
      icon: StreamlineThreads,
      onSelect: () => setThreadsOpen(true),
    },
    {
      id: 'summaries',
      label: showSummaries ? 'Masquer les résumés' : 'Afficher les résumés',
      icon: StreamlineSummaries,
      onSelect: () => setShowSummaries(v => !v),
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      onSelect: () => setDetailOpen(true),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Compact header - Back, Icon, Name (tappable), Members count, Kebab */}
      <div
        className="h-13 px-1.5 flex items-center gap-1 bg-[hsl(var(--surface-1))] flex-shrink-0 rounded-b-2xl"
        style={{ boxShadow: 'var(--shadow-elevation-1)' }}
      >
        <button
          onClick={onBack}
          aria-label="Retour"
          title="Retour"
          className="p-2 rounded-full active:bg-primary/10 transition-all duration-200 flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Tappable title block — opens detail sheet */}
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          className="flex-1 min-w-0 flex items-center gap-2 px-1 py-1.5 rounded-xl active:bg-primary/8 transition-colors text-left"
          aria-label={`Détails du salon ${channel.name}`}
        >
          <div className="w-8 h-8 rounded-full bg-primary/8 flex items-center justify-center flex-shrink-0">
            <ChannelIcon className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-sm truncate leading-tight">{channel.name}</h2>
            {channel.description && (
              <p className="text-[11px] text-muted-foreground truncate leading-tight">{channel.description}</p>
            )}
          </div>
        </button>

        {/* Follow button — restored to header for parity with desktop */}
        {canFollowAnnouncements && (
          <button
            type="button"
            onClick={() => setFollowModalOpen(true)}
            className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border border-border/60 bg-muted/40 active:bg-muted transition-colors min-h-[32px]"
            aria-label="Suivre cette annonce"
            title="Suivre"
          >
            <Rss className="w-3.5 h-3.5" />
            <span>Suivre</span>
          </button>
        )}

        {/* Members count - opens member sheet */}
        <Sheet open={membersOpen} onOpenChange={setMembersOpen}>
          <SheetTrigger asChild>
            <button
              aria-label={`Membres, ${memberCount}`}
              title="Membres"
              className="px-2 py-1 rounded-full active:bg-muted transition-colors flex items-center gap-1 text-muted-foreground min-h-[44px]"
            >
              <Users className="w-4 h-4" />
              <span className="text-xs font-semibold tabular-nums">{memberCount}</span>
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85vw] max-w-80 p-0 rounded-l-2xl [&>button.absolute]:hidden">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground ml-1">Membres</h3>
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 mr-0.5 rounded-full" aria-label="Fermer">
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

        {/* Kebab - more actions */}
        <button
          onClick={() => setMoreOpen(true)}
          aria-label="Plus d'actions"
          title="Plus d'actions"
          className="p-2 rounded-full active:bg-muted transition-colors text-muted-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Summaries Bar (collapsible) */}
      {showSummaries && (
        <SummariesBar
          activeTopic={activeTopic}
          isDropdownOpen={isDropdownOpen}
          summaries={summaries}
          onToggleDropdown={toggleDropdown}
          onSelectTopic={selectTopic}
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

      {/* Channel detail bottom sheet (tap title) */}
      <MobileChannelDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        channelName={channel.name}
        channelType={channel.type}
        description={channel.description}
        pinnedCount={pinnedMessages.length}
        ChannelIcon={ChannelIcon}
        onShowPinned={() => setPinnedOpen(true)}
        onShowThreads={() => setThreadsOpen(true)}
        onShowSummaries={() => setShowSummaries(true)}
        onSetNotifications={() => { /* TODO: persist */ }}
      />

      {/* More actions (kebab) */}
      <MobileMoreActionsSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        title="Salon"
        actions={moreActions}
      />

      {/* Pinned messages drawer */}
      <Sheet open={pinnedOpen} onOpenChange={setPinnedOpen}>
        <SheetContent side="right" className="w-[90vw] max-w-md p-0 rounded-l-2xl [&>button.absolute]:hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <h3 className="text-sm font-semibold ml-1">Messages épinglés</h3>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Fermer">
                <X className="w-4 h-4" />
              </Button>
            </SheetClose>
          </div>
          <ScrollArea className="h-[calc(100%-3rem)]">
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
        </SheetContent>
      </Sheet>

      {/* Threads drawer */}
      <Sheet open={threadsOpen} onOpenChange={setThreadsOpen}>
        <SheetContent side="right" className="w-[90vw] max-w-md p-0 rounded-l-2xl [&>button.absolute]:hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <h3 className="text-sm font-semibold ml-1">Fils de discussion</h3>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Fermer">
                <X className="w-4 h-4" />
              </Button>
            </SheetClose>
          </div>
          <div className="h-[calc(100%-3rem)] overflow-hidden">
            <ThreadsPopover
              channelId={channel.id}
              onSelectThread={(threadId) => {
                onSelectThread?.(threadId);
                setThreadsOpen(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

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
