import { useMemo } from 'react';
import { DiscordInbox as Inbox } from '@/components/icons/DiscordInbox';
import { cn } from '@/lib/utils';
import { 
  Check, 
  X, 
  Trash2, 
  CheckCheck, 
  Loader2,
  AlertTriangle,
  Bell,
  AtSign,
  MessageSquare,
  MessagesSquare,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useDeleteNotification,
  useRespondToDeletionRequest,
  ServerNotification,
} from '@/hooks/useNotifications';
import { useUnifiedNotifications, type UnifiedNotification } from '@/hooks/useUnifiedNotifications';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { useMarkChannelAsRead } from '@/hooks/useMarkChannelAsRead';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function InboxPanel() {
  const { items, isLoading } = useUnifiedNotifications();
  const markAllRead = useMarkAllNotificationsAsRead();
  const markRead = useMarkNotificationAsRead();
  const deleteNotification = useDeleteNotification();
  const respondToDeletion = useRespondToDeletionRequest();
  const { markAsRead: markDMRead } = useUnreadCounts();
  const markChannelRead = useMarkChannelAsRead();

  const unreadCount = useMemo(() => items.filter(n => n.isUnread).length, [items]);
  const mentionCount = useMemo(
    () => items.reduce((sum, n) => sum + (n.mentionCount || 0), 0),
    [items],
  );

  const markItemRead = (notification: UnifiedNotification) => {
    if (notification.source === 'channel_mention' && notification.channelId) {
      void markChannelRead(notification.channelId, notification.serverId);
      return;
    }
    if (notification.source === 'dm' && notification.conversationId) {
      markDMRead.mutate(notification.conversationId);
      return;
    }
    if (notification.isUnread) markRead.mutate((notification.raw as any).id);
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
    const seenChannels = new Set<string>();
    const seenDMs = new Set<string>();
    items.forEach((item) => {
      if (item.source === 'channel_mention' && item.channelId && !seenChannels.has(item.channelId)) {
        seenChannels.add(item.channelId);
        void markChannelRead(item.channelId, item.serverId);
      }
      if (item.source === 'dm' && item.conversationId && item.isUnread && !seenDMs.has(item.conversationId)) {
        seenDMs.add(item.conversationId);
        markDMRead.mutate(item.conversationId);
      }
    });
  };

  const handleDelete = (notification: UnifiedNotification) => {
    if (notification.source === 'server_notification') deleteNotification.mutate((notification.raw as any).id);
    else markItemRead(notification);
  };

  const handleRespond = (notificationId: string, accept: boolean) => {
    respondToDeletion.mutate({ notificationId, accept });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 px-4 flex items-center gap-4 border-b border-border">
        <Inbox className="w-5 h-5 text-muted-foreground" />
        <h2 className="font-semibold">Boîte de réception</h2>
        {mentionCount > 0 ? (
          <Badge variant="destructive" className="text-xs">
            {mentionCount > 99 ? '99+' : mentionCount}
          </Badge>
        ) : unreadCount > 0 && (
          <span className="w-2 h-2 rounded-full bg-foreground" aria-label="Notifications non lues" />
        )}
        
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markAllRead.isPending || unreadCount === 0}
          >
            <CheckCheck className="w-4 h-4 mr-1" />
            Tout marquer comme lu
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Bell className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">Aucune notification</h3>
          <p className="text-sm text-muted-foreground">
            Vous n'avez pas de notifications pour le moment
          </p>
        </div>
      ) : (
        <ScrollArea className="max-h-80">
          <div className="divide-y divide-border">
            {items.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={() => markItemRead(notification)}
                onDelete={() => handleDelete(notification)}
                onRespond={handleRespond}
                isResponding={respondToDeletion.isPending}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

interface NotificationItemProps {
  notification: UnifiedNotification;
  onMarkRead: () => void;
  onDelete: () => void;
  onRespond: (id: string, accept: boolean) => void;
  isResponding: boolean;
}

function NotificationItem({ 
  notification, 
  onMarkRead,
  onDelete,
  onRespond,
  isResponding,
}: NotificationItemProps) {
  const isUnread = notification.isUnread;
  const rawServer = notification.source === 'server_notification' ? notification.raw as ServerNotification : null;
  const isDeletionRequest = rawServer?.type === 'deletion_request' || rawServer?.type === 'server_deletion_request';
  const KindIcon = notification.kind === 'mention'
    ? AtSign
    : notification.kind === 'dm'
      ? MessagesSquare
      : notification.kind === 'reply'
        ? MessageSquare
        : AlertTriangle;

  return (
    <div
      className={cn(
        "px-4 py-3 flex gap-3 transition-colors hover:bg-muted/30",
        isUnread && "bg-primary/5"
      )}
    >
      {/* Server/Sender icon */}
      <div className="relative flex-shrink-0">
      <Avatar className="w-10 h-10">
        <AvatarImage src={notification.avatarUrl || notification.serverIconUrl || undefined} />
        <AvatarFallback className="bg-primary/20 text-primary">
          {notification.fallback || '?'}
        </AvatarFallback>
      </Avatar>
        <span className={cn(
          'absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-background',
          notification.mentionCount > 0 ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'
        )}>
          <KindIcon className="w-2.5 h-2.5" />
        </span>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={cn("text-sm", isUnread && "font-semibold")}>
              {notification.title}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {notification.message}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {formatDistanceToNow(new Date(notification.createdAt), { 
                addSuffix: true,
                locale: fr 
              })}
              {notification.serverName && (
                <> · {notification.serverName}</>
              )}
            </p>
          </div>
          
          {notification.mentionCount > 0 ? (
            <Badge variant="destructive" className="h-5 min-w-5 px-1 text-[10px] flex items-center justify-center">
              {notification.mentionCount > 99 ? '99+' : notification.mentionCount}
            </Badge>
          ) : isUnread && (
            <div className="w-2 h-2 rounded-full bg-foreground flex-shrink-0 mt-2" />
          )}
        </div>
        
        {/* Action buttons for deletion requests */}
        {isDeletionRequest && rawServer?.status === 'pending' && (
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="default"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => onRespond(rawServer.id, true)}
              disabled={isResponding}
            >
              <Check className="w-4 h-4 mr-1" />
              Accepter
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onRespond(rawServer.id, false)}
              disabled={isResponding}
            >
              <X className="w-4 h-4 mr-1" />
              Refuser
            </Button>
          </div>
        )}
        
        {/* Status for responded requests */}
        {isDeletionRequest && rawServer?.status !== 'pending' && (
          <div className="mt-2">
            <Badge 
              variant={rawServer?.status === 'accepted' ? 'default' : 'secondary'}
              className={cn(
                rawServer?.status === 'accepted' && "bg-green-600",
                rawServer?.status === 'rejected' && "bg-red-600"
              )}
            >
              {rawServer?.status === 'accepted' ? 'Acceptée' : 'Refusée'}
            </Badge>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        {isUnread && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onMarkRead}
          >
            <CheckCheck className="w-4 h-4 text-muted-foreground" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}
