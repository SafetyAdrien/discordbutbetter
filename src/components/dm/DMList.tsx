import { cn } from '@/lib/utils';
import { useDMConversations, DMConversation } from '@/hooks/useDMs';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState, useEffect } from 'react';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

function formatCompactTimestamp(date: Date): string {
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  // Messages très récents
  if (diffSeconds < 5) {
    return "À l'instant";
  }
  
  // Moins d'une minute
  if (diffSeconds < 60) {
    return `il y a ${diffSeconds}s`;
  }
  
  // Moins d'une heure
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `il y a ${diffMinutes}min`;
  }
  
  // Aujourd'hui
  if (isToday(date)) {
    return format(date, 'HH:mm', { locale: fr });
  }
  
  if (isYesterday(date)) {
    return 'Hier';
  }
  
  if (isThisWeek(date, { weekStartsOn: 1 })) {
    return format(date, 'EEE', { locale: fr });
  }
  
  return format(date, 'dd/MM', { locale: fr });
}

function useRealtimeTimestamp(date: Date): string {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []); // Pas de dépendance pour éviter la recréation

  return formatCompactTimestamp(date);
}

function RealtimeTimestamp({ date }: { date: Date }) {
  const timestamp = useRealtimeTimestamp(date);
  return <span className="text-[11px] text-muted-foreground">{timestamp}</span>;
}
import { MessageCircle, User, Phone, X, Trash2 } from 'lucide-react';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { toast } from 'sonner';

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
  const { unreadCounts } = useUnreadCounts();

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
    <div className="px-2 space-y-[2px]">
      {conversations.map((conv) => (
        <DMConversationItem
          key={conv.id}
          conversation={conv}
          isActive={activeConversationId === conv.id}
          unreadCount={unreadCounts[conv.id] || 0}
          onClick={() => onConversationSelect(conv.id)}
        />
      ))}
    </div>
  );
}

function DMConversationItem({
  conversation,
  isActive,
  unreadCount,
  onClick,
}: {
  conversation: DMConversation;
  isActive: boolean;
  unreadCount: number;
  onClick: () => void;
}) {
  const participants = conversation.participants || [];
  const participant = participants[0];
  const displayName = conversation.is_group
    ? conversation.name || 'Groupe'
    : participant?.display_name || 'Utilisateur';
  const avatarUrl = conversation.is_group
    ? conversation.icon_url
    : participant?.avatar_url;
  const status = participant?.status || 'offline';

  const handleViewProfile = () => {
    // TODO: Open profile popup
    console.log('View profile', participant?.id);
  };

  const handleCall = () => {
    toast.success('Appels vocaux', { description: 'Bientôt disponible !' });
  };

  const handleClose = () => {
    // TODO: Implement close conversation
    toast.success('Conversation fermée');
  };

  const handleDelete = () => {
    // TODO: Implement delete conversation
    toast.error('Conversation supprimée');
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            'w-full flex items-center gap-2 px-2 py-1 rounded-md transition-colors text-left',
            isActive ? 'bg-[hsl(var(--surface-hover))]' : 'hover:bg-[hsl(var(--surface-2))]'
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
              <StatusIndicator
                status={status}
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-[hsl(var(--surface-1))]"
                bgClassName="bg-[hsl(var(--surface-1))]"
              />
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
                        {conversation.lastMessage.author_display_name && (
                          <span className="font-medium">{conversation.lastMessage.author_display_name}: </span>
                        )}
                        {conversation.lastMessage.content}
                      </p>
                    )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {unreadCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            {conversation.lastMessage && (
              <RealtimeTimestamp date={new Date(conversation.lastMessage.created_at)} />
            )}
          </div>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {!conversation.is_group && (
          <ContextMenuItem onClick={handleViewProfile}>
            <User className="w-4 h-4 mr-2" />
            Voir le profil
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={handleCall}>
          <Phone className="w-4 h-4 mr-2" />
          Appeler
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleClose}>
          <X className="w-4 h-4 mr-2" />
          Fermer la conversation
        </ContextMenuItem>
        <ContextMenuItem 
          onClick={handleDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Supprimer la conversation
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
