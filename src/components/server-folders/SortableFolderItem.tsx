import { useState, useMemo } from 'react';
import { Server } from '@/types/app';
import { ServerFolder } from '@/types/serverFolder';
import { cn } from '@/lib/utils';
import { FolderSettingsModal } from './FolderSettingsModal';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Settings, CheckCircle, Trash2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableFolderItemProps {
  folder: ServerFolder;
  servers: Server[];
  activeServerId: string | null;
  unreadCounts: Record<string, number>;
  onServerSelect: (serverId: string) => void;
  onToggleExpanded: () => void;
  onUpdateFolder: (name: string, color: string) => void;
  onDeleteFolder: () => void;
  onMarkAllAsRead: () => void;
  showAddToFolderIndicator: boolean;
  showInsertBefore: boolean;
  showInsertAfter: boolean;
}

// Mini server icon for 2x2 grid (closed state)
function MiniServerIcon({ server }: { server: Server }) {
  return (
    <div className="w-full h-full rounded-[4px] overflow-hidden bg-[#36393f] flex items-center justify-center">
      {server.icon ? (
        server.icon.startsWith('http') ? (
          <img
            src={server.icon}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <span className="text-[10px] text-white/80">{server.icon}</span>
        )
      ) : (
        <span className="text-[7px] font-semibold text-white/60">
          {server.name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}

// Full-size server icon inside an open folder
function NestedServerIcon({
  server,
  isActive,
  unreadCount,
  onClick,
  folderId,
}: {
  server: Server;
  isActive: boolean;
  unreadCount: number;
  onClick: () => void;
  folderId: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `server-${server.id}`,
    data: { type: 'server', server, containerId: `folder-${folderId}`, folderId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'opacity 150ms ease' : transition,
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          onClick={onClick}
          className={cn(
            'w-12 h-12 rounded-[16px] flex items-center justify-center relative group select-none transition-all duration-200',
            isActive
              ? 'bg-[#5865f2] text-white rounded-[16px]'
              : 'bg-[#313338] hover:bg-[#5865f2]/80 hover:text-white hover:rounded-[12px]',
            isDragging && 'opacity-30 scale-95'
          )}
        >
          {server.icon ? (
            server.icon.startsWith('http') ? (
              <img
                src={server.icon}
                alt={server.name}
                className="w-full h-full object-cover rounded-[inherit] pointer-events-none"
                draggable={false}
              />
            ) : (
              <span className="text-xl pointer-events-none">{server.icon}</span>
            )
          ) : (
            <span className="text-sm font-semibold pointer-events-none">
              {server.name.slice(0, 2).toUpperCase()}
            </span>
          )}

          {/* Unread badge */}
          {unreadCount > 0 && (
            <div className="absolute -bottom-1 -right-1 min-w-[20px] h-5 px-1.5 bg-[#f23f43] rounded-full flex items-center justify-center text-white text-xs font-bold border-[3px] border-[#2b2d31]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>{server.name}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function SortableFolderItem({
  folder,
  servers,
  activeServerId,
  unreadCounts,
  onServerSelect,
  onToggleExpanded,
  onUpdateFolder,
  onDeleteFolder,
  onMarkAllAsRead,
  showAddToFolderIndicator,
  showInsertBefore,
  showInsertAfter,
}: SortableFolderItemProps) {
  const [showSettings, setShowSettings] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `folder-${folder.id}`,
    data: { type: 'folder', folder },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'opacity 150ms ease' : transition,
  };

  // Calculate folder stats
  const totalUnread = folder.serverIds.reduce(
    (acc, id) => acc + (unreadCounts[id] ?? 0),
    0
  );
  const hasUnread = totalUnread > 0;
  const isActiveInFolder = servers.some((s) => s.id === activeServerId);
  
  // Get up to 4 servers for closed state grid
  const displayServers = servers.slice(0, 4);
  
  // Calculate expanded height: header (32px) + servers (48px each) + gaps (8px) + padding (12px top/bottom)
  const expandedHeight = useMemo(() => {
    return 32 + (servers.length * 48) + ((servers.length) * 8) + 24;
  }, [servers.length]);

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn('relative flex flex-col items-center', isDragging && 'z-50')}
      >
        {/* Insert Before Indicator */}
        {showInsertBefore && (
          <div className="absolute left-1/2 -translate-x-1/2 w-10 h-[2px] z-50 pointer-events-none bg-[#5865f2] rounded-full top-0 -translate-y-1" />
        )}
        
        {/* Insert After Indicator */}
        {showInsertAfter && (
          <div className="absolute left-1/2 -translate-x-1/2 w-10 h-[2px] z-50 pointer-events-none bg-[#5865f2] rounded-full bottom-0 translate-y-1" />
        )}

        <ContextMenu>
          <ContextMenuTrigger asChild>
            <Tooltip>
              <TooltipTrigger asChild>
                {/* THE UNIFIED CONTAINER - This is the key element that stretches */}
                <div
                  {...attributes}
                  {...listeners}
                  className={cn(
                    'relative select-none cursor-pointer overflow-hidden',
                    // Transition for smooth stretch effect
                    'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
                    // Width is always the same
                    'w-[52px]',
                    // Border radius changes slightly
                    folder.isExpanded ? 'rounded-[24px]' : 'rounded-[16px]',
                    // Background changes
                    folder.isExpanded ? 'bg-[#2b2d31]' : 'bg-transparent hover:bg-[#36393f]/50',
                    // Visual indicators
                    isDragging && 'opacity-30 scale-95',
                    showAddToFolderIndicator && 'ring-2 ring-[#5865f2]'
                  )}
                  style={{
                    // Height animates from 48px to calculated expanded height
                    height: folder.isExpanded ? `${expandedHeight}px` : '48px',
                  }}
                >
                  {/* Active indicator pill - positioned relative to the container */}
                  <div
                    className={cn(
                      'absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1 rounded-r-full bg-white transition-all duration-200',
                      isActiveInFolder
                        ? folder.isExpanded ? 'h-6' : 'h-10'
                        : hasUnread
                          ? 'h-2'
                          : 'h-0 group-hover:h-5'
                    )}
                    style={{
                      top: folder.isExpanded ? '24px' : '50%',
                      transform: folder.isExpanded ? 'translateX(-4px)' : 'translateX(-4px) translateY(-50%)'
                    }}
                  />

                  {/* COLLAPSED VIEW - 2x2 Grid */}
                  <div
                    className={cn(
                      'absolute inset-0 flex items-center justify-center p-[6px]',
                      'transition-opacity duration-200',
                      folder.isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'
                    )}
                    onClick={onToggleExpanded}
                  >
                    <div className="w-12 h-12 grid grid-cols-2 grid-rows-2 gap-[3px]">
                      {displayServers.map((server) => (
                        <MiniServerIcon key={server.id} server={server} />
                      ))}
                      {/* Fill empty slots */}
                      {Array.from({ length: Math.max(0, 4 - displayServers.length) }).map((_, i) => (
                        <div
                          key={`empty-${i}`}
                          className="w-full h-full rounded-[4px] bg-[#36393f]"
                        />
                      ))}
                    </div>
                  </div>

                  {/* EXPANDED VIEW - Folder handle + server list */}
                  <div
                    className={cn(
                      'absolute inset-0 flex flex-col items-center',
                      'transition-opacity duration-200 delay-100',
                      folder.isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    )}
                    style={{ padding: '12px 2px' }}
                  >
                    {/* Folder Handle (Header) - Click to close */}
                    <button
                      onClick={onToggleExpanded}
                      className="w-12 h-8 flex items-center justify-center hover:opacity-80 transition-opacity mb-2"
                    >
                      {/* Folder icon SVG */}
                      <svg
                        width="28"
                        height="20"
                        viewBox="0 0 32 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="text-[#b5bac1]"
                      >
                        <path
                          d="M2 4C2 2.89543 2.89543 2 4 2H11.1716C11.702 2 12.2107 2.21071 12.5858 2.58579L14.4142 4.41421C14.7893 4.78929 15.298 5 15.8284 5H28C29.1046 5 30 5.89543 30 7V16C30 17.1046 29.1046 18 28 18H4C2.89543 18 2 17.1046 2 16V4Z"
                          fill="currentColor"
                          fillOpacity="0.6"
                        />
                      </svg>
                    </button>

                    {/* Server List */}
                    <div className="flex flex-col items-center gap-2">
                      {servers.map((server) => (
                        <NestedServerIcon
                          key={server.id}
                          server={server}
                          isActive={activeServerId === server.id}
                          unreadCount={unreadCounts[server.id] ?? 0}
                          onClick={() => onServerSelect(server.id)}
                          folderId={folder.id}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Unread badge (only visible when collapsed) */}
                  {totalUnread > 0 && !folder.isExpanded && (
                    <div className="absolute -bottom-1 -right-1 min-w-[20px] h-5 px-1.5 bg-[#f23f43] rounded-full flex items-center justify-center text-white text-xs font-bold border-[3px] border-[#1e1f22] z-10">
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{folder.name} • {folder.isExpanded ? 'Cliquer pour fermer' : `${servers.length} serveur${servers.length > 1 ? 's' : ''}`}</p>
              </TooltipContent>
            </Tooltip>
          </ContextMenuTrigger>

          <ContextMenuContent className="w-48">
            <ContextMenuItem onClick={onMarkAllAsRead}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Tout marquer comme lu
            </ContextMenuItem>
            <ContextMenuItem onClick={() => setShowSettings(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Paramètres du dossier
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={onDeleteFolder}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer le dossier
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>

      <FolderSettingsModal
        folder={folder}
        open={showSettings}
        onOpenChange={setShowSettings}
        onSave={onUpdateFolder}
      />
    </>
  );
}
