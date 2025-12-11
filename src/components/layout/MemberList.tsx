import { forwardRef, useState } from 'react';
import { User } from '@/types/app';
import { cn } from '@/lib/utils';
import { Crown } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { UserProfilePopup } from '@/components/profile/UserProfilePopup';

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
    const onlineMembers = members.filter((m) => m.status !== 'offline');
    const offlineMembers = members.filter((m) => m.status === 'offline');

    const renderMember = (member: MemberWithRoles) => {
      const isOwner = member.id === ownerId;

      return (
        <button
          key={member.id}
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
                statusColors[member.status],
                member.status === 'online' && 'animate-pulse-ring'
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
      );
    };

    return (
      <>
        <div ref={ref} className="w-60 bg-card flex flex-col border-l border-border">
          <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
            {/* Online Members */}
            {onlineMembers.length > 0 && (
              <div className="mb-4">
                <h3 className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  En ligne — {onlineMembers.length}
                </h3>
                <div className="space-y-0.5">
                  {onlineMembers.map(renderMember)}
                </div>
              </div>
            )}

            {/* Offline Members */}
            {offlineMembers.length > 0 && (
              <div>
                <h3 className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Hors ligne — {offlineMembers.length}
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
