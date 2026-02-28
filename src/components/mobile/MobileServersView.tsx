import { cn } from '@/lib/utils';
import { Plus, Compass } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useServerUnreadCounts } from '@/hooks/useServerUnreadCounts';
import type { Server } from '@/types/app';

interface MobileServersViewProps {
  servers: Server[];
  activeServerId: string | null;
  onServerSelect: (serverId: string) => void;
  onDiscoverClick: () => void;
  onCreateClick: () => void;
}

export function MobileServersView({
  servers,
  activeServerId,
  onServerSelect,
  onDiscoverClick,
  onCreateClick,
}: MobileServersViewProps) {
  const { unreadInfo } = useServerUnreadCounts();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-12 px-4 flex items-center border-b border-border">
        <h2 className="font-semibold text-sm flex-1">Serveurs</h2>
        <div className="flex gap-2">
          <button
            onClick={onDiscoverClick}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <Compass className="w-5 h-5" />
          </button>
          <button
            onClick={onCreateClick}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Server Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {servers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted-foreground text-sm mb-4">Aucun serveur</p>
            <button
              onClick={onCreateClick}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
            >
              Créer un serveur
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {servers.map((server) => {
              const info = unreadInfo[server.id] || { hasUnread: false, mentionCount: 0 };
              return (
                <button
                  key={server.id}
                  onClick={() => onServerSelect(server.id)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-xl transition-colors',
                    activeServerId === server.id ? 'bg-primary/10' : 'hover:bg-muted/50'
                  )}
                >
                  <div className="relative">
                    <Avatar className={cn(
                      'w-14 h-14 rounded-2xl transition-all',
                      activeServerId === server.id && 'ring-2 ring-primary'
                    )}>
                      {server.icon?.startsWith('http') ? (
                        <AvatarImage src={server.icon} />
                      ) : null}
                      <AvatarFallback className="bg-muted text-foreground text-lg rounded-2xl">
                        {server.icon && !server.icon.startsWith('http')
                          ? server.icon
                          : server.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {info.mentionCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full">
                        {info.mentionCount > 99 ? '99+' : info.mentionCount}
                      </span>
                    )}
                    {info.hasUnread && info.mentionCount === 0 && (
                      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rounded-full" />
                    )}
                  </div>
                  <span className="text-xs text-center truncate w-full">{server.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
