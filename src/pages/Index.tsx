import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ServerList } from '@/components/layout/ServerList';
import { ChannelList } from '@/components/layout/ChannelList';
import { MemberList } from '@/components/layout/MemberList';
import { ChatArea } from '@/components/chat/ChatArea';
import { DMPage } from '@/components/dm/DMPage';
import { DiscoverModal } from '@/components/modals/DiscoverModal';
import { CreateServerModal } from '@/components/modals/CreateServerModal';
import { ServerSettingsModal } from '@/components/server-settings/ServerSettingsModal';
import { KeyboardShortcutsModal } from '@/components/modals/KeyboardShortcutsModal';
import { GlobalSearchModal } from '@/components/modals/GlobalSearchModal';
import { MediaChannel } from '@/components/channels/MediaChannel';
import { ForumChannel } from '@/components/channels/ForumChannel';
import { TasksChannel } from '@/components/channels/TasksChannel';
import { CalendarChannel } from '@/components/channels/CalendarChannel';
import { AnnouncementChannel } from '@/components/channels/AnnouncementChannel';
import { VoiceChannelView } from '@/components/channels/VoiceChannelView';
import { StageChannel } from '@/components/channels/StageChannel';
import ThreadView from '@/components/threads/ThreadView';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { TabletLayout } from '@/components/tablet/TabletLayout';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAuth } from '@/contexts/AuthContext';
import { useServers, usePublicServers, useCreateServer, useJoinServer } from '@/hooks/useServers';
import { useChannels } from '@/hooks/useChannels';
import { useMessages, useSendMessage } from '@/hooks/useMessages';
import { useMembers, MemberWithProfile } from '@/hooks/useMembers';
import { useProfilesRealtime } from '@/hooks/useProfilesRealtime';
import { usePermissionsRealtime, useGlobalPermissionsRealtime } from '@/hooks/usePermissionsRealtime';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useVoice } from '@/contexts/VoiceContext';
import { useNavigationState } from '@/hooks/useNavigationState';
import { useHistoryNavigation, HistoryViewState } from '@/hooks/useHistoryNavigation';
import LoadingScreen from '@/components/LoadingScreen';
import { usePreloader } from '@/hooks/usePreloader';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, Users } from 'lucide-react';
import type { Server, Message, User } from '@/types/app';

// Main application component
const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isMobile, isTablet } = useBreakpoint();
  
  // Navigation state persistence
  const {
    activeServerId: persistedServerId,
    activeDMId: persistedDMId,
    activeChannelId: persistedChannelId,
    activeThreadId: persistedThreadId,
    threadChannelId: persistedThreadChannelId,
    channelsByServer,
    setActiveServerId: setPersistedServerId,
    setActiveDMId: setPersistedDMId,
    setActiveChannelId: setPersistedChannelId,
    setActiveThreadId: setPersistedThreadId,
    setThreadChannelId: setPersistedThreadChannelId,
    setChannelForServer,
    getChannelForServer,
    threadFullscreen,
    setThreadFullscreen,
  } = useNavigationState();
  
  const [activeServerId, setActiveServerIdLocal] = useState<string | null>(persistedServerId);
  const [activeChannelId, setActiveChannelIdLocal] = useState<string | null>(persistedChannelId);
  const [activeDMId, setActiveDMIdLocal] = useState<string | null>(persistedDMId);
  const [activeThreadId, setActiveThreadIdLocal] = useState<string | null>(persistedThreadId);
  const [threadChannelId, setThreadChannelIdLocal] = useState<string | null>(persistedThreadChannelId);
  const [showDiscover, setShowDiscover] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [serverSettingsInitialTab, setServerSettingsInitialTab] = useState<string | undefined>(undefined);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showMembers, setShowMembers] = useState(true);
  const [tabletChannelsOpen, setTabletChannelsOpen] = useState(false);
  const [tabletMembersOpen, setTabletMembersOpen] = useState(false);
  const [voiceChatChannelId, setVoiceChatChannelId] = useState<string | null>(null);
  const [threadPanelFlex, setThreadPanelFlex] = useState(4); // flex ratio for thread panel
  const threadResizing = useRef(false);

  // Wrapper functions to persist navigation state
  const setActiveServerId = useCallback((id: string | null) => {
    setActiveServerIdLocal(id);
    setPersistedServerId(id);
  }, [setPersistedServerId]);
  
  const setActiveDMId = useCallback((id: string | null) => {
    setActiveDMIdLocal(id);
    setPersistedDMId(id);
  }, [setPersistedDMId]);

  const setActiveChannelId = useCallback((id: string | null) => {
    setActiveChannelIdLocal(id);
    setPersistedChannelId(id);
  }, [setPersistedChannelId]);

  const setActiveThreadId = useCallback((id: string | null) => {
    setActiveThreadIdLocal(id);
    setPersistedThreadId(id);
  }, [setPersistedThreadId]);

  const setThreadChannelId = useCallback((id: string | null) => {
    setThreadChannelIdLocal(id);
    setPersistedThreadChannelId(id);
  }, [setPersistedThreadChannelId]);

  // --- History navigation (desktop) ---
  const buildHistoryState = useCallback((): HistoryViewState => ({
    serverId: activeServerId,
    channelId: activeChannelId,
    dmId: activeDMId,
    threadId: activeThreadId,
  }), [activeServerId, activeChannelId, activeDMId, activeThreadId]);

  const handleHistoryPop = useCallback((state: HistoryViewState) => {
    setActiveServerIdLocal(state.serverId);
    setPersistedServerId(state.serverId);
    setActiveChannelIdLocal(state.channelId);
    setPersistedChannelId(state.channelId);
    setActiveDMIdLocal(state.dmId);
    setPersistedDMId(state.dmId);
    setActiveThreadIdLocal(state.threadId);
    setPersistedThreadId(state.threadId);
  }, [setPersistedServerId, setPersistedChannelId, setPersistedDMId, setPersistedThreadId]);

  const { pushView, replaceView } = useHistoryNavigation(handleHistoryPop);

  // Replace initial history entry
  const initialReplaced = useRef(false);
  useEffect(() => {
    if (!isMobile && !initialReplaced.current) {
      initialReplaced.current = true;
      replaceView(buildHistoryState());
    }
  }, [isMobile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Push history on significant navigation changes (desktop only)
  const prevNavKey = useRef('');
  useEffect(() => {
    if (isMobile) return;
    const key = `${activeServerId}|${activeChannelId}|${activeDMId}|${activeThreadId}`;
    if (prevNavKey.current && prevNavKey.current !== key) {
      pushView({
        serverId: activeServerId,
        channelId: activeChannelId,
        dmId: activeDMId,
        threadId: activeThreadId,
      });
    }
    prevNavKey.current = key;
  }, [activeServerId, activeChannelId, activeDMId, activeThreadId, isMobile, pushView]);

  // Data hooks
  const { data: servers = [], isLoading: serversLoading, isPending: serversPending } = useServers();
  const { data: publicServers = [] } = usePublicServers();
  
  // Prepare initial channels data from servers cache for instant display
  const initialChannelsData = useMemo(() => {
    if (!activeServerId) return undefined;
    const server = servers.find(s => s.id === activeServerId);
    if (!server) return undefined;
    
    return {
      categories: server.categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        position: cat.position ?? 0,
        channels: cat.channels.map(ch => ({
          id: ch.id,
          name: ch.name,
          type: ch.type as import('@/hooks/useChannels').ChannelType,
          description: ch.description ?? null,
          position: ch.position ?? 0,
          category_id: cat.id,
          server_id: activeServerId,
          icon_url: (ch as any).icon_url ?? null,
        })),
      })),
      orphanChannels: (server.orphanChannels || []).map(ch => ({
        id: ch.id,
        name: ch.name,
        type: ch.type as import('@/hooks/useChannels').ChannelType,
        description: ch.description ?? null,
        position: ch.position ?? 0,
        category_id: null,
        server_id: activeServerId,
        icon_url: (ch as any).icon_url ?? null,
      })),
    };
  }, [activeServerId, servers]);
  
  const { data: channelsData } = useChannels(activeServerId, initialChannelsData);
  const { data: messages = [] } = useMessages(activeChannelId);
  const { data: members = [] } = useMembers(activeServerId);
  // Realtime profiles updates (DB -> postgres_changes)
  useProfilesRealtime();
  
  // Realtime permissions updates (server-specific + global)
  usePermissionsRealtime(activeServerId);
  useGlobalPermissionsRealtime();

  // Voice state
  const { voiceState, toggleMute } = useVoice();

  // Mutations
  const createServer = useCreateServer();
  const joinServer = useJoinServer();
  const sendMessage = useSendMessage();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onEscape: () => {
      if (showGlobalSearch) setShowGlobalSearch(false);
      else if (showShortcutsHelp) setShowShortcutsHelp(false);
      else if (showDiscover) setShowDiscover(false);
      else if (showCreate) setShowCreate(false);
      else if (showServerSettings) setShowServerSettings(false);
    },
    onSearch: () => {
      setShowGlobalSearch(true);
    },
    onShortcutsHelp: () => setShowShortcutsHelp(true),
    onToggleMute: () => {
      if (voiceState.channelId) {
        toggleMute();
      }
    },
  });


  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Set first server as active when servers load (only if not on home/DM view)
  useEffect(() => {
    if (servers.length > 0 && activeServerId === null && activeDMId === null) {
      // Start on home (DM) view by default
      // User can click a server to switch
    }
  }, [servers, activeServerId, activeDMId]);

  // Reactive redirect: if active server no longer exists (left/deleted), go to last visited server
  useEffect(() => {
    if (!activeServerId || !servers || serversPending) return;
    const stillExists = servers.some(s => s.id === activeServerId);
    if (stillExists) return;

    // Find last visited server from channelsByServer history
    const visitedServerIds = Object.keys(channelsByServer);
    const fallbackServer = visitedServerIds
      .filter(id => id !== activeServerId)
      .reverse()
      .find(id => servers.some(s => s.id === id));

    if (fallbackServer) {
      setActiveServerId(fallbackServer);
    } else if (servers.length > 0) {
      setActiveServerId(servers[0].id);
    } else {
      setActiveServerId(null);
    }
    setActiveChannelId(null);
    setActiveThreadId(null);
    setThreadChannelId(null);
  }, [activeServerId, servers, serversLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeServer = servers.find((s) => s.id === activeServerId);
  const resolvedCategories = channelsData?.categories ?? activeServer?.categories ?? [];
  const resolvedOrphanChannels = channelsData?.orphanChannels ?? activeServer?.orphanChannels ?? [];
  const activeChannel = resolvedCategories
    .flatMap((c) => c.channels)
    .find((ch) => ch.id === activeChannelId)
    || resolvedOrphanChannels.find((ch) => ch.id === activeChannelId);

  // Update active channel when server changes - restore last visited or first text channel
  useEffect(() => {
    if (activeServerId) {
      const server = servers.find(s => s.id === activeServerId);
      if (server) {
        const allChannels = [
          ...resolvedCategories.flatMap(c => c.channels),
          ...resolvedOrphanChannels,
        ];

        // If we already have a persisted channel for this server from session restore, use it
        if (activeChannelId) {
          const exists = allChannels.find(ch => ch.id === activeChannelId);
          if (exists) return; // already set and valid
        }

        // Try to restore last visited channel for this server
        const savedChannelId = getChannelForServer(activeServerId);

        const savedChannel = savedChannelId
          ? allChannels.find(ch => ch.id === savedChannelId)
          : null;

        if (savedChannel) {
          setActiveChannelId(savedChannel.id);
        } else {
          // Fallback to first available channel, prefer text-like channels when present
          const firstChannel = allChannels.find(ch => ch.type === 'text')
            || allChannels.find(ch => ch.type === 'announcement' || ch.type === 'forum' || ch.type === 'media')
            || allChannels[0];
          if (firstChannel) {
            setActiveChannelId(firstChannel.id);
            setChannelForServer(activeServerId, firstChannel.id);
          }
        }
      }
    }
  }, [activeServerId, activeChannelId, servers, resolvedCategories, resolvedOrphanChannels, getChannelForServer, setChannelForServer]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prepare channels and members for search modal
  const searchChannels = useMemo(() => {
    if (!activeServer) return [];
    const allChannels = [
      ...resolvedCategories.flatMap(cat => cat.channels),
      ...resolvedOrphanChannels
    ];
    return allChannels.map(ch => ({
      id: ch.id,
      name: ch.name,
      type: ch.type || 'text'
    }));
  }, [activeServer, resolvedCategories, resolvedOrphanChannels]);

  const searchMembers = useMemo(() => {
    return members.map(m => ({
      id: m.user.id,
      username: m.user.username,
      displayName: m.serverProfile?.display_name || m.nickname || m.user.display_name,
      avatar: m.serverProfile?.avatar_url || m.user.avatar_url || undefined,
      bio: m.serverProfile?.bio || m.user.bio || undefined,
    }));
  }, [members]);

  const handleSendMessage = (content: string, attachments?: any[], replyToId?: string | null) => {
    if (!activeChannelId) return;
    sendMessage.mutate({ channelId: activeChannelId, content, attachments: attachments || [], replyToId: replyToId ?? null });
  };

  const handleJoinServer = (serverId: string) => {
    joinServer.mutate(serverId);
    setShowDiscover(false);
  };

  const handleCreateServer = (name: string, iconUrl: string | null, bannerUrl?: string | null, templateId?: string | null) => {
    createServer.mutate(
      { name, icon_url: iconUrl || undefined, banner_url: bannerUrl || undefined, is_public: false, templateId },
      {
        onSuccess: (server) => {
          setActiveServerId(server.id);
          setActiveDMId(null);
          setShowCreate(false);
        },
      }
    );
  };

  const handleOpenDM = (conversationId: string) => {
    setActiveDMId(conversationId);
    setActiveServerId(null);
    setActiveChannelId(null);
  };

  const handleShowFriends = () => {
    setActiveDMId(null);
  };

  const handleServerSelect = (serverId: string | null) => {
    if (serverId === null) {
      // Home button clicked - show DM page
      setActiveServerId(null);
      setActiveChannelId(null);
    } else {
      setActiveServerId(serverId);
      setActiveDMId(null);
    }
  };

  const handleOpenServerSettings = (serverId?: string, initialTab?: string) => {
    if (serverId) {
      setActiveServerId(serverId);
    }
    setServerSettingsInitialTab(initialTab);
    setShowServerSettings(true);
  };

  const handleToggleMembers = () => {
    setShowMembers(!showMembers);
  };

  // Preloader — now runs only in background, without blocking the shell
  const preloader = usePreloader(authLoading, serversPending, servers);

  if (authLoading) {
    return <LoadingScreen progress={preloader.progress} currentStep={preloader.currentStep} />;
  }

  if (!user) {
    return null;
  }

  // Transform data for components - full Server type
  const serverListData: Server[] = servers.map(s => ({
    id: s.id,
    name: s.name,
    icon: s.icon_url || undefined,
    ownerId: s.owner_id || '',
    description: s.description || undefined,
    memberCount: 0,
    isPublic: s.is_public,
    categories: s.categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      channels: cat.channels.map(ch => ({
        id: ch.id,
        name: ch.name,
        type: (ch.type || 'text') as 'text' | 'voice' | 'forum' | 'announcement' | 'media' | 'calendar' | 'tasks' | 'stage' | 'link',
        description: ch.description || undefined,
        icon_url: (ch as any).icon_url ?? null,
      })),
    })),
  }));

  const serverForChannelList = activeServer ? {
    id: activeServer.id,
    name: activeServer.name,
    ownerId: activeServer.owner_id || '',
    iconUrl: activeServer.icon_url || undefined,
    bannerUrl: activeServer.banner_url || undefined,
    description: activeServer.description || undefined,
    createdAt: activeServer.created_at || undefined,
    categories: resolvedCategories.map(cat => ({
      id: cat.id,
      name: cat.name,
      channels: cat.channels.map(ch => ({
        id: ch.id,
        name: ch.name,
        type: (ch.type || 'text') as 'text' | 'voice' | 'forum' | 'announcement' | 'media' | 'calendar' | 'tasks' | 'stage' | 'link',
        description: ch.description || undefined,
        icon_url: (ch as any).icon_url ?? null,
      })),
    })),
  } : null;

  const memberListData: (User & { roles?: MemberWithProfile['roles']; activity_type?: string | null; activity_text?: string | null })[] = members.map(m => ({
    id: m.user.id,
    username: m.user.username,
    displayName: m.serverProfile?.display_name || m.nickname || m.user.display_name,
    avatar: m.serverProfile?.avatar_url || m.user.avatar_url || undefined,
    banner: m.serverProfile?.banner_url || m.user.banner_url || undefined,
    status: m.user.status || 'offline',
    customStatus: m.user.custom_status || undefined,
    activity_type: m.user.activity_type,
    activity_text: m.user.activity_text,
    bio: m.serverProfile?.bio || m.user.bio || undefined,
    pronouns: m.serverProfile?.pronouns || m.user.pronouns || undefined,
    roles: m.roles,
  }));

  // Create member roles map for ChatArea
  const memberRolesMap = new Map<string, MemberWithProfile['roles']>();
  members.forEach(m => {
    memberRolesMap.set(m.user.id, m.roles);
  });

  const messagesData: Message[] = messages.map((m) => {
    const isSystemMessage = m.author === null || m.is_system === true;
    return {
      id: m.id,
      content: m.content,
      attachments: (m as any).attachments || [],
      isSystemMessage,
      is_system: m.is_system,
      edited_at: m.edited_at,
      author: m.author === null ? {
        id: 'system',
        username: 'system',
        displayName: 'Système',
        status: 'online' as const,
      } : {
        id: m.author?.id || '',
        username: m.author?.username || 'unknown',
        displayName: m.author?.display_name || 'Utilisateur inconnu',
        avatar: m.author?.avatar_url || undefined,
        status: m.author?.status || 'offline',
      },
      timestamp: new Date(m.created_at || Date.now()),
      replyToId: (m as any).reply_to_id ?? null,
      repliedMessage: (m as any).repliedMessage
        ? {
            id: (m as any).repliedMessage.id,
            content: (m as any).repliedMessage.content ?? '',
            attachments: (m as any).repliedMessage.attachments ?? [],
            deleted: (m as any).repliedMessage.deleted === true,
            author: (m as any).repliedMessage.author
              ? {
                  id: (m as any).repliedMessage.author.id,
                  username: (m as any).repliedMessage.author.username,
                  displayName:
                    (m as any).repliedMessage.author.display_name ||
                    (m as any).repliedMessage.author.username ||
                    'Utilisateur',
                  avatar: (m as any).repliedMessage.author.avatar_url || undefined,
                }
              : null,
          }
        : null,
    };
  });

  const channelForChat = activeChannel ? {
    id: activeChannel.id,
    name: activeChannel.name,
    type: (activeChannel.type || 'text') as 'text' | 'voice' | 'forum' | 'announcement' | 'media' | 'calendar' | 'tasks' | 'stage',
    description: activeChannel.description || undefined,
    server_id: activeServerId || undefined,
  } : null;

  // Filter public servers that user hasn't joined
  const discoverableServers: Server[] = publicServers
    .filter(ps => !servers.some(s => s.id === ps.id))
    .map(s => ({
      id: s.id,
      name: s.name,
      icon: s.icon_url || undefined,
      description: s.description || '',
      ownerId: s.owner_id || '',
      memberCount: Array.isArray(s.server_members) ? s.server_members.length : 0,
      isPublic: true,
      categories: [],
    }));

  // Determine if we're on home (DM) view
  const isHomeView = activeServerId === null;

  // Mobile layout
  if (isMobile) {
    return (
      <MobileLayout
        servers={serverListData}
        activeServerId={activeServerId}
        activeDMId={activeDMId}
        onServerSelect={handleServerSelect}
        onOpenDM={handleOpenDM}
        onShowFriends={handleShowFriends}
        onJoinServer={handleJoinServer}
        onCreateServer={handleCreateServer}
        discoverableServers={discoverableServers}
        rawServers={servers}
      />
    );
  }

  // Channel list element (shared between desktop inline and tablet drawer)
  const channelListEl = activeServer && serverForChannelList ? (
    <ChannelList
      server={serverForChannelList}
      activeChannelId={activeChannelId}
      onChannelSelect={(channelId) => {
        setActiveChannelId(channelId);
        if (activeServerId) {
          setChannelForServer(activeServerId, channelId);
        }
        setActiveThreadId(null);
        setThreadChannelId(null);
        if (isTablet) setTabletChannelsOpen(false);
      }}
      onOpenServerSettings={(initialTab) => {
        setServerSettingsInitialTab(initialTab);
        setShowServerSettings(true);
      }}
      orphanChannels={resolvedOrphanChannels as import('@/hooks/useChannels').OrphanChannel[]}
      activeThreadId={activeThreadId}
      onThreadSelect={(threadId) => {
        setActiveThreadId(threadId);
        setThreadChannelId(activeChannelId);
        if (isTablet) setTabletChannelsOpen(false);
      }}
      onOpenVoiceChat={(channelId) => {
        setActiveChannelId(channelId);
        if (activeServerId) {
          setChannelForServer(activeServerId, channelId);
        }
        setActiveThreadId(null);
        setThreadChannelId(null);
        setVoiceChatChannelId(channelId);
        if (isTablet) setTabletChannelsOpen(false);
      }}
      onOpenGlobalSearch={() => setShowGlobalSearch(true)}
    />
  ) : null;

  const memberListEl = activeServer && channelForChat?.type !== 'voice' && !activeThreadId ? (
    <MemberList
      members={memberListData}
      ownerId={activeServer.owner_id || ''}
      serverId={activeServer.id}
      onOpenDM={handleOpenDM}
    />
  ) : null;

  return (
    <div className="h-[100svh] flex bg-[hsl(var(--sidebar-background))] overflow-hidden gap-[2px]">
      {/* Server List - compact rail on tablet (64px) */}
      <div className={isTablet ? 'w-[64px] shrink-0 [&>div]:!w-[64px]' : 'shrink-0'}>
        <ServerList
          servers={serverListData}
          activeServerId={activeServerId}
          onServerSelect={handleServerSelect}
          onDiscoverClick={() => setShowDiscover(true)}
          onCreateClick={() => setShowCreate(true)}
          onOpenServerSettings={handleOpenServerSettings}
        />
      </div>

      {/* Home/DM View */}
      {isHomeView ? (
        <DMPage
          activeDMId={activeDMId}
          onConversationSelect={handleOpenDM}
          onShowFriends={handleShowFriends}
        />
      ) : activeServer && serverForChannelList ? (
        <>
          {/* Channel List inline (desktop only) */}
          {!isTablet && channelListEl}

          {/* Main Content Area - resizable split when thread is open */}
          <div className="flex-1 flex min-w-0 w-full overflow-x-hidden relative">
            {/* Tablet floating toggle buttons */}
            {isTablet && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTabletChannelsOpen(true)}
                  className="absolute top-2 left-2 z-30 h-9 w-9 bg-background/80 backdrop-blur-sm border border-border/40 shadow-sm"
                  aria-label="Ouvrir les salons"
                >
                  <Menu className="h-4 w-4" />
                </Button>
                {memberListEl && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTabletMembersOpen(true)}
                    className="absolute top-2 right-2 z-30 h-9 w-9 bg-background/80 backdrop-blur-sm border border-border/40 shadow-sm"
                    aria-label="Ouvrir les membres"
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}

            {channelForChat && (
              <div
                className={`${activeThreadId && (channelForChat.type === 'text' || channelForChat.type === 'announcement') ? (threadFullscreen ? 'hidden' : 'min-w-[300px]') : 'flex-1 min-w-0'} flex flex-col w-full overflow-hidden`}
                style={activeThreadId && (channelForChat.type === 'text' || channelForChat.type === 'announcement') && !threadFullscreen ? { flex: `${10 - threadPanelFlex} 1 0%` } : undefined}
              >
                {channelForChat.type === 'voice' ? (
                  <VoiceChannelView 
                    key={channelForChat.id}
                    channel={channelForChat}
                    serverId={activeServer.id}
                    members={memberListData}
                    ownerId={activeServer.owner_id || ''}
                    onOpenDM={handleOpenDM}
                    initialShowChat={voiceChatChannelId === channelForChat.id}
                    onChatOpened={() => setVoiceChatChannelId(null)}
                  />
                ) : channelForChat.type === 'media' ? (
                  <MediaChannel 
                    key={channelForChat.id}
                    channel={channelForChat}
                    onToggleMembers={handleToggleMembers}
                    showMembers={showMembers}
                  />
                ) : channelForChat.type === 'forum' ? (
                  <ForumChannel 
                    key={channelForChat.id}
                    channel={channelForChat}
                    onToggleMembers={handleToggleMembers}
                    showMembers={showMembers}
                  />
                ) : channelForChat.type === 'tasks' ? (
                  <TasksChannel 
                    key={channelForChat.id}
                    channel={channelForChat}
                    onToggleMembers={handleToggleMembers}
                    showMembers={showMembers}
                  />
                ) : channelForChat.type === 'calendar' ? (
                  <CalendarChannel 
                    key={channelForChat.id}
                    channel={channelForChat}
                    onToggleMembers={handleToggleMembers}
                    showMembers={showMembers}
                  />
                ) : channelForChat.type === 'announcement' ? (
                  <AnnouncementChannel 
                    key={channelForChat.id}
                    channel={channelForChat}
                    onToggleMembers={handleToggleMembers}
                    showMembers={showMembers}
                    onSelectThread={(threadId) => setActiveThreadId(threadId)}
                    activeThreadId={activeThreadId}
                    onCloseThread={() => {
                      setActiveThreadId(null);
                      setThreadChannelId(null);
                    }}
                  />
                ) : channelForChat.type === 'stage' ? (
                  <StageChannel 
                    key={channelForChat.id}
                    channel={channelForChat}
                    serverId={activeServer.id}
                  />
                ) : (
                  <ChatArea
                    key={channelForChat.id}
                    channel={channelForChat}
                    messages={messagesData}
                    onSendMessage={handleSendMessage}
                    memberRoles={memberRolesMap}
                    onOpenDM={handleOpenDM}
                    onToggleMembers={handleToggleMembers}
                    showMembers={showMembers}
                    onSelectThread={(threadId) => setActiveThreadId(threadId)}
                    activeThreadId={activeThreadId}
                    onCloseThread={() => {
                      setActiveThreadId(null);
                      setThreadChannelId(null);
                    }}
                    members={searchMembers}
                    onChannelSelect={(channelId) => {
                      setActiveChannelId(channelId);
                      if (activeServerId) {
                        setChannelForServer(activeServerId, channelId);
                      }
                      setActiveThreadId(null);
                      setThreadChannelId(null);
                    }}
                  />
                )}
              </div>
            )}

            {/* Thread View - resizable split with chat */}
            {activeThreadId && (channelForChat?.type === 'text' || channelForChat?.type === 'announcement') && (
              <>
              {/* Invisible resize handle (desktop only) */}
              {!isTablet && (
                <div
                  className="w-1 shrink-0 cursor-ew-resize bg-transparent z-10 relative"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    threadResizing.current = true;
                    const container = (e.currentTarget.parentElement as HTMLElement);
                    const startX = e.clientX;
                    const containerWidth = container.getBoundingClientRect().width;
                    const startFlex = threadPanelFlex;
                    const handleMouseMove = (ev: MouseEvent) => {
                      if (!threadResizing.current) return;
                      const delta = ev.clientX - startX;
                      const deltaRatio = (delta / containerWidth) * 10;
                      const newFlex = Math.max(2, Math.min(8, startFlex - deltaRatio));
                      setThreadPanelFlex(Math.round(newFlex * 10) / 10);
                    };
                    const handleMouseUp = () => {
                      threadResizing.current = false;
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                />
              )}
              <div
                className="min-w-[300px]"
                style={isTablet ? { flex: '1 1 0%' } : threadFullscreen ? { flex: '1 1 0%' } : { flex: `${threadPanelFlex} 1 0%` }}
              >
                <ThreadView
                  threadId={activeThreadId}
                  channelId={threadChannelId || activeChannelId || undefined}
                  serverId={activeServerId}
                  channelName={channelForChat?.name || ''}
                  onBack={() => {
                    setActiveThreadId(null);
                    setThreadChannelId(null);
                    setThreadFullscreen(false);
                  }}
                  isFullscreen={isTablet ? true : threadFullscreen}
                  onToggleFullscreen={() => setThreadFullscreen(!threadFullscreen)}
                />
              </div>
              </>
            )}
          </div>

          {/* Right Panel - Member List inline (desktop only) */}
          {channelForChat?.type !== 'voice' && !activeThreadId && showMembers && !isTablet && memberListEl}
        </>
      ) : null}

      {/* Tablet drawers */}
      {isTablet && channelListEl && (
        <Sheet open={tabletChannelsOpen} onOpenChange={setTabletChannelsOpen}>
          <SheetContent side="left" className="p-0 w-[280px] sm:max-w-[280px] border-r">
            <div className="h-full overflow-hidden">{channelListEl}</div>
          </SheetContent>
        </Sheet>
      )}
      {isTablet && memberListEl && (
        <Sheet open={tabletMembersOpen} onOpenChange={setTabletMembersOpen}>
          <SheetContent side="right" className="p-0 w-[280px] sm:max-w-[280px] border-l">
            <div className="h-full overflow-hidden">{memberListEl}</div>
          </SheetContent>
        </Sheet>
      )}


      {/* Modals */}
      {showDiscover && (
        <DiscoverModal
          servers={discoverableServers}
          onClose={() => setShowDiscover(false)}
          onJoinServer={handleJoinServer}
        />
      )}

      {showCreate && (
        <CreateServerModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreateServer}
        />
      )}

      {showServerSettings && activeServer && (
        <ServerSettingsModal
          serverId={activeServer.id}
          serverName={activeServer.name}
          onClose={() => { setShowServerSettings(false); setServerSettingsInitialTab(undefined); }}
          initialTab={serverSettingsInitialTab as any}
        />
      )}

      {showShortcutsHelp && (
        <KeyboardShortcutsModal onClose={() => setShowShortcutsHelp(false)} />
      )}

      {showGlobalSearch && (
        <GlobalSearchModal
          open={showGlobalSearch}
          onClose={() => setShowGlobalSearch(false)}
          serverId={activeServerId}
          channels={searchChannels}
          members={searchMembers}
          onNavigateToMessage={(channelId, messageId) => {
            setActiveChannelId(channelId);
            setShowGlobalSearch(false);
            // TODO: Scroll to message
          }}
        />
      )}
    </div>
  );
};

export default Index;
