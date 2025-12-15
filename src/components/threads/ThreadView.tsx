import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, ArrowDown, Hash, BarChart2, Link, Pencil, Trash2, Bell, BellOff, MoreVertical, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useThread, useDeleteThread, useUpdateThread } from '@/hooks/useThreads';
import { useThreadMessages, useSendThreadMessage, useEditThreadMessage, useDeleteThreadMessage } from '@/hooks/useThreadMessages';
import { useMarkThreadAsRead } from '@/hooks/useThreadUnreadCounts';
import { useThreadPolls, useDeletePoll, Poll } from '@/hooks/usePolls';
import { useIsFollowingThread, useFollowThread, useUnfollowThread } from '@/hooks/useThreadFollow';
import { PollDisplay } from '@/components/chat/PollDisplay';
import { CreatePollModal } from '@/components/chat/CreatePollModal';
import { UniversalMessageActions } from '@/components/chat/UniversalMessageActions';
import { UniversalMessageContextMenu } from '@/components/chat/UniversalMessageContextMenu';
import { ReportModal } from '@/components/chat/ReportModal';
import { ThreadMessage } from '@/types/thread';
import { Message } from '@/types/app';
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
import { useShiftKey } from '@/hooks/useShiftKey';
import { toast } from 'sonner';

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
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [openDropdownMessageId, setOpenDropdownMessageId] = useState<string | null>(null);
  const [reportingMessage, setReportingMessage] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);
  
  const { user } = useAuth();
  const isShiftPressed = useShiftKey();
  const { data: thread } = useThread(threadId);
  const { data: messages = [] } = useThreadMessages(threadId);
  const { data: polls = [] } = useThreadPolls(threadId);
  const { data: isFollowing } = useIsFollowingThread(threadId);
  const followThread = useFollowThread();
  const unfollowThread = useUnfollowThread();
  const deleteThread = useDeleteThread();
  const updateThread = useUpdateThread();
  const sendMessage = useSendThreadMessage();
  const editMessage = useEditThreadMessage();
  const deleteMessage = useDeleteThreadMessage();
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

  const handleCopyMessageLink = (messageId: string) => {
    const link = `${window.location.origin}/channels/${serverId}/${channelId}/thread/${threadId}/${messageId}`;
    copyToClipboard(link, 'Lien du message copié');
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    console.log('Add reaction', messageId, emoji);
    toast.success(`Réaction ${emoji} ajoutée`);
  };

  const handleStartEdit = (message: ThreadMessage) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
  };

  const handleSaveEdit = async () => {
    if (editingMessageId && editingContent.trim()) {
      await editMessage.mutateAsync({
        messageId: editingMessageId,
        threadId,
        content: editingContent.trim(),
      });
      setEditingMessageId(null);
      setEditingContent('');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleDeleteMessage = (messageId: string) => {
    deleteMessage.mutate({ messageId, threadId });
  };

  const getCharacterCountColor = () => {
    if (editingContent.length > 1980) return 'text-destructive';
    if (editingContent.length > 1900) return 'text-yellow-500';
    return 'text-muted-foreground';
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
  const handleRename = () => {
    if (newName.trim() && newName !== thread?.name) {
      updateThread.mutate({ threadId, name: newName.trim() });
    }
    setIsRenaming(false);
  };

  const handleDeleteThread = () => {
    if (channelId) {
      deleteThread.mutate({ threadId, channelId }, {
        onSuccess: () => onBack()
      });
    }
    setShowDeleteDialog(false);
  };

  return (
    <div className="h-full flex flex-col bg-card border-l-2 border-border/70 shadow-[-4px_0_12px_rgba(0,0,0,0.15)] min-w-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 h-12 border-b border-border shrink-0">
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
          {isRenaming ? (
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setIsRenaming(false);
              }}
              className="h-7 text-sm font-semibold"
              autoFocus
            />
          ) : (
            <span className="font-semibold text-foreground truncate">
              {thread?.name || 'Thread'}
            </span>
          )}
        </div>
        
        {/* Actions groupées */}
        <div className="flex items-center gap-0.5">
          {/* Renommer */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => {
                  setNewName(thread?.name || '');
                  setIsRenaming(true);
                }}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Renommer</TooltipContent>
          </Tooltip>
          
          {/* Suivre/Ne plus suivre */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => {
                  if (isFollowing) {
                    unfollowThread.mutate(threadId, {
                      onSuccess: () => onBack()
                    });
                  } else {
                    followThread.mutate(threadId);
                  }
                }}
                className={cn(isFollowing && "text-primary")}
                disabled={followThread.isPending || unfollowThread.isPending}
              >
                {isFollowing ? (
                  <Bell className="w-4 h-4 fill-current" />
                ) : (
                  <BellOff className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isFollowing ? 'Ne plus suivre' : 'Suivre'}
            </TooltipContent>
          </Tooltip>
          
          {/* Menu 3 points */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="iconSm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer le thread
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce thread ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Tous les messages de ce thread seront supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteThread}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

                  const isOwnMessage = user?.id === message.author_id;

                  return (
                    <UniversalMessageContextMenu
                      key={message.id}
                      isOwnMessage={isOwnMessage}
                      messageId={message.id}
                      onReply={() => console.log('Reply to', message.id)}
                      onAddReaction={(emoji) => handleAddReaction(message.id, emoji)}
                      onCopyText={() => copyToClipboard(message.content, 'Message copié')}
                      onCopyLink={() => handleCopyMessageLink(message.id)}
                      onCopyId={() => handleCopyId(message.id)}
                      onEdit={isOwnMessage ? () => handleStartEdit(message) : undefined}
                      onDelete={isOwnMessage ? () => handleDeleteMessage(message.id) : undefined}
                      onReport={!isOwnMessage ? () => setReportingMessage({
                        id: message.id,
                        content: message.content,
                        author: {
                          id: message.author?.id || '',
                          displayName: message.author?.display_name || 'Utilisateur',
                          username: message.author?.username || 'unknown',
                          avatar: message.author?.avatar_url || undefined,
                          status: 'offline',
                        },
                        timestamp: new Date(message.created_at),
                        edited: !!message.edited_at,
                      }) : undefined}
                    >
                      <div 
                        className={cn(
                          'flex gap-3 px-2 py-1 message-hover rounded relative',
                          showAuthor ? 'pt-2' : '',
                        )}
                        onMouseEnter={() => setHoveredMessageId(message.id)}
                        onMouseLeave={() => { 
                          if (openDropdownMessageId !== message.id) setHoveredMessageId(null); 
                        }}
                      >
                        <UniversalMessageActions
                          isVisible={(hoveredMessageId === message.id || openDropdownMessageId === message.id) && editingMessageId !== message.id}
                          isShiftPressed={isShiftPressed}
                          isOwnMessage={isOwnMessage}
                          onReply={() => console.log('Reply to', message.id)}
                          onAddReaction={(emoji) => handleAddReaction(message.id, emoji)}
                          onCopyLink={() => handleCopyMessageLink(message.id)}
                          onCopyId={() => handleCopyId(message.id)}
                          onEdit={isOwnMessage ? () => handleStartEdit(message) : undefined}
                          onDelete={isOwnMessage ? () => handleDeleteMessage(message.id) : undefined}
                          onDropdownOpenChange={(open) => {
                            setOpenDropdownMessageId(open ? message.id : null);
                            if (!open) setHoveredMessageId(null);
                          }}
                        />
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
                          {editingMessageId === message.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSaveEdit();
                                  }
                                  if (e.key === 'Escape') {
                                    handleCancelEdit();
                                  }
                                }}
                                className="min-h-[40px] max-h-[200px] resize-none text-sm"
                                autoFocus
                              />
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                  Entrée pour sauvegarder • Maj+Entrée nouvelle ligne
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className={cn('text-xs font-mono', getCharacterCountColor())}>
                                    {editingContent.length}/2000
                                  </span>
                                  <Button size="iconSm" variant="ghost" onClick={handleCancelEdit}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    size="iconSm" 
                                    variant="ghost" 
                                    onClick={handleSaveEdit}
                                    disabled={!editingContent.trim() || editingContent.length > 2000}
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-foreground break-words">
                              <MarkdownText content={message.content} />
                            </div>
                          )}
                        </div>
                      </div>
                    </UniversalMessageContextMenu>
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

      {/* Report Modal */}
      <ReportModal
        isOpen={!!reportingMessage}
        onClose={() => setReportingMessage(null)}
        message={reportingMessage}
        onSubmit={(reason, details) => {
          console.log('Report submitted:', { reason, details, messageId: reportingMessage?.id });
          toast.success('Signalement envoyé. Merci !');
          setReportingMessage(null);
        }}
      />
    </div>
  );
};

export default ThreadView;
