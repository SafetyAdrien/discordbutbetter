import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useDMMessages, useSendDMMessage, DMMessage } from '@/hooks/useDMMessages';
import { useDMConversations } from '@/hooks/useDMs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Send, Loader2 } from 'lucide-react';

interface DMConversationProps {
  conversationId: string;
}

export function DMConversation({ conversationId }: DMConversationProps) {
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [] } = useDMConversations();
  const { data: messages = [], isLoading } = useDMMessages(conversationId);
  const sendMessage = useSendDMMessage();

  const conversation = conversations.find(c => c.id === conversationId);
  const participant = conversation?.participants[0];

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
  };

  const displayName = conversation?.is_group
    ? conversation.name || 'Groupe'
    : participant?.display_name || 'Utilisateur';

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 px-4 flex items-center gap-3 border-b border-border">
        <Avatar className="w-8 h-8">
          <AvatarImage src={participant?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/20 text-primary text-sm">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-semibold text-sm">{displayName}</h2>
          {participant && (
            <p className="text-xs text-muted-foreground">
              @{participant.username}
            </p>
          )}
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
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
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

function MessageItem({ message, showAuthor }: { message: DMMessage; showAuthor: boolean }) {
  const timestamp = message.created_at
    ? format(new Date(message.created_at), 'HH:mm', { locale: fr })
    : '';

  return (
    <div className={cn('flex gap-3', !showAuthor && 'pl-12')}>
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
          'text-sm break-words',
          message.isPending && 'opacity-50'
        )}>
          {message.content}
        </p>
      </div>
    </div>
  );
}
