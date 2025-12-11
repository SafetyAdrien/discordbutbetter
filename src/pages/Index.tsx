import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ServerList } from '@/components/layout/ServerList';
import { ChannelList } from '@/components/layout/ChannelList';
import { MemberList } from '@/components/layout/MemberList';
import { ChatArea } from '@/components/chat/ChatArea';
import { DMConversation } from '@/components/dm/DMConversation';
import { DiscoverModal } from '@/components/modals/DiscoverModal';
import { CreateServerModal } from '@/components/modals/CreateServerModal';
import { ServerSettingsModal } from '@/components/server-settings/ServerSettingsModal';
import { useAuth } from '@/contexts/AuthContext';
import { useServers, usePublicServers, useCreateServer, useJoinServer } from '@/hooks/useServers';
import { useMessages, useSendMessage } from '@/hooks/useMessages';
import { useMembers, MemberWithProfile } from '@/hooks/useMembers';
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

  // Data hooks
  const { data: servers = [], isLoading: serversLoading } = useServers();
  const { data: publicServers = [] } = usePublicServers();
  const { data: messages = [] } = useMessages(activeChannelId);
  const { data: members = [] } = useMembers(activeServerId);

  // Mutations
  const createServer = useCreateServer();
  const joinServer = useJoinServer();
  const sendMessage = useSendMessage();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Set first server as active when servers load
  useEffect(() => {
    if (servers.length > 0 && !activeServerId) {
      setActiveServerId(servers[0].id);
      // Set first text channel as active
      const firstChannel = servers[0].categories
        .flatMap(c => c.channels)
        .find(ch => ch.type === 'text');
      if (firstChannel) {
        setActiveChannelId(firstChannel.id);
      }
    }
  }, [servers, activeServerId]);

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

  const activeServer = servers.find((s) => s.id === activeServerId);
  const activeChannel = activeServer?.categories
    .flatMap((c) => c.channels)
    .find((ch) => ch.id === activeChannelId);

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

  const handleBackFromDM = () => {
    setActiveDMId(null);
    if (servers.length > 0) {
      setActiveServerId(servers[0].id);
    }
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
        type: (ch.type || 'text') as 'text' | 'voice' | 'forum' | 'announcement',
        description: ch.description || undefined,
      })),
    })),
  }));

  const serverForChannelList = activeServer ? {
    id: activeServer.id,
    name: activeServer.name,
    ownerId: activeServer.owner_id || '',
    categories: activeServer.categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      channels: cat.channels.map(ch => ({
        id: ch.id,
        name: ch.name,
        type: (ch.type || 'text') as 'text' | 'voice' | 'forum' | 'announcement',
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
    type: (activeChannel.type || 'text') as 'text' | 'voice' | 'forum' | 'announcement',
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

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Server List */}
      <ServerList
        servers={serverListData}
        activeServerId={activeServerId}
        onServerSelect={(id) => {
          setActiveServerId(id);
          setActiveDMId(null);
        }}
        onDiscoverClick={() => setShowDiscover(true)}
        onCreateClick={() => setShowCreate(true)}
      />

      {/* DM View */}
      {activeDMId ? (
        <DMConversation
          conversationId={activeDMId}
          onBack={handleBackFromDM}
        />
      ) : activeServer && serverForChannelList ? (
        <>
          {/* Channel List */}
          <ChannelList
            server={serverForChannelList}
            activeChannelId={activeChannelId}
            onChannelSelect={setActiveChannelId}
            onOpenServerSettings={() => setShowServerSettings(true)}
          />

          {/* Main Chat Area */}
          {channelForChat && (
            <ChatArea
              channel={channelForChat}
              messages={messagesData}
              onSendMessage={handleSendMessage}
              memberRoles={memberRolesMap}
              onOpenDM={handleOpenDM}
            />
          )}

          {/* Member List */}
          <MemberList 
            members={memberListData} 
            ownerId={activeServer.owner_id || ''} 
            onOpenDM={handleOpenDM}
          />
        </>
      ) : (
        /* Home / No Server View */
        <div className="flex-1 flex flex-col items-center justify-center bg-background">
          <div className="text-center max-w-md px-6">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center animation-pulse-glow">
              <span className="text-5xl">💬</span>
            </div>
            <h1 className="text-3xl font-bold mb-4 gradient-text">
              Bienvenue sur GameVault
            </h1>
            <p className="text-muted-foreground mb-8">
              {servers.length === 0 
                ? "Créez votre premier serveur ou explorez les serveurs publics."
                : "Sélectionnez un serveur ou commencez une conversation privée avec vos amis."}
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setShowCreate(true)}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
              >
                Créer un serveur
              </button>
              <button
                onClick={() => setShowDiscover(true)}
                className="px-6 py-3 bg-muted rounded-lg font-semibold text-foreground border border-border hover:bg-muted/80 transition-colors"
              >
                Explorer
              </button>
            </div>
          </div>
        </div>
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
          onClose={() => setShowServerSettings(false)}
        />
      )}
    </div>
  );
};

export default Index;
