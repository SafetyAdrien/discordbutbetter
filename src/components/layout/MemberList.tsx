import { forwardRef, useState, useMemo, useRef } from 'react';
import { User } from '@/types/app';
import { cn } from '@/lib/utils';
import { MessageCircle, UserPlus, Hash, VolumeX, LogOut, Ban, User as UserIcon, Search, AtSign, FileText, Calendar, Pin, UserCircle } from 'lucide-react';
import { StreamlineCrown } from '@/components/icons/StreamlineCrown';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { UserProfilePopup } from '@/components/profile/UserProfilePopup';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { copyToClipboard } from '@/lib/clipboard';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useServerRoles, RoleWithPermissions } from '@/hooks/useRoles';
import { useMembers } from '@/hooks/useMembers';
import { useAuth } from '@/contexts/AuthContext';
import { useServers } from '@/hooks/useServers';

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
}

interface MemberListProps {
  members: MemberWithRoles[];
  ownerId: string;
  serverId?: string;
  onOpenDM?: (conversationId: string) => void;
  serverRoles?: Role[];
}

const statusColors: Record<string, string> = {
  online: 'bg-[hsl(var(--online))]',
  idle: 'bg-[hsl(var(--idle))]',
  dnd: 'bg-[hsl(var(--dnd))]',
  offline: 'bg-[hsl(var(--offline))]',
};

// Search filter prefixes
const searchFilters = [
  { prefix: 'de:', label: 'de la personne', icon: UserIcon },
  { prefix: 'mentions:', label: 'mentionner quelqu\'un', icon: AtSign },
  { prefix: 'contient:', label: 'dispose de données spécifiques', icon: FileText },
  { prefix: 'dans:', label: 'dans un salon spécifique', icon: Hash },
  { prefix: 'pendant:', label: 'envoyé à une date', icon: Calendar },
  { prefix: 'avant:', label: 'avant la date', icon: Calendar },
  { prefix: 'après:', label: 'après la date', icon: Calendar },
  { prefix: 'épinglé:', label: 'épinglé', icon: Pin },
  { prefix: 'auteur:', label: 'par type d\'auteur', icon: UserCircle },
];

// Search Filters Component
function SearchFilters({ 
  onSelectFilter,
  searchQuery,
}: {
  onSelectFilter: (prefix: string) => void;
  searchQuery: string;
}) {
  // Filter suggestions based on current query
  const availableFilters = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    // If query already has a prefix, don't show suggestions
    if (searchFilters.some(f => lowerQuery.startsWith(f.prefix))) {
      return [];
    }
    // If typing, filter suggestions that match
    if (lowerQuery.trim()) {
      return searchFilters.filter(f => 
        f.prefix.toLowerCase().includes(lowerQuery) ||
        f.label.toLowerCase().includes(lowerQuery)
      );
    }
    return searchFilters;
  }, [searchQuery]);

  if (availableFilters.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 z-50 bg-card border border-border rounded-lg shadow-xl p-2 mt-1 animate-slide-down">
      <p className="text-xs font-medium text-muted-foreground px-2 mb-2">Options de recherche</p>
      {availableFilters.map(filter => {
        const Icon = filter.icon;
        return (
          <button
            key={filter.prefix}
            onClick={() => onSelectFilter(filter.prefix)}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted text-sm text-left transition-colors"
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
    if (!role.icon_url.startsWith('http')) {
      return <span className="text-xs">{role.icon_url}</span>;
    }
    return <img src={role.icon_url} alt="" className="w-3 h-3 object-contain" />;
  }

  return (
    <div
      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: role.color || '#99AAB5' }}
    />
  );
}

export const MemberList = forwardRef<HTMLDivElement, MemberListProps>(
  function MemberList({ members, ownerId, serverId, onOpenDM, serverRoles = [] }, ref) {
    const { user: currentUser } = useAuth();
    const [selectedMember, setSelectedMember] = useState<MemberWithRoles | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedRoleFilters, setSelectedRoleFilters] = useState<string[]>([]);
    const searchRef = useRef<HTMLInputElement>(null);

    // Fetch roles for filter and management
    const { data: allRoles = [] } = useServerRoles(serverId || null);
    const { data: membersData = [] } = useMembers(serverId || null);
    const { data: servers = [] } = useServers();
    
    // Get the server to check for secondary owner
    const server = servers.find(s => s.id === serverId);

    // Check if current user can manage roles
    const canManageRoles = useMemo(() => {
      if (!currentUser || !serverId) return false;
      
      // Owner can always manage
      if (currentUser.id === ownerId) return true;
      
      // Check if current user has administrator or manage_roles permission
      const currentMemberData = membersData.find(m => m.user.id === currentUser.id);
      if (!currentMemberData) return false;
      
      const userRoleIds = currentMemberData.roles?.map(r => r.id) || [];
      const userRoles = allRoles.filter(r => userRoleIds.includes(r.id));
      
      return userRoles.some(role => 
        role.permissions.includes('administrator') || 
        role.permissions.includes('manage_roles')
      );
    }, [currentUser, serverId, ownerId, membersData, allRoles]);

    const handleSelectFilter = (prefix: string) => {
      setSearchQuery(prefix);
      setShowFilters(false);
      searchRef.current?.focus();
    };

    const handleRoleFilterToggle = (roleId: string) => {
      setSelectedRoleFilters(prev => 
        prev.includes(roleId) 
          ? prev.filter(id => id !== roleId)
          : [...prev, roleId]
      );
    };

    const clearRoleFilters = () => {
      setSelectedRoleFilters([]);
    };

    // Parse search query for prefixes
    const parseSearchQuery = (query: string) => {
      const parsed: { prefix: string; value: string }[] = [];
      let remaining = query;
      
      // Check for each known prefix
      for (const filter of searchFilters) {
        const regex = new RegExp(`${filter.prefix}(\\S+)`, 'gi');
        const match = regex.exec(remaining);
        if (match) {
          parsed.push({ prefix: filter.prefix, value: match[1] });
          remaining = remaining.replace(match[0], '').trim();
        }
      }
      
      return { parsed, freeText: remaining };
    };

    const filteredMembers = useMemo(() => {
      let result = [...members];
      
      const { parsed, freeText } = parseSearchQuery(searchQuery);
      
      // Apply free text filter on name
      if (freeText.trim()) {
        const query = freeText.toLowerCase();
        result = result.filter(m => 
          m.displayName.toLowerCase().includes(query) ||
          m.username.toLowerCase().includes(query)
        );
      }
      
      // Apply prefix filters
      for (const { prefix, value } of parsed) {
        switch (prefix) {
          case 'de:':
            result = result.filter(m => 
              m.displayName.toLowerCase().includes(value.toLowerCase()) ||
              m.username.toLowerCase().includes(value.toLowerCase())
            );
            break;
          case 'auteur:':
            // Filter by author type (e.g., bot, user)
            if (value.toLowerCase() === 'bot') {
              result = result.filter(m => m.username.toLowerCase().includes('bot'));
            }
            break;
        }
      }
      
      // Apply role filter
      if (selectedRoleFilters.length > 0) {
        result = result.filter(m => 
          m.roles?.some(role => selectedRoleFilters.includes(role.id))
        );
      }
      
      // Sort by display name
      result.sort((a, b) => a.displayName.localeCompare(b.displayName));
      
      return result;
    }, [members, searchQuery, selectedRoleFilters]);

    const onlineMembers = filteredMembers.filter((m) => m.status !== 'offline');
    const offlineMembers = filteredMembers.filter((m) => m.status === 'offline');

    const handleCopyId = (id: string) => {
      copyToClipboard(id, 'ID utilisateur copié');
    };

    const handleSendMessage = (member: MemberWithRoles) => {
      console.log('Send message to', member.id);
    };

    const handleAddFriend = (member: MemberWithRoles) => {
      console.log('Add friend', member.id);
    };

    // Get the member ID from membersData for role management
    const getMemberId = (userId: string): string | undefined => {
      const memberData = membersData.find(m => m.user.id === userId);
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
              onClick={() => setSelectedMember({ ...member, memberId })}
              className="flex items-center gap-3 w-full px-2 py-1.5 rounded-md hover:bg-surface-hover transition-colors group"
            >
              <div className="relative flex-shrink-0">
                <Avatar className={cn('w-8 h-8', member.status === 'offline' && 'opacity-50 grayscale')}>
                  <AvatarImage src={member.avatar} alt={member.displayName} />
                  <AvatarFallback className="bg-primary/20 text-primary text-sm">
                    {member.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card',
                    statusColors[member.status]
                  )}
                />
              </div>

              <div className="flex-1 min-w-0 text-left overflow-hidden">
                <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                  <span
                    className={cn(
                      'text-sm font-medium truncate block flex-1 min-w-0',
                      member.status === 'offline' ? 'text-muted-foreground' : 'text-foreground'
                    )}
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
                        <p>{isOwner ? 'Propriétaire du serveur' : 'Second Propriétaire'}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                {member.customStatus && (
                  <p className="text-xs text-muted-foreground truncate">
                    {member.customStatus}
                  </p>
                )}
              </div>
            </button>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-48">
            <ContextMenuItem onClick={() => setSelectedMember({ ...member, memberId })}>
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
            <ContextMenuItem onClick={() => handleCopyId(member.id)}>
              <Hash className="w-4 h-4 mr-2" />
              Copier l'ID
            </ContextMenuItem>
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
    const filterableRoles = allRoles.filter(r => !r.is_default);

    return (
      <>
        <div ref={ref} className="w-60 bg-card flex flex-col border-l border-border">
          {/* Search input */}
          <div className="px-3 pt-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
              <Input 
                ref={searchRef}
                placeholder="Rechercher"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowFilters(true)}
                onBlur={() => setTimeout(() => setShowFilters(false), 150)}
                className="h-8 pl-8 text-sm bg-input"
              />
              {/* Filters suggestions - overlay dropdown */}
              {showFilters && (
                <SearchFilters
                  onSelectFilter={handleSelectFilter}
                  searchQuery={searchQuery}
                />
              )}
            </div>
          </div>
          <Separator className="mt-3" />
          <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
            {/* Online Members */}
            {onlineMembers.length > 0 && (
              <div className="mb-4">
                <h3 className="px-2 py-1 text-xs font-semibold text-muted-foreground tracking-wide">
                  En Ligne — {onlineMembers.length}
                </h3>
                <div className="space-y-0.5">
                  {onlineMembers.map(renderMember)}
                </div>
              </div>
            )}

            {/* Offline Members */}
            {offlineMembers.length > 0 && (
              <div>
                <h3 className="px-2 py-1 text-xs font-semibold text-muted-foreground tracking-wide">
                  Hors Ligne — {offlineMembers.length}
                </h3>
                <div className="space-y-0.5">
                  {offlineMembers.map(renderMember)}
                </div>
              </div>
            )}
          </div>
        </div>

        <UserProfilePopup
          user={selectedMember}
          open={!!selectedMember}
          onOpenChange={(open) => !open && setSelectedMember(null)}
          roles={selectedMember?.roles}
          onOpenDM={onOpenDM}
          serverId={serverId}
          ownerId={ownerId}
          memberId={selectedMember?.memberId}
          canManageRoles={canManageRoles}
          mode="card"
          cardPosition={{ top: 60, right: 280 }}
        />
      </>
    );
  }
);
