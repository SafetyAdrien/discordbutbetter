import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { MobileBottomNav, MobileTab } from './MobileBottomNav';
import { MobileServersView } from './MobileServersView';
import { MobileChannelListView } from './MobileChannelListView';
import { MobileChatView } from './MobileChatView';

import { MobileProfileView } from './MobileProfileView';

import { MobileThreadView } from './MobileThreadView';
import { VoiceChannelView } from '@/components/channels/VoiceChannelView';
import { VoicePiP } from './VoicePiP';
import { StageChannel } from '@/components/channels/StageChannel';
import { MediaChannel } from '@/components/channels/MediaChannel';
import { ForumChannel } from '@/components/channels/ForumChannel';
import { TasksChannel } from '@/components/channels/TasksChannel';
import { CalendarChannel } from '@/components/channels/CalendarChannel';
import { AnnouncementChannel } from '@/components/channels/AnnouncementChannel';
import { ExternalLinkWarningModal } from '@/components/modals/ExternalLinkWarningModal';
import { DiscoverModal } from '@/components/modals/DiscoverModal';
import { CreateServerModal } from '@/components/modals/CreateServerModal';
import { ServerSettingsModal } from '@/components/server-settings/ServerSettingsModal';
import { VoiceControls } from '@/components/layout/VoiceControls';
import { useVoice } from '@/contexts/VoiceContext';
import { useMessages, useSendMessage } from '@/hooks/useMessages';
import { useChannels } from '@/hooks/useChannels';
import { useMembers, MemberWithProfile } from '@/hooks/useMembers';
import { useSwipeBack } from '@/hooks/useSwipeBack';

import { useHistoryNavigation, HistoryViewState } from '@/hooks/useHistoryNavigation';
import { useNavigationState } from '@/hooks/useNavigationState';
import { useVisualViewport } from '@/hooks/useVisualViewport';
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
  onCreateServer: (name: string, iconFile: File | null, bannerFile: File | null, templateId?: string | null) => void;
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
  const {
    mobileActiveTab: persistedTab,
    mobileView: persistedView,
    setMobileActiveTab: persistMobileTab,
    setMobileView: persistMobileView,
  } = useNavigationState();

  // Restore persisted state on mount
  const [activeTab, setActiveTabLocal] = useState<MobileTab>(() => {
    const tab = persistedTab as MobileTab;
    if (tab === 'servers' || tab === 'explore' || tab === 'profile') return tab;
    return 'servers';
  });
  const [mobileView, setMobileViewLocal] = useState<MobileView>(() => {
    if (persistedView && persistedView.type) {
      return persistedView as unknown as MobileView;
    }
    return { type: 'tab' };
  });

  const [showDiscover, setShowDiscover] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [settingsServerId, setSettingsServerId] = useState<string | null>(null);
  const [settingsInitialTab, setSettingsInitialTab] = useState<string | undefined>(undefined);
  const [externalLinkUrl, setExternalLinkUrl] = useState<string | null>(null);

  const openServerSettings = (serverId: string, initialTab?: string) => {
    setSettingsInitialTab(initialTab);
    setSettingsServerId(serverId);
  };

  // Persist on change
  const setActiveTab = useCallback((tab: MobileTab) => {
    setActiveTabLocal(tab);
    persistMobileTab(tab);
  }, [persistMobileTab]);

  const setMobileView = useCallback((view: MobileView) => {
    setMobileViewLocal(view);
    persistMobileView(view.type === 'tab' ? { type: 'tab' } : view as any);
  }, [persistMobileView]);

  // History navigation
  const buildHistoryState = useCallback((view: MobileView, tab: MobileTab): HistoryViewState => ({
    serverId: null,
    channelId: null,
    dmId: null,
    threadId: null,
    mobileView: view.type,
    mobileTab: tab,
    mobileServerId: 'serverId' in view ? view.serverId : undefined,
    mobileChannelId: 'channelId' in view ? view.channelId : undefined,
    mobileChannelType: view.type === 'chat' ? view.channelType : undefined,
    mobileThreadId: view.type === 'thread' ? view.threadId : undefined,
    mobileChannelName: view.type === 'thread' ? view.channelName : undefined,
    mobileFromTab: view.type === 'chat' ? view.fromTab : undefined,
  }), []);

  const handlePop = useCallback((state: HistoryViewState) => {
    if (!state.mobileView) return;
    const tab = (state.mobileTab as MobileTab) || 'servers';
    setActiveTabLocal(tab);
    persistMobileTab(tab);

    let view: MobileView;
    switch (state.mobileView) {
      case 'channels':
        view = { type: 'channels', serverId: state.mobileServerId || '' };
        break;
      case 'chat':
        view = { type: 'chat', serverId: state.mobileServerId || '', channelId: state.mobileChannelId || '', channelType: state.mobileChannelType || 'text', fromTab: state.mobileFromTab };
        break;
      case 'thread':
        view = { type: 'thread', serverId: state.mobileServerId || '', channelId: state.mobileChannelId || '', threadId: state.mobileThreadId || '', channelName: state.mobileChannelName || '' };
        break;
      default:
        view = { type: 'tab' };
    }
    setMobileViewLocal(view);
    persistMobileView(view.type === 'tab' ? { type: 'tab' } : view as any);
  }, [persistMobileTab, persistMobileView]);

  const { pushView, replaceView } = useHistoryNavigation(handlePop);

  // Replace initial state
  const initialReplaced = useRef(false);
  useEffect(() => {
    if (!initialReplaced.current) {
      initialReplaced.current = true;
      replaceView(buildHistoryState(mobileView, activeTab));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Push history on navigation (not on initial mount)
  const prevViewRef = useRef<string>('');
  useEffect(() => {
    const key = JSON.stringify({ type: mobileView.type, tab: activeTab, ...('channelId' in mobileView ? { ch: mobileView.channelId } : {}), ...('threadId' in mobileView ? { th: mobileView.threadId } : {}) });
    if (prevViewRef.current && prevViewRef.current !== key) {
      pushView(buildHistoryState(mobileView, activeTab));
    }
    prevViewRef.current = key;
  }, [mobileView, activeTab, pushView, buildHistoryState]);

  const { voiceState, leaveChannel, toggleMute, toggleDeafen, isConnected } = useVoice();

  // Data for current server view
  const currentServerId = mobileView.type === 'channels' || mobileView.type === 'chat' || mobileView.type === 'thread'
    ? mobileView.serverId : null;

  const { data: channelsData } = useChannels(currentServerId);
  const { data: messages = [] } = useMessages(mobileView.type === 'chat' ? mobileView.channelId : null);
  const { data: members = [] } = useMembers(currentServerId);
  const sendMessage = useSendMessage();

  const currentServer = rawServers.find(s => s.id === currentServerId);
  const resolvedCategories = channelsData?.categories ?? currentServer?.categories ?? [];
  const resolvedOrphanChannels = channelsData?.orphanChannels ?? currentServer?.orphanChannels ?? [];

  const handleSendMessage = (content: string, attachments?: any[], replyToId?: string | null) => {
    if (mobileView.type === 'chat') {
      sendMessage.mutate({ channelId: mobileView.channelId, content, attachments: attachments || [], replyToId: replyToId ?? null });
    }
  };

  const handleServerSelect = useCallback((serverId: string) => {
    onServerSelect(serverId);
    // Selecting a server from the base mobile servers tab should always clear any stale overlay.
    if (mobileView.type !== 'tab') {
      setMobileView({ type: 'tab' });
    }
  }, [onServerSelect, mobileView.type, setMobileView]);

  // Resolve a channel object from any loaded server (used to intercept link channels)
  const findChannel = useCallback((channelId: string) => {
    for (const s of rawServers) {
      const all = [...s.categories.flatMap((c: any) => c.channels), ...(s.orphanChannels || [])];
      const found = all.find((ch: any) => ch.id === channelId);
      if (found) return found;
    }
    return null;
  }, [rawServers]);

  const handleServerChannelSelect = (serverId: string, channelId: string, channelType: string) => {
    // Intercept link channels — open external link modal instead of navigating to a chat
    if (channelType === 'link') {
      const ch = findChannel(channelId);
      const url = ch?.description || '';
      if (url) setExternalLinkUrl(url);
      return;
    }

    if (serverId) {
      onServerSelect(serverId);
      setMobileView({ type: 'chat', serverId, channelId, channelType, fromTab: true });
    }
  };

  const handleChannelSelect = (channelId: string, channelType: string) => {
    if (channelType === 'link') {
      const ch = findChannel(channelId);
      const url = ch?.description || '';
      if (url) setExternalLinkUrl(url);
      return;
    }
    if (mobileView.type === 'channels') {
      setMobileView({ type: 'chat', serverId: mobileView.serverId, channelId, channelType });
    }
  };

  const handleBackToServers = () => {
    setMobileView({ type: 'tab' });
  };

  const handleBackToChannels = () => {
    if ((mobileView.type === 'chat' && mobileView.fromTab) || (mobileView.type === 'thread')) {
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
    bio: m.serverProfile?.bio || m.user.bio || undefined,
    pronouns: m.serverProfile?.pronouns || m.user.pronouns || undefined,
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
    replyToId: m.reply_to_id ?? null,
    repliedMessage: m.repliedMessage
      ? {
          id: m.repliedMessage.id,
          content: m.repliedMessage.content,
          attachments: m.repliedMessage.attachments || [],
          deleted: m.repliedMessage.deleted,
          author: m.repliedMessage.author
            ? {
                id: m.repliedMessage.author.id,
                username: m.repliedMessage.author.username,
                displayName: m.repliedMessage.author.display_name,
                avatar: m.repliedMessage.author.avatar_url || undefined,
              }
            : null,
        }
      : null,
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
    if (!currentServerId) return null;
    const all = [
      ...resolvedCategories.flatMap((c: any) => c.channels),
      ...resolvedOrphanChannels,
    ];
    return all.find((ch: any) => ch.id === mobileView.channelId);
  }, [mobileView, currentServerId, resolvedCategories, resolvedOrphanChannels]);

  const channelForChat = activeChannel ? {
    id: activeChannel.id,
    name: activeChannel.name,
    type: (activeChannel.type || 'text') as any,
    description: activeChannel.description || undefined,
    server_id: currentServerId || undefined,
  } : null;

  // Track how long the chat fallback has been visible (for explicit "not found" message)
  const [chatFallbackElapsed, setChatFallbackElapsed] = useState(false);
  useEffect(() => {
    setChatFallbackElapsed(false);
    if (mobileView.type !== 'chat') return;
    if (channelForChat && currentServer) return;
    const t = setTimeout(() => setChatFallbackElapsed(true), 2500);
    return () => clearTimeout(t);
  }, [mobileView.type, channelForChat, currentServer]);

  // Validate persisted view against loaded data — auto-recover on confirmed orphan state.
  // Conservative: only fire when servers list is loaded AND (for chat/thread) channelsData
  // belongs to the right server AND has actually been populated.
  useEffect(() => {
    if (!rawServers || rawServers.length === 0) return;
    if (mobileView.type === 'tab') return;

    const sid = 'serverId' in mobileView ? mobileView.serverId : null;
    if (sid && !rawServers.some((s: any) => s.id === sid)) {
      setMobileView({ type: 'tab' });
      return;
    }

    // Only validate channel existence when channelsData is for THIS server
    // and is non-empty (avoid false positives during loading).
    if ((mobileView.type === 'chat' || mobileView.type === 'thread') && currentServerId === sid && channelsData) {
      const all = [
        ...(channelsData.categories || []).flatMap((c: any) => c.channels || []),
        ...(channelsData.orphanChannels || []),
      ];
      if (all.length > 0 && !all.some((ch: any) => ch.id === mobileView.channelId)) {
        setMobileView({ type: 'tab' });
      }
    }
  }, [rawServers, channelsData, mobileView, currentServerId, setMobileView]);


  // Render chat content based on channel type
  const renderChannelContent = () => {
    if (mobileView.type !== 'chat') return null;
    if (!channelForChat || !currentServer) {
      return (
        <div className="flex flex-col h-full">
          <div className="h-12 px-2 flex items-center gap-2 border-b border-border">
            <button onClick={handleBackToChannels} className="p-1.5 rounded-lg hover:bg-muted">
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
            {!chatFallbackElapsed ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Salon introuvable</p>
                <button
                  onClick={() => setMobileView({ type: 'tab' })}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
                >
                  Retour
                </button>
              </>
            )}
          </div>
        </div>
      );
    }

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
            renderCustomContent={() => (
              <AnnouncementChannel {...commonProps} hideHeader />
            )}
          />
        );
      case 'stage':
        return <FullScreenWrapper name={channelForChat.name} onBack={handleBackToChannels}><StageChannel {...commonProps} serverId={currentServer.id} /></FullScreenWrapper>;
      case 'link': {
        // Safety net: a link channel reached the chat view — open the external URL modal and bounce back
        const url = (channelForChat.description as string | undefined) || '';
        if (url) {
          // Defer state update to avoid setState during render
          setTimeout(() => {
            setExternalLinkUrl(url);
            handleBackToChannels();
          }, 0);
        }
        return (
          <FullScreenWrapper name={channelForChat.name} onBack={handleBackToChannels}>
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
              Ouverture du lien externe…
            </div>
          </FullScreenWrapper>
        );
      }
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
  const categoriesForList = resolvedCategories.map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    channels: cat.channels.map((ch: any) => ({
      id: ch.id,
      name: ch.name,
      type: ch.type || 'text',
      description: ch.description,
    })),
  }));

  const orphanChannelsForList = resolvedOrphanChannels.map((ch: any) => ({
    id: ch.id, name: ch.name, type: ch.type || 'text', description: ch.description,
  }));

  // Swipe-back handlers for overlays
  // Full-screen left→right swipe to navigate back from chat/thread overlays.
  // The channel list still uses an edge-only gesture to avoid interfering
  // with channel item interactions.
  const chatSwipe = useSwipeBack({ onBack: handleBackToChannels, fullScreen: true });
  const channelSwipe = useSwipeBack({ onBack: handleBackToServers });
  const threadSwipe = useSwipeBack({ onBack: handleBackToChannels, fullScreen: true });

  const isOverlayActive = mobileView.type !== 'tab';

  // Visual viewport / keyboard handling
  const { keyboardHeight, isKeyboardOpen, isInputFocused } = useVisualViewport();
  // Hide the bottom nav only for full-screen chat/thread overlays or the profile tab.
  // The `channels` (salons) overlay must keep the nav visible at all times.
  const inFullOverlay = mobileView.type === 'chat' || mobileView.type === 'thread';
  const onProfileTab = activeTab === 'profile';
  const hideBottomNav = (isKeyboardOpen && isInputFocused) || inFullOverlay || onProfileTab || showDiscover;

  // Publish keyboard offset as a CSS variable so any component (modals,
  // floating buttons, chat input) can dock above the on-screen keyboard.
  useEffect(() => {
    document.documentElement.style.setProperty('--kb-offset', hideBottomNav ? `${keyboardHeight}px` : '0px');
    return () => {
      document.documentElement.style.setProperty('--kb-offset', '0px');
    };
  }, [keyboardHeight, hideBottomNav]);


  // When the bottom nav is hidden (keyboard open on focused input) the overlays
  // should extend all the way to the bottom — otherwise the 56px nav reservation
  // leaves a transparent strip that reveals the underlying tab view (servers list).
  const overlayBottomClass = hideBottomNav
    ? 'bottom-0'
    : 'bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))]';

  return (
    <div
      className="flex flex-col bg-background overflow-hidden relative"
      style={{ height: '100svh', paddingBottom: hideBottomNav ? `${keyboardHeight}px` : undefined }}
    >
      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {/* Thread overlay */}
          {mobileView.type === 'thread' && (
            <motion.div
              key="thread"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className={`absolute inset-0 ${overlayBottomClass} z-30 bg-background`}
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
              className={`absolute inset-0 ${overlayBottomClass} z-20 bg-background`}
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
              className={`absolute inset-0 ${overlayBottomClass} z-10 bg-background`}
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
                onOpenSettings={(initialTab) => openServerSettings(mobileView.serverId, initialTab)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Base tab views with swipe */}
        <div
          className="h-full"
          style={{ paddingBottom: hideBottomNav ? 0 : 'calc(56px + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="h-full">
            {activeTab === 'servers' && (
              <MobileServersView
                servers={servers}
                activeServerId={activeServerId}
                rawServers={rawServers}
                activeDMId={activeDMId}
                onServerSelect={handleServerSelect}
                onChannelSelect={handleServerChannelSelect}
                onCreateClick={() => setShowCreate(true)}
                onOpenSettings={(initialTab) => activeServerId && openServerSettings(activeServerId, initialTab)}
                onOpenDM={onOpenDM}
                onShowFriends={onShowFriends}
              />
            )}
            {activeTab === 'profile' && (
              <MobileProfileView
                onOpenDM={onOpenDM}
                onSelectServer={(id) => {
                  onServerSelect(id);
                  setMobileView({ type: 'channels', serverId: id });
                  setActiveTab('servers');
                }}
                onCreateServer={() => setShowCreate(true)}
                onDiscover={() => setShowDiscover(true)}
                onClose={() => setActiveTab('servers')}
              />
            )}
          </div>
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
            onToggleMute={() => toggleMute()}
            onToggleDeafen={() => toggleDeafen()}
            onDisconnect={() => leaveChannel()}
          />
        </div>
      )}

      {/* Floating Voice PiP — visible on every view EXCEPT the active voice channel itself */}
      {isConnected && voiceState.channelId &&
        !(mobileView.type === 'chat' && mobileView.channelId === voiceState.channelId) && (
          <VoicePiP
            onExpand={() => {
              // Find the channel and navigate to it
              const channel = rawServers
                .flatMap((s: any) => [...s.categories.flatMap((c: any) => c.channels), ...(s.orphanChannels || [])])
                .find((ch: any) => ch.id === voiceState.channelId);
              if (channel) {
                const serverId = rawServers.find((s: any) =>
                  [...s.categories.flatMap((c: any) => c.channels), ...(s.orphanChannels || [])].some((ch: any) => ch.id === voiceState.channelId)
                )?.id;
                if (serverId) {
                  setMobileView({ type: 'chat', serverId, channelId: voiceState.channelId!, channelType: 'voice' });
                }
              }
            }}
          />
        )}

      {/* Bottom Navigation - hidden when keyboard is open on a focused input */}
      {!activeDMId && !hideBottomNav && (
        <MobileBottomNav
          activeTab={activeTab}
          voiceActive={isConnected && !!voiceState.channelId}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setMobileView({ type: 'tab' });
          }}
        />
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
            onClose={() => { setSettingsServerId(null); setSettingsInitialTab(undefined); }}
            initialTab={settingsInitialTab as any}
          />
        ) : null;
      })()}

      {externalLinkUrl && (
        <ExternalLinkWarningModal
          url={externalLinkUrl}
          onClose={() => setExternalLinkUrl(null)}
        />
      )}
    </div>
  );
}

// Helper components
import { ChevronLeft as ChevronLeftIcon, Loader2 } from 'lucide-react';
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
