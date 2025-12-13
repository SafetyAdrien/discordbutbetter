import { Server } from '@/types/app';
import { cn } from '@/lib/utils';
import { Compass, Plus, MessageCircle, Settings, UserPlus, Hash, LogOut, CheckCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { copyToClipboard } from '@/lib/clipboard';
import { toast } from '@/hooks/use-toast';
import { useServerUnreadCounts } from '@/hooks/useServerUnreadCounts';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { useState, useEffect, useRef } from 'react';

interface ServerListProps {
  servers: Server[];
  activeServerId: string | null;
  onServerSelect: (serverId: string | null) => void;
  onDiscoverClick: () => void;
  onCreateClick: () => void;
  onOpenServerSettings?: (serverId: string) => void;
}

export function ServerList({
  servers,
  activeServerId,
  onServerSelect,
  onDiscoverClick,
  onCreateClick,
  onOpenServerSettings,
}: ServerListProps) {
  const { unreadCounts, markServerAsRead } = useServerUnreadCounts();
  const { unreadCounts: dmUnreadCounts } = useUnreadCounts();

  // Calculate total unread DMs
  const totalUnreadDMs = Object.values(dmUnreadCounts).reduce((acc, count) => acc + count, 0);

  // Check if there are any unread DMs
  const hasUnreadDMs = Object.values(dmUnreadCounts).some(count => count > 0);

  // Track previous counts for shake animation
  const prevUnreadCounts = useRef<Record<string, number>>({});
  const prevDMCount = useRef<number>(0);
  const [shakingServers, setShakingServers] = useState<Set<string>>(new Set());
  const [shakingDMs, setShakingDMs] = useState(false);

  useEffect(() => {
    // Detect servers where count increased
    const newShaking = new Set<string>();
    Object.entries(unreadCounts).forEach(([serverId, count]) => {
      const prevCount = prevUnreadCounts.current[serverId] || 0;
      if (count > prevCount) {
        newShaking.add(serverId);
      }
    });

    if (newShaking.size > 0) {
      setShakingServers(newShaking);
      setTimeout(() => setShakingServers(new Set()), 500);
    }

    prevUnreadCounts.current = { ...unreadCounts };
  }, [unreadCounts]);

  useEffect(() => {
    // Detect DM count increase
    if (totalUnreadDMs > prevDMCount.current) {
      setShakingDMs(true);
      setTimeout(() => setShakingDMs(false), 500);
    }
    prevDMCount.current = totalUnreadDMs;
  }, [totalUnreadDMs]);

  const handleCopyId = (serverId: string) => {
    copyToClipboard(serverId, 'ID serveur copié');
  };

  const handleMarkAsRead = (serverId: string) => {
    markServerAsRead(serverId);
    toast({ title: 'Serveur marqué comme lu' });
  };

  const handleInvite = (serverId: string) => {
    const inviteLink = `${window.location.origin}/invite/${serverId}`;
    copyToClipboard(inviteLink, 'Lien d\'invitation copié');
  };

  const handleLeaveServer = (serverId: string) => {
    // TODO: Implement leave server
    console.log('Leave server', serverId);
  };

  const handleServerClick = (serverId: string) => {
    onServerSelect(serverId);
    markServerAsRead(serverId);
  };

  return (
    <div className="w-[72px] bg-discord-serverBar flex flex-col items-center py-3 gap-2">
      {/* Home / DMs */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onServerSelect(null)}
            className={cn(
              'server-icon relative group',
              activeServerId === null && 'active'
            )}
          >
            {/* Active indicator */}
            <div
              className={cn(
                'absolute -left-3 w-1 rounded-r-full bg-foreground transition-all duration-200',
                activeServerId === null
                  ? 'h-10'
                  : hasUnreadDMs
                    ? 'h-2'
                    : 'h-0 group-hover:h-5'
              )}
            />
            <MessageCircle className="w-6 h-6" />
            
            {/* Unread DMs notification badge */}
            {totalUnreadDMs > 0 && (
              <div className={cn(
                "absolute -bottom-1 -right-1 min-w-[20px] h-5 px-1.5 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground text-xs font-bold border-2 border-discord-serverBar animate-badge-pop",
                shakingDMs && "animate-badge-shake"
              )}>
                {totalUnreadDMs > 99 ? '99+' : totalUnreadDMs}
              </div>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Messages Privés</p>
        </TooltipContent>
      </Tooltip>

      <div className="w-8 h-[2px] bg-discord-separator rounded-full my-1" />

      {/* Server Icons */}
      <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col items-center gap-2 w-full">
        {servers.map((server) => (
          <ContextMenu key={server.id}>
            <Tooltip>
              <ContextMenuTrigger asChild>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleServerClick(server.id)}
                    className={cn(
                      'server-icon relative group',
                      activeServerId === server.id && 'active'
                    )}
                  >
                    {/* Active indicator */}
                    <div
                      className={cn(
                        'absolute -left-3 w-1 rounded-r-full bg-foreground transition-all duration-200',
                        activeServerId === server.id
                          ? 'h-10'
                          : (unreadCounts[server.id] ?? 0) > 0
                            ? 'h-2'
                            : 'h-0 group-hover:h-5'
                      )}
                    />
                    
                    {server.icon ? (
                      server.icon.startsWith('http') ? (
                        <img 
                          src={server.icon} 
                          alt={server.name}
                          className="w-full h-full object-cover rounded-[inherit]"
                        />
                      ) : (
                        <span className="text-xl">{server.icon}</span>
                      )
                    ) : (
                      <span className="text-sm font-semibold text-foreground">
                        {server.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}

                    {/* Unread notification badge */}
                    {(unreadCounts[server.id] ?? 0) > 0 && (
                      <div className={cn(
                        "absolute -bottom-1 -right-1 min-w-[20px] h-5 px-1.5 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground text-xs font-bold border-2 border-discord-serverBar animate-badge-pop",
                        shakingServers.has(server.id) && "animate-badge-shake"
                      )}>
                        {unreadCounts[server.id] > 99 ? '99+' : unreadCounts[server.id]}
                      </div>
                    )}
                  </button>
                </TooltipTrigger>
              </ContextMenuTrigger>
              <TooltipContent side="right">
                <p>{server.name}</p>
              </TooltipContent>
            </Tooltip>
            <ContextMenuContent className="w-48">
              <ContextMenuItem onClick={() => handleMarkAsRead(server.id)}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Marquer comme lu
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleInvite(server.id)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Inviter des personnes
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => onOpenServerSettings?.(server.id)}>
                <Settings className="w-4 h-4 mr-2" />
                Paramètres du serveur
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleCopyId(server.id)}>
                <Hash className="w-4 h-4 mr-2" />
                Copier l'ID
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem 
                onClick={() => handleLeaveServer(server.id)}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Quitter le serveur
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </div>

      <div className="w-8 h-[2px] bg-discord-separator rounded-full my-1" />

      {/* Action Buttons */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onCreateClick}
            className="server-icon text-primary"
          >
            <Plus className="w-6 h-6" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Créer un serveur</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onDiscoverClick}
            className="server-icon text-primary"
          >
            <Compass className="w-6 h-6" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Découvrir des serveurs</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
