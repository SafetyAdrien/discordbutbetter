import { useState, useEffect, useRef } from 'react';
import { Server } from '@/types/app';
import { ServerFolder, FOLDER_CREATION_THRESHOLD } from '@/types/serverFolder';
import { cn } from '@/lib/utils';
import { FolderIcon } from './FolderIcon';
import { FolderSettingsModal } from './FolderSettingsModal';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Settings, CheckCircle, Trash2, FolderOpen } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';

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
  // Drop indicator for folder icon
  showFolderDropIndicator: boolean;
  folderDropPosition: 'before' | 'after' | 'center';
  // Drop indicator for nested servers (reordering)
  reorderTargetServerId: string | null;
  reorderPosition: 'before' | 'after' | null;
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
  showFolderDropIndicator,
  folderDropPosition,
  reorderTargetServerId,
  reorderPosition,
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

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn('relative flex flex-col items-center', isDragging && 'z-50')}
      >
        {/* Drop Indicator - before folder */}
        {showFolderDropIndicator && folderDropPosition === 'before' && (
          <div
            className={cn(
              'absolute left-1/2 -translate-x-1/2 w-10 h-[2px] z-50 pointer-events-none',
              'bg-[#5865f2] rounded-full',
              'top-0 -translate-y-1'
            )}
          />
        )}
        
        {/* Drop Indicator - after folder */}
        {showFolderDropIndicator && folderDropPosition === 'after' && (
          <div
            className={cn(
              'absolute left-1/2 -translate-x-1/2 w-10 h-[2px] z-50 pointer-events-none',
              'bg-[#5865f2] rounded-full',
              'bottom-0 translate-y-1'
            )}
          />
        )}
        
        {/* Drop Indicator - center (add to folder) */}
        {showFolderDropIndicator && folderDropPosition === 'center' && (
          <div className="absolute inset-0 rounded-[24px] border-2 border-[#5865f2] pointer-events-none z-50" />
        )}

        {/* Folder Icon */}
        <ContextMenu>
          <Tooltip>
            <ContextMenuTrigger asChild>
              <TooltipTrigger asChild>
                <button
                  {...attributes}
                  {...listeners}
                  onClick={onToggleExpanded}
                  className={cn(
                    'server-icon relative group select-none',
                    isDragging && 'opacity-30 scale-95'
                  )}
                >
                  {/* Active indicator */}
                  <div
                    className={cn(
                      'absolute -left-3 w-1 rounded-r-full bg-foreground transition-all duration-300',
                      isActiveInFolder
                        ? 'h-10'
                        : hasUnread
                          ? 'h-2'
                          : 'h-0 group-hover:h-5'
                    )}
                  />

                  <FolderIcon
                    servers={servers}
                    color={folder.color}
                    isExpanded={folder.isExpanded}
                    isActive={isActiveInFolder}
                    hasUnread={hasUnread}
                  />

                  {/* Unread badge */}
                  {totalUnread > 0 && !folder.isExpanded && (
                    <div className="absolute -bottom-1 -right-1 min-w-[20px] h-5 px-1.5 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground text-xs font-bold border-2 border-sidebar animate-badge-pop">
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </div>
                  )}
                </button>
              </TooltipTrigger>
            </ContextMenuTrigger>
            <TooltipContent side="right">
              <p>{folder.name} ({servers.length} serveurs)</p>
            </TooltipContent>
          </Tooltip>

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

        {/* Expanded servers */}
        <AnimatePresence>
          {folder.isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="flex flex-col items-center gap-2 mt-2 overflow-hidden"
              style={{
                borderLeft: `2px solid ${folder.color}40`,
                paddingLeft: '4px',
                marginLeft: '2px',
              }}
            >
              {servers.map((server) => (
                <NestedServerIcon
                  key={server.id}
                  server={server}
                  isActive={activeServerId === server.id}
                  unreadCount={unreadCounts[server.id] ?? 0}
                  onClick={() => onServerSelect(server.id)}
                  folderId={folder.id}
                  showDropIndicator={reorderTargetServerId === server.id}
                  dropPosition={reorderTargetServerId === server.id ? reorderPosition : null}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
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

// Nested server inside folder
function NestedServerIcon({
  server,
  isActive,
  unreadCount,
  onClick,
  folderId,
  showDropIndicator,
  dropPosition,
}: {
  server: Server;
  isActive: boolean;
  unreadCount: number;
  onClick: () => void;
  folderId: string;
  showDropIndicator: boolean;
  dropPosition: 'before' | 'after' | null;
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
    <div className="relative">
      {/* Drop Indicator - before */}
      {showDropIndicator && dropPosition === 'before' && (
        <div className="absolute left-1/2 -translate-x-1/2 w-8 h-[2px] bg-[#5865f2] rounded-full -top-1 z-50 pointer-events-none" />
      )}
      
      {/* Drop Indicator - after */}
      {showDropIndicator && dropPosition === 'after' && (
        <div className="absolute left-1/2 -translate-x-1/2 w-8 h-[2px] bg-[#5865f2] rounded-full -bottom-1 z-50 pointer-events-none" />
      )}
      
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className={cn(
              'w-10 h-10 rounded-[12px] flex items-center justify-center relative group select-none transition-all',
              isActive
                ? 'bg-[#5865f2] text-white'
                : 'bg-card hover:bg-[#5865f2]/80 hover:text-white',
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
                <span className="text-lg pointer-events-none">{server.icon}</span>
              )
            ) : (
              <span className="text-xs font-semibold pointer-events-none">
                {server.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          {server.icon ? (
            server.icon.startsWith('http') ? (
              <img
                src={server.icon}
                alt={server.name}
                className="w-full h-full object-cover rounded-[inherit] pointer-events-none"
                draggable={false}
              />
            ) : (
              <span className="text-lg pointer-events-none">{server.icon}</span>
            )
          ) : (
            <span className="text-xs font-semibold pointer-events-none">
              {server.name.slice(0, 2).toUpperCase()}
            </span>
          )}

          {/* Unread badge */}
          {unreadCount > 0 && (
            <div className="absolute -bottom-1 -right-1 min-w-[16px] h-4 px-1 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground text-[10px] font-bold border-2 border-sidebar">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{server.name}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
