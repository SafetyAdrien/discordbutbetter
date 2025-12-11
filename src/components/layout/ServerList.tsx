import { useState } from 'react';
import { Server } from '@/types/app';
import { cn } from '@/lib/utils';
import { Compass, Plus, MessageCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ServerListProps {
  servers: Server[];
  activeServerId: string | null;
  onServerSelect: (serverId: string | null) => void;
  onDiscoverClick: () => void;
  onCreateClick: () => void;
}

export function ServerList({
  servers,
  activeServerId,
  onServerSelect,
  onDiscoverClick,
  onCreateClick,
}: ServerListProps) {
  return (
    <div className="w-[72px] bg-sidebar flex flex-col items-center py-3 gap-2 border-r border-border">
      {/* Home / DMs */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onServerSelect(null)}
            className={cn(
              'server-icon bg-card hover:bg-primary hover:text-primary-foreground',
              activeServerId === null && 'bg-primary text-primary-foreground rounded-[16px]'
            )}
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Messages Privés</p>
        </TooltipContent>
      </Tooltip>

      <div className="w-8 h-[2px] bg-border rounded-full my-1" />

      {/* Server Icons */}
      <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col items-center gap-2 w-full px-3">
        {servers.map((server) => (
          <Tooltip key={server.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onServerSelect(server.id)}
                className={cn(
                  'server-icon relative group',
                  activeServerId === server.id
                    ? 'bg-primary text-primary-foreground rounded-[16px]'
                    : 'bg-card hover:bg-primary/80 hover:text-primary-foreground'
                )}
              >
                {/* Active indicator */}
                <div
                  className={cn(
                    'absolute left-[-16px] w-1 rounded-r-full bg-foreground transition-all duration-300',
                    activeServerId === server.id
                      ? 'h-10'
                      : 'h-0 group-hover:h-5'
                  )}
                />
                
                {server.icon ? (
                  <span className="text-xl">{server.icon}</span>
                ) : (
                  <span className="text-sm font-semibold">
                    {server.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{server.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      <div className="w-8 h-[2px] bg-border rounded-full my-1" />

      {/* Action Buttons */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onCreateClick}
            className="server-icon bg-card hover:bg-status-online hover:text-primary-foreground text-status-online"
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
            className="server-icon bg-card hover:bg-status-online hover:text-primary-foreground text-status-online"
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
