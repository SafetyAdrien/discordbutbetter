import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ServerList } from './ServerList';
import { ChannelList } from './ChannelList';
import type { Server } from '@/types/app';
import type { OrphanChannel } from '@/hooks/useChannels';

interface SidebarDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servers: Server[];
  activeServerId: string | null;
  onServerSelect: (serverId: string | null) => void;
  onDiscoverClick: () => void;
  onCreateClick: () => void;
  onOpenServerSettings: (serverId?: string) => void;
  // ChannelList props
  server: {
    id: string;
    name: string;
    ownerId: string;
    iconUrl?: string;
    bannerUrl?: string;
    description?: string;
    createdAt?: string;
    categories: {
      id: string;
      name: string;
      channels: {
        id: string;
        name: string;
        type: 'text' | 'voice' | 'forum' | 'announcement' | 'media' | 'calendar' | 'tasks' | 'stage';
        description?: string;
      }[];
    }[];
  } | null;
  activeChannelId: string | null;
  onChannelSelect: (channelId: string) => void;
  orphanChannels: OrphanChannel[];
  activeThreadId?: string | null;
  onThreadSelect?: (threadId: string) => void;
}

export function SidebarDrawer({
  open,
  onOpenChange,
  servers,
  activeServerId,
  onServerSelect,
  onDiscoverClick,
  onCreateClick,
  onOpenServerSettings,
  server,
  activeChannelId,
  onChannelSelect,
  orphanChannels,
  activeThreadId,
  onThreadSelect,
}: SidebarDrawerProps) {
  const handleServerSelect = (serverId: string | null) => {
    onServerSelect(serverId);
    // Don't close drawer on server select - let user pick channel
  };

  const handleChannelSelect = (channelId: string) => {
    onChannelSelect(channelId);
    onOpenChange(false); // Close drawer after channel selection
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-fit p-0 flex gap-0 border-r border-border">
        <ServerList
          servers={servers}
          activeServerId={activeServerId}
          onServerSelect={handleServerSelect}
          onDiscoverClick={onDiscoverClick}
          onCreateClick={onCreateClick}
          onOpenServerSettings={onOpenServerSettings}
        />
        {server && (
          <ChannelList
            server={server}
            activeChannelId={activeChannelId}
            onChannelSelect={handleChannelSelect}
            onOpenServerSettings={() => {
              onOpenServerSettings();
              onOpenChange(false);
            }}
            orphanChannels={orphanChannels}
            activeThreadId={activeThreadId}
            onThreadSelect={(threadId) => {
              onThreadSelect?.(threadId);
              onOpenChange(false);
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
