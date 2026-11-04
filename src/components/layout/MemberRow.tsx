import { memo, useState } from "react";
import { MemberMenuItems } from "./MemberMenuItems";
import { FriendNicknameDialog, RemoveFriendDialog } from "@/components/dm/RelationDialogs";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ServerTagBadge } from '@/components/server-tags/ServerTagBadge';
import { MemberStatusText } from "@/components/profile/StatusEmoji";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserAvatarImage } from "@/components/ui/user-avatar-image";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { RoleCheckboxItem } from "@/components/profile/RoleCheckboxItem";
import { cn } from "@/lib/utils";
import { RoleIcon } from "@/components/chat/RoleIcon";
import { StreamlineCrown } from "@/components/icons/StreamlineCrown";
import { VolumeX, Ban } from "lucide-react";
import { Shield, UserIcon, MessageCircle, UserPlus, Pencil, LogOut, Gamepad2, Headphones, Eye, Trophy, Volume2 } from "@/components/icons/discord/lucide";
import type { ElementType } from "react";

import { ChannelSheetIcon } from "@/components/icons/ChannelSheetIcon";
export interface MemberWithRoles {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  customStatus?: string;
  roles?: Array<{ id: string; name: string; color?: string | null; position?: number | null; is_default?: boolean; icon_url?: string | null }>;
  memberId?: string;
  activity_type?: string | null;
  activity_text?: string | null;
}

export interface MemberRoleOption {
  id: string;
  name: string;
  position?: number | null;
  is_default?: boolean;
}

interface MemberRowProps {
  member: MemberWithRoles;
  isOwner: boolean;
  isSecondaryOwner: boolean;
  /** membership row id, needed for role management */
  memberId?: string;
  roles: MemberRoleOption[];
  serverId?: string;
  currentUserId?: string;
  ownerId: string;
  /** Connecte a un salon vocal de ce serveur. */
  inVoice?: boolean;
  canManageRoles: boolean;
  onOpenProfile: (member: MemberWithRoles, memberId?: string) => void;
  onSendMessage: (member: MemberWithRoles) => void;
  onAddFriend: (member: MemberWithRoles) => void;
  onCopyId: (id: string) => void;
  onEditServerProfile: () => void;
  onSetSecondOwner: (target: { id: string; name: string }) => void;
  onRemoveSecondOwner: (target: { id: string; name: string }) => void;
  canKick?: boolean;
  canBan?: boolean;
  onKick?: (target: { id: string; name: string }) => void;
  onBan?: (target: { id: string; name: string }) => void;
}

const activityIcons: Record<string, ElementType> = {
  playing: Gamepad2,
  listening: Headphones,
  watching: Eye,
  competing: Trophy,
};
const activityLabels: Record<string, string> = {
  playing: "Joue à",
  listening: "Écoute",
  watching: "Regarde",
  competing: "En compétition sur",
};
const activityColors: Record<string, string> = {
  playing: "text-violet-400",
  listening: "text-green-400",
  watching: "text-red-400",
  competing: "text-yellow-400",
};

/**
 * A single member row.
 *
 * Extracted from MemberList and wrapped in `memo` so that typing in the member
 * filter, toggling a role filter, or any presence tick elsewhere in the list no
 * longer re-renders every row. All callbacks are stable references owned by the
 * parent, so a row only re-renders when its own data actually changes.
 */
const noop = () => {};

function MemberRowComponent({
  member,
  isOwner,
  isSecondaryOwner,
  memberId,
  roles,
  serverId,
  currentUserId,
  ownerId,
  inVoice,
  canManageRoles,
  onOpenProfile,
  onSendMessage,
  onAddFriend,
  onCopyId,
  onEditServerProfile,
  onSetSecondOwner,
  onRemoveSecondOwner,
  canKick = false,
  canBan = false,
  onKick = noop,
  onBan = noop,
}: MemberRowProps) {
  const [dialog, setDialog] = useState<{ kind: 'nick' } | { kind: 'remove'; friendshipId: string | null } | null>(null);
  const manageableRoles = roles
    .filter((role) => !role.is_default)
    .sort((a, b) => (b.position ?? 0) - (a.position ?? 0));

  return (
    <>
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          onClick={() => onOpenProfile(member, memberId)}
          /* Cotes Discord :
     hauteur  42px (nom + statut), rayon 8px
     padding interne 8px
     Le rayon etait en `2xl` (16px), ce qui transformait chaque membre en
     pilule : Discord utilise des lignes pleine largeur a angle quasi droit.
     L'inset de 8px vient du `p-2` du conteneur de MemberList. */
          className={cn(
            "flex items-center gap-3 w-full h-[42px] px-2 rounded-lg hover:bg-surface-hover group",
            // Capture : les membres hors ligne sont attenues en bloc (avatar,
            // nom, badges), sans passer l'avatar en niveaux de gris.
            member.status === "offline" && "opacity-30 hover:opacity-100",
          )}
          style={{ transition: 'background-color 150ms ease' }}
        >
          <div className="relative flex-shrink-0">
            <UserAvatarImage
              src={member.avatar}
              alt={member.displayName}
              fallback={member.displayName.charAt(0).toUpperCase()}
              ownerId={member.id}
              className="w-8 h-8"
            />
            <StatusIndicator
              status={member.status}
              /* L'anneau de l'indicateur de statut epouse le fond de la colonne
         membres (meme gris que le chat). */
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-background"
            />
          </div>

          <div className="flex-1 min-w-0 text-left overflow-hidden">
            <div className="flex items-center gap-1 min-w-0 overflow-hidden">
              <span translate="no"
                className={cn(
                  "text-base font-medium leading-5 truncate min-w-0 block",
                )}
                style={{ color: member.roles?.[0]?.color || undefined }}
              >
                {member.displayName}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <ServerTagBadge userId={member.id} variant="compact" />
                {(() => {
                  const iconRole = member.roles?.find((r) => r.icon_url);
                  return iconRole ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex"><RoleIcon role={iconRole} size={16} /></span>
                      </TooltipTrigger>
                      <TooltipContent><p>{iconRole.name}</p></TooltipContent>
                    </Tooltip>
                  ) : null;
                })()}
                {(isOwner || isSecondaryOwner) && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex-shrink-0 cursor-pointer">
                        <StreamlineCrown size={16} className="text-yellow-500" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isOwner ? "Propriétaire du serveur" : "Second Propriétaire"}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
            {member.activity_type && member.activity_text ? (
              <div className="flex items-center gap-1 text-xs truncate">
                {(() => {
                  const ActivityIcon = activityIcons[member.activity_type];
                  return ActivityIcon ? (
                    <ActivityIcon
                      className={cn("w-3 h-3 flex-shrink-0", activityColors[member.activity_type])}
                    />
                  ) : null;
                })()}
                <span
                  className={cn("flex-shrink-0", activityColors[member.activity_type] || "text-muted-foreground")}
                >
                  {activityLabels[member.activity_type] || ""}
                </span>
                <span className="text-muted-foreground truncate">{member.activity_text}</span>
              </div>
            ) : (member.customStatus && member.status !== 'offline') || inVoice ? (
              <p className="flex items-center gap-1 text-xs leading-4 text-muted-foreground truncate">
                {inVoice && <Volume2 className="w-3.5 h-3.5 shrink-0 text-[hsl(var(--online))]" aria-label="Dans un salon vocal" />}
                {inVoice && member.customStatus && <span aria-hidden>•</span>}
                {member.customStatus && member.status !== 'offline' && <span className="truncate"><MemberStatusText value={member.customStatus} /></span>}
              </p>
            ) : null}
          </div>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-max min-w-[221px] max-h-[calc(100vh-16px)] overflow-y-auto scrollbar-thin">
        <MemberMenuItems
          member={member}
          memberId={memberId}
          roles={roles}
          serverId={serverId}
          currentUserId={currentUserId}
          ownerId={ownerId}
          isOwner={isOwner}
          isSecondaryOwner={isSecondaryOwner}
          canManageRoles={canManageRoles}
          canKick={canKick}
          canBan={canBan}
          onOpenProfile={onOpenProfile}
          onEditServerProfile={onEditServerProfile}
          onSetSecondOwner={onSetSecondOwner}
          onRemoveSecondOwner={onRemoveSecondOwner}
          onKick={onKick}
          onBan={onBan}
          onNickname={() => setDialog({ kind: 'nick' })}
          onRemoveFriend={(friendshipId) => setDialog({ kind: 'remove', friendshipId })}
        />
      </ContextMenuContent>
    </ContextMenu>
      {dialog?.kind === 'nick' && <FriendNicknameDialog open onOpenChange={(o) => !o && setDialog(null)} userId={member.id} displayName={member.displayName} />}
      {dialog?.kind === 'remove' && <RemoveFriendDialog open onOpenChange={(o) => !o && setDialog(null)} friendshipId={dialog.friendshipId} username={member.username} />}
    </>
  );
}

// `member` is compared by value: rows receive a fresh object whenever the
// member list is rebuilt, so a reference comparison alone would defeat the memo.
export const MemberRow = memo(MemberRowComponent, (prev, next) => {
  return (
    prev.member.id === next.member.id &&
    prev.member.displayName === next.member.displayName &&
    prev.member.status === next.member.status &&
    prev.member.customStatus === next.member.customStatus &&
    prev.member.avatar === next.member.avatar &&
    prev.member.activity_type === next.member.activity_type &&
    prev.member.activity_text === next.member.activity_text &&
    prev.member.roles === next.member.roles &&
    prev.isOwner === next.isOwner &&
    prev.isSecondaryOwner === next.isSecondaryOwner &&
    prev.memberId === next.memberId &&
    prev.canManageRoles === next.canManageRoles &&
    prev.currentUserId === next.currentUserId &&
    prev.ownerId === next.ownerId &&
    prev.inVoice === next.inVoice &&
    prev.serverId === next.serverId &&
    prev.roles === next.roles &&
    prev.onOpenProfile === next.onOpenProfile &&
    prev.onSendMessage === next.onSendMessage &&
    prev.onAddFriend === next.onAddFriend &&
    prev.onCopyId === next.onCopyId &&
    prev.onEditServerProfile === next.onEditServerProfile &&
    prev.onSetSecondOwner === next.onSetSecondOwner &&
    prev.onRemoveSecondOwner === next.onRemoveSecondOwner &&
    prev.canKick === next.canKick &&
    prev.canBan === next.canBan &&
    prev.onKick === next.onKick &&
    prev.onBan === next.onBan
  );
});