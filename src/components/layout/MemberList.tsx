import { forwardRef, useState, useMemo, useRef, useEffect } from "react";
import { User } from "@/types/app";
import { cn } from "@/lib/utils";
import { uuidToSnowflake } from "@/lib/snowflake";
import {
  MessageCircle,
  UserPlus,
  Hash,
  VolumeX,
  LogOut,
  Ban,
  User as UserIcon,
  Search,
  AtSign,
  FileText,
  Calendar,
  Pin,
  UserCircle,
  Gamepad2,
  Headphones,
  Eye,
  Trophy,
  Inbox,
} from "lucide-react";
import { StreamlineCrown } from "@/components/icons/StreamlineCrown";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { InboxPanel } from "@/components/inbox/InboxPanel";
import { DiscordInbox } from '@/components/icons/DiscordInbox';
import { useNotifications } from "@/hooks/useNotifications";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useServerRoles, RoleWithPermissions } from "@/hooks/useRoles";
import { Shield, Pencil } from "lucide-react";

import { useMembers } from "@/hooks/useMembers";
import { useAuth } from "@/contexts/AuthContext";
import { useServers } from "@/hooks/useServers";
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
  serverRoles?: Role[];
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

// Search filter prefixes
const searchFilters = [
  {
    prefix: "de:",
    label: "de la personne",
    icon: UserIcon,
  },
  {
    prefix: "mentions:",
    label: "mentionner quelqu'un",
    icon: AtSign,
  },
  {
    prefix: "contient:",
    label: "dispose de données spécifiques",
    icon: FileText,
  },
  {
    prefix: "dans:",
    label: "dans un salon spécifique",
    icon: Hash,
  },
  {
    prefix: "pendant:",
    label: "envoyé à une date",
    icon: Calendar,
  },
  {
    prefix: "avant:",
    label: "avant la date",
    icon: Calendar,
  },
  {
    prefix: "après:",
    label: "après la date",
    icon: Calendar,
  },
  {
    prefix: "épinglé:",
    label: "épinglé",
    icon: Pin,
  },
  {
    prefix: "auteur:",
    label: "par type d'auteur",
    icon: UserCircle,
  },
];

// Search Filters Component
function SearchFilters({
  onSelectFilter,
  searchQuery,
  isClosing,
  selectedIndex,
  onMouseEnterItem,
  availableFilters,
}: {
  onSelectFilter: (prefix: string) => void;
  searchQuery: string;
  isClosing: boolean;
  selectedIndex: number;
  onMouseEnterItem: (index: number) => void;
  availableFilters: typeof searchFilters;
}) {
  if (availableFilters.length === 0) return null;
  return (
    <div
      className={cn(
        "absolute top-full -left-32 right-0 z-50 w-[calc(100%+8rem)] bg-card border border-border rounded-lg shadow-xl p-2 mt-1",
        isClosing ? "animate-slide-up" : "animate-slide-down",
      )}
    >
      <p className="text-xs font-medium text-muted-foreground px-2 mb-2">Options de recherche</p>
      {availableFilters.map((filter, index) => {
        const Icon = filter.icon;
        const isSelected = index === selectedIndex;
        return (
          <button
            key={filter.prefix}
            onClick={() => onSelectFilter(filter.prefix)}
            onMouseEnter={() => onMouseEnterItem(index)}
            className={cn(
              "flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm text-left transition-colors",
              isSelected ? "bg-muted" : "hover:bg-muted",
            )}
          >
            <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-primary font-medium min-w-[80px]">{filter.prefix}</span>
            <span className="text-muted-foreground/70 truncate">{filter.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Role Icon Component
function RoleIcon({ role }: { role: Role | RoleWithPermissions }) {
  if (role.icon_url) {
    if (!role.icon_url.startsWith("http")) {
      return <span className="text-xs">{role.icon_url}</span>;
    }
    return <img src={role.icon_url} alt="" className="w-3 h-3 object-contain" />;
  }
  return (
    <div
      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
      style={{
        backgroundColor: role.color || "#99AAB5",
      }}
    />
  );
}

// Inbox Button Component
function InboxButton() {
  const { data: notifications = [] } = useNotifications();
  const unreadCount = notifications.filter(n => n.status === 'pending').length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-1.5 rounded hover:bg-surface-hover transition-colors text-muted-foreground hover:text-foreground">
          <DiscordInbox className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        side="left" 
        align="start" 
        className="w-96 max-h-[500px] p-0 overflow-hidden"
        sideOffset={8}
      >
        <InboxPanel />
      </PopoverContent>
    </Popover>
  );
}

export const MemberList = forwardRef<HTMLDivElement, MemberListProps>(function MemberList(
  { members, ownerId, serverId, onOpenDM, serverRoles = [] },
  ref,
) {
  const { user: currentUser } = useAuth();
  const [selectedMember, setSelectedMember] = useState<MemberWithRoles | null>(null);
  const [serverProfileEditOpen, setServerProfileEditOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [isClosingFilters, setIsClosingFilters] = useState(false);
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
  const [filterSelectedIndex, setFilterSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  // Calculate available filters based on search query
  const availableFilters = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    // If query already has a prefix, don't show suggestions
    if (searchFilters.some((f) => lowerQuery.startsWith(f.prefix))) {
      return [];
    }
    // If typing, filter suggestions that match
    if (lowerQuery.trim()) {
      return searchFilters.filter(
        (f) => f.prefix.toLowerCase().includes(lowerQuery) || f.label.toLowerCase().includes(lowerQuery),
      );
    }
    return searchFilters;
  }, [searchQuery]);

  // Reset selected index when filters change or dropdown opens
  useEffect(() => {
    setFilterSelectedIndex(0);
  }, [searchQuery, showFilters]);

  // Re-hydrate role filters when changing server (component may not unmount)
  useEffect(() => {
    setSelectedRoleFiltersRaw(getPersistedRoleFilter(serverId));
  }, [serverId]);
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showFilters || availableFilters.length === 0) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFilterSelectedIndex((prev) => (prev + 1) % availableFilters.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setFilterSelectedIndex((prev) => (prev <= 0 ? availableFilters.length - 1 : prev - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (availableFilters[filterSelectedIndex]) {
          handleSelectFilter(availableFilters[filterSelectedIndex].prefix);
        }
        break;
      case "Tab":
        if (availableFilters.length > 0) {
          e.preventDefault();
          handleSelectFilter(availableFilters[filterSelectedIndex].prefix);
        }
        break;
    }
  };

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
  const handleSelectFilter = (prefix: string) => {
    setSearchQuery(prefix);
    setShowFilters(false);
    searchRef.current?.focus();
  };
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

  // Parse search query for prefixes
  const parseSearchQuery = (query: string) => {
    const parsed: {
      prefix: string;
      value: string;
    }[] = [];
    let remaining = query;

    // Check for each known prefix
    for (const filter of searchFilters) {
      const regex = new RegExp(`${filter.prefix}(\\S+)`, "gi");
      const match = regex.exec(remaining);
      if (match) {
        parsed.push({
          prefix: filter.prefix,
          value: match[1],
        });
        remaining = remaining.replace(match[0], "").trim();
      }
    }
    return {
      parsed,
      freeText: remaining,
    };
  };
  const filteredMembers = useMemo(() => {
    let result = [...members];
    const { parsed, freeText } = parseSearchQuery(searchQuery);

    // Apply free text filter on name
    if (freeText.trim()) {
      const query = freeText.toLowerCase();
      result = result.filter(
        (m) => m.displayName.toLowerCase().includes(query) || m.username.toLowerCase().includes(query),
      );
    }

    // Apply prefix filters
    for (const { prefix, value } of parsed) {
      switch (prefix) {
        case "de:":
          result = result.filter(
            (m) =>
              m.displayName.toLowerCase().includes(value.toLowerCase()) ||
              m.username.toLowerCase().includes(value.toLowerCase()),
          );
          break;
        case "auteur:":
          // Filter by author type (e.g., bot, user)
          if (value.toLowerCase() === "bot") {
            result = result.filter((m) => m.username.toLowerCase().includes("bot"));
          }
          break;
      }
    }

    // Apply role filter
    if (selectedRoleFilters.length > 0) {
      result = result.filter((m) => m.roles?.some((role) => selectedRoleFilters.includes(role.id)));
    }

    // Sort by display name
    result.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return result;
  }, [members, searchQuery, selectedRoleFilters]);

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
  const handleCopyId = (id: string) => {
    copyToClipboard(uuidToSnowflake(id), "ID utilisateur copié");
  };
  const handleSendMessage = (member: MemberWithRoles) => {
    console.log("Send message to", member.id);
  };
  const handleAddFriend = (member: MemberWithRoles) => {
    console.log("Add friend", member.id);
  };

  // Get the member ID from membersData for role management
  const getMemberId = (userId: string): string | undefined => {
    const memberData = membersData.find((m) => m.user.id === userId);
    return memberData?.id;
  };
  const renderMember = (member: MemberWithRoles) => {
    const isOwner = member.id === ownerId;
    const isSecondaryOwner = member.id === server?.secondary_owner_id;
    const memberId = getMemberId(member.id);
    return (
      <ContextMenu key={member.id}>
        <ContextMenuTrigger asChild>
          <button
            onClick={() =>
              setSelectedMember({
                ...member,
                memberId,
              })
            }
            className="flex items-center gap-3 w-full px-2.5 py-1 rounded-2xl hover:bg-surface-hover/40 group"
            style={{ transition: 'all 300ms cubic-bezier(0.2, 0, 0, 1)' }}
          >
            <div className="relative flex-shrink-0">
              <Avatar className={cn("w-8 h-8", member.status === "offline" && "opacity-50 grayscale")}>
                <AvatarImage src={member.avatar} alt={member.displayName} />
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  {member.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <StatusIndicator
                status={member.status}
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-card"
              />
            </div>

            <div className="flex-1 min-w-0 text-left overflow-hidden">
              <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                <span
                  className={cn(
                    "text-sm font-medium truncate min-w-0",
                    member.status === "offline" && "opacity-60",
                  )}
                  style={{
                    color: member.roles?.[0]?.color || undefined,
                  }}
                >
                  {member.displayName}
                </span>
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
              {/* Activity or Custom Status */}
              {member.activity_type && member.activity_text ? (
                <div className="flex items-center gap-1 text-xs truncate">
                  {(() => {
                    const ActivityIcon = activityIcons[member.activity_type];
                    return ActivityIcon ? (
                      <ActivityIcon className={cn("w-3 h-3 flex-shrink-0", activityColors[member.activity_type])} />
                    ) : null;
                  })()}
                  <span
                    className={cn("flex-shrink-0", activityColors[member.activity_type] || "text-muted-foreground")}
                  >
                    {activityLabels[member.activity_type] || ""}
                  </span>
                  <span className="text-muted-foreground truncate">{member.activity_text}</span>
                </div>
              ) : member.customStatus ? (
                <p className="text-xs text-muted-foreground truncate">{member.customStatus}</p>
              ) : null}
            </div>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem
            onClick={() =>
              setSelectedMember({
                ...member,
                memberId,
              })
            }
          >
            <UserIcon className="w-4 h-4 mr-2" />
            Voir le profil
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleSendMessage(member)}>
            <MessageCircle className="w-4 h-4 mr-2" />
            Envoyer un message
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleAddFriend(member)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Ajouter en ami
          </ContextMenuItem>
          <ContextMenuSeparator />
          {currentUser && member.id === currentUser.id && (
            <ContextMenuItem onClick={() => setServerProfileEditOpen(true)}>
              <Pencil className="w-4 h-4 mr-2" />
              Modifier le profil serveur
            </ContextMenuItem>
          )}
          <ContextMenuItem onClick={() => handleCopyId(member.id)}>
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
                    <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Rôles</h4>
                  </div>
                  <ScrollArea className="max-h-[300px]">
                    <div className="p-2 space-y-1">
                      {allRoles
                        .filter((role) => !role.is_default)
                        .sort((a, b) => (b.position ?? 0) - (a.position ?? 0))
                        .map((role) => (
                          <RoleCheckboxItem
                            key={role.id}
                            role={role}
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
  };

  // Get displayable roles for filter (non-default roles)
  const filterableRoles = allRoles.filter((r) => !r.is_default);
  return (
    <>
      <div ref={ref} className="w-full sm:w-60 bg-surface-1 flex flex-col sm:border-l sm:border-border/30">
        {/* Search input and Inbox */}
        <div className="px-3 pt-3 bg-surface-1">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
              <Input
                ref={searchRef}
                placeholder="Rechercher"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => {
                  setIsClosingFilters(false);
                  setShowFilters(true);
                }}
                onBlur={() => {
                  setIsClosingFilters(true);
                  setTimeout(() => {
                    setShowFilters(false);
                    setIsClosingFilters(false);
                  }, 150);
                }}
                className="h-8 pl-8 text-sm bg-input"
              />
              {/* Filters suggestions - overlay dropdown */}
              {showFilters && (
                <SearchFilters
                  onSelectFilter={handleSelectFilter}
                  searchQuery={searchQuery}
                  isClosing={isClosingFilters}
                  selectedIndex={filterSelectedIndex}
                  onMouseEnterItem={setFilterSelectedIndex}
                  availableFilters={availableFilters}
                />
              )}
            </div>
            <InboxButton />
          </div>
        </div>
        <Separator className="mt-3" />
        {selectedRoleFilters.length > 0 && (
          <div className="px-2 pt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Filtré par</span>
            {selectedRoleFilters.map((rid) => {
              const r = allRoles.find((rr) => rr.id === rid);
              if (!r) return null;
              return (
                <button
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
            <button
              onClick={clearRoleFilters}
              className="text-[11px] text-muted-foreground hover:text-foreground ml-1"
            >
              Tout effacer
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
          {groupedMembers.map((group, index) => (
            <div key={group.role?.id || (group.isOffline ? "offline" : "online")} className="mb-2">
              <h3 className="px-3 py-1.5 text-xs font-semibold capitalize tracking-wider flex items-center gap-1.5 text-muted-foreground">
                {group.role?.icon_url && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-default">
                        {group.role.icon_url.startsWith("http") ? (
                          <img src={group.role.icon_url} alt="" className="w-4 h-4 object-contain" />
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
                <span className="text-xs font-semibold text-muted-foreground capitalize tracking-wide">
                  {group.isOffline ? "Hors ligne" : group.role?.name || "En ligne"}
                </span>
                <span> — {group.members.length}</span>
              </h3>
              <div className="space-y-0">{group.members.map(renderMember)}</div>
            </div>
          ))}
        </div>
      </div>

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
    </>
  );
});
