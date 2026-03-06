import React from 'react';
import { Thread } from '@/types/thread';
import { ChevronRight, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import StreamlineThreads from '@/components/icons/StreamlineThreads';
interface ThreadSystemMessageProps {
  thread: Thread;
  onClick: () => void;
}

/**
 * ThreadSystemMessage - System message displayed under a parent message when a thread is attached
 * Shows thread name, message count, last message preview, and timestamp
 */
export function ThreadSystemMessage({
  thread,
  onClick
}: ThreadSystemMessageProps) {
  const messageCount = thread.message_count || 0;
  const lastMessage = thread.last_message;
  const relativeTime = thread.last_message_at ? formatDistanceToNow(new Date(thread.last_message_at), {
    addSuffix: false,
    locale: fr
  }) : thread.created_at ? formatDistanceToNow(new Date(thread.created_at), {
    addSuffix: false,
    locale: fr
  }) : null;
  return <button onClick={onClick} className="group/thread flex items-start gap-2 w-full text-left py-1.5 px-2 -mx-2 rounded transition-colors bg-surface-elevated hover:bg-surface-hover/70">
      {/* Thread icon */}
      <StreamlineThreads className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        {/* Thread name and message count */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-primary hover:underline">
            {thread.name}
          </span>
          <span className="text-xs flex items-center gap-1 text-foreground">
            {messageCount} {messageCount === 1 ? 'Message' : 'Messages'}
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>
        
        {/* Last message preview or empty state */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {lastMessage ? <>
              <span className="truncate max-w-[200px]">
                {lastMessage.author?.display_name}: {lastMessage.content}
              </span>
            </> : <span className="italic">
              Il n'y a pas de messages récents dans ce thread.
            </span>}
          {relativeTime && <>
              <span className="flex-shrink-0">•</span>
              <span className="flex-shrink-0">{relativeTime}</span>
            </>}
        </div>
      </div>
    </button>;
}
export default ThreadSystemMessage;