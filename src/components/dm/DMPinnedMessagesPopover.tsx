import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Pin, X } from '@/components/icons/discord/lucide';
import { useDMPinnedMessages, useUnpinDMMessage } from '@/hooks/useDMPinnedMessages';
import { format } from '@/lib/dateUtils';
import { fr } from '@/lib/dateUtils';
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
        <button type="button" aria-label="Messages épinglés" className="relative flex h-6 w-6 items-center justify-center text-[hsl(var(--interactive-icon-default))] transition-colors hover:text-white data-[state=open]:text-white">
          <Pin className="h-6 w-6" />
          {pinnedMessages.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#5865f2] text-[10px] font-bold text-white">
              {pinnedMessages.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[440px] overflow-hidden rounded-lg border border-white/[0.06] bg-[#383840] p-0 shadow-[0_8px_16px_rgba(0,0,0,0.24)]"
        align="end"
        sideOffset={12}
      >
        <div className="flex h-12 items-center gap-3 border-b border-white/[0.06] px-4">
          <Pin className="h-6 w-6 text-[#b5bac1]" />
          <h3 className="text-base font-semibold text-white">Messages épinglés</h3>
        </div>

        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Chargement...
            </div>
          ) : pinnedMessages.length === 0 ? (
            <div>
              <div className="flex flex-col items-center px-8 pb-8 pt-8 text-center">
                <svg viewBox="0 0 120 120" className="h-[110px] w-[110px] text-[#4a4b52]" aria-hidden>
                  <circle cx="58" cy="68" r="38" fill="none" stroke="currentColor" strokeWidth="6" />
                  <circle cx="46" cy="62" r="4" fill="currentColor" />
                  <circle cx="68" cy="62" r="4" fill="currentColor" />
                  <path d="M44 86c6-8 18-8 24 0" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                  <path d="M76 38l22-22M86 24l14 14M72 42l14 14" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                </svg>
                <p className="mt-4 text-base leading-[22px] text-[#dbdee1]">Ce message privé n'a pas encore<br />de messages épinglés… pour l'instant.</p>
              </div>
              <div className="bg-[#303038] px-4 py-5 text-center">
                <p className="text-sm font-bold text-[#6fbf8d]">Astuce :</p>
                <p className="text-sm text-[#dbdee1]">Tu peux épingler un message depuis son menu contextuel.</p>
              </div>
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
