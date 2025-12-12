import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useDMMessages, useSendDMMessage, DMMessage } from '@/hooks/useDMMessages';
import { useDMConversations } from '@/hooks/useDMs';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { useDMCalls } from '@/hooks/useDMCalls';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Send, Loader2, ArrowLeft, Copy, Pencil, Trash2, Hash, Smile, Reply, Phone, Video, Pin } from 'lucide-react';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { TypingIndicator } from '@/components/typing/TypingIndicator';
import { DMCallView } from './DMCallView';
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

export interface DMConversationProps {
  conversationId: string;
  onBack?: () => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export function DMConversation({ conversationId, onBack }: DMConversationProps) {
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { startTyping, stopTyping } = useTypingIndicator(null, conversationId);
  const { markAsRead } = useUnreadCounts();

  const { data: conversations = [] } = useDMConversations();
  const { data: messages = [], isLoading } = useDMMessages(conversationId);
  const sendMessage = useSendDMMessage();
  const { activeCall, startCall, endCall } = useDMCalls(conversationId);

  const conversation = conversations.find(c => c.id === conversationId);
  const participant = conversation?.participants[0];

  // Mark conversation as read when opened
  useEffect(() => {
    if (conversationId) {
      markAsRead.mutate(conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    sendMessage.mutate({
      conversationId,
      content: messageInput.trim(),
    });
    setMessageInput('');
    stopTyping();
  };

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    if (e.target.value.trim()) {
      startTyping();
    }
  }, [startTyping]);

  const handleVoiceCall = () => {
    startCall.mutate({ callType: 'voice' });
  };

  const handleVideoCall = () => {
    startCall.mutate({ callType: 'video' });
  };

  const handleEndCall = () => {
    if (activeCall) {
      endCall.mutate(activeCall.id);
    }
  };

  const handleCopyMessage = (content: string) => {
    copyToClipboard(content, 'Message copié');
  };

  const handleCopyId = (id: string) => {
    copyToClipboard(id, 'ID copié');
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    console.log('Add reaction', messageId, emoji);
  };

  const displayName = conversation?.is_group
    ? conversation.name || 'Groupe'
    : participant?.display_name || 'Utilisateur';

  return (
    <div className="flex-1 flex flex-col bg-background relative">
      {/* Active Call View */}
      {activeCall && (activeCall.status === 'ringing' || activeCall.status === 'active') && (
        <DMCallView 
          call={activeCall} 
          participant={participant || null} 
          onEndCall={handleEndCall} 
        />
      )}

      {/* Header */}
      <div className="h-12 px-4 flex items-center gap-3 border-b border-border">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="mr-1">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <Avatar className="w-8 h-8">
          <AvatarImage src={participant?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/20 text-primary text-sm">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="font-semibold text-sm">{displayName}</h2>
          {participant && (
            <p className="text-xs text-muted-foreground">
              @{participant.username.toLowerCase()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleVoiceCall}
            disabled={startCall.isPending || !!activeCall}
          >
            <Phone className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleVideoCall}
            disabled={startCall.isPending || !!activeCall}
          >
            <Video className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Pin className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Avatar className="w-16 h-16 mb-4">
              <AvatarImage src={participant?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-lg font-semibold">{displayName}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              C'est le début de votre conversation avec {displayName}
            </p>
          </div>
        ) : (
          <>
            {messages.map((message, idx) => (
              <MessageItem
                key={message.id}
                message={message}
                showAuthor={idx === 0 || messages[idx - 1]?.author?.id !== message.author?.id}
                isOwnMessage={user?.id === message.author?.id}
                onCopyMessage={handleCopyMessage}
                onCopyId={handleCopyId}
                onAddReaction={handleAddReaction}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Typing Indicator */}
      <TypingIndicator conversationId={conversationId} />

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={messageInput}
            onChange={handleInputChange}
            placeholder={`Envoyer un message à ${displayName}`}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!messageInput.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}

function MessageItem({ 
  message, 
  showAuthor,
  isOwnMessage,
  onCopyMessage,
  onCopyId,
  onAddReaction,
}: { 
  message: DMMessage; 
  showAuthor: boolean;
  isOwnMessage: boolean;
  onCopyMessage: (content: string) => void;
  onCopyId: (id: string) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
}) {
  const timestamp = message.created_at
    ? format(new Date(message.created_at), 'HH:mm', { locale: fr })
    : '';

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className={cn('flex gap-3 group message-hover rounded-md px-2 py-1 -mx-2', !showAuthor && 'pl-12')}>
          {showAuthor && (
            <Avatar className="w-9 h-9 flex-shrink-0">
              <AvatarImage src={message.author?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-sm">
                {message.author?.display_name?.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="flex-1 min-w-0">
            {showAuthor && (
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="font-medium text-sm">
                  {message.author?.display_name || 'Utilisateur'}
                </span>
                <span className="text-xs text-muted-foreground">{timestamp}</span>
              </div>
            )}
            <p className={cn(
              'text-sm break-words font-ginto',
              message.isPending && 'opacity-50'
            )}>
              {message.content}
            </p>
          </div>
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
                  onClick={() => onAddReaction(message.id, emoji)}
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
        <ContextMenuItem onClick={() => onCopyMessage(message.content)}>
          <Copy className="w-4 h-4 mr-2" />
          Copier le texte
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onCopyId(message.id)}>
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
}
