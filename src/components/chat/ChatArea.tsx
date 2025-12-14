import { useState, forwardRef, useCallback, useEffect, useMemo } from 'react';
import { Message, Channel, User } from '@/types/app';
import { cn } from '@/lib/utils';
import { 
  Hash, 
  Bell, 
  Pin, 
  Users, 
  Inbox,
  PlusCircle,
  Sticker,
  Smile,
  Send,
  Copy,
  Reply,
  Pencil,
  Trash2,
  MessageSquareText,
  BellOff,
  BellRing,
  AtSign,
  X,
  Check,
  Image,
  BarChart2,
  Link
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserProfilePopup } from '@/components/profile/UserProfilePopup';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { copyToClipboard } from '@/lib/clipboard';
import { useAuth } from '@/contexts/AuthContext';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { TypingIndicator } from '@/components/typing/TypingIndicator';
import { MarkdownText } from '@/lib/markdown';
import { useEditMessage, useDeleteMessage } from '@/hooks/useMessages';
import { usePinnedMessages, usePinMessage, useUnpinMessage } from '@/hooks/usePinnedMessages';
import { useMessageReactions, useAddReaction, useRemoveReaction, Reaction } from '@/hooks/useReactions';

// Reply Reference Component
function ReplyReference({ 
  replyTo, 
  onClear 
}: { 
  replyTo: Message; 
  onClear: () => void;
}) {
  return (
    <div className="mx-4 mb-2 flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border-l-2 border-primary">
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
    </div>
  );
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
    const groups: Record<string, { count: number; hasUserReacted: boolean }> = {};
    reactions.forEach(r => {
      if (!groups[r.emoji]) {
        groups[r.emoji] = { count: 0, hasUserReacted: false };
      }
      groups[r.emoji].count++;
      if (r.user_id === userId) {
        groups[r.emoji].hasUserReacted = true;
      }
    });
    return groups;
  }, [reactions, userId]);

  if (Object.keys(grouped).length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(grouped).map(([emoji, { count, hasUserReacted }]) => (
        <button
          key={emoji}
          onClick={() => onToggle(emoji)}
          className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-full text-sm transition-colors",
            hasUserReacted 
              ? "bg-primary/20 border border-primary/50" 
              : "bg-surface-hover hover:bg-muted"
          )}
        >
          <span>{emoji}</span>
          <span className="text-xs text-muted-foreground">{count}</span>
        </button>
      ))}
    </div>
  );
}

// Message Actions Component (shown on Shift+hover)
function MessageActions({ 
  isVisible, 
  onReply, 
  onAddReaction,
  onCopyLink,
  onEdit, 
  onDelete, 
  isOwnMessage 
}: { 
  isVisible: boolean;
  onReply: () => void;
  onAddReaction: () => void;
  onCopyLink: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isOwnMessage: boolean;
}) {
  if (!isVisible) return null;
  
  return (
    <div className="absolute top-0 right-0 -translate-y-1/2 flex items-center gap-0.5 bg-card border border-border rounded-md shadow-lg p-0.5 z-10 animate-fade-in">
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={onReply} className="p-1.5 hover:bg-muted rounded transition-colors">
            <Reply className="w-4 h-4 text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Répondre</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={onAddReaction} className="p-1.5 hover:bg-muted rounded transition-colors">
            <Smile className="w-4 h-4 text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Ajouter une réaction</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={onCopyLink} className="p-1.5 hover:bg-muted rounded transition-colors">
            <Link className="w-4 h-4 text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Copier le lien</TooltipContent>
      </Tooltip>
      {isOwnMessage && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={onEdit} className="p-1.5 hover:bg-muted rounded transition-colors">
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Modifier</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={onDelete} className="p-1.5 hover:bg-destructive/20 rounded transition-colors">
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Supprimer</TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
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
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
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
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export const ChatArea = forwardRef<HTMLDivElement, ChatAreaProps>(
  function ChatArea({ channel, messages, onSendMessage, memberRoles, onOpenDM, onToggleMembers, showMembers = true }, ref) {
    const [messageInput, setMessageInput] = useState('');
    const [selectedUser, setSelectedUser] = useState<{ user: User; roles?: Role[] } | null>(null);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState('');
    const [isShiftPressed, setIsShiftPressed] = useState(false);
    const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [isSending, setIsSending] = useState(false);
    const { user } = useAuth();
    const { startTyping, stopTyping } = useTypingIndicator(channel.id, null);
    const editMessage = useEditMessage();
    const deleteMessage = useDeleteMessage();
    
    // Pinned messages
    const { data: pinnedMessages } = usePinnedMessages(channel.id);
    const pinMessage = usePinMessage();
    const unpinMessage = useUnpinMessage();
    
    // Reactions
    const messageIds = useMemo(() => messages.map(m => m.id), [messages]);
    const { data: reactionsData } = useMessageReactions(messageIds);
    const addReaction = useAddReaction();
    const removeReaction = useRemoveReaction();
    
    const pinnedMessageIds = useMemo(() => 
      new Set(pinnedMessages?.map(pm => pm.message_id) || []), 
      [pinnedMessages]
    );

    // Detect Shift key press
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

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (messageInput.trim()) {
        // Trigger send animation
        setIsSending(true);
        setTimeout(() => setIsSending(false), 400);
        
        // Include reply reference in message if replying
        const content = replyingTo 
          ? `> **${replyingTo.author.displayName}:** ${replyingTo.content.substring(0, 100)}${replyingTo.content.length > 100 ? '...' : ''}\n\n${messageInput}`
          : messageInput;
        onSendMessage(content);
        setMessageInput('');
        setReplyingTo(null);
        stopTyping();
      }
    };

    const handleReply = (message: Message) => {
      setReplyingTo(message);
    };

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessageInput(e.target.value);
      if (e.target.value.trim()) {
        startTyping();
      }
      // Auto-resize textarea
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
    }, [startTyping]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.currentTarget.form?.requestSubmit();
      }
      // Shift+Enter = default behavior (new line)
    }, []);

    const handleUserClick = (author: User) => {
      const roles = memberRoles?.get(author.id);
      setSelectedUser({ user: author, roles });
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
        removeReaction.mutate({ messageId, emoji });
      } else {
        addReaction.mutate({ messageId, emoji });
      }
    };
    
    const handlePinMessage = (messageId: string) => {
      if (pinnedMessageIds.has(messageId)) {
        unpinMessage.mutate({ messageId, channelId: channel.id });
      } else {
        pinMessage.mutate({ messageId, channelId: channel.id });
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
      deleteMessage.mutate({ messageId, channelId: channel.id });
    };

    const handleCopyMessageLink = (messageId: string) => {
      const link = `${window.location.origin}/channels/${channel.server_id}/${channel.id}/${messageId}`;
      copyToClipboard(link, 'Lien du message copié');
    };

    return (
      <div ref={ref} className="flex-1 flex flex-col bg-background min-w-0">
      {/* Channel Header */}
      <div className="h-12 px-4 flex items-center gap-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Hash className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">{channel.name}</h2>
        </div>

        {channel.description && (
          <>
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
          </>
        )}

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

          {/* Pinned Messages Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="iconSm" className="relative">
                <Pin className="w-5 h-5" />
                {pinnedMessages && pinnedMessages.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                    {pinnedMessages.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" className="w-96 p-0">
              <div className="p-3 border-b border-border">
                <h4 className="font-semibold text-foreground">Messages Épinglés</h4>
              </div>
              <ScrollArea className="max-h-80">
                {pinnedMessages && pinnedMessages.length > 0 ? (
                  <div className="p-2 space-y-2">
                    {pinnedMessages.map((pm) => (
                      <div key={pm.id} className="p-3 bg-muted/50 rounded-lg group relative">
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
                        <button
                          onClick={() => unpinMessage.mutate({ messageId: pm.message_id, channelId: channel.id })}
                          className="absolute top-2 right-2 p-1 hover:bg-destructive/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground/70 text-center py-8">
                    Aucun message épinglé dans ce salon.
                  </div>
                )}
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

          {/* Members Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="iconSm"
                onClick={onToggleMembers}
                className={cn(showMembers && 'bg-surface-hover')}
              >
                <Users className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{showMembers ? 'Masquer les membres' : 'Afficher les membres'}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-4">
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
            {formatDate(messages[0]?.timestamp || new Date())}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Messages */}
        {messages.map((message, index) => {
          const showAuthor = index === 0 || 
            messages[index - 1].author.id !== message.author.id ||
            (message.timestamp.getTime() - messages[index - 1].timestamp.getTime()) > 300000;
          const isOwnMessage = user?.id === message.author.id;
          const isEditing = editingMessageId === message.id;

          return (
            <ContextMenu key={message.id}>
              <ContextMenuTrigger asChild>
                <div
                    className={cn(
                      'group message-hover rounded-md px-2 -mx-2 relative',
                      showAuthor ? 'pt-1' : 'py-0'
                    )}
                  onMouseEnter={() => setHoveredMessageId(message.id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                >
                  <MessageActions
                    isVisible={isShiftPressed && hoveredMessageId === message.id}
                    onReply={() => handleReply(message)}
                    onAddReaction={() => handleAddReaction(message.id, '👍')}
                    onCopyLink={() => handleCopyMessageLink(message.id)}
                    onEdit={() => handleStartEdit(message)}
                    onDelete={() => handleDelete(message.id)}
                    isOwnMessage={isOwnMessage}
                  />
                  {showAuthor ? (
                  <div className="flex gap-3">
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
                          <button 
                            onClick={() => handleUserClick(message.author)}
                            className="font-semibold text-foreground hover:underline cursor-pointer truncate max-w-[200px] flex-shrink-0"
                          >
                            {message.author.displayName}
                          </button>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatTime(message.timestamp)}
                          </span>
                          {message.edited && (
                            <span className="text-xs text-muted-foreground/50">(modifié)</span>
                          )}
                        </div>
                        {isEditing ? (
                          <div className="mt-1 space-y-2">
                            <Input
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
                              autoFocus
                              className="bg-input"
                            />
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Échap pour annuler</span>
                              <span>•</span>
                              <span>Entrée pour sauvegarder</span>
                              <div className="flex gap-1 ml-auto">
                                <Button size="iconSm" variant="ghost" onClick={handleCancelEdit}>
                                  <X className="w-4 h-4" />
                                </Button>
                                <Button size="iconSm" variant="default" onClick={handleSaveEdit}>
                                  <Check className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-foreground break-words font-ginto"><MarkdownText content={message.content} /></p>
                        )}
                        
                        {message.reactions && message.reactions.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {message.reactions.map((reaction, i) => (
                              <button
                                key={i}
                                className="flex items-center gap-1 px-2 py-0.5 bg-surface-hover rounded-full text-sm hover:bg-primary/20 transition-colors"
                              >
                                <span>{reaction.emoji}</span>
                                <span className="text-xs text-muted-foreground">{reaction.count}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <span className="w-10 flex-shrink-0 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 text-right pt-0.5">
                        {formatTime(message.timestamp)}
                      </span>
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="space-y-2">
                            <Input
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
                              autoFocus
                              className="bg-input"
                            />
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Échap pour annuler</span>
                              <span>•</span>
                              <span>Entrée pour sauvegarder</span>
                              <div className="flex gap-1 ml-auto">
                                <Button size="iconSm" variant="ghost" onClick={handleCancelEdit}>
                                  <X className="w-4 h-4" />
                                </Button>
                                <Button size="iconSm" variant="default" onClick={handleSaveEdit}>
                                  <Check className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-foreground break-words font-ginto"><MarkdownText content={message.content} /></p>
                            {message.edited && (
                              <span className="text-xs text-muted-foreground/50">(modifié)</span>
                            )}
                          </>
                        )}
                        
                        {message.reactions && message.reactions.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {message.reactions.map((reaction, i) => (
                              <button
                                key={i}
                                className="flex items-center gap-1 px-2 py-0.5 bg-surface-hover rounded-full text-sm hover:bg-primary/20 transition-colors"
                              >
                                <span>{reaction.emoji}</span>
                                <span className="text-xs text-muted-foreground">{reaction.count}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-48">
                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <Smile className="w-4 h-4 mr-2" />
                    Ajouter une réaction
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="p-2">
                    <div className="flex gap-1">
                      {QUICK_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleAddReaction(message.id, emoji)}
                          className="p-1.5 hover:bg-muted rounded text-lg transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </ContextMenuSubContent>
                </ContextMenuSub>
                <ContextMenuItem onClick={() => handleReply(message)}>
                  <Reply className="w-4 h-4 mr-2" />
                  Répondre
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handlePinMessage(message.id)}>
                  <Pin className="w-4 h-4 mr-2" />
                  {pinnedMessageIds.has(message.id) ? 'Désépingler' : 'Épingler'}
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => handleCopyMessage(message.content)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copier le texte
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleCopyMessageLink(message.id)}>
                  <Link className="w-4 h-4 mr-2" />
                  Copier le lien du message
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleCopyId(message.id)}>
                  <Hash className="w-4 h-4 mr-2" />
                  Copier l'ID
                </ContextMenuItem>
                {isOwnMessage && (
                  <>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => handleStartEdit(message)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Modifier
                    </ContextMenuItem>
                    <ContextMenuItem 
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDelete(message.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </ContextMenuItem>
                  </>
                )}
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>

      {/* Typing Indicator */}
      <TypingIndicator channelId={channel.id} />

      {/* Reply Reference */}
      {replyingTo && (
        <ReplyReference replyTo={replyingTo} onClear={() => setReplyingTo(null)} />
      )}

      {/* Message Input */}
      <div className="px-4 pb-6 flex-shrink-0">
        <form onSubmit={handleSubmit} className="relative shadow-[0_-8px_15px_-10px_hsl(var(--background)/0.5)]">
          <div className="flex items-center gap-2 bg-input rounded-lg border border-border focus-within:border-primary/50 transition-colors">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="p-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <PlusCircle className="w-5 h-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-48 p-1">
                <button
                  type="button"
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
                >
                  <Image className="w-4 h-4" />
                  <span>Ajouter une image</span>
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
                >
                  <BarChart2 className="w-4 h-4" />
                  <span>Créer un sondage</span>
                </button>
              </PopoverContent>
            </Popover>
            
            <textarea
              value={messageInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={`Envoyer un message dans #${channel.name}`}
              className="flex-1 bg-transparent py-3 text-foreground placeholder:text-muted-foreground focus:outline-none resize-none min-h-[24px] max-h-[200px] overflow-y-auto"
              rows={1}
            />
            
            <div className="flex items-center gap-1 pr-2">
              <button
                type="button"
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Sticker className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Smile className="w-5 h-5" />
              </button>
              {messageInput.trim() && (
                <button 
                  type="submit" 
                  className={`ml-1 p-1.5 rounded transition-colors hover:bg-muted send-button-hover ${isSending ? 'animate-send-fly' : ''}`}
                >
                  <Send className="w-4 h-4" style={{ color: '#5865f2' }} />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      <UserProfilePopup
        user={selectedUser?.user ?? null}
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
        roles={selectedUser?.roles}
        onOpenDM={onOpenDM}
      />
    </div>
    );
  }
);
