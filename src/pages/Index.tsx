import { useState } from 'react';
import { ServerList } from '@/components/layout/ServerList';
import { ChannelList } from '@/components/layout/ChannelList';
import { MemberList } from '@/components/layout/MemberList';
import { ChatArea } from '@/components/chat/ChatArea';
import { DiscoverModal } from '@/components/modals/DiscoverModal';
import { CreateServerModal } from '@/components/modals/CreateServerModal';
import { servers, discoverServers, messages, users, currentUser } from '@/data/mockData';
import { Message, Server } from '@/types/app';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const [activeServerId, setActiveServerId] = useState<string | null>(servers[0]?.id || null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>('ch-4');
  const [showDiscover, setShowDiscover] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [allServers, setAllServers] = useState<Server[]>(servers);
  const [allMessages, setAllMessages] = useState<Message[]>(messages);

  const activeServer = allServers.find((s) => s.id === activeServerId);
  const activeChannel = activeServer?.categories
    .flatMap((c) => c.channels)
    .find((ch) => ch.id === activeChannelId);

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      content,
      author: currentUser,
      timestamp: new Date(),
    };
    setAllMessages([...allMessages, newMessage]);
  };

  const handleJoinServer = (serverId: string) => {
    const serverToJoin = discoverServers.find((s) => s.id === serverId);
    if (serverToJoin && !allServers.find((s) => s.id === serverId)) {
      setAllServers([...allServers, { ...serverToJoin, categories: servers[0].categories }]);
      toast({
        title: "Serveur rejoint !",
        description: `Vous avez rejoint ${serverToJoin.name}`,
      });
    }
    setShowDiscover(false);
  };

  const handleCreateServer = (name: string, icon: string) => {
    const newServer: Server = {
      id: `server-${Date.now()}`,
      name,
      icon,
      ownerId: currentUser.id,
      description: 'Un nouveau serveur',
      memberCount: 1,
      isPublic: false,
      categories: servers[0].categories,
    };
    setAllServers([...allServers, newServer]);
    setActiveServerId(newServer.id);
    toast({
      title: "Serveur créé !",
      description: `${name} est prêt à accueillir vos amis`,
    });
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Server List */}
      <ServerList
        servers={allServers}
        activeServerId={activeServerId}
        onServerSelect={setActiveServerId}
        onDiscoverClick={() => setShowDiscover(true)}
        onCreateClick={() => setShowCreate(true)}
      />

      {activeServer ? (
        <>
          {/* Channel List */}
          <ChannelList
            server={activeServer}
            activeChannelId={activeChannelId}
            onChannelSelect={setActiveChannelId}
          />

          {/* Main Chat Area */}
          {activeChannel && (
            <ChatArea
              channel={activeChannel}
              messages={allMessages}
              onSendMessage={handleSendMessage}
            />
          )}

          {/* Member List */}
          <MemberList members={users} ownerId={activeServer.ownerId} />
        </>
      ) : (
        /* Home / DMs View */
        <div className="flex-1 flex flex-col items-center justify-center bg-background">
          <div className="text-center max-w-md px-6">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-gaming flex items-center justify-center animation-pulse-glow">
              <span className="text-5xl">💬</span>
            </div>
            <h1 className="text-3xl font-display font-bold mb-4 glow-text">
              Messages Privés
            </h1>
            <p className="text-muted-foreground mb-8">
              Sélectionnez un serveur ou commencez une conversation privée avec vos amis.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setShowCreate(true)}
                className="px-6 py-3 bg-gradient-gaming rounded-lg font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Créer un serveur
              </button>
              <button
                onClick={() => setShowDiscover(true)}
                className="px-6 py-3 bg-surface-elevated rounded-lg font-semibold text-foreground border border-border hover:bg-surface-hover transition-colors"
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
          servers={discoverServers}
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
    </div>
  );
};

export default Index;
