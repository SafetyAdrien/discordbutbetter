import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useRelationTo, useSendFriendRequest } from '@/hooks/useFriends';
import { RemoveFriendDialog } from '@/components/dm/RelationDialogs';
import { MENU_ITEM, MENU_PANEL } from './ProfileActionsMenu';

/*
 * Bouton d'amitie d'un profil (video de reference) : "Ajouter en ami" (icone +), "Ami" (icone avec coche ;
 * un clic ouvre "Retirer l'ami" puis la confirmation), "Demande en attente".
 */

const ICON_ADD = 'M12 11a4 4 0 100-8 4 4 0 000 8zM3 20c0-3.3 3.6-5.5 8-5.5.9 0 1.8.1 2.6.3A5 5 0 0017 22H4a1 1 0 01-1-1v-1zm14-6h2v2h2v2h-2v2h-2v-2h-2v-2h2v-2z';
const ICON_FRIEND = 'M12 11a4 4 0 100-8 4 4 0 000 8zM3 20c0-3.3 3.6-5.5 8-5.5.7 0 1.4.1 2 .2A5.5 5.5 0 0013.1 20H3zm14.5-5.5a4 4 0 110 8 4 4 0 010-8zm-1.8 3.9l1.2 1.2 2.4-2.6-.9-.8-1.5 1.7-.4-.4-.8.9z';

interface Props {
  user: { id: string; username: string };
  variant: 'round' | 'square';
  className?: string;
}

export function FriendStateButton({ user, variant, className }: Props) {
  const { row, isFriend, isPending } = useRelationTo(user.id);
  const send = useSendFriendRequest();
  const [removeOpen, setRemoveOpen] = useState(false);
  const label = isFriend ? 'Ami' : isPending ? "Demande d'ami envoyée" : 'Ajouter en ami';
  const base = variant === 'round' ? 'h-7 w-7 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70' : 'h-8 w-8 rounded-lg bg-white/[0.08] text-white hover:bg-white/[0.12]';
  const button = (
    <button
      type="button"
      aria-label={label}
      disabled={isPending}
      onClick={isFriend ? undefined : () => send.mutate(user.username)}
      className={cn('flex items-center justify-center transition-colors disabled:opacity-60', base, className)}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden><path d={isFriend ? ICON_FRIEND : ICON_ADD} /></svg>
    </button>
  );

  return (
    <>
      {isFriend ? (
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild><DropdownMenuTrigger asChild>{button}</DropdownMenuTrigger></TooltipTrigger>
            <TooltipContent side="top">{label}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" sideOffset={6} className={cn(MENU_PANEL, 'min-w-[160px]')}>
            <DropdownMenuItem className={MENU_ITEM} onSelect={() => setRemoveOpen(true)}>Retirer l'ami</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="top">{label}</TooltipContent>
        </Tooltip>
      )}
      <RemoveFriendDialog open={removeOpen} onOpenChange={setRemoveOpen} friendshipId={row?.id ?? null} username={user.username} />
    </>
  );
}
