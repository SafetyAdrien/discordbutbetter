import React, { useState } from 'react';
import { Search, Plus, Pencil, Bell, BellOff, MoreVertical, Trash2, Check, X, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useThreads, useUpdateThread, useDeleteThread } from '@/hooks/useThreads';
import { useIsFollowingThread, useFollowThread, useUnfollowThread } from '@/hooks/useThreadFollow';
import { Thread } from '@/types/thread';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import CreateThreadModal from './CreateThreadModal';
import StreamlineThreads from '@/components/icons/StreamlineThreads';
import { cn } from '@/lib/utils';

interface ThreadsPopoverProps {
  channelId: string;
  onSelectThread: (threadId: string) => void;
}

const ThreadsPopover: React.FC<ThreadsPopoverProps> = ({ channelId, onSelectThread }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data: threads = [], isLoading } = useThreads(channelId);

  const filteredThreads = threads.filter((thread) =>
    thread.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleThreadCreated = (threadId: string) => {
    onSelectThread(threadId);
  };

  return (
    <div className="flex flex-col max-h-[350px] sm:h-[450px] w-full max-w-[380px]">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <StreamlineThreads className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Threads</h3>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Créer
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher des threads..."
            className="pl-8 h-8"
          />
        </div>
      </div>

      {/* Thread List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Chargement...
          </div>
        ) : filteredThreads.length === 0 ? (
          <EmptyState
            hasSearchQuery={!!searchQuery}
            onCreateClick={() => setShowCreateModal(true)}
          />
        ) : (
          <div className="p-2 space-y-1">
            {filteredThreads.map((thread) => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                onClick={() => onSelectThread(thread.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      <CreateThreadModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        channelId={channelId}
        onThreadCreated={handleThreadCreated}
      />
    </div>
  );
};

const ThreadItem: React.FC<{ thread: Thread; onClick: () => void }> = ({
  thread,
  onClick,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(thread.name);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const updateThread = useUpdateThread();
  const deleteThread = useDeleteThread();
  const { data: isFollowing } = useIsFollowingThread(thread.id);
  const followThread = useFollowThread();
  const unfollowThread = useUnfollowThread();

  const handleRename = () => {
    if (newName.trim() && newName !== thread.name) {
      updateThread.mutate({ threadId: thread.id, name: newName.trim() });
    }
    setIsRenaming(false);
  };

  const handleDelete = () => {
    deleteThread.mutate({ threadId: thread.id, channelId: thread.channel_id });
    setShowDeleteDialog(false);
  };

  const handleToggleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFollowing) {
      unfollowThread.mutate(thread.id);
    } else {
      followThread.mutate(thread.id);
    }
  };

  // Truncate last message content
  const truncateMessage = (content: string, maxLength: number = 50) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + '...';
  };

  return (
    <>
      <div className="w-full flex items-start gap-3 p-2.5 rounded-md hover:bg-muted transition-colors group cursor-pointer" onClick={onClick}>
        {/* Main content area */}
        <div className="flex-1 min-w-0">
          {/* Top row: Thread name + Avatars + Count */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            {isRenaming ? (
              <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-6 text-sm flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename();
                    if (e.key === 'Escape') {
                      setNewName(thread.name);
                      setIsRenaming(false);
                    }
                  }}
                />
                <Button size="iconSm" variant="ghost" onClick={handleRename} className="h-6 w-6">
                  <Check className="w-3 h-3" />
                </Button>
                <Button size="iconSm" variant="ghost" onClick={() => {
                  setNewName(thread.name);
                  setIsRenaming(false);
                }} className="h-6 w-6">
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <span className="font-semibold text-foreground truncate text-sm">
                {thread.name}
              </span>
            )}
            
            {/* Right side: Stacked avatars + participant count */}
            {!isRenaming && (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Stacked avatars */}
                {thread.participants && thread.participants.length > 0 && (
                  <div className="flex -space-x-2">
                    {thread.participants.slice(0, 4).map((participant, index) => (
                      <Avatar
                        key={participant.id}
                        className={cn(
                          "w-5 h-5 border-2 border-card",
                          "ring-0"
                        )}
                        style={{ zIndex: 4 - index }}
                      >
                        <AvatarImage src={participant.avatar_url || undefined} />
                        <AvatarFallback className="text-[8px]">
                          {participant.display_name?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                )}
                
                {/* Participant count badge */}
                {thread.participant_count !== undefined && thread.participant_count > 0 && (
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                    {thread.participant_count}+
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Bottom row: Last message preview with author and time */}
          {thread.last_message ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Avatar className="w-4 h-4 flex-shrink-0">
                <AvatarImage src={thread.last_message.author?.avatar_url || undefined} />
                <AvatarFallback className="text-[8px]">
                  {thread.last_message.author?.display_name?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground/80 flex-shrink-0">
                {thread.last_message.author?.display_name || 'Inconnu'}:
              </span>
              <span className="truncate flex-1">
                {truncateMessage(thread.last_message.content)}
              </span>
              <span className="flex-shrink-0">•</span>
              <span className="flex-shrink-0">
                {formatDistanceToNow(new Date(thread.last_message.created_at), {
                  addSuffix: false,
                  locale: fr,
                })}
              </span>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              Aucun message
            </div>
          )}
        </div>

        {/* Actions - visible on hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="iconSm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRenaming(true);
                }}
                className="h-6 w-6"
              >
                <Pencil className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Renommer</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="iconSm"
                variant="ghost"
                onClick={handleToggleFollow}
                className={cn("h-6 w-6", isFollowing && "text-primary")}
              >
                {isFollowing ? (
                  <Bell className="w-3 h-3 fill-current" />
                ) : (
                  <BellOff className="w-3 h-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {isFollowing ? 'Ne plus suivre' : 'Suivre'}
            </TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="iconSm"
                variant="ghost"
                onClick={(e) => e.stopPropagation()}
                className="h-6 w-6"
              >
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteDialog(true);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer le thread
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le thread</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "{thread.name}" ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const EmptyState: React.FC<{
  hasSearchQuery: boolean;
  onCreateClick: () => void;
}> = ({ hasSearchQuery, onCreateClick }) => {
  if (hasSearchQuery) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8 px-4 text-center">
        <Search className="w-12 h-12 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground text-sm">Aucun thread trouvé</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full py-8 px-4 text-center">
      <div className="relative mb-4">
        <StreamlineThreads className="w-16 h-16 text-muted-foreground/30" />
        <div className="absolute -top-2 -right-2">
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
        </div>
        <div className="absolute -bottom-1 -left-3">
          <Star className="w-4 h-4 text-yellow-500/70 fill-yellow-500/70" />
        </div>
        <div className="absolute top-0 -left-4">
          <Star className="w-3 h-3 text-yellow-500/50 fill-yellow-500/50" />
        </div>
      </div>
      <h4 className="font-semibold text-foreground mb-1">
        Pas encore de threads
      </h4>
      <p className="text-muted-foreground text-sm mb-4 max-w-[250px]">
        Les threads permettent d'organiser des discussions sans encombrer le salon principal.
      </p>
      <Button size="sm" onClick={onCreateClick}>
        <Plus className="w-4 h-4 mr-1" />
        Créer un thread
      </Button>
    </div>
  );
};

export default ThreadsPopover;
