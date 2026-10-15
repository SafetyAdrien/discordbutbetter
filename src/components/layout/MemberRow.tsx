import { memo } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserAvatarImage } from "@/components/ui/user-avatar-image";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { RoleCheckboxItem } from "@/components/profile/RoleCheckboxItem";
import { cn } from "@/lib/utils";
import { StreamlineCrown } from "@/components/icons/StreamlineCrown";
import {
  Shield,
  UserIcon,
  MessageCircle,
  UserPlus,
  Hash,
  Pencil,
  VolumeX,
  LogOut,
  Ban,
  Gamepad2,
  Headphones,
  Eye,
  Trophy,
} from "lucide-react";
import type { ElementType } from "react";

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
  canManageRoles: boolean;
  onOpenProfile: (member: MemberWithRoles, memberId?: string) => void;
  onSendMessage: (member: MemberWithRoles) => void;
  onAddFriend: (member: MemberWithRoles) => void;
  onCopyId: (id: string) => void;
  onEditServerProfile: () => void;
  onSetSecondOwner: (target: { id: string; name: string }) => void;
  onRemoveSecondOwner: (target: { id: string; name: string }) => void;
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
function MemberRowComponent({
  member,
  isOwner,
  isSecondaryOwner,
  memberId,
  roles,
  serverId,
  currentUserId,
  ownerId,
  canManageRoles,
  onOpenProfile,
  onSendMessage,
  onAddFriend,
  onCopyId,
  onEditServerProfile,
  onSetSecondOwner,
  onRemoveSecondOwner,
}: MemberRowProps) {
  const manageableRoles = roles
    .filter((role) => !role.is_default)
    .sort((a, b) => (b.position ?? 0) - (a.position ?? 0));

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          onClick={() => onOpenProfile(member, memberId)}
          className="flex items-center gap-3 w-full px-2.5 py-1 rounded-2xl hover:bg-surface-hover/40 group"
          style={{ transition: 'all 300ms cubic-bezier(0.2, 0, 0, 1)' }}
        >
          <div className="relative flex-shrink-0">
            <UserAvatarImage
              src={member.avatar}
              alt={member.displayName}
              fallback={member.displayName.charAt(0).toUpperCase()}
              ownerId={member.id}
              className={cn("w-8 h-8", member.status === "offline" && "opacity-50 grayscale")}
            />
            <StatusIndicator
              status={member.status}
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-card"
            />
          </div>

          <div className="flex-1 min-w-0 text-left overflow-hidden">
            <div className="flex items-center gap-1 min-w-0 overflow-hidden">
              <span
                className={cn(
                  "text-sm font-medium truncate min-w-0 block",
                  member.status === "offline" && "opacity-60",
                )}
                style={{ color: member.roles?.[0]?.color || undefined }}
              >
                {member.displayName}
              </span>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {(isOwner || isSecondaryOwner) && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex-shrink-0 cursor-pointer">
                        <StreamlineCrown size={14} className="text-yellow-500" />
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
            ) : member.customStatus && member.status !== 'offline' ? (
              <p className="text-xs text-muted-foreground truncate">{member.customStatus}</p>
            ) : null}
          </div>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => onOpenProfile(member, memberId)}>
          <UserIcon className="w-4 h-4 mr-2" />
          Voir le profil
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onSendMessage(member)}>
          <MessageCircle className="w-4 h-4 mr-2" />
          Envoyer un message
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onAddFriend(member)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Ajouter en ami
        </ContextMenuItem>
        <ContextMenuSeparator />
        {currentUserId && member.id === currentUserId && (
          <ContextMenuItem onClick={onEditServerProfile}>
            <Pencil className="w-4 h-4 mr-2" />
            Modifier le profil serveur
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={() => onCopyId(member.id)}>
          <Hash className="w-4 h-4 mr-2" />
          Copier l'ID
        </ContextMenuItem>
        {canManageRoles && memberId && (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Shield className="w-4 h-4 mr-2" />
                Gérer les rôles
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-56 p-0">
                <div className="p-2 border-b border-border">
                  <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                    Rôles
                  </h4>
                </div>
                <ScrollArea className="max-h-[300px]">
                  <div className="p-2 space-y-1">
                    {manageableRoles.map((role) => (
                      <RoleCheckboxItem
                        key={role.id}
                        role={role as Parameters<typeof RoleCheckboxItem>[0]["role"]}
                        serverId={serverId!}
                        memberId={memberId}
                        userId={member.id}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}
        {currentUserId === ownerId && !isOwner && (
          <>
            <ContextMenuSeparator />
            {!isSecondaryOwner ? (
              <ContextMenuItem
                onClick={() => onSetSecondOwner({ id: member.id, name: member.displayName })}
              >
                <StreamlineCrown size={14} className="mr-2 text-yellow-500" />
                Ajouter second propriétaire
              </ContextMenuItem>
            ) : (
              <ContextMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onRemoveSecondOwner({ id: member.id, name: member.displayName })}
              >
                <StreamlineCrown size={14} className="mr-2" />
                Retirer second propriétaire
              </ContextMenuItem>
            )}
          </>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem>
          <VolumeX className="w-4 h-4 mr-2" />
          Rendre muet
        </ContextMenuItem>
        <ContextMenuItem className="text-destructive focus:text-destructive">
          <LogOut className="w-4 h-4 mr-2" />
          Expulser
        </ContextMenuItem>
        <ContextMenuItem className="text-destructive focus:text-destructive">
          <Ban className="w-4 h-4 mr-2" />
          Bannir
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
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
    prev.serverId === next.serverId &&
    prev.roles === next.roles &&
    prev.onOpenProfile === next.onOpenProfile &&
    prev.onSendMessage === next.onSendMessage &&
    prev.onAddFriend === next.onAddFriend &&
    prev.onCopyId === next.onCopyId &&
    prev.onEditServerProfile === next.onEditServerProfile &&
    prev.onSetSecondOwner === next.onSetSecondOwner &&
    prev.onRemoveSecondOwner === next.onRemoveSecondOwner
  );
});