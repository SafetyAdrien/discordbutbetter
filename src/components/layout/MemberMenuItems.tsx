import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { IdCard } from '@/components/icons/discord/lucide';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import { RoleCheckboxItem } from '@/components/profile/RoleCheckboxItem';
import { StreamlineCrown } from '@/components/icons/StreamlineCrown';
import { useServers } from '@/hooks/useServers';
import { useRelations } from '@/hooks/useRelations';
import { useBlockUser, useRelationTo, useSendFriendRequest, useUnblockUser } from '@/hooks/useFriends';
import { useInviteUserToServer } from '@/hooks/useInviteUserToServer';
import { useDMActions } from '@/hooks/useDMActions';
import { MENTION_USER_EVENT } from '@/lib/mentionEvents';
import { copyToClipboard } from '@/lib/clipboard';
import { uuidToSnowflake } from '@/lib/snowflake';
import type { MemberWithRoles, MemberRoleOption } from './MemberRow';

/*
 * Menu d'un membre (video de reference) : Profil, Mentionner, Envoyer un message, Commence un appel, Ajouter une note,
 * pseudo d'ami, Changer le pseudo, Applications, Inviter sur le serveur, Retirer l'ami / Ajouter, Ignorer, Bloquer,
 * Roles, Expulser / Bannir, Copier l'identifiant. Monte seulement quand le menu s'ouvre.
 */

const ITEM = 'min-h-[33px] px-2 py-1.5 text-sm whitespace-nowrap';
const SUB = cn(ITEM, '[&>svg:last-child]:!h-[11px] [&>svg:last-child]:!w-[11px]');
const DANGER = 'text-[#f57976] focus:text-[#f57976] data-[highlighted]:text-[#f57976]';

interface Props {
  member: MemberWithRoles;
  memberId?: string;
  roles: MemberRoleOption[];
  serverId?: string;
  currentUserId?: string;
  ownerId: string;
  isOwner: boolean;
  isSecondaryOwner: boolean;
  canManageRoles: boolean;
  canKick: boolean;
  canBan: boolean;
  onOpenProfile: (member: MemberWithRoles, memberId?: string) => void;
  onEditServerProfile: () => void;
  onSetSecondOwner: (target: { id: string; name: string }) => void;
  onRemoveSecondOwner: (target: { id: string; name: string }) => void;
  onKick: (target: { id: string; name: string }) => void;
  onBan: (target: { id: string; name: string }) => void;
  /** Les fenetres vivent dans la ligne (le menu se demonte a la fermeture). */
  onNickname: () => void;
  onRemoveFriend: (friendshipId: string | null) => void;
}

export function MemberMenuItems(p: Props) {
  const { member } = p;
  const self = p.currentUserId === member.id;
  const { data: servers = [] } = useServers();
  const invite = useInviteUserToServer();
  const { nicknameOf, isIgnored, toggleIgnore } = useRelations();
  const { row, isFriend, isPending, isBlocked } = useRelationTo(member.id);
  const sendRequest = useSendFriendRequest();
  const block = useBlockUser();
  const unblock = useUnblockUser();
  const { openDM, startCall } = useDMActions();
  const ignored = isIgnored(member.id);
  const manageableRoles = p.roles.filter((r) => !r.is_default).sort((a, b) => (b.position ?? 0) - (a.position ?? 0));
  const target = { id: member.id, name: member.displayName };
  const canModerate = !self && !p.isOwner && !p.isSecondaryOwner;

  return (
    <>
      <ContextMenuItem className={ITEM} onSelect={() => p.onOpenProfile(member, p.memberId)}>Profil</ContextMenuItem>
      {!self && (
        <>
          <ContextMenuItem className={ITEM} onSelect={() => window.dispatchEvent(new CustomEvent(MENTION_USER_EVENT, { detail: { userId: member.id, name: member.displayName } }))}>Mentionner</ContextMenuItem>
          <ContextMenuItem className={ITEM} onSelect={() => void openDM(member.id)}>Envoyer un message</ContextMenuItem>
          <ContextMenuItem className={ITEM} onSelect={() => void startCall(member.id)}>Commence un appel</ContextMenuItem>
          <ContextMenuItem className={cn(ITEM, 'min-h-[44px]')} onSelect={() => p.onOpenProfile(member, p.memberId)}>
            <span className="flex flex-col"><span>Ajouter une note</span><span className="text-xs font-normal text-[#b5bac1]">Seulement visible par toi</span></span>
          </ContextMenuItem>
          {isFriend && <ContextMenuItem className={ITEM} onSelect={p.onNickname}>{nicknameOf(member.id) ? "Modifier un pseudo d'ami" : "Ajouter un pseudo d'ami"}</ContextMenuItem>}
        </>
      )}
      {self && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem className={ITEM} onSelect={p.onEditServerProfile}>Changer le pseudo</ContextMenuItem>
        </>
      )}
      {!self && (
        <>
          <ContextMenuSeparator />
          <ContextMenuSub>
            <ContextMenuSubTrigger className={SUB}>Applications</ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-max min-w-[200px]"><ContextMenuItem className={ITEM} disabled>Aucune commande n'est disponible</ContextMenuItem></ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSub>
            <ContextMenuSubTrigger className={SUB}>Inviter sur le serveur</ContextMenuSubTrigger>
            <ContextMenuSubContent className="max-h-[420px] w-max min-w-[220px] max-w-[380px] overflow-y-auto scrollbar-thin">
              {servers.length === 0 ? <ContextMenuItem className={ITEM} disabled>Aucun serveur</ContextMenuItem> : servers.map((s) => <ContextMenuItem key={s.id} translate="no" className={cn(ITEM, 'truncate')} onSelect={() => void invite(member.id, s.id, s.name)}>{s.name}</ContextMenuItem>)}
            </ContextMenuSubContent>
          </ContextMenuSub>
          {isFriend ? (
            <ContextMenuItem className={ITEM} onSelect={() => p.onRemoveFriend(row?.id ?? null)}>Retirer l'ami</ContextMenuItem>
          ) : isPending ? (
            <ContextMenuItem className={ITEM} disabled>Demande d'ami envoyée</ContextMenuItem>
          ) : !isBlocked ? (
            <ContextMenuItem className={ITEM} onSelect={() => sendRequest.mutate(member.username)}>Ajouter</ContextMenuItem>
          ) : null}
          <ContextMenuItem className={ITEM} onSelect={() => { toggleIgnore(member.id); toast.success(ignored ? `${member.displayName} n'est plus ignoré` : `${member.displayName} est ignoré`); }}>{ignored ? 'Ne plus ignorer' : 'Ignorer'}</ContextMenuItem>
          <ContextMenuItem className={cn(ITEM, DANGER)} onSelect={() => (isBlocked ? unblock.mutate(member.id) : block.mutate({ id: member.id, name: member.displayName }))}>{isBlocked ? 'Débloquer' : 'Bloquer'}</ContextMenuItem>
        </>
      )}
      {p.canManageRoles && p.memberId && (
        <>
          <ContextMenuSeparator />
          <ContextMenuSub>
            <ContextMenuSubTrigger className={SUB}>Rôles</ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-[240px] p-2 rounded-lg bg-[#3b3b45] border border-white/[0.08]">
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-0.5">
                  {manageableRoles.map((role) => (
                    <RoleCheckboxItem key={role.id} role={role as Parameters<typeof RoleCheckboxItem>[0]['role']} serverId={p.serverId!} memberId={p.memberId!} userId={member.id} />
                  ))}
                </div>
              </ScrollArea>
            </ContextMenuSubContent>
          </ContextMenuSub>
        </>
      )}
      {p.currentUserId === p.ownerId && !p.isOwner && !self && (
        <>
          <ContextMenuSeparator />
          {!p.isSecondaryOwner ? (
            <ContextMenuItem className={ITEM} onSelect={() => p.onSetSecondOwner(target)}>
              <StreamlineCrown size={14} className="mr-2 text-yellow-500" />
              Ajouter second propriétaire
            </ContextMenuItem>
          ) : (
            <ContextMenuItem className={cn(ITEM, DANGER)} onSelect={() => p.onRemoveSecondOwner(target)}>
              <StreamlineCrown size={14} className="mr-2" />
              Retirer second propriétaire
            </ContextMenuItem>
          )}
        </>
      )}
      {canModerate && (p.canKick || p.canBan) && (
        <>
          <ContextMenuSeparator />
          {p.canKick && <ContextMenuItem className={cn(ITEM, DANGER)} onSelect={() => p.onKick(target)}>Expulser {member.username}</ContextMenuItem>}
          {p.canBan && <ContextMenuItem className={cn(ITEM, DANGER)} onSelect={() => p.onBan(target)}>Bannir {member.username}</ContextMenuItem>}
        </>
      )}
      <ContextMenuSeparator />
      <ContextMenuItem className={cn(ITEM, 'gap-2')} onSelect={() => void copyToClipboard(uuidToSnowflake(member.id), 'ID utilisateur copié')}>
        <IdCard className="h-[18px] w-[18px]" /> Copier l'identifiant de l'utilisateur
      </ContextMenuItem>
    </>
  );
}
