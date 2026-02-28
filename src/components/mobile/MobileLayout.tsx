import { useState, useMemo } from 'react';
import { MobileBottomNav, MobileTab } from './MobileBottomNav';
import { MobileHomeView } from './MobileHomeView';
import { MobileServersView } from './MobileServersView';
import { MobileChannelListView } from './MobileChannelListView';
import { MobileChatView } from './MobileChatView';
import { MobileNotificationsView } from './MobileNotificationsView';
import { MobileProfileView } from './MobileProfileView';
import { MobileThreadView } from './MobileThreadView';
import { VoiceChannelView } from '@/components/channels/VoiceChannelView';
import { StageChannel } from '@/components/channels/StageChannel';
import { MediaChannel } from '@/components/channels/MediaChannel';
import { ForumChannel } from '@/components/channels/ForumChannel';
import { TasksChannel } from '@/components/channels/TasksChannel';
import { CalendarChannel } from '@/components/channels/CalendarChannel';
import { AnnouncementChannel } from '@/components/channels/AnnouncementChannel';
import { DiscoverModal } from '@/components/modals/DiscoverModal';
import { CreateServerModal } from '@/components/modals/CreateServerModal';
import { ServerSettingsModal } from '@/components/server-settings/ServerSettingsModal';
import { VoiceControls } from '@/components/layout/VoiceControls';
import { useVoiceState } from '@/hooks/useVoiceState';
import { useMessages, useSendMessage } from '@/hooks/useMessages';
import { useChannels } from '@/hooks/useChannels';
import { useMembers, MemberWithProfile } from '@/hooks/useMembers';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import type { Server, Message, User } from '@/types/app';
import { AnimatePresence, motion } from 'framer-motion';

type MobileView = 
  | { type: 'tab' }
  | { type: 'channels'; serverId: string }
  | { type: 'chat'; serverId: string; channelId: string; channelType: string; fromTab?: boolean }
  | { type: 'thread'; serverId: string; channelId: string; threadId: string; channelName: string };

interface MobileLayoutProps {
  servers: Server[];
  activeServerId: string | null;
  activeDMId: string | null;
  onServerSelect: (serverId: string | null) => void;
  onOpenDM: (conversationId: string) => void;
  onShowFriends: () => void;
  onJoinServer: (serverId: string) => void;
  onCreateServer: (name: string, iconUrl: string | null, bannerUrl?: string | null, templateId?: string | null) => void;
  discoverableServers: Server[];
  rawServers: any[];
}

export function MobileLayout({
  servers,
  activeServerId,
  activeDMId,
  onServerSelect,
  onOpenDM,
  onShowFriends,
  onJoinServer,
  onCreateServer,
  discoverableServers,
  rawServers,
}: MobileLayoutProps) {
  const [activeTab, setActiveTab] = useState<MobileTab>('home');
  const [mobileView, setMobileView] = useState<MobileView>({ type: 'tab' });
  const [showDiscover, setShowDiscover] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [settingsServerId, setSettingsServerId] = useState<string | null>(null);

  const { voiceState, leaveChannel, toggleMute, toggleDeafen, isConnected } = useVoiceState();

  // Data for current server view
  const currentServerId = mobileView.type === 'channels' || mobileView.type === 'chat' || mobileView.type === 'thread'
    ? mobileView.serverId : null;

  const { data: channelsData } = useChannels(currentServerId);
  const { data: messages = [] } = useMessages(mobileView.type === 'chat' ? mobileView.channelId : null);
  const { data: members = [] } = useMembers(currentServerId);
  const sendMessage = useSendMessage();

  const currentServer = rawServers.find(s => s.id === currentServerId);

  const handleSendMessage = (content: string, attachments?: any[]) => {
    if (mobileView.type === 'chat') {
      sendMessage.mutate({ channelId: mobileView.channelId, content, attachments: attachments || [] });
    }
  };

  const handleServerSelect = (serverId: string) => {
    onServerSelect(serverId);
  };

  const handleServerChannelSelect = (channelId: string, channelType: string) => {
    const serverId = activeServerId || servers[0]?.id;
    if (serverId) {
      setMobileView({ type: 'chat', serverId, channelId, channelType, fromTab: true });
    }
  };

  const handleChannelSelect = (channelId: string, channelType: string) => {
    if (mobileView.type === 'channels') {
      setMobileView({ type: 'chat', serverId: mobileView.serverId, channelId, channelType });
    }
  };

  const handleBackToServers = () => {
    setMobileView({ type: 'tab' });
  };

  const handleBackToChannels = () => {
    if ((mobileView.type === 'chat' && mobileView.fromTab) || (mobileView.type === 'thread')) {
      // If came from embedded server tab, go back to tab directly
      if (mobileView.type === 'chat' && mobileView.fromTab) {
        setMobileView({ type: 'tab' });
      } else {
        setMobileView({ type: 'channels', serverId: mobileView.serverId });
      }
    } else if (mobileView.type === 'chat') {
      setMobileView({ type: 'channels', serverId: mobileView.serverId });
    }
  };

  // Build member data
  const memberListData: (User & { roles?: MemberWithProfile['roles'] })[] = members.map(m => ({
    id: m.user.id,
    username: m.user.username,
    displayName: m.nickname || m.user.display_name,
    avatar: m.user.avatar_url || undefined,
    banner: m.user.banner_url || undefined,
    status: m.user.status || 'offline',
    customStatus: m.user.custom_status || undefined,
    roles: m.roles,
  }));

  const memberRolesMap = new Map<string, MemberWithProfile['roles']>();
  members.forEach(m => memberRolesMap.set(m.user.id, m.roles));

  const searchMembers = members.map(m => ({
    id: m.user.id,
    username: m.user.username,
    displayName: m.nickname || m.user.display_name,
    avatar: m.user.avatar_url || undefined,
  }));

  const messagesData: Message[] = messages.map((m: any) => ({
    id: m.id,
    content: m.content,
    attachments: m.attachments || [],
    isSystemMessage: m.author === null,
    edited_at: m.edited_at,
    author: m.author === null ? {
      id: 'system', username: 'system', displayName: 'Système', status: 'online' as const,
    } : {
      id: m.author?.id || '', username: m.author?.username || 'unknown',
      displayName: m.author?.display_name || 'Utilisateur inconnu',
      avatar: m.author?.avatar_url || undefined, status: m.author?.status || 'offline',
    },
    timestamp: new Date(m.created_at || Date.now()),
  }));

  // Active channel info
  const activeChannel = useMemo(() => {
    if (mobileView.type !== 'chat') return null;
    if (!currentServer) return null;
    const all = [
      ...currentServer.categories.flatMap((c: any) => c.channels),
      ...(currentServer.orphanChannels || []),
    ];
    return all.find((ch: any) => ch.id === mobileView.channelId);
  }, [mobileView, currentServer]);

  const channelForChat = activeChannel ? {
    id: activeChannel.id,
    name: activeChannel.name,
    type: (activeChannel.type || 'text') as any,
    description: activeChannel.description || undefined,
    server_id: currentServerId || undefined,
  } : null;

  // Render chat content based on channel type
  const renderChannelContent = () => {
    if (mobileView.type !== 'chat' || !channelForChat || !currentServer) return null;

    const commonProps = {
      key: channelForChat.id,
      channel: channelForChat,
      onToggleMembers: () => {},
      showMembers: false,
    };

    switch (channelForChat.type) {
      case 'voice':
        return (
          <div className="flex flex-col h-full">
            <div className="h-12 px-2 flex items-center gap-2 border-b border-border">
              <button onClick={handleBackToChannels} className="p-1.5 rounded-lg hover:bg-muted"><ChevronLeftIcon /></button>
              <h2 className="font-semibold text-sm truncate flex-1">{channelForChat.name}</h2>
            </div>
            <div className="flex-1 overflow-hidden">
              <VoiceChannelView {...commonProps} serverId={currentServer.id} members={memberListData} ownerId={currentServer.owner_id || ''} onOpenDM={onOpenDM} />
            </div>
          </div>
        );
      case 'media':
        return <FullScreenWrapper name={channelForChat.name} onBack={handleBackToChannels}><MediaChannel {...commonProps} /></FullScreenWrapper>;
      case 'forum':
        return <FullScreenWrapper name={channelForChat.name} onBack={handleBackToChannels}><ForumChannel {...commonProps} /></FullScreenWrapper>;
      case 'tasks':
        return <FullScreenWrapper name={channelForChat.name} onBack={handleBackToChannels}><TasksChannel {...commonProps} /></FullScreenWrapper>;
      case 'calendar':
        return <FullScreenWrapper name={channelForChat.name} onBack={handleBackToChannels}><CalendarChannel {...commonProps} /></FullScreenWrapper>;
      case 'announcement':
        return <FullScreenWrapper name={channelForChat.name} onBack={handleBackToChannels}><AnnouncementChannel {...commonProps} /></FullScreenWrapper>;
      case 'stage':
        return <FullScreenWrapper name={channelForChat.name} onBack={handleBackToChannels}><StageChannel {...commonProps} serverId={currentServer.id} /></FullScreenWrapper>;
      default:
        return (
          <MobileChatView
            channel={channelForChat}
            messages={messagesData}
            onSendMessage={handleSendMessage}
            memberRoles={memberRolesMap}
            members={searchMembers}
            memberListData={memberListData}
            ownerId={currentServer.owner_id || ''}
            serverId={currentServer.id}
            onBack={handleBackToChannels}
            onOpenDM={onOpenDM}
            onSelectThread={(threadId) => {
              setMobileView({
                type: 'thread',
                serverId: mobileView.serverId,
                channelId: mobileView.channelId,
                threadId,
                channelName: channelForChat.name,
              });
            }}
          />
        );
    }
  };

  // Build categories for channel list
  const categoriesForList = currentServer?.categories.map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    channels: cat.channels.map((ch: any) => ({
      id: ch.id,
      name: ch.name,
      type: ch.type || 'text',
      description: ch.description,
    })),
  })) || [];

  const orphanChannelsForList = (currentServer?.orphanChannels || channelsData?.orphanChannels || []).map((ch: any) => ({
    id: ch.id, name: ch.name, type: ch.type || 'text', description: ch.description,
  }));

  // Swipe-back handlers for overlays
  const chatSwipe = useSwipeBack({ onBack: handleBackToChannels });
  const channelSwipe = useSwipeBack({ onBack: handleBackToServers });
  const threadSwipe = useSwipeBack({ onBack: handleBackToChannels });

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden relative">
      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="popLayout">
          {/* Thread overlay */}
          {mobileView.type === 'thread' && (
            <motion.div
              key="thread"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="absolute inset-0 z-30 bg-background"
              onTouchStart={threadSwipe.onTouchStart}
              onTouchMove={threadSwipe.onTouchMove}
              onTouchEnd={threadSwipe.onTouchEnd}
            >
              <MobileThreadView
                threadId={mobileView.threadId}
                channelId={mobileView.channelId}
                serverId={mobileView.serverId}
                channelName={mobileView.channelName}
                onBack={handleBackToChannels}
              />
            </motion.div>
          )}

          {/* Chat overlay */}
          {mobileView.type === 'chat' && (
            <motion.div
              key={`chat-${(mobileView as any).channelId}`}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="absolute inset-0 z-20 bg-background"
              onTouchStart={chatSwipe.onTouchStart}
              onTouchMove={chatSwipe.onTouchMove}
              onTouchEnd={chatSwipe.onTouchEnd}
            >
              {renderChannelContent()}
            </motion.div>
          )}

          {/* Channel list overlay */}
          {mobileView.type === 'channels' && (
            <motion.div
              key={`channels-${mobileView.serverId}`}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="absolute inset-0 z-10 bg-background"
              onTouchStart={channelSwipe.onTouchStart}
              onTouchMove={channelSwipe.onTouchMove}
              onTouchEnd={channelSwipe.onTouchEnd}
            >
              <MobileChannelListView
                serverName={currentServer?.name || 'Serveur'}
                serverId={mobileView.serverId}
                categories={categoriesForList}
                orphanChannels={orphanChannelsForList}
                onBack={handleBackToServers}
                onChannelSelect={handleChannelSelect}
                onOpenSettings={() => setSettingsServerId(mobileView.serverId)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Base tab views */}
        <div className="h-full pb-[calc(56px+env(safe-area-inset-bottom,0px))]">
          {activeTab === 'home' && (
            <MobileHomeView
              activeDMId={activeDMId}
              onConversationSelect={onOpenDM}
              onShowFriends={onShowFriends}
            />
          )}
          {activeTab === 'servers' && (
            <MobileServersView
              servers={servers}
              activeServerId={activeServerId}
              rawServers={rawServers}
              onServerSelect={handleServerSelect}
              onChannelSelect={handleServerChannelSelect}
              onDiscoverClick={() => setShowDiscover(true)}
              onCreateClick={() => setShowCreate(true)}
              onOpenSettings={() => activeServerId && setSettingsServerId(activeServerId)}
            />
          )}
          {activeTab === 'notifications' && <MobileNotificationsView />}
          {activeTab === 'profile' && <MobileProfileView />}
        </div>
      </div>

      {/* Voice Controls (floating above bottom nav) */}
      {isConnected && voiceState.channelName && (
        <div className="px-3 pb-1">
          <VoiceControls
            channelName={voiceState.channelName}
            serverName={voiceState.serverName}
            isMuted={voiceState.isMuted}
            isDeafened={voiceState.isDeafened}
            onToggleMute={() => toggleMute.mutate()}
            onToggleDeafen={() => toggleDeafen.mutate()}
            onDisconnect={() => leaveChannel.mutate()}
          />
        </div>
      )}

      {/* Bottom Navigation - only show when no overlay view */}
      {mobileView.type === 'tab' && !activeDMId && (
        <MobileBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      )}

      {/* Modals */}
      {showDiscover && (
        <DiscoverModal
          servers={discoverableServers}
          onClose={() => setShowDiscover(false)}
          onJoinServer={(id) => { onJoinServer(id); setShowDiscover(false); }}
        />
      )}
      {showCreate && (
        <CreateServerModal
          onClose={() => setShowCreate(false)}
          onCreate={(name, icon, banner, template) => {
            onCreateServer(name, icon, banner, template);
            setShowCreate(false);
          }}
        />
      )}
      {settingsServerId && (() => {
        const settingsServer = rawServers.find((s: any) => s.id === settingsServerId);
        return settingsServer ? (
          <ServerSettingsModal
            serverId={settingsServerId}
            serverName={settingsServer.name}
            onClose={() => setSettingsServerId(null)}
          />
        ) : null;
      })()}
    </div>
  );
}

// Helper components
import { ChevronLeft as ChevronLeftIcon } from 'lucide-react';
import { ReactNode } from 'react';

function FullScreenWrapper({ name, onBack, children }: { name: string; onBack: () => void; children: ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      <div className="h-12 px-2 flex items-center gap-2 border-b border-border flex-shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted"><ChevronLeftIcon className="w-5 h-5" /></button>
        <h2 className="font-semibold text-sm truncate flex-1">{name}</h2>
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
