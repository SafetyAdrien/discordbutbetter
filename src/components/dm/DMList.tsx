import { cn } from '@/lib/utils';
import { useDMConversations, DMConversation } from '@/hooks/useDMs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageCircle } from 'lucide-react';

const statusColors = {
  online: 'bg-[hsl(var(--online))]',
  idle: 'bg-[hsl(var(--idle))]',
  dnd: 'bg-[hsl(var(--dnd))]',
  offline: 'bg-[hsl(var(--offline))]',
};

interface DMListProps {
  activeConversationId: string | null;
  onConversationSelect: (conversationId: string) => void;
}

export function DMList({ activeConversationId, onConversationSelect }: DMListProps) {
  const { data: conversations = [], isLoading } = useDMConversations();

  if (isLoading) {
    return (
      <div className="px-2 py-4">
        <div className="animate-pulse space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-muted/50 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <MessageCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Pas de conversations
        </p>
      </div>
    );
  }

  return (
    <div className="px-2 py-2 space-y-1">
      <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
        Messages privés
      </p>
      {conversations.map((conv) => (
        <DMConversationItem
          key={conv.id}
          conversation={conv}
          isActive={activeConversationId === conv.id}
          onClick={() => onConversationSelect(conv.id)}
        />
      ))}
    </div>
  );
}

function DMConversationItem({
  conversation,
  isActive,
  onClick,
}: {
  conversation: DMConversation;
  isActive: boolean;
  onClick: () => void;
}) {
  const participant = conversation.participants[0];
  const displayName = conversation.is_group
    ? conversation.name || 'Groupe'
    : participant?.display_name || 'Utilisateur';
  const avatarUrl = conversation.is_group
    ? conversation.icon_url
    : participant?.avatar_url;
  const status = participant?.status || 'offline';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors text-left',
        isActive ? 'bg-muted' : 'hover:bg-muted/50'
      )}
    >
      <div className="relative flex-shrink-0">
        <Avatar className="w-8 h-8">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="bg-primary/20 text-primary text-sm">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {!conversation.is_group && (
          <div className={cn(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card',
            statusColors[status]
          )} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm truncate',
          isActive ? 'font-medium' : 'text-foreground/80'
        )}>
          {displayName}
        </p>
        {conversation.lastMessage && (
          <p className="text-xs text-muted-foreground truncate">
            {conversation.lastMessage.content}
          </p>
        )}
      </div>
      {conversation.lastMessage && (
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {formatDistanceToNow(new Date(conversation.lastMessage.created_at), {
            addSuffix: false,
            locale: fr,
          })}
        </span>
      )}
    </button>
  );
}
