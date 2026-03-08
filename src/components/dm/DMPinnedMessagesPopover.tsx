import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Pin, X } from 'lucide-react';
import { useDMPinnedMessages, useUnpinDMMessage } from '@/hooks/useDMPinnedMessages';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DMPinnedMessagesPopoverProps {
  conversationId: string;
  onJumpToMessage?: (messageId: string) => void;
}

export function DMPinnedMessagesPopover({ 
  conversationId,
  onJumpToMessage 
}: DMPinnedMessagesPopoverProps) {
  const { data: pinnedMessages = [], isLoading } = useDMPinnedMessages(conversationId);
  const unpinMessage = useUnpinDMMessage();

  const handleUnpin = (messageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    unpinMessage.mutate({ messageId, conversationId });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Pin className="w-4 h-4" />
          {pinnedMessages.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {pinnedMessages.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[420px] p-0" 
        align="end"
        sideOffset={8}
      >
        <div className="p-3 border-b border-border">
          <h3 className="font-semibold text-sm">Messages épinglés</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pinnedMessages.length} message{pinnedMessages.length !== 1 ? 's' : ''} épinglé{pinnedMessages.length !== 1 ? 's' : ''}
          </p>
        </div>

        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Chargement...
            </div>
          ) : pinnedMessages.length === 0 ? (
            <div className="p-8 text-center">
              <Pin className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Aucun message épinglé
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Cliquez droit sur un message pour l'épingler
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {pinnedMessages.map((pin) => (
                <div
                  key={pin.id}
                  onClick={() => onJumpToMessage?.(pin.message_id)}
                  className={cn(
                    "group relative p-3 rounded-xl bg-[hsl(var(--surface-2))] hover:bg-[hsl(var(--surface-3))] transition-colors",
                    onJumpToMessage && "cursor-pointer"
                  )}
                >
                  <Button
                    variant="ghost"
                    size="iconSm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleUnpin(pin.message_id, e)}
                  >
                    <X className="w-3 h-3" />
                  </Button>

                  <div className="flex items-start gap-2">
                    <Avatar className="w-6 h-6 flex-shrink-0">
                      <AvatarImage src={pin.message.author?.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {pin.message.author?.display_name?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium truncate">
                          {pin.message.author?.display_name || 'Utilisateur'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {pin.message.created_at && format(new Date(pin.message.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/80 line-clamp-3 mt-0.5">
                        {pin.message.content}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-[10px] text-muted-foreground">
                      Épinglé le {format(new Date(pin.pinned_at), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
