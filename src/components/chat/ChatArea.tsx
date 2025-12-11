import { useState, forwardRef, useCallback } from 'react';
import { Message, Channel, User } from '@/types/app';
import { cn } from '@/lib/utils';
import { 
  Hash, 
  Bell, 
  Pin, 
  Users, 
  Search, 
  Inbox,
  PlusCircle,
  Gift,
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
  AtSign
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
    const { user } = useAuth();
    const { startTyping, stopTyping } = useTypingIndicator(channel.id, null);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (messageInput.trim()) {
        onSendMessage(messageInput);
        setMessageInput('');
        stopTyping();
      }
    };

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setMessageInput(e.target.value);
      if (e.target.value.trim()) {
        startTyping();
      }
    }, [startTyping]);

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
      // TODO: Implement reaction mutation
      console.log('Add reaction', messageId, emoji);
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
              <Button variant="ghost" size="iconSm">
                <Pin className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" className="w-80 p-3">
              <h4 className="font-semibold text-foreground mb-3">Messages Épinglés</h4>
              <div className="text-sm text-muted-foreground/70 text-center py-6">
                Aucun message épinglé dans ce salon.
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

          <div className="relative ml-2">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Rechercher"
              className="h-7 w-36 pl-8 text-sm bg-input"
            />
          </div>

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

          return (
            <ContextMenu key={message.id}>
              <ContextMenuTrigger asChild>
                <div
                  className={cn(
                    'group message-hover rounded-md px-2 py-1 -mx-2',
                    !showAuthor && 'mt-0'
                  )}
                >
                  {showAuthor ? (
                    <div className="flex gap-4">
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
                        </div>
                        <p className="text-foreground break-words">{message.content}</p>
                        
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
                    <div className="flex gap-4">
                      <span className="w-10 flex-shrink-0 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 text-right pt-0.5">
                        {formatTime(message.timestamp)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground break-words">{message.content}</p>
                        
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
                <ContextMenuItem>
                  <Reply className="w-4 h-4 mr-2" />
                  Répondre
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => handleCopyMessage(message.content)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copier le texte
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleCopyId(message.id)}>
                  <Hash className="w-4 h-4 mr-2" />
                  Copier l'ID
                </ContextMenuItem>
                {isOwnMessage && (
                  <>
                    <ContextMenuSeparator />
                    <ContextMenuItem>
                      <Pencil className="w-4 h-4 mr-2" />
                      Modifier
                    </ContextMenuItem>
                    <ContextMenuItem className="text-destructive focus:text-destructive">
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

      {/* Message Input */}
      <div className="px-4 pb-6 flex-shrink-0">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-center gap-2 bg-input rounded-lg border border-border focus-within:border-primary/50 transition-colors">
            <button
              type="button"
              className="p-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <PlusCircle className="w-5 h-5" />
            </button>
            
            <input
              type="text"
              value={messageInput}
              onChange={handleInputChange}
              placeholder={`Envoyer un message dans #${channel.name}`}
              className="flex-1 bg-transparent py-3 text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            
            <div className="flex items-center gap-1 pr-2">
              <button
                type="button"
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Gift className="w-5 h-5" />
              </button>
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
                <Button type="submit" size="iconSm" className="ml-1">
                  <Send className="w-4 h-4" />
                </Button>
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
