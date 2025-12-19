import { useState, useEffect, useMemo } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';
import { useServers, usePublicServers, useCreateServer, useJoinServer } from '@/hooks/useServers';
import { useChannels } from '@/hooks/useChannels';
import { useMessages, useSendMessage } from '@/hooks/useMessages';
import { useMembers, MemberWithProfile } from '@/hooks/useMembers';
import { useProfilesRealtime } from '@/hooks/useProfilesRealtime';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useVoiceState } from '@/hooks/useVoiceState';
import { useNavigationState } from '@/hooks/useNavigationState';
import { Loader2 } from 'lucide-react';
import type { Server, Message, User } from '@/types/app';

// Main application component
const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  // Navigation state persistence
  const {
    activeServerId: persistedServerId,
    activeDMId: persistedDMId,
    setActiveServerId: setPersistedServerId,
    setActiveDMId: setPersistedDMId,
    setChannelForServer,
    getChannelForServer,
  } = useNavigationState();
  
  // Track window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const isMobile = windowWidth < 768;
  
  const [activeServerId, setActiveServerIdLocal] = useState<string | null>(persistedServerId);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeDMId, setActiveDMIdLocal] = useState<string | null>(persistedDMId);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [threadChannelId, setThreadChannelId] = useState<string | null>(null);
  const [showDiscover, setShowDiscover] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showMembers, setShowMembers] = useState(true);

  // Wrapper functions to persist navigation state
  const setActiveServerId = (id: string | null) => {
    setActiveServerIdLocal(id);
    setPersistedServerId(id);
  };
  
  const setActiveDMId = (id: string | null) => {
    setActiveDMIdLocal(id);
    setPersistedDMId(id);
  };

  // Data hooks
  const { data: servers = [], isLoading: serversLoading } = useServers();
  const { data: publicServers = [] } = usePublicServers();
  const { data: channelsData } = useChannels(activeServerId);
  const { data: messages = [] } = useMessages(activeChannelId);
  const { data: members = [] } = useMembers(activeServerId);
  // Realtime profiles updates (DB -> postgres_changes)
  useProfilesRealtime();

  // Voice state
  const { voiceState, toggleMute } = useVoiceState();

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
        toggleMute.mutate();
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

  // Update active channel when server changes - restore last visited or first text channel
  useEffect(() => {
    if (activeServerId) {
      const server = servers.find(s => s.id === activeServerId);
      if (server) {
        // Try to restore last visited channel for this server
        const savedChannelId = getChannelForServer(activeServerId);
        const allChannels = [
          ...server.categories.flatMap(c => c.channels),
          ...(channelsData?.orphanChannels || [])
        ];
        
        const savedChannel = savedChannelId 
          ? allChannels.find(ch => ch.id === savedChannelId)
          : null;
        
        if (savedChannel) {
          setActiveChannelId(savedChannel.id);
        } else {
          // Fallback to first text channel
          const firstChannel = allChannels.find(ch => ch.type === 'text');
          if (firstChannel) {
            setActiveChannelId(firstChannel.id);
            setChannelForServer(activeServerId, firstChannel.id);
          }
        }
      }
    }
  }, [activeServerId, servers, channelsData?.orphanChannels, getChannelForServer, setChannelForServer]);

  const activeServer = servers.find((s) => s.id === activeServerId);
  const activeChannel = activeServer?.categories
    .flatMap((c) => c.channels)
    .find((ch) => ch.id === activeChannelId) 
    || channelsData?.orphanChannels?.find((ch) => ch.id === activeChannelId);

  // Prepare channels and members for search modal
  const searchChannels = useMemo(() => {
    if (!activeServer) return [];
    const allChannels = [
      ...activeServer.categories.flatMap(cat => cat.channels),
      ...(channelsData?.orphanChannels || [])
    ];
    return allChannels.map(ch => ({
      id: ch.id,
      name: ch.name,
      type: ch.type || 'text'
    }));
  }, [activeServer, channelsData]);

  const searchMembers = useMemo(() => {
    return members.map(m => ({
      id: m.user.id,
      username: m.user.username,
      displayName: m.nickname || m.user.display_name,
      avatar: m.user.avatar_url || undefined
    }));
  }, [members]);

  const handleSendMessage = (content: string, attachments?: any[]) => {
    if (!activeChannelId) return;
    sendMessage.mutate({ channelId: activeChannelId, content, attachments: attachments || [] });
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

  const handleOpenServerSettings = (serverId?: string) => {
    if (serverId) {
      setActiveServerId(serverId);
    }
    setShowServerSettings(true);
  };

  const handleToggleMembers = () => {
    setShowMembers(!showMembers);
  };

  // Loading state
  if (authLoading || (user && serversLoading)) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
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
        type: (ch.type || 'text') as 'text' | 'voice' | 'forum' | 'announcement' | 'media' | 'calendar' | 'tasks' | 'stage',
        description: ch.description || undefined,
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
    categories: activeServer.categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      channels: cat.channels.map(ch => ({
      id: ch.id,
        name: ch.name,
        type: (ch.type || 'text') as 'text' | 'voice' | 'forum' | 'announcement' | 'media' | 'calendar' | 'tasks' | 'stage',
        description: ch.description || undefined,
      })),
    })),
  } : null;

  const memberListData: (User & { roles?: MemberWithProfile['roles']; activity_type?: string | null; activity_text?: string | null })[] = members.map(m => ({
    id: m.user.id,
    username: m.user.username,
    displayName: m.nickname || m.user.display_name,
    avatar: m.user.avatar_url || undefined,
    banner: m.user.banner_url || undefined,
    status: m.user.status || 'offline',
    customStatus: m.user.custom_status || undefined,
    activity_type: m.user.activity_type,
    activity_text: m.user.activity_text,
    roles: m.roles,
  }));

  // Create member roles map for ChatArea
  const memberRolesMap = new Map<string, MemberWithProfile['roles']>();
  members.forEach(m => {
    memberRolesMap.set(m.user.id, m.roles);
  });

  const messagesData: Message[] = messages.map((m) => ({
    id: m.id,
    content: m.content,
    attachments: (m as any).attachments || [],
    author: {
      id: m.author?.id || '',
      username: m.author?.username || 'unknown',
      displayName: m.author?.display_name || 'Utilisateur inconnu',
      avatar: m.author?.avatar_url || undefined,
      status: m.author?.status || 'offline',
    },
    timestamp: new Date(m.created_at || Date.now()),
  }));

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

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Server List */}
      <ServerList
        servers={serverListData}
        activeServerId={activeServerId}
        onServerSelect={handleServerSelect}
        onDiscoverClick={() => setShowDiscover(true)}
        onCreateClick={() => setShowCreate(true)}
        onOpenServerSettings={handleOpenServerSettings}
      />

      {/* Home/DM View */}
      {isHomeView ? (
        <DMPage
          activeDMId={activeDMId}
          onConversationSelect={handleOpenDM}
          onShowFriends={handleShowFriends}
        />
      ) : activeServer && serverForChannelList ? (
        <>
          {/* Channel List */}
          <ChannelList
            server={serverForChannelList}
            activeChannelId={activeChannelId}
            onChannelSelect={(channelId) => {
              setActiveChannelId(channelId);
              // Persist channel selection for this server
              if (activeServerId) {
                setChannelForServer(activeServerId, channelId);
              }
              // Fermer le thread quand on clique sur un salon
              setActiveThreadId(null);
              setThreadChannelId(null);
            }}
            onOpenServerSettings={() => setShowServerSettings(true)}
            orphanChannels={channelsData?.orphanChannels || []}
            activeThreadId={activeThreadId}
            onThreadSelect={(threadId) => {
              setActiveThreadId(threadId);
              setThreadChannelId(activeChannelId); // Stocker le channel d'origine du thread
            }}
          />

          {/* Main Content Area - flex container for 60/40 split when thread is open */}
          <div className="flex-1 flex min-w-0 w-full overflow-x-hidden">
            {channelForChat && (
              <div className={`${activeThreadId && channelForChat.type === 'text' ? 'flex-[6] min-w-0' : 'flex-1 min-w-0'} flex flex-col w-full overflow-hidden`}>
                {channelForChat.type === 'voice' ? (
                  <VoiceChannelView 
                    channel={channelForChat}
                    serverId={activeServer.id}
                    members={memberListData}
                    ownerId={activeServer.owner_id || ''}
                    onOpenDM={handleOpenDM}
                  />
                ) : channelForChat.type === 'media' ? (
                  <MediaChannel 
                    channel={channelForChat}
                    onToggleMembers={handleToggleMembers}
                    showMembers={showMembers}
                  />
                ) : channelForChat.type === 'forum' ? (
                  <ForumChannel 
                    channel={channelForChat}
                    onToggleMembers={handleToggleMembers}
                    showMembers={showMembers}
                  />
                ) : channelForChat.type === 'tasks' ? (
                  <TasksChannel 
                    channel={channelForChat}
                    onToggleMembers={handleToggleMembers}
                    showMembers={showMembers}
                  />
                ) : channelForChat.type === 'calendar' ? (
                  <CalendarChannel 
                    channel={channelForChat}
                    onToggleMembers={handleToggleMembers}
                    showMembers={showMembers}
                  />
                ) : channelForChat.type === 'announcement' ? (
                  <AnnouncementChannel 
                    channel={channelForChat}
                    onToggleMembers={handleToggleMembers}
                    showMembers={showMembers}
                  />
                ) : channelForChat.type === 'stage' ? (
                  <StageChannel 
                    channel={channelForChat}
                    serverId={activeServer.id}
                    canModerate={activeServer.owner_id === user?.id}
                  />
                ) : (
                  <ChatArea
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
                  />
                )}
              </div>
            )}

            {/* Thread View - 60/40 split with chat */}
            {activeThreadId && channelForChat?.type === 'text' && (
              <div className="flex-[4] min-w-0">
                <ThreadView
                  threadId={activeThreadId}
                  channelId={threadChannelId || activeChannelId || undefined}
                  serverId={activeServerId}
                  channelName={channelForChat?.name || ''}
                  onBack={() => {
                    setActiveThreadId(null);
                    setThreadChannelId(null);
                  }}
                />
              </div>
            )}
          </div>

          {/* Right Panel - Member List (only when no thread is open for text channels, and not on mobile) */}
          {channelForChat?.type !== 'voice' && !activeThreadId && showMembers && !isMobile && (
            <MemberList 
              members={memberListData} 
              ownerId={activeServer.owner_id || ''} 
              serverId={activeServer.id}
              onOpenDM={handleOpenDM}
            />
          )}
        </>
      ) : null}

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
          onClose={() => setShowServerSettings(false)}
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
