import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Send, Hash, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useThread } from '@/hooks/useThreads';
import { useThreadMessages, useSendThreadMessage } from '@/hooks/useThreadMessages';
import { useMarkThreadAsRead } from '@/hooks/useThreadUnreadCounts';
import { ThreadMessage } from '@/types/thread';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MarkdownText } from '@/lib/markdown';
import StreamlineThreads from '@/components/icons/StreamlineThreads';

interface ThreadViewProps {
  threadId: string;
  channelName: string;
  onBack: () => void;
}

const ThreadView: React.FC<ThreadViewProps> = ({ threadId, channelName, onBack }) => {
  const [messageContent, setMessageContent] = useState('');
  const [showNewMessagesBanner, setShowNewMessagesBanner] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);
  
  const { data: thread } = useThread(threadId);
  const { data: messages = [] } = useThreadMessages(threadId);
  const sendMessage = useSendThreadMessage();
  const markAsRead = useMarkThreadAsRead();

  // Mark thread as read when opened
  useEffect(() => {
    if (threadId) {
      markAsRead.mutate(threadId);
      setShowNewMessagesBanner(false);
      lastMessageCountRef.current = 0;
    }
  }, [threadId]);

  // Check if user is at bottom of scroll
  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const atBottom = scrollHeight - scrollTop - clientHeight < 50;
      setIsAtBottom(atBottom);
      
      if (atBottom) {
        setShowNewMessagesBanner(false);
        markAsRead.mutate(threadId);
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
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      setShowNewMessagesBanner(false);
      markAsRead.mutate(threadId);
    }
  }, [threadId, markAsRead]);

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

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = format(new Date(message.created_at), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, ThreadMessage[]>);

  return (
    <div className="flex flex-col h-full bg-background">
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
        <div className="flex items-center gap-2 min-w-0">
          <StreamlineThreads className="w-5 h-5 text-muted-foreground shrink-0" />
          <span className="font-semibold text-foreground truncate">
            {thread?.name || 'Thread'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
          <Hash className="w-3 h-3" />
          <span>{channelName}</span>
        </div>
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
        
        <ScrollArea className="h-full" ref={scrollRef} onScrollCapture={handleScroll}>
          <div className="p-4 space-y-4">
          {Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center gap-2 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground px-2">
                  {formatDate(msgs[0].created_at)}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
              
              {/* Messages for this date */}
              <div className="space-y-0.5">
                {msgs.map((message, index) => {
                  const prevMessage = index > 0 ? msgs[index - 1] : null;
                  const showAuthor =
                    !prevMessage ||
                    prevMessage.author_id !== message.author_id ||
                    new Date(message.created_at).getTime() -
                      new Date(prevMessage.created_at).getTime() >
                      5 * 60 * 1000;

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
          
          {messages.length === 0 && (
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
        </ScrollArea>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border shrink-0">
        <div className="flex items-center gap-2">
          <Input
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message dans ${thread?.name || 'le thread'}...`}
            className="flex-1"
            maxLength={2000}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!messageContent.trim() || sendMessage.isPending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
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
