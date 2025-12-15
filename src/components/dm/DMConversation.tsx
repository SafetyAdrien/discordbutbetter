import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useDMMessages, useSendDMMessage, DMMessage } from '@/hooks/useDMMessages';
import { useDMConversations } from '@/hooks/useDMs';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { useDMCalls } from '@/hooks/useDMCalls';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, ArrowLeft, Phone, Video, Pin } from 'lucide-react';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { TypingIndicator } from '@/components/typing/TypingIndicator';
import { DMCallView } from './DMCallView';
import { MessageInput } from '@/components/chat/MessageInput';
import { UniversalMessageActions } from '@/components/chat/UniversalMessageActions';
import { UniversalMessageContextMenu } from '@/components/chat/UniversalMessageContextMenu';
import { ReportModal } from '@/components/chat/ReportModal';
import { useShiftKey } from '@/hooks/useShiftKey';
import { copyToClipboard } from '@/lib/clipboard';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Message } from '@/types/app';

export interface DMConversationProps {
  conversationId: string;
  onBack?: () => void;
}

export function DMConversation({ conversationId, onBack }: DMConversationProps) {
  const [messageInput, setMessageInput] = useState('');
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [openDropdownMessageId, setOpenDropdownMessageId] = useState<string | null>(null);
  const [reportingMessage, setReportingMessage] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const isShiftPressed = useShiftKey();
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

  const handleCopyLink = (messageId: string) => {
    const link = `${window.location.origin}/dm/${conversationId}/${messageId}`;
    copyToClipboard(link, 'Lien copié');
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    console.log('Add reaction', messageId, emoji);
    toast.success(`Réaction ${emoji} ajoutée`);
  };

  const handleReply = (message: DMMessage) => {
    // TODO: Implement reply
    console.log('Reply to', message.id);
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
      <div className="flex-1 overflow-y-auto p-4 space-y-0.5">
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
            {messages.map((message, idx) => {
              const showAuthor = idx === 0 || messages[idx - 1]?.author?.id !== message.author?.id;
              const isOwnMessage = user?.id === message.author?.id;
              const timestamp = message.created_at
                ? format(new Date(message.created_at), 'HH:mm', { locale: fr })
                : '';

              return (
                <UniversalMessageContextMenu
                  key={message.id}
                  isOwnMessage={isOwnMessage}
                  messageId={message.id}
                  onReply={() => handleReply(message)}
                  onAddReaction={(emoji) => handleAddReaction(message.id, emoji)}
                  onCopyText={() => handleCopyMessage(message.content)}
                  onCopyLink={() => handleCopyLink(message.id)}
                  onCopyId={() => handleCopyId(message.id)}
                  onEdit={isOwnMessage ? () => console.log('Edit', message.id) : undefined}
                  onDelete={isOwnMessage ? () => console.log('Delete', message.id) : undefined}
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
                    timestamp: new Date(message.created_at || Date.now()),
                    edited: false,
                  }) : undefined}
                >
                  <div 
                    className={cn(
                      'flex gap-3 group message-hover rounded-md px-2 -mx-2 relative',
                      showAuthor ? 'pt-1' : 'py-0',
                      !showAuthor && 'pl-12'
                    )}
                    onMouseEnter={() => setHoveredMessageId(message.id)}
                    onMouseLeave={() => { 
                      if (openDropdownMessageId !== message.id) setHoveredMessageId(null); 
                    }}
                  >
                    <UniversalMessageActions
                      isVisible={hoveredMessageId === message.id || openDropdownMessageId === message.id}
                      isShiftPressed={isShiftPressed}
                      isOwnMessage={isOwnMessage}
                      onReply={() => handleReply(message)}
                      onAddReaction={(emoji) => handleAddReaction(message.id, emoji)}
                      onCopyLink={() => handleCopyLink(message.id)}
                      onCopyId={() => handleCopyId(message.id)}
                      onEdit={isOwnMessage ? () => console.log('Edit', message.id) : undefined}
                      onDelete={isOwnMessage ? () => console.log('Delete', message.id) : undefined}
                      onDropdownOpenChange={(open) => {
                        setOpenDropdownMessageId(open ? message.id : null);
                        if (!open) setHoveredMessageId(null);
                      }}
                    />
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
                </UniversalMessageContextMenu>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Typing Indicator */}
      <TypingIndicator conversationId={conversationId} />

      {/* Input */}
      <MessageInput
        value={messageInput}
        onChange={setMessageInput}
        onSend={() => {
          if (!messageInput.trim()) return;
          sendMessage.mutate({
            conversationId,
            content: messageInput.trim(),
          });
          setMessageInput('');
          stopTyping();
        }}
        placeholder={`Envoyer un message à ${displayName}`}
        disabled={sendMessage.isPending}
        isSending={sendMessage.isPending}
        onTypingStart={startTyping}
        onTypingStop={stopTyping}
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
}
