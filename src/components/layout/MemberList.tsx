import { User } from '@/types/app';
import { cn } from '@/lib/utils';
import { Crown, Shield, Headphones, Mic } from 'lucide-react';

interface MemberListProps {
  members: User[];
  ownerId: string;
}

const statusColors = {
  online: 'bg-status-online',
  idle: 'bg-status-idle',
  dnd: 'bg-status-dnd',
  offline: 'bg-status-offline',
};

export function MemberList({ members, ownerId }: MemberListProps) {
  const onlineMembers = members.filter((m) => m.status !== 'offline');
  const offlineMembers = members.filter((m) => m.status === 'offline');

  const renderMember = (member: User) => {
    const isOwner = member.id === ownerId;

    return (
      <button
        key={member.id}
        className="flex items-center gap-3 w-full px-2 py-1.5 rounded-md hover:bg-surface-hover transition-colors group"
      >
        <div className="relative flex-shrink-0">
          <img
            src={member.avatar}
            alt={member.displayName}
            className={cn(
              'w-8 h-8 rounded-full',
              member.status === 'offline' && 'opacity-50 grayscale'
            )}
          />
          <div
            className={cn(
              'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card',
              statusColors[member.status]
            )}
          />
        </div>

        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1">
            <span
              className={cn(
                'text-sm font-medium truncate',
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
    <div className="w-60 bg-card flex flex-col border-l border-border">
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
  );
}
