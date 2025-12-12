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
import { useAuth } from '@/contexts/AuthContext';
import { useServers, usePublicServers, useCreateServer, useJoinServer } from '@/hooks/useServers';
import { useChannels } from '@/hooks/useChannels';
import { useMessages, useSendMessage } from '@/hooks/useMessages';
import { useMembers, MemberWithProfile } from '@/hooks/useMembers';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useVoiceState } from '@/hooks/useVoiceState';
import { Loader2 } from 'lucide-react';
import type { Server, Message, User } from '@/types/app';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeDMId, setActiveDMId] = useState<string | null>(null);
  const [showDiscover, setShowDiscover] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showMembers, setShowMembers] = useState(true);

  // Data hooks
  const { data: servers = [], isLoading: serversLoading } = useServers();
  const { data: publicServers = [] } = usePublicServers();
  const { data: channelsData } = useChannels(activeServerId);
  const { data: messages = [] } = useMessages(activeChannelId);
  const { data: members = [] } = useMembers(activeServerId);

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

  // Update active channel when server changes
  useEffect(() => {
    if (activeServerId) {
      const server = servers.find(s => s.id === activeServerId);
      if (server) {
        const firstChannel = server.categories
          .flatMap(c => c.channels)
          .find(ch => ch.type === 'text');
        if (firstChannel) {
          setActiveChannelId(firstChannel.id);
        }
      }
    }
  }, [activeServerId, servers]);

  // Also check orphan channels when selecting first channel
  useEffect(() => {
    if (activeServerId && !activeChannelId && channelsData?.orphanChannels) {
      const firstOrphan = channelsData.orphanChannels.find(ch => ch.type === 'text');
      if (firstOrphan) {
        setActiveChannelId(firstOrphan.id);
      }
    }
  }, [activeServerId, activeChannelId, channelsData?.orphanChannels]);

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

  const handleSendMessage = (content: string) => {
    if (!activeChannelId) return;
    sendMessage.mutate({ channelId: activeChannelId, content });
  };

  const handleJoinServer = (serverId: string) => {
    joinServer.mutate(serverId);
    setShowDiscover(false);
  };

  const handleCreateServer = (name: string, icon: string) => {
    createServer.mutate(
      { name, icon_url: icon || undefined, is_public: false },
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
        type: (ch.type || 'text') as 'text' | 'voice' | 'forum' | 'announcement' | 'media' | 'calendar' | 'tasks',
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
        type: (ch.type || 'text') as 'text' | 'voice' | 'forum' | 'announcement' | 'media' | 'calendar' | 'tasks',
        description: ch.description || undefined,
      })),
    })),
  } : null;

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

  // Create member roles map for ChatArea
  const memberRolesMap = new Map<string, MemberWithProfile['roles']>();
  members.forEach(m => {
    memberRolesMap.set(m.user.id, m.roles);
  });

  const messagesData: Message[] = messages.map(m => ({
    id: m.id,
    content: m.content,
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
    type: (activeChannel.type || 'text') as 'text' | 'voice' | 'forum' | 'announcement' | 'media' | 'calendar' | 'tasks',
    description: activeChannel.description || undefined,
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
            onChannelSelect={setActiveChannelId}
            onOpenServerSettings={() => setShowServerSettings(true)}
            orphanChannels={channelsData?.orphanChannels || []}
          />

          {/* Main Content Area - Conditional based on channel type */}
          {channelForChat && (
            <>
              {channelForChat.type === 'media' ? (
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
              ) : (
                <ChatArea
                  channel={channelForChat}
                  messages={messagesData}
                  onSendMessage={handleSendMessage}
                  memberRoles={memberRolesMap}
                  onOpenDM={handleOpenDM}
                  onToggleMembers={handleToggleMembers}
                  showMembers={showMembers}
                />
              )}
            </>
          )}

          {/* Member List - Conditionally rendered */}
          {showMembers && (
            <MemberList 
              members={memberListData} 
              ownerId={activeServer.owner_id || ''} 
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
