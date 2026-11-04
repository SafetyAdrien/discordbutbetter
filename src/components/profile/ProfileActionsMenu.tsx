import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { IdCard } from '@/components/icons/discord/lucide';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ShareProfileModal } from './ShareProfileModal';
import { copyToClipboard } from '@/lib/clipboard';
import { uuidToSnowflake } from '@/lib/snowflake';
import { useServers } from '@/hooks/useServers';
import { useRelations } from '@/hooks/useRelations';
import { useBlockUser, useRelationTo, useUnblockUser } from '@/hooks/useFriends';
import { useInviteUserToServer } from '@/hooks/useInviteUserToServer';

/*
 * Menu "..." d'un profil d'un autre utilisateur (video de reference) : Partager le profil, Inviter sur le serveur >,
 * Ignorer, Bloquer, Signaler le profil d'utilisateur, Copier l'identifiant de l'utilisateur.
 */

export const MENU_ITEM = 'min-h-[33px] px-2 py-1.5 text-sm whitespace-nowrap';
export const MENU_SUB = cn(MENU_ITEM, '[&>svg:last-child]:!h-[11px] [&>svg:last-child]:!w-[11px]');
export const MENU_DANGER = 'text-[#f57976] focus:text-[#f57976] data-[highlighted]:text-[#f57976]';
export const MENU_PANEL = 'z-[140] w-max min-w-[221px] rounded-lg border border-white/[0.08] bg-[#3b3b45] p-2 shadow-[0_8px_16px_rgba(0,0,0,0.24)]';

interface Props {
  profile: { id: string; display_name: string; username: string; avatar_url: string | null };
  /** Pastille posee sur la banniere ("round") ou bouton de la rangee d'actions ("square"). */
  trigger: React.ReactNode;
  align?: 'start' | 'end';
}

export function ProfileActionsMenu({ profile, trigger, align = 'start' }: Props) {
  const [shareOpen, setShareOpen] = useState(false);
  const { data: servers = [] } = useServers();
  const invite = useInviteUserToServer();
  const { isIgnored, toggleIgnore } = useRelations();
  const { isBlocked } = useRelationTo(profile.id);
  const block = useBlockUser();
  const unblock = useUnblockUser();
  const ignored = isIgnored(profile.id);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent align={align} sideOffset={6} className={MENU_PANEL}>
          <DropdownMenuItem className={MENU_ITEM} onSelect={() => setShareOpen(true)}>Partager le profil</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className={MENU_SUB}>Inviter sur le serveur</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className={cn(MENU_PANEL, 'max-h-[400px] overflow-y-auto scrollbar-thin')}>
              {servers.length === 0 ? (
                <DropdownMenuItem className={MENU_ITEM} disabled>Aucun serveur</DropdownMenuItem>
              ) : (
                servers.map((s) => (
                  <DropdownMenuItem key={s.id} translate="no" className={MENU_ITEM} onSelect={() => void invite(profile.id, s.id, s.name)}>{s.name}</DropdownMenuItem>
                ))
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className={MENU_ITEM}
            onSelect={() => {
              toggleIgnore(profile.id);
              toast.success(ignored ? `${profile.display_name} n'est plus ignoré` : `${profile.display_name} est ignoré`);
            }}
          >
            {ignored ? 'Ne plus ignorer' : 'Ignorer'}
          </DropdownMenuItem>
          <DropdownMenuItem className={cn(MENU_ITEM, MENU_DANGER)} onSelect={() => (isBlocked ? unblock.mutate(profile.id) : block.mutate({ id: profile.id, name: profile.display_name }))}>
            {isBlocked ? 'Débloquer' : 'Bloquer'}
          </DropdownMenuItem>
          <DropdownMenuItem className={cn(MENU_ITEM, MENU_DANGER)} onSelect={() => toast.info('Bientôt disponible')}>Signaler le profil d'utilisateur</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className={cn(MENU_ITEM, 'gap-2')} onSelect={() => void copyToClipboard(uuidToSnowflake(profile.id), 'Identifiant copié')}>
            <IdCard className="h-[18px] w-[18px]" /> Copier l'identifiant de l'utilisateur
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ShareProfileModal open={shareOpen} onOpenChange={setShareOpen} profile={profile} />
    </>
  );
}
