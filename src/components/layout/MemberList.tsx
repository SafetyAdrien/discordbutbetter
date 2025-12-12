import { forwardRef, useState, useMemo, useRef, useEffect } from 'react';
import { User } from '@/types/app';
import { cn } from '@/lib/utils';
import { Crown, MessageCircle, UserPlus, Hash, VolumeX, LogOut, Ban, User as UserIcon, Search, X, ChevronDown } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { UserProfilePopup } from '@/components/profile/UserProfilePopup';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { copyToClipboard } from '@/lib/clipboard';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

interface Role {
  id: string;
  name: string;
  color: string | null;
  position: number | null;
}

interface MemberWithRoles extends User {
  roles?: Role[];
}

interface MemberListProps {
  members: MemberWithRoles[];
  ownerId: string;
  onOpenDM?: (conversationId: string) => void;
  serverRoles?: Role[];
}

const statusColors: Record<string, string> = {
  online: 'bg-[hsl(var(--online))]',
  idle: 'bg-[hsl(var(--idle))]',
  dnd: 'bg-[hsl(var(--dnd))]',
  offline: 'bg-[hsl(var(--offline))]',
};

const statusLabels: Record<string, string> = {
  online: 'En ligne',
  idle: 'Inactif',
  dnd: 'Ne pas déranger',
  offline: 'Hors ligne',
};

// Search Filters Component
function SearchFilters({ 
  selectedStatuses, 
  selectedRoles,
  sortBy,
  onStatusChange,
  onRoleChange,
  onSortChange,
  onClear,
  roles,
}: {
  selectedStatuses: string[];
  selectedRoles: string[];
  sortBy: string;
  onStatusChange: (status: string) => void;
  onRoleChange: (roleId: string) => void;
  onSortChange: (sort: string) => void;
  onClear: () => void;
  roles: Role[];
}) {
  const hasFilters = selectedStatuses.length > 0 || selectedRoles.length > 0 || sortBy !== 'name-asc';

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 mt-2 animate-fade-in">
      {/* Status Filter */}
      <div className="mb-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Statut</p>
        <div className="flex flex-wrap gap-1">
          {['online', 'idle', 'dnd', 'offline'].map(status => (
            <button
              key={status}
              onClick={() => onStatusChange(status)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-colors",
                selectedStatuses.includes(status) 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              <div className={cn('w-2 h-2 rounded-full', statusColors[status])} />
              {statusLabels[status]}
            </button>
          ))}
        </div>
      </div>

      {/* Roles Filter */}
      {roles.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Rôles</p>
          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
            {roles.map(role => (
              <button
                key={role.id}
                onClick={() => onRoleChange(role.id)}
                className={cn(
                  "px-2 py-1 rounded-full text-xs transition-colors border",
                  selectedRoles.includes(role.id) 
                    ? "ring-2 ring-primary border-primary" 
                    : "border-border hover:border-muted-foreground"
                )}
                style={{ 
                  backgroundColor: role.color ? `${role.color}20` : undefined, 
                  color: role.color || undefined 
                }}
              >
                {role.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sort By */}
      <div className="mb-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Trier par</p>
        <div className="flex gap-1">
          {[
            { value: 'name-asc', label: 'A-Z' },
            { value: 'name-desc', label: 'Z-A' },
          ].map(option => (
            <button
              key={option.value}
              onClick={() => onSortChange(option.value)}
              className={cn(
                "px-2 py-1 rounded text-xs transition-colors",
                sortBy === option.value 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      {hasFilters && (
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3 h-3" />
          Effacer les filtres
        </button>
      )}
    </div>
  );
}

export const MemberList = forwardRef<HTMLDivElement, MemberListProps>(
  function MemberList({ members, ownerId, onOpenDM, serverRoles = [] }, ref) {
    const [selectedMember, setSelectedMember] = useState<MemberWithRoles | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState('name-asc');
    const searchRef = useRef<HTMLInputElement>(null);

    const handleStatusChange = (status: string) => {
      setSelectedStatuses(prev => 
        prev.includes(status) 
          ? prev.filter(s => s !== status)
          : [...prev, status]
      );
    };

    const handleRoleChange = (roleId: string) => {
      setSelectedRoles(prev => 
        prev.includes(roleId) 
          ? prev.filter(r => r !== roleId)
          : [...prev, roleId]
      );
    };

    const handleSortChange = (sort: string) => {
      setSortBy(sort);
    };

    const handleClearFilters = () => {
      setSelectedStatuses([]);
      setSelectedRoles([]);
      setSortBy('name-asc');
    };

    const filteredMembers = useMemo(() => {
      let result = [...members];
      
      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        result = result.filter(m => 
          m.displayName.toLowerCase().includes(query) ||
          m.username.toLowerCase().includes(query)
        );
      }
      
      // Filter by status
      if (selectedStatuses.length > 0) {
        result = result.filter(m => selectedStatuses.includes(m.status));
      }
      
      // Filter by role
      if (selectedRoles.length > 0) {
        result = result.filter(m => 
          m.roles?.some(r => selectedRoles.includes(r.id))
        );
      }
      
      // Sort
      result.sort((a, b) => {
        switch (sortBy) {
          case 'name-asc': return a.displayName.localeCompare(b.displayName);
          case 'name-desc': return b.displayName.localeCompare(a.displayName);
          default: return 0;
        }
      });
      
      return result;
    }, [members, searchQuery, selectedStatuses, selectedRoles, sortBy]);

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

    const hasActiveFilters = selectedStatuses.length > 0 || selectedRoles.length > 0 || sortBy !== 'name-asc';

    const renderMember = (member: MemberWithRoles) => {
      const isOwner = member.id === ownerId;

      return (
        <ContextMenu key={member.id}>
          <ContextMenuTrigger asChild>
            <button
              onClick={() => setSelectedMember(member)}
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
                  {isOwner && (
                    <Crown className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
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
            <ContextMenuItem onClick={() => setSelectedMember(member)}>
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

    return (
      <>
        <div ref={ref} className="w-60 bg-card flex flex-col border-l border-border">
          {/* Search input with filters toggle */}
          <div className="px-3 pt-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                ref={searchRef}
                placeholder="Rechercher"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowFilters(true)}
                className="h-8 pl-8 pr-8 text-sm bg-input"
              />
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors",
                  showFilters || hasActiveFilters ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ChevronDown className={cn("w-4 h-4 transition-transform", showFilters && "rotate-180")} />
              </button>
            </div>
            
            {/* Filters embed */}
            {showFilters && (
              <SearchFilters
                selectedStatuses={selectedStatuses}
                selectedRoles={selectedRoles}
                sortBy={sortBy}
                onStatusChange={handleStatusChange}
                onRoleChange={handleRoleChange}
                onSortChange={handleSortChange}
                onClear={handleClearFilters}
                roles={serverRoles}
              />
            )}
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
        />
      </>
    );
  }
);
