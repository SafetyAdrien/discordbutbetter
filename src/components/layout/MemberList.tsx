import { forwardRef, useState, useMemo } from 'react';
import { User } from '@/types/app';
import { cn } from '@/lib/utils';
import { MessageCircle, UserPlus, Hash, VolumeX, LogOut, Ban, User as UserIcon } from 'lucide-react';
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

    const sortedMembers = useMemo(() => {
      return [...members].sort((a, b) => a.displayName.localeCompare(b.displayName));
    }, [members]);

    const onlineMembers = sortedMembers.filter((m) => m.status !== 'offline');
    const offlineMembers = sortedMembers.filter((m) => m.status === 'offline');

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

    return (
      <>
        <div ref={ref} className="w-60 bg-card flex flex-col border-l border-border">
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
