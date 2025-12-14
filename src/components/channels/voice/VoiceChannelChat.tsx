import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMessages, useSendMessage } from '@/hooks/useMessages';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageInput } from '@/components/chat/MessageInput';

interface VoiceChannelChatProps {
  channelId: string;
  channelName: string;
  onClose: () => void;
}

export function VoiceChannelChat({ channelId, channelName, onClose }: VoiceChannelChatProps) {
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { data: messages = [] } = useMessages(channelId);
  const sendMessage = useSendMessage();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!messageInput.trim()) return;
    sendMessage.mutate({ channelId, content: messageInput.trim() });
    setMessageInput('');
  };

  return (
    <div className="w-80 border-l border-white/10 flex flex-col bg-[#2b2d31]">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-white/10">
        <span className="text-sm font-semibold text-white">Chat textuel</span>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-0.5">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Aucun message</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Commencez la conversation !
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="group">
                <div className="flex items-start gap-2">
                  <Avatar className="w-7 h-7 flex-shrink-0">
                    <AvatarImage src={message.author?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {message.author?.display_name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-medium text-white truncate">
                        {message.author?.display_name || 'Utilisateur'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {message.created_at && format(new Date(message.created_at), 'HH:mm', { locale: fr })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 break-words">
                      {message.content}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <MessageInput
        value={messageInput}
        onChange={setMessageInput}
        onSend={handleSend}
        placeholder={`Envoyer un message dans #${channelName}`}
        disabled={sendMessage.isPending}
        isSending={sendMessage.isPending}
        compact
      />
    </div>
  );
}
