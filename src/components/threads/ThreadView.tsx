import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, ArrowDown, Hash, BarChart2, Link, Pencil, Trash2, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useThread } from '@/hooks/useThreads';
import { useThreadMessages, useSendThreadMessage } from '@/hooks/useThreadMessages';
import { useMarkThreadAsRead } from '@/hooks/useThreadUnreadCounts';
import { useThreadPolls, useDeletePoll, Poll } from '@/hooks/usePolls';
import { useIsFollowingThread, useFollowThread, useUnfollowThread } from '@/hooks/useThreadFollow';
import { PollDisplay } from '@/components/chat/PollDisplay';
import { CreatePollModal } from '@/components/chat/CreatePollModal';
import { ThreadMessage } from '@/types/thread';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MarkdownText } from '@/lib/markdown';
import StreamlineThreads from '@/components/icons/StreamlineThreads';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { TypingIndicator } from '@/components/typing/TypingIndicator';
import { MessageInput } from '@/components/chat/MessageInput';
import { cn } from '@/lib/utils';
import { copyToClipboard } from '@/lib/clipboard';
import { useAuth } from '@/contexts/AuthContext';

interface ThreadViewProps {
  threadId: string;
  channelName: string;
  channelId?: string;
  serverId?: string | null;
  onBack: () => void;
}

const ThreadView: React.FC<ThreadViewProps> = ({ threadId, channelName, channelId, serverId, onBack }) => {
  const [messageContent, setMessageContent] = useState('');
  const [showNewMessagesBanner, setShowNewMessagesBanner] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hoveredPollId, setHoveredPollId] = useState<string | null>(null);
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);
  
  const { user } = useAuth();
  const { data: thread } = useThread(threadId);
  const { data: messages = [] } = useThreadMessages(threadId);
  const { data: polls = [] } = useThreadPolls(threadId);
  const { data: isFollowing } = useIsFollowingThread(threadId);
  const followThread = useFollowThread();
  const unfollowThread = useUnfollowThread();
  const sendMessage = useSendThreadMessage();
  const markAsRead = useMarkThreadAsRead();
  const deletePoll = useDeletePoll();
  
  // Typing indicator for threads
  const { startTyping, stopTyping } = useTypingIndicator(null, null, threadId);

  const handleCopyPollLink = (pollId: string) => {
    const link = `${window.location.origin}/channels/${serverId}/${channelId}/thread/${threadId}/poll/${pollId}`;
    copyToClipboard(link, 'Lien du sondage copié');
  };

  const handleCopyId = (id: string) => {
    copyToClipboard(id, 'ID copié');
  };

  const handleDeletePoll = (poll: Poll) => {
    deletePoll.mutate({ pollId: poll.id, channelId: channelId || thread?.channel_id || '', threadId });
  };

  // Mark thread as read when opened
  useEffect(() => {
    if (threadId && channelId) {
      markAsRead.mutate({ threadId, channelId });
      setShowNewMessagesBanner(false);
      lastMessageCountRef.current = 0;
    }
  }, [threadId, channelId]);

  // Check if user is at bottom of scroll
  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const atBottom = scrollHeight - scrollTop - clientHeight < 50;
      setIsAtBottom(atBottom);
      
      if (atBottom && channelId) {
        setShowNewMessagesBanner(false);
        markAsRead.mutate({ threadId, channelId });
      }
    }
  }, [threadId, markAsRead]);

  // Detect new messages and show banner if not at bottom
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current && lastMessageCountRef.current > 0 && !isAtBottom) {
      setShowNewMessagesBanner(true);
    }
    lastMessageCountRef.current = messages.length;
  }, [messages.length, isAtBottom]);

  // Auto-scroll to bottom on initial load
  useEffect(() => {
    if (scrollRef.current && lastMessageCountRef.current === 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current && channelId) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      setShowNewMessagesBanner(false);
      markAsRead.mutate({ threadId, channelId });
    }
  }, [threadId, channelId, markAsRead]);

  const handleSend = async () => {
    if (!messageContent.trim()) return;
    
    try {
      await sendMessage.mutateAsync({
        threadId,
        content: messageContent,
      });
      setMessageContent('');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: fr });
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'd MMMM yyyy', { locale: fr });
  };

  // Create unified timeline of messages and polls
  type TimelineItem = 
    | { type: 'message'; data: ThreadMessage; timestamp: Date }
    | { type: 'poll'; data: Poll; timestamp: Date };
    
  const timelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];
    
    messages.forEach(msg => items.push({ 
      type: 'message', 
      data: msg, 
      timestamp: new Date(msg.created_at) 
    }));
    
    polls.forEach(poll => items.push({ 
      type: 'poll', 
      data: poll, 
      timestamp: new Date(poll.created_at) 
    }));
    
    return items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [messages, polls]);
  
  // Group timeline items by date
  const groupedTimelineItems = useMemo(() => {
    return timelineItems.reduce((groups, item) => {
      const date = format(item.timestamp, 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
      return groups;
    }, {} as Record<string, TimelineItem[]>);
  }, [timelineItems]);

  // Handle input change with typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageContent(e.target.value);
    if (e.target.value.trim()) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  return (
    <div className="w-80 flex flex-col bg-card border-l border-border min-w-0 shrink-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-12 border-b border-border shrink-0">
        <Button
          variant="ghost"
          size="iconSm"
          onClick={onBack}
          className="shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <StreamlineThreads className="w-5 h-5 text-muted-foreground shrink-0" />
          <span className="font-semibold text-foreground truncate">
            {thread?.name || 'Thread'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Hash className="w-3 h-3" />
          <span>{channelName}</span>
        </div>
        
        {/* Bouton Suivre/Ne plus suivre */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isFollowing) {
                  unfollowThread.mutate(threadId, {
                    onSuccess: () => {
                      // Fermer le thread quand on arrête de le suivre
                      onBack();
                    }
                  });
                } else {
                  followThread.mutate(threadId);
                }
              }}
              className={cn(
                "gap-1.5 ml-2",
                isFollowing && "text-primary"
              )}
              disabled={followThread.isPending || unfollowThread.isPending}
            >
              {isFollowing ? (
                <>
                  <Bell className="w-4 h-4 fill-current" />
                  <span className="text-sm">Suivi</span>
                </>
              ) : (
                <>
                  <BellOff className="w-4 h-4" />
                  <span className="text-sm">Suivre</span>
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {isFollowing ? 'Ne plus suivre ce thread' : 'Suivre ce thread'}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Messages */}
      <div className="relative flex-1 overflow-hidden">
        {/* New messages banner */}
        {showNewMessagesBanner && (
          <button
            onClick={scrollToBottom}
            className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <ArrowDown className="w-4 h-4" />
            <span className="text-sm font-medium">Nouveaux messages</span>
          </button>
        )}
        
        <div 
          ref={scrollRef} 
          onScroll={handleScroll}
          className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
        >
          <div className="p-4 space-y-4">
          {Object.entries(groupedTimelineItems).map(([date, items]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center gap-2 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground px-2">
                  {formatDate(items[0].timestamp.toISOString())}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
              
              {/* Items for this date */}
              <div className="space-y-0.5">
                {items.map((item, index) => {
                  // Render Poll
                  if (item.type === 'poll') {
                    const poll = item.data as Poll;
                    const prevItem = index > 0 ? items[index - 1] : null;
                    const showAuthor = !prevItem || 
                      prevItem.type !== 'poll' ||
                      (prevItem.data as Poll).author?.id !== poll.author?.id ||
                      (item.timestamp.getTime() - prevItem.timestamp.getTime()) > 300000;
                    const isOwnPoll = user?.id === poll.author_id;

                    return (
                      <ContextMenu key={`poll-${poll.id}`}>
                        <ContextMenuTrigger asChild>
                          <div 
                            className={cn(
                              'group rounded-md px-2 hover:bg-muted/50 relative',
                              showAuthor ? 'pt-2' : 'py-0'
                            )}
                            onMouseEnter={() => setHoveredPollId(poll.id)}
                            onMouseLeave={() => setHoveredPollId(null)}
                          >
                            {hoveredPollId === poll.id && (
                              <div className="absolute top-0 right-0 -translate-y-1/2 flex items-center gap-0.5 bg-card border border-border rounded-md shadow-lg p-0.5 z-10 animate-fade-in">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button onClick={() => handleCopyPollLink(poll.id)} className="p-1.5 hover:bg-muted rounded transition-colors">
                                      <Link className="w-4 h-4 text-muted-foreground" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Copier le lien</TooltipContent>
                                </Tooltip>
                                {isOwnPoll && (
                                  <>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button onClick={() => setEditingPoll(poll)} className="p-1.5 hover:bg-muted rounded transition-colors">
                                          <Pencil className="w-4 h-4 text-muted-foreground" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">Modifier</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button onClick={() => handleDeletePoll(poll)} className="p-1.5 hover:bg-destructive/20 rounded transition-colors">
                                          <Trash2 className="w-4 h-4 text-destructive" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">Supprimer</TooltipContent>
                                    </Tooltip>
                                  </>
                                )}
                              </div>
                            )}
                            {showAuthor ? (
                              <div className="flex gap-3">
                                <Avatar className="w-8 h-8 mt-0.5 shrink-0">
                                  <AvatarImage src={poll.author?.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {poll.author?.display_name?.[0] || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline gap-2 mb-0.5">
                                    <span className="font-medium text-foreground text-sm">
                                      {poll.author?.display_name || 'Inconnu'}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(poll.created_at), 'HH:mm', { locale: fr })}
                                    </span>
                                    <div className="flex items-center gap-1 text-[#5865f2] text-xs font-medium bg-[#5865f2]/10 px-1.5 py-0.5 rounded">
                                      <BarChart2 className="w-3 h-3" />
                                      POLL
                                    </div>
                                  </div>
                                  <div className="mt-1">
                                    <PollDisplay 
                                      poll={poll} 
                                      channelId={channelId || thread?.channel_id || ''} 
                                      threadId={threadId}
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-3">
                                <div className="w-8 shrink-0" />
                                <div className="flex-1">
                                  <PollDisplay 
                                    poll={poll} 
                                    channelId={channelId || thread?.channel_id || ''} 
                                    threadId={threadId}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-48">
                          <ContextMenuItem onClick={() => handleCopyPollLink(poll.id)}>
                            <Link className="w-4 h-4 mr-2" />
                            Copier le lien
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => handleCopyId(poll.id)}>
                            <Hash className="w-4 h-4 mr-2" />
                            Copier l'ID
                          </ContextMenuItem>
                          {isOwnPoll && (
                            <>
                              <ContextMenuSeparator />
                              <ContextMenuItem onClick={() => setEditingPoll(poll)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Modifier
                              </ContextMenuItem>
                              <ContextMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeletePoll(poll)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                              </ContextMenuItem>
                            </>
                          )}
                        </ContextMenuContent>
                      </ContextMenu>
                    );
                  }
                  
                  // Render Message
                  const message = item.data as ThreadMessage;
                  const prevItem = index > 0 ? items[index - 1] : null;
                  const showAuthor =
                    !prevItem ||
                    prevItem.type !== 'message' ||
                    (prevItem.data as ThreadMessage).author_id !== message.author_id ||
                    item.timestamp.getTime() - prevItem.timestamp.getTime() > 5 * 60 * 1000;

                  return (
                    <MessageItem
                      key={message.id}
                      message={message}
                      showAuthor={showAuthor}
                      formatTime={formatTime}
                    />
                  );
                })}
              </div>
            </div>
          ))}
          
          {timelineItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <StreamlineThreads className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold text-foreground mb-1">
                Début du thread
              </h3>
              <p className="text-muted-foreground text-sm">
                Soyez le premier à envoyer un message !
              </p>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Typing Indicator */}
      <TypingIndicator threadId={threadId} />

      {/* Input */}
      <MessageInput
        value={messageContent}
        onChange={setMessageContent}
        onSend={handleSend}
        placeholder={`Envoyer un message dans ${thread?.name || 'le thread'}`}
        disabled={sendMessage.isPending}
        isSending={sendMessage.isPending}
        onTypingStart={startTyping}
        onTypingStop={stopTyping}
        serverId={serverId}
        channelId={channelId || thread?.channel_id}
        threadId={threadId}
      />
      {/* Edit Poll Modal */}
      <CreatePollModal
        channelId={channelId || thread?.channel_id || ''}
        serverId={serverId || null}
        threadId={threadId}
        open={!!editingPoll}
        onOpenChange={(open) => !open && setEditingPoll(null)}
        editPoll={editingPoll}
      />
    </div>
  );
};

const MessageItem: React.FC<{
  message: ThreadMessage;
  showAuthor: boolean;
  formatTime: (date: string) => string;
}> = ({ message, showAuthor, formatTime }) => {
  return (
    <div className={`flex gap-3 px-2 py-1 hover:bg-muted/50 rounded ${showAuthor ? 'pt-2' : ''}`}>
      {showAuthor ? (
        <Avatar className="w-8 h-8 mt-0.5 shrink-0">
          <AvatarImage src={message.author?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">
            {message.author?.display_name?.[0] || '?'}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-8 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        {showAuthor && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="font-medium text-foreground text-sm">
              {message.author?.display_name || 'Inconnu'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTime(message.created_at)}
            </span>
            {message.edited_at && (
              <span className="text-xs text-muted-foreground">(modifié)</span>
            )}
          </div>
        )}
        <div className="text-sm text-foreground break-words">
          <MarkdownText content={message.content} />
        </div>
      </div>
    </div>
  );
};

export default ThreadView;
