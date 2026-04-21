import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { uuidToSnowflake } from '@/lib/snowflake';
import { messageMentionsMe } from '@/lib/mention-detection';
import { ArrowLeft, ArrowDown, Hash, BarChart2, Link, Pencil, Trash2, Bell, BellOff, MoreVertical, Check, X, StopCircle, Maximize2, Minimize2 } from 'lucide-react';
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
import { useThreadPolls, useDeletePoll, useEndPoll, Poll } from '@/hooks/usePolls';
import { useIsFollowingThread, useFollowThread, useUnfollowThread } from '@/hooks/useThreadFollow';
import { useChannels } from '@/hooks/useChannels';
import { useServerRoles } from '@/hooks/useRoles';
import { useMembers } from '@/hooks/useMembers';
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
import { useHasChannelPermission, useMultipleChannelPermissions } from '@/hooks/useUserChannelPermissions';
import { MobilePollActions } from '@/components/mobile/MobilePollActions';
import { useThreadMessageReactions, useToggleThreadReaction } from '@/hooks/useThreadReactions';
import { ReactionBar } from '@/components/chat/ReactionBar';
import { SwipeToReplyRow } from '@/components/mobile/SwipeToReplyRow';
import { RepliedLine } from '@/components/chat/RepliedLine';
import { parseRepliedMessage } from '@/lib/parse-reply';

const MOBILE_BREAKPOINT = 768;
interface ThreadViewProps {
  threadId: string;
  channelName: string;
  channelId?: string;
  serverId?: string | null;
  onBack: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const ThreadView: React.FC<ThreadViewProps> = ({ threadId, channelName, channelId, serverId, onBack, isFullscreen, onToggleFullscreen }) => {
  const [messageContent, setMessageContent] = useState('');
  const [showNewMessagesBanner, setShowNewMessagesBanner] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hoveredPollId, setHoveredPollId] = useState<string | null>(null);
  const [openDropdownPollId, setOpenDropdownPollId] = useState<string | null>(null);
  const [mobilePollSheetId, setMobilePollSheetId] = useState<string | null>(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT;
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [openDropdownMessageId, setOpenDropdownMessageId] = useState<string | null>(null);
  const [reportingMessage, setReportingMessage] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<ThreadMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
  const endPollMutation = useEndPoll();

  // Reactions
  const messageIds = useMemo(() => messages.map(m => m.id), [messages]);
  const { data: reactionsData = {} } = useThreadMessageReactions(messageIds);
  const toggleReaction = useToggleThreadReaction();
  
  // Fetch channels, roles and members for mention autocomplete
  const { data: channelsData } = useChannels(serverId || null);
  const { data: serverRoles = [] } = useServerRoles(serverId || '');
  const { data: membersData = [] } = useMembers(serverId || '');
  
  // Build channels list for mentions
  const allChannels = useMemo(() => {
    const channels: Array<{ id: string; name: string; type: string }> = [];
    channelsData?.categories.forEach(cat => {
      cat.channels.forEach(ch => {
        channels.push({ id: ch.id, name: ch.name, type: ch.type || 'text' });
      });
    });
    channelsData?.orphanChannels?.forEach(ch => {
      channels.push({ id: ch.id, name: ch.name, type: ch.type || 'text' });
    });
    return channels;
  }, [channelsData]);
  
  // Build members list for mentions
  const mentionMembers = useMemo(() => {
    return membersData.map(m => ({
      id: m.user?.id || m.id,
      displayName: m.user?.display_name || m.nickname || 'Unknown',
      username: m.user?.username || '',
      avatar: m.user?.avatar_url || undefined
    }));
  }, [membersData]);
  
  // Build roles list for mentions
  const mentionRoles = useMemo(() => {
    return serverRoles.filter(r => !r.is_default).map(r => ({
      id: r.id,
      name: r.name,
      color: r.color || undefined
    }));
  }, [serverRoles]);

  // Build memberRoles map (userId -> roles[]) for reply role badges (Discord-like)
  const memberRoles = useMemo(() => {
    const map = new Map<string, Array<{ id: string; name: string; color?: string | null; icon_url?: string | null }>>();
    for (const m of membersData) {
      const uid = m.user?.id || m.id;
      const roles = ((m as any).roles ?? []) as Array<{ id: string; name: string; color?: string | null; icon_url?: string | null; position?: number | null }>;
      // Sort by position desc so the highest role is first
      const sorted = [...roles].sort((a, b) => (b.position ?? 0) - (a.position ?? 0));
      map.set(uid, sorted);
    }
    return map;
  }, [membersData]);

  // Build a lightweight authorLookup (displayName -> {id, avatar, displayName}) for legacy reply parsing
  const replyAuthorLookup = useMemo(() => {
    const map = new Map<string, { id: string; avatar?: string; displayName: string }>();
    for (const m of membersData) {
      const dn = m.user?.display_name || m.nickname || '';
      if (!dn) continue;
      map.set(dn, {
        id: m.user?.id || m.id,
        displayName: dn,
        avatar: m.user?.avatar_url || undefined,
      });
    }
    return map;
  }, [membersData]);
  
  // Typing indicator for threads
  const { startTyping, stopTyping } = useTypingIndicator(null, null, threadId);

  // Check multiple permissions for parent channel
  const { can: canPerm } = useMultipleChannelPermissions(channelId || thread?.channel_id || null, [
    'send_messages_in_threads',
    'send_messages',
    'attach_files',
    'add_reactions',
    'create_polls',
    'mention_everyone',
    'manage_threads',
  ]);
  
  // Use send_messages_in_threads, fallback to send_messages
  const canSendMessages = canPerm('send_messages_in_threads') || canPerm('send_messages');
  const canAttachFiles = canPerm('attach_files');
  const canAddReactions = canPerm('add_reactions');
  const canCreatePolls = canPerm('create_polls');
  const canMentionEveryone = canPerm('mention_everyone');
  const canManageThreads = canPerm('manage_threads');
  
  // Thread locked/closed state
  const isThreadLocked = thread?.locked && !canManageThreads;
  const isThreadClosed = thread?.closed && !canManageThreads;
  const isReadOnly = isThreadLocked || isThreadClosed;
  
  const permissionDeniedMessage = isThreadClosed
    ? "Ce fil est fermé. L'écriture n'est plus possible."
    : isThreadLocked
    ? "Ce fil est verrouillé. Seuls les modérateurs peuvent envoyer des messages."
    : !canSendMessages 
    ? "Vous n'avez pas la permission d'envoyer des messages dans ce fil." 
    : undefined;

  const handleCopyPollLink = (pollId: string) => {
    const link = `${window.location.origin}/channels/${serverId}/${channelId}/thread/${threadId}/poll/${pollId}`;
    copyToClipboard(link, 'Lien du sondage copié');
  };

  const handleCopyId = (id: string) => {
    copyToClipboard(uuidToSnowflake(id), 'ID copié');
  };

  const handleCopyMessageLink = (messageId: string) => {
    const link = `${window.location.origin}/channels/${serverId}/${channelId}/thread/${threadId}/${messageId}`;
    copyToClipboard(link, 'Lien du message copié');
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    const currentReactions = reactionsData?.[messageId] || [];
    toggleReaction.mutate({ messageId, emoji, currentReactions });
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

  const handleEndPoll = (poll: Poll) => {
    endPollMutation.mutate({ pollId: poll.id, channelId: channelId || thread?.channel_id || '', threadId });
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
      let content = messageContent;
      // Prepend reply citation if replying
      if (replyingTo) {
        const replyAuthor = replyingTo.author?.display_name || 'Inconnu';
        const replyPreview = replyingTo.content.length > 50 
          ? replyingTo.content.slice(0, 50) + '...' 
          : replyingTo.content;
        content = `> **${replyAuthor}** : ${replyPreview}\n${content}`;
      }
      
      await sendMessage.mutateAsync({
        threadId,
        content,
      });
      setMessageContent('');
      setReplyingTo(null);
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

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [timelineItems.length]);

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
    <div className="h-full flex flex-col bg-[hsl(var(--surface-2)/0.3)] border-l-2 border-border/70 shadow-[-4px_0_12px_rgba(0,0,0,0.15)] min-w-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 h-12 shrink-0 bg-[hsl(var(--surface-2))]" style={{ borderBottom: "1px solid hsl(var(--border) / 0.5)", boxShadow: "var(--shadow-elevation-1)", borderRadius: "0 0 var(--radius-xl) var(--radius-xl)" }}>
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
              {onToggleFullscreen && (
                <DropdownMenuItem onClick={onToggleFullscreen}>
                  {isFullscreen ? (
                    <>
                      <Minimize2 className="w-4 h-4 mr-2" />
                      Vue partagée
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-4 h-4 mr-2" />
                      Plein écran
                    </>
                  )}
                </DropdownMenuItem>
              )}
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
          <div className="flex flex-col justify-end min-h-full p-4 space-y-4">
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
                    const isPollExpired = poll.expires_at ? new Date(poll.expires_at) <= new Date() : false;

                    return (
                      <ContextMenu key={`poll-${poll.id}`}>
                        <ContextMenuTrigger asChild>
                          <div 
                            className={cn(
                              'group rounded-md px-2 hover:bg-muted/50 relative',
                              showAuthor ? 'pt-2' : 'py-0'
                            )}
                            onMouseEnter={() => !isMobile && setHoveredPollId(poll.id)}
                            onMouseLeave={() => {
                              if (openDropdownPollId !== poll.id) setHoveredPollId(null);
                            }}
                            onTouchStart={() => {
                              if (!isMobile) return;
                              const timer = setTimeout(() => setMobilePollSheetId(poll.id), 500);
                              (window as any).__pollLongPressTimer = timer;
                            }}
                            onTouchEnd={() => {
                              if ((window as any).__pollLongPressTimer) {
                                clearTimeout((window as any).__pollLongPressTimer);
                                (window as any).__pollLongPressTimer = null;
                              }
                            }}
                            onTouchMove={() => {
                              if ((window as any).__pollLongPressTimer) {
                                clearTimeout((window as any).__pollLongPressTimer);
                                (window as any).__pollLongPressTimer = null;
                              }
                            }}
                          >
                            {!isMobile && (hoveredPollId === poll.id || openDropdownPollId === poll.id) && (
                              <div className="absolute top-0 right-0 -translate-y-1/2 flex items-center gap-0.5 bg-toolbar border border-border rounded-md shadow-lg p-0.5 z-10 animate-fade-in">
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
                                    <DropdownMenu onOpenChange={(open) => {
                                      setOpenDropdownPollId(open ? poll.id : null);
                                      if (!open) setHoveredPollId(null);
                                    }}>
                                      <DropdownMenuTrigger asChild>
                                        <button className="p-1.5 hover:bg-muted rounded transition-colors">
                                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        {!isPollExpired && (
                                          <DropdownMenuItem onClick={() => handleEndPoll(poll)}>
                                            <StopCircle className="w-4 h-4 mr-2" />
                                            Terminer
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem onClick={() => handleDeletePoll(poll)} className="text-destructive focus:text-destructive">
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Supprimer
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </>
                                )}
                              </div>
                            )}
                            <MobilePollActions
                              open={mobilePollSheetId === poll.id}
                              onOpenChange={(open) => setMobilePollSheetId(open ? poll.id : null)}
                              isOwnPoll={isOwnPoll}
                              isPollExpired={isPollExpired}
                              onCopyLink={() => handleCopyPollLink(poll.id)}
                              onCopyId={() => handleCopyId(poll.id)}
                              onEdit={() => setEditingPoll(poll)}
                              onDelete={() => handleDeletePoll(poll)}
                              onEndPoll={() => handleEndPoll(poll)}
                            />
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
                                    <div className="flex items-center gap-1 text-primary text-xs font-medium bg-primary/10 px-1.5 py-0.5 rounded">
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
                              {!isPollExpired && (
                                <ContextMenuItem onClick={() => handleEndPoll(poll)}>
                                  <StopCircle className="w-4 h-4 mr-2" />
                                  Terminer le sondage
                                </ContextMenuItem>
                              )}
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
                      previewAuthorName={message.author?.display_name || message.author?.username}
                      previewAuthorAvatar={message.author?.avatar_url || undefined}
                      previewContent={message.content}
                      onReply={() => setReplyingTo(message)}
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
                        edited_at: message.edited_at || null,
                      }) : undefined}
                    >
                      <SwipeToReplyRow
                        enabled={isMobile}
                        onReply={() => setReplyingTo(message)}
                        onDoubleTap={() => handleAddReaction(message.id, '❤️')}
                      >
                      <div 
                        className={cn(
                          'flex gap-3 px-2 py-1 message-hover relative',
                          showAuthor ? 'pt-2' : '',
                          messageMentionsMe(message.content, user?.id, membersData.find(m => m.user?.id === user?.id)?.roles?.map((r: any) => r.id) ?? []) && 'message-mentioned !-mx-4 !px-6',
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
                          onReply={() => setReplyingTo(message)}
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
                                <span className="text-[.625rem] text-muted-foreground/40">(modifié)</span>
                              )}
                            </div>
                          )}
                          {editingMessageId === message.id ? (
                            <div className="space-y-2">
                              <Textarea
                                ref={(el) => {
                                  if (el) {
                                    el.style.height = 'auto';
                                    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
                                  }
                                }}
                                value={editingContent}
                                onChange={(e) => {
                                  setEditingContent(e.target.value);
                                  e.target.style.height = 'auto';
                                  e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                                }}
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
                              <MarkdownText content={parseRepliedMessage(message.content).body} />
                            </div>
                          )}
                          {(reactionsData[message.id]?.length ?? 0) > 0 && (
                            <div className="mt-1">
                              <ReactionBar
                                reactions={reactionsData[message.id] || []}
                                onToggle={(emoji) => handleAddReaction(message.id, emoji)}
                                serverId={serverId || null}
                                size="sm"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      </SwipeToReplyRow>
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
          <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Typing Indicator */}
      <TypingIndicator threadId={threadId} />

      {/* Reply indicator */}
      {replyingTo && (
        <div className="px-4 py-2 bg-muted/50 border-t border-border flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <span className="text-xs text-muted-foreground">
              Répondre à{' '}
              <span className="font-semibold text-foreground">
                {replyingTo.author?.display_name || 'Inconnu'}
              </span>
            </span>
            <p className="text-xs text-muted-foreground truncate">
              {replyingTo.content}
            </p>
          </div>
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => setReplyingTo(null)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2">
      <MessageInput
        value={messageContent}
        onChange={setMessageContent}
        onSend={handleSend}
        placeholder={replyingTo ? `Répondre à ${replyingTo.author?.display_name || 'Inconnu'}` : `Envoyer un message dans ${thread?.name || 'le thread'}`}
        disabled={sendMessage.isPending || isThreadLocked || isThreadClosed}
        isSending={sendMessage.isPending}
        onTypingStart={startTyping}
        onTypingStop={stopTyping}
        serverId={serverId}
        channelId={channelId || thread?.channel_id}
        threadId={threadId}
        members={mentionMembers}
        roles={mentionRoles}
        channels={allChannels}
        permissionDeniedMessage={permissionDeniedMessage}
        canAttachFiles={canAttachFiles}
        canCreatePolls={canCreatePolls}
        canMentionEveryone={canMentionEveryone}
      />
      </div>
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
