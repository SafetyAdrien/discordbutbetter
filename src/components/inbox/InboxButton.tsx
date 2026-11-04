import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MentionBadge } from '@/components/ui/MentionBadge';
import { DiscordInbox } from '@/components/icons/DiscordInbox';
import { useNotifications } from '@/hooks/useNotifications';
import { useTotalMentionCount } from '@/hooks/useTotalMentionCount';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';
import { useOverdueReminders } from '@/hooks/useReminders';
import { OPEN_FRIENDS_EVENT } from '@/lib/invites';

const openFriends = () => window.dispatchEvent(new CustomEvent(OPEN_FRIENDS_EVENT));
import { InboxPanel } from './InboxPanel';

/*
 * Bouton + panneau de la boite de reception. `variant="titlebar"` : barre de
 * titre de l'application de bureau (32px, panneau de 675px sous la barre) ;
 * `variant="header"` : champ de recherche de la liste des membres.
 */
export function InboxButton({ variant = 'titlebar' }: { variant?: 'titlebar' | 'header' }) {
  const [open, setOpen] = useState(false);
  const { data: notifications = [] } = useNotifications();
  const mentionCount = useTotalMentionCount();
  const hasUnread = notifications.some((n) => n.status === 'pending') || mentionCount > 0;
  const overdue = useOverdueReminders().length;
  const titlebar = variant === 'titlebar';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Boîte de réception"
              className={cn(
                'relative shrink-0 flex items-center justify-center transition-colors text-[hsl(var(--header-icon))] hover:text-[hsl(var(--interactive-text-hover))]',
                titlebar ? 'h-[32px] w-[36px] text-[hsl(var(--icon-default))]' : 'p-0.5',
                open && 'text-white',
              )}
            >
              <DiscordInbox className={titlebar ? "w-[17px] h-[17px]" : "w-[23px] h-[23px]"} />
              {overdue > 0 ? (
                <span aria-label="Rappels en retard" className="absolute top-[7px] right-[9px] w-2.5 h-2.5 rounded-full bg-[#f23f42] ring-2 ring-[hsl(var(--sidebar-background))]" />
              ) : mentionCount > 0 ? (
                <MentionBadge count={mentionCount} size="xs" className="absolute top-1 right-1" />
              ) : hasUnread ? (
                <span aria-label="Notifications non lues" className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-white" />
              ) : null}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        {!open && (
          <TooltipContent side="bottom">
            {overdue > 0 ? (
              <span className="flex items-center gap-2 text-base"><Clock className="w-5 h-5" />{overdue} rappel{overdue > 1 ? 's' : ''} en retard</span>
            ) : 'Boîte de réception'}
          </TooltipContent>
        )}
      </Tooltip>
      <PopoverContent
        side={titlebar ? 'bottom' : 'left'}
        align={titlebar ? 'end' : 'start'}
        sideOffset={titlebar ? 4 : 8}
        collisionPadding={8}
        className="w-[675px] max-w-[calc(100vw-16px)] p-0 overflow-hidden rounded-lg border-[hsl(var(--border-subtle))] bg-[hsl(var(--input))] shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
      >
        <InboxPanel onOpenFriends={openFriends} onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
