import { useState, forwardRef, useEffect, useMemo, useCallback, useRef } from 'react';
import { Message, Channel, User } from '@/types/app';
import { cn } from '@/lib/utils';
import { Hash, Bell, Pin, Users, Inbox, Copy, Reply, Pencil, Trash2, MessageSquareText, BellOff, BellRing, AtSign, X, Check, Link, SmilePlus, BarChart2, MoreHorizontal, Smile, Flag } from 'lucide-react';
import { UniversalMessageActions } from '@/components/chat/UniversalMessageActions';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserProfilePopup } from '@/components/profile/UserProfilePopup';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from '@/components/ui/context-menu';
import { copyToClipboard } from '@/lib/clipboard';
import { useAuth } from '@/contexts/AuthContext';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { TypingIndicator } from '@/components/typing/TypingIndicator';
import { MarkdownText } from '@/lib/markdown';
import { useEditMessage, useDeleteMessage } from '@/hooks/useMessages';
import { usePinnedMessages, usePinMessage, useUnpinMessage } from '@/hooks/usePinnedMessages';
import { useMessageReactions, useAddReaction, useRemoveReaction, Reaction } from '@/hooks/useReactions';
import { usePolls, useDeletePoll, Poll } from '@/hooks/usePolls';
import { useThreads } from '@/hooks/useThreads';
import { Thread } from '@/types/thread';
import { PollDisplay } from './PollDisplay';
import { CreatePollModal } from './CreatePollModal';
import StreamlineThreads from '@/components/icons/StreamlineThreads';
import ThreadsPopover from '@/components/threads/ThreadsPopover';
import CreateThreadModal from '@/components/threads/CreateThreadModal';
import { ThreadSpine } from '@/components/threads/ThreadSpine';
import { ThreadSystemMessage } from '@/components/threads/ThreadSystemMessage';
import { MessageInput } from '@/components/chat/MessageInput';
import { ReportModal } from '@/components/chat/ReportModal';
import { toast } from 'sonner';

// Reply Reference Component
function ReplyReference({
  replyTo,
  onClear
}: {
  replyTo: Message;
  onClear: () => void;
}) {
  return <div className="mx-4 mb-2 flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border-l-2 border-primary">
      <Reply className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-xs text-primary font-medium">
          Réponse à {replyTo.author.displayName}
        </span>
        <p className="text-sm text-muted-foreground truncate">{replyTo.content}</p>
      </div>
      <button onClick={onClear} className="p-1 hover:bg-muted rounded transition-colors">
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>;
}

// Reactions Display Component
function MessageReactions({
  reactions,
  onToggle,
  userId
}: {
  reactions: Reaction[];
  onToggle: (emoji: string) => void;
  userId?: string;
}) {
  // Group reactions by emoji
  const grouped = useMemo(() => {
    const groups: Record<string, {
      count: number;
      hasUserReacted: boolean;
    }> = {};
    reactions.forEach(r => {
      if (!groups[r.emoji]) {
        groups[r.emoji] = {
          count: 0,
          hasUserReacted: false
        };
      }
      groups[r.emoji].count++;
      if (r.user_id === userId) {
        groups[r.emoji].hasUserReacted = true;
      }
    });
    return groups;
  }, [reactions, userId]);
  if (Object.keys(grouped).length === 0) return null;
  return <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(grouped).map(([emoji, {
      count,
      hasUserReacted
    }]) => <button key={emoji} onClick={() => onToggle(emoji)} className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-sm transition-colors", hasUserReacted ? "bg-primary/20 border border-primary/50" : "bg-surface-hover hover:bg-muted")}>
          <span>{emoji}</span>
          <span className="text-xs text-muted-foreground">{count}</span>
        </button>)}
    </div>;
}

// Quick reactions - exactement 3 émojis les plus populaires pour le hover standard
const QUICK_REACTIONS_HOVER = ['👍', '❤️', '😂'];

// Émojis favoris pour le menu contextuel
const CONTEXT_MENU_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

// QUICK_REACTIONS for PollActions

// Poll Actions Component (shown on hover) - Discord style
function PollActions({
  isVisible,
  onCopyLink,
  onEdit,
  onDelete,
  onReply,
  onAddReaction,
  isOwnPoll
}: {
  isVisible: boolean;
  onCopyLink: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReply: () => void;
  onAddReaction: (emoji: string) => void;
  isOwnPoll: boolean;
}) {
  if (!isVisible) return null;
  return <div className="absolute top-0 right-0 -translate-y-1/2 flex items-center gap-0.5 bg-card border border-border rounded-md shadow-lg p-0.5 z-10 animate-fade-in">
      {/* 1. Réactions rapides - 3 émojis */}
      {QUICK_REACTIONS_HOVER.map(emoji => <Tooltip key={emoji}>
          <TooltipTrigger asChild>
            <button onClick={() => onAddReaction(emoji)} className="p-1 hover:bg-muted rounded transition-colors text-base">
              {emoji}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">{emoji}</TooltipContent>
        </Tooltip>)}
      
      {/* 2. Picker emoji complet */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="p-1.5 hover:bg-muted rounded transition-colors">
            <SmilePlus className="w-4 h-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-64 p-2">
          <div className="grid grid-cols-8 gap-1">
            {['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐'].map(emoji => <button key={emoji} onClick={() => onAddReaction(emoji)} className="p-1 hover:bg-muted rounded text-lg transition-colors">
                {emoji}
              </button>)}
          </div>
        </PopoverContent>
      </Popover>
      
      {/* 3. Répondre */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={onReply} className="p-1.5 hover:bg-muted rounded transition-colors">
            <Reply className="w-4 h-4 text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Répondre</TooltipContent>
      </Tooltip>
      
      {/* 4. Menu Plus d'options */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1.5 hover:bg-muted rounded transition-colors">
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onCopyLink}>
            <Link className="w-4 h-4 mr-2" />
            Copier le lien
          </DropdownMenuItem>
          {isOwnPoll && <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="w-4 h-4 mr-2" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </>}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>;
}
interface Role {
  id: string;
  name: string;
  color: string | null;
  position: number | null;
}
interface ChatAreaProps {
  channel: Channel;
  messages: Message[];
  onSendMessage: (content: string) => void;
  memberRoles?: Map<string, Role[]>;
  onOpenDM?: (conversationId: string) => void;
  onToggleMembers?: () => void;
  showMembers?: boolean;
  onSelectThread?: (threadId: string) => void;
  activeThreadId?: string | null;
  onCloseThread?: () => void;
}
function formatTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}
function formatDate(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) {
    return "Aujourd'hui";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Hier';
  }
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}
export const ChatArea = forwardRef<HTMLDivElement, ChatAreaProps>(function ChatArea({
  channel,
  messages,
  onSendMessage,
  memberRoles,
  onOpenDM,
  onToggleMembers,
  showMembers = true,
  onSelectThread,
  activeThreadId,
  onCloseThread
}, ref) {
  const [messageInput, setMessageInput] = useState('');
  const [selectedUser, setSelectedUser] = useState<{
    user: User;
    roles?: Role[];
  } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [hoveredPollId, setHoveredPollId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [createThreadForMessageId, setCreateThreadForMessageId] = useState<string | null>(null);
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [openDropdownMessageId, setOpenDropdownMessageId] = useState<string | null>(null);
  const [reportingMessage, setReportingMessage] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // SHIFT key detection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  const {
    user
  } = useAuth();
  const {
    startTyping,
    stopTyping
  } = useTypingIndicator(channel.id, null);
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();
  const deletePoll = useDeletePoll();

  // Pinned messages
  const {
    data: pinnedMessages
  } = usePinnedMessages(channel.id);
  const pinMessage = usePinMessage();
  const unpinMessage = useUnpinMessage();

  // Reactions
  const messageIds = useMemo(() => messages.map(m => m.id), [messages]);
  const {
    data: reactionsData
  } = useMessageReactions(messageIds);
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();

  // Polls
  const {
    data: polls = []
  } = usePolls(channel.id);

  // Threads - fetch all threads for this channel to find message-linked threads
  const {
    data: threads = []
  } = useThreads(channel.id);

  // Build a map of message_id -> thread for messages that have threads
  const threadsByMessageId = useMemo(() => {
    const map = new Map<string, Thread>();
    threads.forEach(thread => {
      if (thread.message_id) {
        map.set(thread.message_id, thread);
      }
    });
    return map;
  }, [threads]);
  const pinnedMessageIds = useMemo(() => new Set(pinnedMessages?.map(pm => pm.message_id) || []), [pinnedMessages]);

  // Create unified timeline of messages and polls
  type TimelineItem = {
    type: 'message';
    data: Message;
    timestamp: Date;
  } | {
    type: 'poll';
    data: Poll;
    timestamp: Date;
  };
  const timelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];
    messages.forEach(msg => items.push({
      type: 'message',
      data: msg,
      timestamp: msg.timestamp
    }));
    polls.forEach(poll => items.push({
      type: 'poll',
      data: poll,
      timestamp: new Date(poll.created_at)
    }));
    return items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [messages, polls]);
  const handleCopyPollLink = (pollId: string) => {
    const link = `${window.location.origin}/channels/${channel.server_id}/${channel.id}/poll/${pollId}`;
    copyToClipboard(link, 'Lien du sondage copié');
  };
  const handleDeletePoll = (poll: Poll) => {
    deletePoll.mutate({
      pollId: poll.id,
      channelId: channel.id
    });
  };
  const handleSubmit = () => {
    if (messageInput.trim()) {
      // Trigger send animation
      setIsSending(true);
      setTimeout(() => setIsSending(false), 400);

      // Include reply reference in message if replying
      const content = replyingTo ? `> **${replyingTo.author.displayName}:** ${replyingTo.content.substring(0, 100)}${replyingTo.content.length > 100 ? '...' : ''}\n\n${messageInput}` : messageInput;
      onSendMessage(content);
      setMessageInput('');
      setReplyingTo(null);
      stopTyping();
    }
  };
  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };
  const handleReplyToPoll = (poll: Poll) => {
    // Créer un pseudo-message de réponse référençant le sondage
    setReplyingTo({
      id: poll.id,
      content: `📊 ${poll.question}`,
      author: {
        id: poll.author?.id || '',
        displayName: poll.author?.display_name || 'Utilisateur inconnu',
        username: poll.author?.username || 'unknown',
        avatar: poll.author?.avatar_url || undefined
      },
      timestamp: new Date(poll.created_at),
      edited: false
    } as Message);
  };
  const handleUserClick = (author: User) => {
    const roles = memberRoles?.get(author.id);
    setSelectedUser({
      user: author,
      roles
    });
  };
  const handleCopyMessage = (content: string) => {
    copyToClipboard(content, 'Message copié');
  };
  const handleCopyId = (id: string) => {
    copyToClipboard(id, 'ID copié');
  };
  const handleAddReaction = (messageId: string, emoji: string) => {
    const currentReactions = reactionsData?.[messageId] || [];
    const hasReacted = currentReactions.some(r => r.user_id === user?.id && r.emoji === emoji);
    if (hasReacted) {
      removeReaction.mutate({
        messageId,
        emoji
      });
    } else {
      addReaction.mutate({
        messageId,
        emoji
      });
    }
  };
  const handlePinMessage = (messageId: string) => {
    if (pinnedMessageIds.has(messageId)) {
      unpinMessage.mutate({
        messageId,
        channelId: channel.id
      });
    } else {
      pinMessage.mutate({
        messageId,
        channelId: channel.id
      });
    }
  };
  const handleStartEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
  };
  const handleSaveEdit = () => {
    if (editingMessageId && editingContent.trim()) {
      editMessage.mutate({
        messageId: editingMessageId,
        channelId: channel.id,
        content: editingContent
      });
      setEditingMessageId(null);
      setEditingContent('');
    }
  };
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };
  const handleDelete = (messageId: string) => {
    deleteMessage.mutate({
      messageId,
      channelId: channel.id
    });
  };
  const handleCopyMessageLink = (messageId: string) => {
    const link = `${window.location.origin}/channels/${channel.server_id}/${channel.id}/${messageId}`;
    copyToClipboard(link, 'Lien du message copié');
  };
  return <div ref={ref} className="flex-1 flex flex-col bg-background min-w-0 overflow-hidden">
      {/* Channel Header */}
      <div className="h-12 px-4 flex items-center gap-4 border-b border-border/50 flex-shrink-0 bg-background">
        <div className="flex items-center gap-2">
          <Hash className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">{channel.name}</h2>
        </div>

        {channel.description && <>
            <div className="w-px h-6 bg-border" />
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted/50 transition-colors max-w-[300px]">
                  <MessageSquareText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-sm text-muted-foreground truncate">{channel.description}</p>
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="start" className="w-80 p-3">
                <h4 className="font-semibold text-foreground mb-2">Topic du Salon</h4>
                <p className="text-sm text-muted-foreground">{channel.description}</p>
              </PopoverContent>
            </Popover>
          </>}

        <div className="flex items-center gap-1 ml-auto">
          {/* Notifications Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="iconSm">
                <Bell className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" className="w-64 p-3">
              <h4 className="font-semibold text-foreground mb-3">Notifications</h4>
              <div className="space-y-2">
                <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted/50 transition-colors text-sm">
                  <BellRing className="w-4 h-4 text-muted-foreground" />
                  <span>Tous les messages</span>
                </button>
                <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted/50 transition-colors text-sm">
                  <AtSign className="w-4 h-4 text-muted-foreground" />
                  <span>Uniquement les mentions</span>
                </button>
                <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted/50 transition-colors text-sm">
                  <BellOff className="w-4 h-4 text-muted-foreground" />
                  <span>Désactiver</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Threads Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="iconSm">
                <StreamlineThreads className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" className="w-96 p-0">
              <ThreadsPopover channelId={channel.id} onSelectThread={threadId => onSelectThread?.(threadId)} />
            </PopoverContent>
          </Popover>

          {/* Pinned Messages Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="iconSm" className="relative">
                <Pin className="w-5 h-5" />
                {pinnedMessages && pinnedMessages.length > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                    {pinnedMessages.length}
                  </span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" className="w-96 p-0">
              <div className="p-3 border-b border-border">
                <h4 className="font-semibold text-foreground">Messages Épinglés</h4>
              </div>
              <ScrollArea className="max-h-80">
                {pinnedMessages && pinnedMessages.length > 0 ? <div className="p-2 space-y-2">
                    {pinnedMessages.map(pm => <div key={pm.id} className="p-3 bg-muted/50 rounded-lg group relative">
                        <div className="flex items-start gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={pm.message?.author?.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/20 text-primary text-sm">
                              {pm.message?.author?.display_name?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{pm.message?.author?.display_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {pm.message?.created_at && formatDate(new Date(pm.message.created_at))}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{pm.message?.content}</p>
                          </div>
                        </div>
                        <button onClick={() => unpinMessage.mutate({
                    messageId: pm.message_id,
                    channelId: channel.id
                  })} className="absolute top-2 right-2 p-1 hover:bg-destructive/20 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>)}
                  </div> : <div className="text-sm text-muted-foreground/70 text-center py-8">
                    Aucun message épinglé dans ce salon.
                  </div>}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {/* Inbox Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="iconSm">
                <Inbox className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" className="w-80 p-3">
              <h4 className="font-semibold text-foreground mb-3">Boîte de Réception</h4>
              <div className="text-sm text-muted-foreground/70 text-center py-6">
                Aucune notification récente.
              </div>
            </PopoverContent>
          </Popover>

          {/* Members Toggle / Thread Close */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="iconSm" onClick={() => {
              if (activeThreadId) {
                onCloseThread?.();
              } else {
                onToggleMembers?.();
              }
            }} className={cn(showMembers && !activeThreadId && 'bg-surface-hover')}>
                <Users className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {activeThreadId ? 'Fermer le thread' : showMembers ? 'Masquer les membres' : 'Afficher les membres'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col justify-end min-h-full px-4 py-4 space-y-0.5">
        {/* Welcome message */}
        <div className="mb-8 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-gradient-gaming flex items-center justify-center mb-4">
            <Hash className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-2">
            Bienvenue sur #{channel.name} !
          </h1>
          <p className="text-muted-foreground">
            C'est le début du salon #{channel.name}. Commencez la conversation !
          </p>
        </div>

        {/* Date Separator */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">
            {formatDate(timelineItems[0]?.timestamp || new Date())}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Timeline Items (Messages + Polls) */}
        {timelineItems.map((item, index) => {
        // Render Poll
        if (item.type === 'poll') {
          const poll = item.data as Poll;
          const prevItem = index > 0 ? timelineItems[index - 1] : null;
          const showAuthor = !prevItem || prevItem.type !== 'poll' || (prevItem.data as Poll).author?.id !== poll.author?.id || item.timestamp.getTime() - prevItem.timestamp.getTime() > 300000;
          const isOwnPoll = user?.id === poll.author_id;
          return <ContextMenu key={`poll-${poll.id}`}>
                <ContextMenuTrigger asChild>
                  <div className={cn('group message-hover rounded-md px-2 -mx-2 relative', showAuthor ? 'pt-1' : 'py-0')} onMouseEnter={() => setHoveredPollId(poll.id)} onMouseLeave={() => setHoveredPollId(null)}>
                    <PollActions isVisible={hoveredPollId === poll.id} onCopyLink={() => handleCopyPollLink(poll.id)} onEdit={() => setEditingPoll(poll)} onDelete={() => handleDeletePoll(poll)} onReply={() => handleReplyToPoll(poll)} onAddReaction={emoji => handleAddReaction(poll.id, emoji)} isOwnPoll={isOwnPoll} />
                    {showAuthor ? <div className="flex gap-3 my-0 py-[5px]">
                        <Avatar className="w-10 h-10 mt-0.5 flex-shrink-0">
                          <AvatarImage src={poll.author?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {poll.author?.display_name?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 my-0 py-0">
                          <div className="flex items-baseline gap-2">
                            <span className="font-semibold text-foreground">
                              {poll.author?.display_name || 'Utilisateur inconnu'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(new Date(poll.created_at))}
                            </span>
                            <div className="flex items-center gap-1 text-[#5865f2] text-xs font-medium bg-[#5865f2]/10 px-1.5 py-0.5 rounded">
                              <BarChart2 className="w-3 h-3" />
                              POLL
                            </div>
                          </div>
                          <div className="mt-2">
                            <PollDisplay poll={poll} channelId={channel.id} />
                          </div>
                        </div>
                      </div> : <div className="flex gap-3">
                        <span className="w-10 flex-shrink-0" />
                        <div className="flex-1">
                          <PollDisplay poll={poll} channelId={channel.id} />
                        </div>
                      </div>}
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                  <ContextMenuItem onClick={() => handleCopyPollLink(poll.id)}>
                    <Link className="w-4 h-4 mr-2" />
                    Copier le lien du sondage
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleCopyId(poll.id)}>
                    <Hash className="w-4 h-4 mr-2" />
                    Copier l'ID
                  </ContextMenuItem>
                  {isOwnPoll && <>
                      <ContextMenuSeparator />
                      <ContextMenuItem onClick={() => setEditingPoll(poll)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Modifier le sondage
                      </ContextMenuItem>
                      <ContextMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeletePoll(poll)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer le sondage
                      </ContextMenuItem>
                    </>}
                </ContextMenuContent>
              </ContextMenu>;
        }

        // Render Message
        const message = item.data as Message;
        const prevItem = index > 0 ? timelineItems[index - 1] : null;
        const showAuthor = !prevItem || prevItem.type !== 'message' || (prevItem.data as Message).author.id !== message.author.id || item.timestamp.getTime() - prevItem.timestamp.getTime() > 300000;
        const isOwnMessage = user?.id === message.author.id;
        const isEditing = editingMessageId === message.id;
        return <ContextMenu key={message.id}>
              <ContextMenuTrigger asChild>
                <div className={cn('group message-hover rounded-md px-2 -mx-2 relative', showAuthor ? 'pt-1' : 'py-0')} onMouseEnter={() => setHoveredMessageId(message.id)} onMouseLeave={() => {
              if (openDropdownMessageId !== message.id) setHoveredMessageId(null);
            }}>
                  <UniversalMessageActions isVisible={(hoveredMessageId === message.id || openDropdownMessageId === message.id) && !isEditing} isShiftPressed={isShiftPressed} isOwnMessage={isOwnMessage} onReply={() => handleReply(message)} onAddReaction={emoji => handleAddReaction(message.id, emoji)} onCopyLink={() => handleCopyMessageLink(message.id)} onCopyId={() => handleCopyId(message.id)} onEdit={isOwnMessage ? () => handleStartEdit(message) : undefined} onDelete={isOwnMessage ? () => handleDelete(message.id) : undefined} onCreateThread={() => setCreateThreadForMessageId(message.id)} onPin={() => handlePinMessage(message.id)} isPinned={pinnedMessageIds.has(message.id)} onDropdownOpenChange={open => {
                setOpenDropdownMessageId(open ? message.id : null);
                if (!open) setHoveredMessageId(null);
              }} />
                {showAuthor ? <div className="relative">
                      {/* Thread Spine - positioned from avatar center */}
                      {threadsByMessageId.has(message.id) && <div className="absolute left-[19px] top-[44px] bottom-0 pointer-events-none">
                          {/* Vertical line descending from avatar */}
                          <div className="absolute left-0 top-0 w-0.5 bg-muted-foreground/30 h-[calc(100%-14px)]" />
                          {/* L-shaped curve */}
                          <div className="absolute left-0 bottom-[6px] w-[22px] h-[12px] border-l-2 border-b-2 border-muted-foreground/30 rounded-bl-lg" />
                        </div>}
                      
                      <div className="flex gap-3 items-start">
                        <button onClick={() => handleUserClick(message.author)} className="flex-shrink-0">
                          <Avatar className="w-10 h-10 mt-0.5 hover:opacity-80 transition-opacity">
                            <AvatarImage src={message.author.avatar} alt={message.author.displayName} />
                            <AvatarFallback className="bg-primary/20 text-primary">
                              {message.author.displayName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-baseline gap-2 min-w-0 overflow-hidden">
                            <button onClick={() => handleUserClick(message.author)} className="font-semibold text-foreground hover:underline cursor-pointer truncate max-w-[200px] flex-shrink-0">
                              {message.author.displayName}
                            </button>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatTime(message.timestamp)}
                            </span>
                            {message.edited && <span className="text-xs text-muted-foreground/50">(modifié)</span>}
                          </div>
                          {isEditing ? <div className="mt-1 space-y-2">
                              <Textarea ref={el => {
                        if (el) {
                          el.style.height = 'auto';
                          el.style.height = Math.min(el.scrollHeight, 200) + 'px';
                        }
                      }} value={editingContent} onChange={e => {
                        setEditingContent(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                      }} onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSaveEdit();
                        }
                        if (e.key === 'Escape') {
                          handleCancelEdit();
                        }
                      }} autoFocus className="bg-input min-h-[40px] max-h-[200px] resize-none" rows={1} />
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Échap pour annuler</span>
                                <span>•</span>
                                <span>Entrée pour sauvegarder • Maj+Entrée nouvelle ligne</span>
                                <span className={cn("ml-auto", editingContent.length > 1900 && "text-yellow-500", editingContent.length > 1980 && "text-destructive font-medium")}>
                                  {editingContent.length}/2000
                                </span>
                                <div className="flex gap-1">
                                  <Button size="iconSm" variant="ghost" onClick={handleCancelEdit}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                  <Button size="iconSm" variant="default" onClick={handleSaveEdit}>
                                    <Check className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div> : <p className="text-foreground break-words font-ginto"><MarkdownText content={message.content} /></p>}
                          
                          {message.reactions && message.reactions.length > 0 && <div className="flex gap-1 mt-1">
                              {message.reactions.map((reaction, i) => <button key={i} className="flex items-center gap-1 px-2 py-0.5 bg-surface-hover rounded-full text-sm hover:bg-primary/20 transition-colors">
                                  <span>{reaction.emoji}</span>
                                  <span className="text-xs text-muted-foreground">{reaction.count}</span>
                                </button>)}
                            </div>}
                        </div>
                      </div>
                      
                      {/* Thread System Message - indented to align with spine curve */}
                      {threadsByMessageId.has(message.id) && <div className="mt-1 ml-[52px]">
                          <ThreadSystemMessage thread={threadsByMessageId.get(message.id)!} onClick={() => onSelectThread?.(threadsByMessageId.get(message.id)!.id)} />
                        </div>}
                    </div> : <div className="relative">
                      {/* Thread Spine for grouped messages */}
                      {threadsByMessageId.has(message.id) && <div className="absolute left-[19px] top-0 bottom-0 pointer-events-none">
                          {/* Vertical line */}
                          <div className="absolute left-0 top-0 w-0.5 bg-muted-foreground/30 h-[calc(100%-14px)]" />
                          {/* L-shaped curve */}
                          <div className="absolute left-0 bottom-[6px] w-[22px] h-[12px] border-l-2 border-b-2 border-muted-foreground/30 rounded-bl-lg" />
                        </div>}
                      
                      <div className="flex gap-3 items-start">
                        <span className="w-10 flex-shrink-0 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 text-right pt-0.5">
                          {formatTime(message.timestamp)}
                        </span>
                        <div className="flex-1 min-w-0">
                          {isEditing ? <div className="space-y-2">
                              <Textarea ref={el => {
                        if (el) {
                          el.style.height = 'auto';
                          el.style.height = Math.min(el.scrollHeight, 200) + 'px';
                        }
                      }} value={editingContent} onChange={e => {
                        setEditingContent(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                      }} onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSaveEdit();
                        }
                        if (e.key === 'Escape') {
                          handleCancelEdit();
                        }
                      }} autoFocus className="bg-input min-h-[40px] max-h-[200px] resize-none" rows={1} />
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Échap pour annuler</span>
                                <span>•</span>
                                <span>Entrée pour sauvegarder • Maj+Entrée nouvelle ligne</span>
                                <span className={cn("ml-auto", editingContent.length > 1900 && "text-yellow-500", editingContent.length > 1980 && "text-destructive font-medium")}>
                                  {editingContent.length}/2000
                                </span>
                                <div className="flex gap-1">
                                  <Button size="iconSm" variant="ghost" onClick={handleCancelEdit}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                  <Button size="iconSm" variant="default" onClick={handleSaveEdit}>
                                    <Check className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div> : <>
                              <p className="text-foreground break-words font-ginto"><MarkdownText content={message.content} /></p>
                              {message.edited && <span className="text-xs text-muted-foreground/50">(modifié)</span>}
                            </>}
                          
                          {message.reactions && message.reactions.length > 0 && <div className="flex gap-1 mt-1">
                              {message.reactions.map((reaction, i) => <button key={i} className="flex items-center gap-1 px-2 py-0.5 bg-surface-hover rounded-full text-sm hover:bg-primary/20 transition-colors">
                                  <span>{reaction.emoji}</span>
                                  <span className="text-xs text-muted-foreground">{reaction.count}</span>
                                </button>)}
                            </div>}
                        </div>
                      </div>
                      
                      {/* Thread System Message for grouped messages */}
                      {threadsByMessageId.has(message.id) && <div className="mt-1 ml-[52px]">
                          <ThreadSystemMessage thread={threadsByMessageId.get(message.id)!} onClick={() => onSelectThread?.(threadsByMessageId.get(message.id)!.id)} />
                        </div>}
                    </div>}
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="min-w-[220px] p-1.5 rounded-lg shadow-xl" collisionPadding={8}>
                {/* Haut : Rangée d'émojis favoris */}
                <div className="flex items-center gap-1 p-1 pb-2 border-b border-border mb-1">
                  {CONTEXT_MENU_REACTIONS.map(emoji => <button key={emoji} onClick={() => handleAddReaction(message.id, emoji)} className="p-1.5 hover:bg-muted rounded text-lg transition-colors">
                      {emoji}
                    </button>)}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="p-1.5 hover:bg-muted rounded transition-colors">
                        <SmilePlus className="w-5 h-5 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="right" align="start" className="w-64 p-2">
                      <div className="grid grid-cols-8 gap-1">
                        {['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐'].map(emoji => <button key={emoji} onClick={() => handleAddReaction(message.id, emoji)} className="p-1 hover:bg-muted rounded text-lg transition-colors">
                            {emoji}
                          </button>)}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                
                {/* Milieu : Actions principales */}
                <ContextMenuItem onClick={() => handleReply(message)}>
                  <Reply className="w-4 h-4 mr-2" />
                  Répondre
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleCopyMessage(message.content)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copier le texte
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handlePinMessage(message.id)}>
                  <Pin className="w-4 h-4 mr-2" />
                  {pinnedMessageIds.has(message.id) ? 'Désépingler' : 'Épingler'}
                </ContextMenuItem>
                <ContextMenuItem onClick={() => setCreateThreadForMessageId(message.id)}>
                  <StreamlineThreads className="w-4 h-4 mr-2" />
                  Créer un thread
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleCopyMessageLink(message.id)}>
                  <Link className="w-4 h-4 mr-2" />
                  Copier le lien
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleCopyId(message.id)}>
                  <Hash className="w-4 h-4 mr-2" />
                  Copier l'ID
                </ContextMenuItem>
                
                {/* Bas : Zone Danger */}
                <ContextMenuSeparator />
                {isOwnMessage ? <>
                    <ContextMenuItem onClick={() => handleStartEdit(message)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Modifier
                    </ContextMenuItem>
                    <ContextMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => handleDelete(message.id)}>
                      <Trash2 className="w-4 h-4 mr-2 text-destructive" />
                      Supprimer
                    </ContextMenuItem>
                  </> : <ContextMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => setReportingMessage(message)}>
                    <Flag className="w-4 h-4 mr-2 text-destructive" />
                    Signaler
                  </ContextMenuItem>}
              </ContextMenuContent>
            </ContextMenu>;
      })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Container - aligned with UserProfileCard (h-14) */}
      <div className="flex-shrink-0 border-t border-border bg-background px-0 py-0">
        <TypingIndicator channelId={channel.id} />
        {replyingTo && <ReplyReference replyTo={replyingTo} onClear={() => setReplyingTo(null)} />}
        <MessageInput value={messageInput} onChange={setMessageInput} onSend={handleSubmit} placeholder={`Envoyer un message dans #${channel.name}`} isSending={isSending} onTypingStart={startTyping} onTypingStop={stopTyping} serverId={channel.server_id} channelId={channel.id} />
      </div>

      <UserProfilePopup user={selectedUser?.user ?? null} open={!!selectedUser} onOpenChange={open => !open && setSelectedUser(null)} roles={selectedUser?.roles} onOpenDM={onOpenDM} />

      {/* Create Thread from Message Modal */}
      <CreateThreadModal open={!!createThreadForMessageId} onOpenChange={open => !open && setCreateThreadForMessageId(null)} channelId={channel.id} messageId={createThreadForMessageId || undefined} onThreadCreated={threadId => {
      setCreateThreadForMessageId(null);
      onSelectThread?.(threadId);
    }} />

      {/* Edit Poll Modal */}
      <CreatePollModal channelId={channel.id} serverId={channel.server_id} open={!!editingPoll} onOpenChange={open => !open && setEditingPoll(null)} editPoll={editingPoll} />

      {/* Report Modal */}
      <ReportModal isOpen={!!reportingMessage} onClose={() => setReportingMessage(null)} message={reportingMessage} onSubmit={(reason, details) => {
      console.log('Report submitted:', {
        reason,
        details,
        messageId: reportingMessage?.id
      });
      toast.success('Signalement envoyé. Merci !');
      setReportingMessage(null);
    }} />
    </div>;
});