import { useTypingUsers } from '@/hooks/useTypingIndicator';

interface TypingIndicatorProps {
  channelId?: string | null;
  conversationId?: string | null;
}

export function TypingIndicator({ channelId, conversationId }: TypingIndicatorProps) {
  const { data: typingUsers = [], isLoading } = useTypingUsers(channelId, conversationId);

  if (isLoading || typingUsers.length === 0) {
    return null;
  }

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].profile?.display_name || typingUsers[0].profile?.username} est en train d'écrire`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].profile?.display_name || typingUsers[0].profile?.username} et ${typingUsers[1].profile?.display_name || typingUsers[1].profile?.username} sont en train d'écrire`;
    } else {
      return `${typingUsers.length} personnes sont en train d'écrire`;
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-muted-foreground animate-pulse">
      <div className="flex gap-0.5">
        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{getTypingText()}...</span>
    </div>
  );
}
