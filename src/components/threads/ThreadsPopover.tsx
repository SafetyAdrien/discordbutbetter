import React, { useState } from 'react';
import { Search, Plus, MessageSquare, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useThreads } from '@/hooks/useThreads';
import { Thread } from '@/types/thread';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import CreateThreadModal from './CreateThreadModal';
import StreamlineThreads from '@/components/icons/StreamlineThreads';

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
    <div className="flex flex-col h-[400px]">
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
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left"
    >
      <Avatar className="w-8 h-8 mt-0.5">
        <AvatarImage src={thread.creator?.avatar_url || undefined} />
        <AvatarFallback className="text-xs">
          {thread.creator?.display_name?.[0] || '?'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground truncate">
            {thread.name}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span>{thread.creator?.display_name || 'Inconnu'}</span>
          <span>•</span>
          <span>
            {thread.last_message_at
              ? formatDistanceToNow(new Date(thread.last_message_at), {
                  addSuffix: true,
                  locale: fr,
                })
              : 'Aucun message'}
          </span>
          {thread.message_count !== undefined && thread.message_count > 0 && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {thread.message_count}
              </span>
            </>
          )}
        </div>
      </div>
    </button>
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
