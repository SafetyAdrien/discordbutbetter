import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Plus, Compass } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useServerUnreadCounts } from '@/hooks/useServerUnreadCounts';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import { MobileChannelListView } from './MobileChannelListView';
import { Separator } from '@/components/ui/separator';
import type { Server } from '@/types/app';

interface MobileServersViewProps {
  servers: Server[];
  activeServerId: string | null;
  rawServers: any[];
  onServerSelect: (serverId: string) => void;
  onChannelSelect: (channelId: string, channelType: string) => void;
  onDiscoverClick: () => void;
  onCreateClick: () => void;
  onOpenSettings?: () => void;
}

export function MobileServersView({
  servers,
  activeServerId,
  rawServers,
  onServerSelect,
  onChannelSelect,
  onDiscoverClick,
  onCreateClick,
  onOpenSettings,
}: MobileServersViewProps) {
  const { unreadInfo } = useServerUnreadCounts();
  const { isSmallMobile } = useBreakpoint();
  const [selectedServerId, setSelectedServerId] = useState<string | null>(activeServerId);

  // Sync with external active server
  useEffect(() => {
    if (activeServerId && !selectedServerId) {
      setSelectedServerId(activeServerId);
    }
  }, [activeServerId]);

  // Auto-select first server if none selected
  useEffect(() => {
    if (!selectedServerId && servers.length > 0) {
      setSelectedServerId(servers[0].id);
    }
  }, [servers, selectedServerId]);

  const handleServerTap = (serverId: string) => {
    setSelectedServerId(serverId);
    onServerSelect(serverId);
  };

  // Build categories/channels for selected server
  const selectedRawServer = rawServers.find(s => s.id === selectedServerId);

  const categoriesForList = selectedRawServer?.categories.map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    channels: cat.channels.map((ch: any) => ({
      id: ch.id,
      name: ch.name,
      type: ch.type || 'text',
      description: ch.description,
    })),
  })) || [];

  const orphanChannelsForList = (selectedRawServer?.orphanChannels || []).map((ch: any) => ({
    id: ch.id, name: ch.name, type: ch.type || 'text', description: ch.description,
  }));

  const sidebarWidth = 'w-[20%]';
  const iconSize = 'w-[50px] h-[50px]';

  return (
    <div className="flex h-full">
      {/* Left: Server icons column */}
      <div className={cn(
        sidebarWidth,
        'flex-shrink-0 bg-sidebar flex flex-col items-center py-2 gap-1.5 border-r border-border/50 overflow-y-auto scrollbar-hide'
      )}>
        {servers.map((server) => {
          const info = unreadInfo[server.id] || { hasUnread: false, mentionCount: 0 };
          const isActive = selectedServerId === server.id;
          return (
            <button
              key={server.id}
              onClick={() => handleServerTap(server.id)}
              className="relative flex items-center justify-center w-full py-0.5 group"
            >
              {/* Active indicator */}
              <div className={cn(
                'absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-foreground transition-all',
                isActive ? 'h-8' : info.hasUnread ? 'h-3' : 'h-0 opacity-0'
              )} />

              <div className="relative">
                <Avatar className={cn(
                  iconSize,
                  'rounded-2xl transition-all',
                  isActive && 'rounded-xl ring-2 ring-primary'
                )}>
                  {server.icon?.startsWith('http') ? (
                    <AvatarImage src={server.icon} />
                  ) : null}
                  <AvatarFallback className="bg-muted text-foreground text-base rounded-2xl">
                    {server.icon && !server.icon.startsWith('http')
                      ? server.icon
                      : server.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Mention badge */}
                {info.mentionCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full">
                    {info.mentionCount > 99 ? '99+' : info.mentionCount}
                  </span>
                )}
              </div>

            </button>
          );
        })}

        {servers.length > 0 && (
          <Separator className="w-8 my-1" />
        )}

        {/* Discover */}
        <button
          onClick={onDiscoverClick}
          className="flex items-center justify-center w-[50px] h-[50px] rounded-2xl bg-muted/50 hover:bg-primary/20 hover:text-primary transition-colors text-muted-foreground"
        >
          <Compass className="w-5 h-5" />
        </button>

        {/* Create */}
        <button
          onClick={onCreateClick}
          className="flex items-center justify-center w-[50px] h-[50px] rounded-2xl bg-muted/50 hover:bg-primary/20 hover:text-primary transition-colors text-muted-foreground"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Right: Channel list */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {selectedServerId && selectedRawServer ? (
          <MobileChannelListView
            embedded
            serverName={selectedRawServer.name}
            serverId={selectedServerId}
            categories={categoriesForList}
            orphanChannels={orphanChannelsForList}
            onBack={() => {}}
            onChannelSelect={onChannelSelect}
            onOpenSettings={onOpenSettings}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <p className="text-muted-foreground text-sm mb-4">Sélectionnez un serveur</p>
            <button
              onClick={onCreateClick}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
            >
              Créer un serveur
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
