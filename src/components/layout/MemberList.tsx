import { forwardRef, useState, useMemo } from 'react';
import { User } from '@/types/app';
import { cn } from '@/lib/utils';
import { Crown, MessageCircle, UserPlus, Hash, VolumeX, LogOut, Ban, User as UserIcon, Search } from 'lucide-react';
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
}

const statusColors = {
  online: 'bg-status-online',
  idle: 'bg-status-idle',
  dnd: 'bg-status-dnd',
  offline: 'bg-status-offline',
};

export const MemberList = forwardRef<HTMLDivElement, MemberListProps>(
  function MemberList({ members, ownerId, onOpenDM }, ref) {
    const [selectedMember, setSelectedMember] = useState<MemberWithRoles | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredMembers = useMemo(() => {
      if (!searchQuery.trim()) return members;
      const query = searchQuery.toLowerCase();
      return members.filter(m => 
        m.displayName.toLowerCase().includes(query) ||
        m.username.toLowerCase().includes(query)
      );
    }, [members, searchQuery]);

    const onlineMembers = filteredMembers.filter((m) => m.status !== 'offline');
    const offlineMembers = filteredMembers.filter((m) => m.status === 'offline');

    const handleCopyId = (id: string) => {
      copyToClipboard(id, 'ID utilisateur copié');
    };

    const handleSendMessage = (member: MemberWithRoles) => {
      // TODO: Create or get DM conversation
      console.log('Send message to', member.id);
    };

    const handleAddFriend = (member: MemberWithRoles) => {
      // TODO: Implement add friend
      console.log('Add friend', member.id);
    };

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
          {/* Search input */}
          <div className="px-[5px] pt-[5px]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Rechercher"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 pl-8 text-sm bg-input"
              />
            </div>
          </div>
          <Separator className="mt-2" />
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
