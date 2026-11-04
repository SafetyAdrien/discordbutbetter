import { useServerVoiceParticipants } from '@/hooks/useServerVoiceParticipants';
import { forwardRef, useState, useMemo, useRef, useEffect, useCallback } from "react";
import { User } from "@/types/app";
import { usePermissions } from "@/hooks/usePermissions";
import { MemberRow } from "./MemberRow";
import { KickBanDialog } from "./KickBanDialog";
import { cn } from "@/lib/utils";
import { uuidToSnowflake } from "@/lib/snowflake";
import { VolumeX, Ban } from "lucide-react";
import { MessageCircle, UserPlus, Hash, LogOut, User as UserIcon, Search, Gamepad2, Headphones, Eye, Trophy, Inbox } from "@/components/icons/discord/lucide";
import { StreamlineCrown } from "@/components/icons/StreamlineCrown";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { InboxButton } from "@/components/inbox/InboxButton";
import { isDesktopApp } from "@/lib/desktop";
import { DiscordInbox } from '@/components/icons/DiscordInbox';
import { useNotifications } from "@/hooks/useNotifications";
import { useTotalMentionCount } from "@/hooks/useTotalMentionCount";
import { Badge } from "@/components/ui/badge";
import { MentionBadge } from "@/components/ui/MentionBadge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { UserAvatarImage } from "@/components/ui/user-avatar-image";
import { UserProfilePopup } from "@/components/profile/UserProfilePopup";
import { RoleCheckboxItem } from "@/components/profile/RoleCheckboxItem";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from "@/components/ui/context-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { copyToClipboard } from "@/lib/clipboard";

import { useServerRoles, RoleWithPermissions } from "@/hooks/useRoles";
import { Shield, Pencil } from "lucide-react";

import { useMembers } from "@/hooks/useMembers";
import { useAuth } from "@/contexts/AuthContext";
import { useServers } from "@/hooks/useServers";
import { useSetSecondaryOwner, useRemoveSecondaryOwner } from "@/hooks/useSecondaryOwner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ServerProfileEditModal } from "@/components/profile/ServerProfileEditModal";
import {
  useMemberRoleFilterListener,
  getPersistedRoleFilter,
  setPersistedRoleFilter,
} from "@/hooks/useMemberRoleFilter";
import { X as XIcon } from "lucide-react";
interface Role {
  id: string;
  name: string;
  color: string | null;
  icon_url?: string | null;
  position: number | null;
}
interface MemberWithRoles extends User {
  roles?: Role[];
  memberId?: string;
  activity_type?: string | null;
  activity_text?: string | null;
}
interface MemberListProps {
  members: MemberWithRoles[];
  ownerId: string;
  serverId?: string;
  onOpenDM?: (conversationId: string) => void;
  onOpenGlobalSearch?: () => void;
  serverRoles?: Role[];
  /**
   * Remplit toute la hauteur du parent (h-full) au lieu de s'ajuster au
   * contenu. À activer UNIQUEMENT quand le parent immédiat a une hauteur
   * définie en display normal (ex: colonne desktop avec `h-full`) — sinon
   * ça peut casser la mise en page (ex: mobile Sheet, qui empile ses
   * enfants en flux normal, pas en flex). Par défaut `false` pour ne rien
   * changer aux autres emplacements où MemberList est monté.
   */
  fillHeight?: boolean;
  className?: string;
}

const statusColors: Record<string, string> = {
  online: "bg-[hsl(var(--online))]",
  idle: "bg-[hsl(var(--idle))]",
  dnd: "bg-[hsl(var(--dnd))]",
  offline: "bg-[hsl(var(--offline))]",
};
const activityIcons: Record<string, React.ElementType> = {
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


export const MemberList = forwardRef<HTMLDivElement, MemberListProps>(function MemberList(
  { members, ownerId, serverId, onOpenDM, onOpenGlobalSearch, serverRoles = [], fillHeight = false, className },
  ref,
) {
  const { user: currentUser } = useAuth();
  const [selectedMember, setSelectedMember] = useState<MemberWithRoles | null>(null);
  const [serverProfileEditOpen, setServerProfileEditOpen] = useState(false);
  const [selectedRoleFilters, setSelectedRoleFiltersRaw] = useState<string[]>(() =>
    getPersistedRoleFilter(serverId),
  );
  const setSelectedRoleFilters: typeof setSelectedRoleFiltersRaw = (value) => {
    setSelectedRoleFiltersRaw((prev) => {
      const next = typeof value === 'function' ? (value as (p: string[]) => string[])(prev) : value;
      setPersistedRoleFilter(serverId, next);
      return next;
    });
  };
  const [addSecondOwnerTarget, setAddSecondOwnerTarget] = useState<{ id: string; name: string } | null>(null);
  const [removeSecondOwnerTarget, setRemoveSecondOwnerTarget] = useState<{ id: string; name: string } | null>(null);
  const setSecondaryOwner = useSetSecondaryOwner();
  const removeSecondaryOwner = useRemoveSecondaryOwner();

  // Re-hydrate role filters when changing server (component may not unmount)
  useEffect(() => {
    setSelectedRoleFiltersRaw(getPersistedRoleFilter(serverId));
  }, [serverId]);

  // Fetch roles for filter and management
  const { data: allRoles = [] } = useServerRoles(serverId || null);
  const { data: membersData = [] } = useMembers(serverId || null);
  const { data: servers = [] } = useServers();

  // Get the server to check for secondary owner
  const server = servers.find((s) => s.id === serverId);

  // Check if current user can manage roles
  const canManageRoles = useMemo(() => {
    if (!currentUser || !serverId) return false;

    // Owner can always manage
    if (currentUser.id === ownerId) return true;

    // Secondary owner can always manage (GOD mode)
    if (server?.secondary_owner_id === currentUser.id) return true;

    // Check if current user has administrator or manage_roles permission
    const currentMemberData = membersData.find((m) => m.user.id === currentUser.id);
    if (!currentMemberData) return false;
    const userRoleIds = currentMemberData.roles?.map((r) => r.id) || [];
    const userRoles = allRoles.filter((r) => userRoleIds.includes(r.id));
    return userRoles.some(
      (role) => role.permissions.includes("administrator") || role.permissions.includes("manage_roles"),
    );
  }, [currentUser, serverId, ownerId, server?.secondary_owner_id, membersData, allRoles]);
  const handleRoleFilterToggle = (roleId: string) => {
    setSelectedRoleFilters((prev) => (prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]));
  };
  const clearRoleFilters = () => {
    setSelectedRoleFilters([]);
  };

  // Listen to external requests to filter by a role (from RoleInfoPopup)
  useMemberRoleFilterListener((roleId, requestedServerId) => {
    if (requestedServerId && requestedServerId !== serverId) return;
    setSelectedRoleFilters([roleId]);
  });

  const filteredMembers = useMemo(() => {
    let result = [...members];

    // Apply role filter
    if (selectedRoleFilters.length > 0) {
      result = result.filter((m) => m.roles?.some((role) => selectedRoleFilters.includes(role.id)));
    }

    // Sort by display name
    result.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return result;
  }, [members, selectedRoleFilters]);

  // Group members by hoisted roles
  const groupedMembers = useMemo(() => {
    // Get hoisted roles sorted by position (highest first)
    const hoistedRoles = allRoles
      .filter((r) => r.hoist && !r.is_default)
      .sort((a, b) => (b.position ?? 0) - (a.position ?? 0));
    const online = filteredMembers.filter((m) => m.status !== "offline");
    const offline = filteredMembers.filter((m) => m.status === "offline");

    // Create groups for hoisted roles
    const groups: {
      role: RoleWithPermissions | null;
      members: MemberWithRoles[];
      isOffline?: boolean;
    }[] = [];
    const assignedMemberIds = new Set<string>();

    // For each hoisted role, find online members with that role as their highest
    for (const role of hoistedRoles) {
      const roleMembers = online.filter((member) => {
        if (assignedMemberIds.has(member.id)) return false;
        // Check if this role is the member's highest hoisted role
        const memberRoleIds = member.roles?.map((r) => r.id) || [];
        if (!memberRoleIds.includes(role.id)) return false;

        // Check if any higher hoisted role exists for this member
        const higherHoistedRole = hoistedRoles.find(
          (hr) => (hr.position ?? 0) > (role.position ?? 0) && memberRoleIds.includes(hr.id),
        );
        return !higherHoistedRole;
      });
      if (roleMembers.length > 0) {
        roleMembers.forEach((m) => assignedMemberIds.add(m.id));
        groups.push({
          role,
          members: roleMembers,
        });
      }
    }

    // Add remaining online members (no hoisted role)
    const remainingOnline = online.filter((m) => !assignedMemberIds.has(m.id));
    if (remainingOnline.length > 0) {
      groups.push({
        role: null,
        members: remainingOnline,
      });
    }

    // Add offline members
    if (offline.length > 0) {
      groups.push({
        role: null,
        members: offline,
        isOffline: true,
      });
    }
    return groups;
  }, [filteredMembers, allRoles]);
  // Stable callbacks: MemberRow is memoized, so a new closure here would
  // defeat the memo and re-render every row on each parent render.

  // Membership row id, required by the role-management menu. Memoized because
  // it is called once per rendered row.
  const { data: voiceParticipants } = useServerVoiceParticipants(serverId ?? null);
  const voiceUserIds = useMemo(() => new Set((voiceParticipants ?? []).map((p) => p.user_id)), [voiceParticipants]);
  const memberIdByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of membersData) map.set(m.user.id, m.id);
    return map;
  }, [membersData]);

  const handleOpenProfile = useCallback(
    (member: MemberWithRoles, memberId?: string) => setSelectedMember({ ...member, memberId }),
    [],
  );
  const handleCopyIdCb = useCallback(
    (id: string) => copyToClipboard(uuidToSnowflake(id), "ID utilisateur copié"),
    [],
  );
  const handleSendMessageCb = useCallback((_member: MemberWithRoles) => {}, []);
  const handleAddFriendCb = useCallback((_member: MemberWithRoles) => {}, []);
  const handleEditServerProfileCb = useCallback(() => setServerProfileEditOpen(true), []);
  const { isGod, hasPermission } = usePermissions(serverId);
  const canKick = isGod || hasPermission('kick_members');
  const canBan = isGod || hasPermission('ban_members');
  const [moderation, setModeration] = useState<{ mode: 'kick' | 'ban'; target: { id: string; name: string } } | null>(null);
  const handleKickCb = useCallback((target: { id: string; name: string }) => setModeration({ mode: 'kick', target }), []);
  const handleBanCb = useCallback((target: { id: string; name: string }) => setModeration({ mode: 'ban', target }), []);
  const handleSetSecondOwnerCb = useCallback(
    (target: { id: string; name: string }) => setAddSecondOwnerTarget(target),
    [],
  );
  const handleRemoveSecondOwnerCb = useCallback(
    (target: { id: string; name: string }) => setRemoveSecondOwnerTarget(target),
    [],
  );

  const handleCopyId = handleCopyIdCb;

  // Get displayable roles for filter (non-default roles)
  const filterableRoles = allRoles.filter((r) => !r.is_default);
  return (
    <>
      <div
        ref={ref}
        className={cn(
          // 264px et meme fond que le chat, comme sur la capture. Le filet
          // gauche ne commence que SOUS la rangee de recherche : celle-ci
          // prolonge l'en-tete du salon sur toute la largeur.
          "w-full sm:w-[264px] bg-background flex flex-col",
          fillHeight && "h-full",
          className
        )}
      >
        {/* Rangee de recherche : 48px, filet bas aligne sur celui de
            l'en-tete du salon. Champ de 32px, fond #2e2f35, bordure 1px,
            rayon 8px, "Rechercher <serveur>", loupe a droite. */}
        <div className="h-12 px-3 flex items-center gap-3 flex-shrink-0 w-full border-b border-border">
          <button
            type="button"
            onClick={() => onOpenGlobalSearch?.()}
            className="flex-1 min-w-0 h-8 pl-2.5 pr-2 flex items-center gap-2 rounded-lg bg-[hsl(var(--search-background))] border border-white/[0.06] text-left cursor-text"
          >
            <span className="flex-1 truncate text-sm text-[hsl(var(--header-icon))]">
              {server?.name ? `Rechercher ${server.name}` : "Rechercher"}
            </span>
            <Search className="w-[18px] h-[18px] shrink-0 text-[hsl(var(--icon-default))]" />
          </button>
          {!isDesktopApp && <InboxButton variant="header" />}
        </div>
        <div className="flex-1 min-h-0 flex flex-col sm:border-l sm:border-border">
        {selectedRoleFilters.length > 0 && (
          <div className="px-2 pt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Filtré par</span>
            {selectedRoleFilters.map((rid) => {
              const r = allRoles.find((rr) => rr.id === rid);
              if (!r) return null;
              return (
                <button type="button"
                  key={rid}
                  onClick={() => handleRoleFilterToggle(rid)}
                  className="inline-flex items-center gap-1 h-5 px-1.5 rounded text-[11px] font-medium bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                  style={{ color: r.color || undefined }}
                >
                  @{r.name}
                  <XIcon className="w-3 h-3" />
                </button>
              );
            })}
            <button type="button"
              onClick={clearRoleFilters}
              className="text-[11px] text-muted-foreground hover:text-foreground ml-1"
            >
              Tout effacer
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-2">
          {groupedMembers.map((group, index) => (
            <div key={group.role?.id || (group.isOffline ? "offline" : "online")}>
              <h3 className="px-2 pt-[21px] pb-1.5 text-sm font-medium leading-4 flex items-center gap-1.5 text-muted-foreground">
                {group.role?.icon_url && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-default">
                        {group.role.icon_url.startsWith("http") ? (
                          <img
                            src={group.role.icon_url}
                            alt=""
                            className="w-4 h-4 object-contain"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        ) : (
                          <span className="text-base">{group.role.icon_url}</span>
                        )}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-popover border-none px-2 py-1">
                      <p className="text-white text-xs font-medium">{group.role.name}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <span>
                  {group.isOffline ? "Hors ligne" : group.role?.name || "En ligne"}
                </span>
                <span> — {group.members.length}</span>
              </h3>
              <div className="space-y-0">
                {group.members.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    isOwner={member.id === ownerId}
                    isSecondaryOwner={member.id === server?.secondary_owner_id}
                    memberId={memberIdByUserId.get(member.id)}
                    roles={allRoles}
                    serverId={serverId}
                    currentUserId={currentUser?.id}
                    ownerId={ownerId}
                    inVoice={voiceUserIds.has(member.id)}
                    canManageRoles={canManageRoles}
                    onOpenProfile={handleOpenProfile}
                    onSendMessage={handleSendMessageCb}
                    onAddFriend={handleAddFriendCb}
                    onCopyId={handleCopyId}
                    onEditServerProfile={handleEditServerProfileCb}
                    onSetSecondOwner={handleSetSecondOwnerCb}
                    onRemoveSecondOwner={handleRemoveSecondOwnerCb}
                    canKick={canKick}
                    canBan={canBan}
                    onKick={handleKickCb}
                    onBan={handleBanCb}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>

      {serverId && <KickBanDialog target={moderation?.target ?? null} mode={moderation?.mode ?? 'kick'} serverId={serverId} onClose={() => setModeration(null)} />}
      <UserProfilePopup
        user={selectedMember}
        open={!!selectedMember}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMember(null);
          }
        }}
        roles={selectedMember?.roles}
        onOpenDM={onOpenDM}
        serverId={serverId}
        ownerId={ownerId}
        secondaryOwnerId={server?.secondary_owner_id}
        memberId={selectedMember?.memberId}
        canManageRoles={canManageRoles}
        mode={window.innerWidth < 640 ? "dialog" : "card"}
        cardPosition={{
          top: 60,
          right: 280,
        }}
      />

      <ServerProfileEditModal
        open={serverProfileEditOpen}
        onOpenChange={setServerProfileEditOpen}
        initialServerId={serverId}
      />

      <AlertDialog
        open={!!addSecondOwnerTarget}
        onOpenChange={() => setAddSecondOwnerTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Définir {addSecondOwnerTarget?.name} comme second propriétaire ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ce membre aura les mêmes droits que vous sur ce serveur. Vous seul pourrez retirer ce statut.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!addSecondOwnerTarget || !serverId) return;
                setSecondaryOwner.mutate(
                  { serverId, userId: addSecondOwnerTarget.id },
                  { onSuccess: () => setAddSecondOwnerTarget(null) }
                );
              }}
              disabled={setSecondaryOwner.isPending}
            >
              {setSecondaryOwner.isPending ? 'Confirmation...' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!removeSecondOwnerTarget}
        onOpenChange={() => setRemoveSecondOwnerTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Retirer {removeSecondOwnerTarget?.name} de la position de second propriétaire ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ce membre perdra immédiatement tous les droits liés à ce statut.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (!serverId) return;
                removeSecondaryOwner.mutate(serverId, {
                  onSuccess: () => setRemoveSecondOwnerTarget(null),
                });
              }}
              disabled={removeSecondaryOwner.isPending}
            >
              {removeSecondaryOwner.isPending ? 'Retrait...' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
