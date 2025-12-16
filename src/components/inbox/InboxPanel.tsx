import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  Inbox, 
  Check, 
  X, 
  Trash2, 
  CheckCheck, 
  Loader2,
  AlertTriangle,
  Bell
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  useNotifications,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  useRespondToDeletionRequest,
  ServerNotification,
} from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function InboxPanel() {
  const { data: notifications = [], isLoading } = useNotifications();
  const markAllRead = useMarkAllNotificationsAsRead();
  const deleteNotification = useDeleteNotification();
  const respondToDeletion = useRespondToDeletionRequest();
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const unreadCount = notifications.filter(n => n.status === 'pending').length;

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map(n => n.id)));
    }
  };

  const handleDeleteSelected = () => {
    selectedIds.forEach(id => {
      deleteNotification.mutate(id);
    });
    setSelectedIds(new Set());
  };

  const handleRespond = (notificationId: string, accept: boolean) => {
    respondToDeletion.mutate({ notificationId, accept });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Inbox className="w-5 h-5" />
          <h2 className="font-semibold">Boîte de réception</h2>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteSelected}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Supprimer ({selectedIds.size})
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending || unreadCount === 0}
          >
            <CheckCheck className="w-4 h-4 mr-1" />
            Tout marquer comme lu
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Bell className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">Aucune notification</h3>
          <p className="text-sm text-muted-foreground">
            Vous n'avez pas de notifications pour le moment
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          {/* Select all row */}
          <div className="px-4 py-2 border-b border-border bg-muted/30 sticky top-0">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={selectedIds.size === notifications.length && notifications.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                Tout sélectionner
              </span>
            </label>
          </div>
          
          <div className="divide-y divide-border">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                isSelected={selectedIds.has(notification.id)}
                onToggleSelect={() => toggleSelect(notification.id)}
                onDelete={() => deleteNotification.mutate(notification.id)}
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
  notification: ServerNotification;
  isSelected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onRespond: (id: string, accept: boolean) => void;
  isResponding: boolean;
}

function NotificationItem({ 
  notification, 
  isSelected, 
  onToggleSelect,
  onDelete,
  onRespond,
  isResponding,
}: NotificationItemProps) {
  const isUnread = notification.status === 'pending';
  const isDeletionRequest = notification.type === 'deletion_request';

  return (
    <div
      className={cn(
        "px-4 py-3 flex gap-3 transition-colors hover:bg-muted/30",
        isUnread && "bg-primary/5"
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggleSelect}
        className="mt-1"
      />
      
      {/* Server/Sender icon */}
      <Avatar className="w-10 h-10 flex-shrink-0">
        <AvatarImage src={notification.server?.icon_url || notification.sender?.avatar_url || undefined} />
        <AvatarFallback className="bg-primary/20 text-primary">
          {notification.server?.name?.charAt(0) || notification.sender?.display_name?.charAt(0) || '?'}
        </AvatarFallback>
      </Avatar>
      
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
              {formatDistanceToNow(new Date(notification.created_at), { 
                addSuffix: true,
                locale: fr 
              })}
              {notification.server?.name && (
                <> · {notification.server.name}</>
              )}
            </p>
          </div>
          
          {isUnread && (
            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
          )}
        </div>
        
        {/* Action buttons for deletion requests */}
        {isDeletionRequest && notification.status === 'pending' && (
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="default"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => onRespond(notification.id, true)}
              disabled={isResponding}
            >
              <Check className="w-4 h-4 mr-1" />
              Accepter
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onRespond(notification.id, false)}
              disabled={isResponding}
            >
              <X className="w-4 h-4 mr-1" />
              Refuser
            </Button>
          </div>
        )}
        
        {/* Status for responded requests */}
        {isDeletionRequest && notification.status !== 'pending' && (
          <div className="mt-2">
            <Badge 
              variant={notification.status === 'accepted' ? 'default' : 'secondary'}
              className={cn(
                notification.status === 'accepted' && "bg-green-600",
                notification.status === 'rejected' && "bg-red-600"
              )}
            >
              {notification.status === 'accepted' ? 'Acceptée' : 'Refusée'}
            </Badge>
          </div>
        )}
      </div>
      
      {/* Delete button - only for non-pending notifications */}
      {notification.status !== 'pending' && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 hover:opacity-100 group-hover:opacity-100"
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}
