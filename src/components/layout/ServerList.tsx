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
  const handleCopyId = (serverId: string) => {
    copyToClipboard(serverId, 'ID serveur copié');
  };

  const handleMarkAsRead = (serverId: string) => {
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

  return (
    <div className="w-[72px] bg-sidebar flex flex-col items-center py-3 gap-2 border-r border-border">
      {/* Home / DMs */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onServerSelect(null)}
            className={cn(
              'server-icon bg-card hover:bg-primary hover:text-primary-foreground relative group',
              activeServerId === null && 'bg-primary text-primary-foreground rounded-[16px]'
            )}
          >
            {/* Active indicator */}
            <div
              className={cn(
                'absolute -left-3 w-1 rounded-r-full bg-foreground transition-all duration-300',
                activeServerId === null
                  ? 'h-2'
                  : 'h-0 group-hover:h-1.5'
              )}
            />
            <MessageCircle className="w-6 h-6" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Messages Privés</p>
        </TooltipContent>
      </Tooltip>

      <div className="w-8 h-[2px] bg-border rounded-full my-1" />

      {/* Server Icons */}
      <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col items-center gap-2 w-full">
        {servers.map((server) => (
          <ContextMenu key={server.id}>
            <Tooltip>
              <ContextMenuTrigger asChild>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onServerSelect(server.id)}
                    className={cn(
                      'server-icon relative group',
                      activeServerId === server.id
                        ? 'bg-[#5865f2] text-white rounded-[16px]'
                        : 'bg-card hover:bg-[#5865f2]/80 hover:text-white'
                    )}
                  >
                    {/* Active indicator */}
                    <div
                      className={cn(
                        'absolute -left-3 w-1 rounded-r-full bg-foreground transition-all duration-300',
                        activeServerId === server.id
                          ? 'h-2'
                          : 'h-0 group-hover:h-1.5'
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
                      <span className="text-sm font-semibold">
                        {server.name.slice(0, 2).toUpperCase()}
                      </span>
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

      <div className="w-8 h-[2px] bg-border rounded-full my-1" />

      {/* Action Buttons */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onCreateClick}
            className="server-icon bg-card hover:bg-[#5865f2] hover:text-white text-[#5865f2]"
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
            className="server-icon bg-card hover:bg-[#5865f2] hover:text-white text-[#5865f2]"
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
