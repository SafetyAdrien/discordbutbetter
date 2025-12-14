import { useState } from 'react';
import { User } from '@/types/app';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { MessageSquare, UserPlus, Check, Loader2, Calendar, UserCheck, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateDMConversation } from '@/hooks/useDMs';
import { useSendFriendRequest, useFriends } from '@/hooks/useFriends';
import { useServerRoles, useAssignRoleToMember, useRemoveRoleFromMember, RoleWithPermissions } from '@/hooks/useRoles';
import * as Portal from '@radix-ui/react-portal';

interface Role {
  id: string;
  name: string;
  color: string | null;
  icon_url?: string | null;
  position: number | null;
}

interface UserProfilePopupProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles?: Role[];
  onOpenDM?: (conversationId: string) => void;
  serverId?: string;
  ownerId?: string;
  memberId?: string;
  canManageRoles?: boolean;
  mode?: 'dialog' | 'card';
  cardPosition?: { top: number; right: number };
}

const statusColors = {
  online: 'bg-status-online',
  idle: 'bg-status-idle',
  dnd: 'bg-status-dnd',
  offline: 'bg-status-offline',
};

const statusLabels = {
  online: 'En ligne',
  idle: 'Inactif',
  dnd: 'Ne pas déranger',
  offline: 'Hors ligne',
};

function formatMemberSince(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
}

function RoleIcon({ role }: { role: RoleWithPermissions | Role }) {
  if ('icon_url' in role && role.icon_url) {
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

export function UserProfilePopup({ 
  user, 
  open, 
  onOpenChange, 
  roles, 
  onOpenDM,
  serverId,
  ownerId,
  memberId,
  canManageRoles = false,
  mode = 'dialog',
  cardPosition,
}: UserProfilePopupProps) {
  const { user: currentUser } = useAuth();
  const { mutate: createDM, isPending: isCreatingDM } = useCreateDMConversation();
  const { mutate: sendFriendRequest, isPending: isSendingRequest } = useSendFriendRequest();
  const { data: friends } = useFriends();
  const { data: allRoles = [] } = useServerRoles(serverId || null);
  const assignRole = useAssignRoleToMember();
  const removeRole = useRemoveRoleFromMember();
  const [dmCreated, setDmCreated] = useState(false);

  if (!user) return null;

  const isOwnProfile = currentUser?.id === user.id;
  
  const friendship = friends?.find(
    f => (f.profile?.id === user.id)
  );
  const isFriend = friendship?.status === 'accepted';
  const isPending = friendship?.status === 'pending';

  const userRoleIds = roles?.map(r => r.id) || [];

  const handleSendMessage = () => {
    createDM(user.id, {
      onSuccess: (data) => {
        setDmCreated(true);
        if (onOpenDM) {
          onOpenDM(data.conversation_id);
          onOpenChange(false);
        }
        setTimeout(() => setDmCreated(false), 2000);
      },
    });
  };

  const handleAddFriend = () => {
    sendFriendRequest(user.username);
  };

  const handleRoleToggle = (roleId: string, checked: boolean) => {
    if (!serverId || !memberId) return;
    
    if (checked) {
      assignRole.mutate({ memberId, roleId, serverId });
    } else {
      removeRole.mutate({ memberId, roleId, serverId });
    }
  };

  const displayRoles = roles
    ?.filter(role => role.name !== '@everyone')
    .sort((a, b) => (b.position ?? 0) - (a.position ?? 0));

  const assignableRoles = allRoles
    .filter(role => !role.is_default)
    .sort((a, b) => (b.position ?? 0) - (a.position ?? 0));

  const ProfileContent = () => (
    <>
      {/* Banner */}
      <div className="relative">
        {user.banner ? (
          <img 
            src={user.banner} 
            alt="Banner" 
            className="h-24 w-full object-cover" 
          />
        ) : (
          <div className="h-24 bg-[hsl(var(--primary))]" />
        )}
        
        {/* Quick Add Friend Icon */}
        {!isOwnProfile && !isFriend && !isPending && (
          <button
            onClick={handleAddFriend}
            disabled={isSendingRequest}
            className="absolute top-2 right-2 p-2 rounded-full bg-background/60 hover:bg-background/80 backdrop-blur-sm transition-colors disabled:opacity-50"
            title="Ajouter en ami"
          >
            {isSendingRequest ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Profile Content */}
      <div className="px-4 pb-4">
        {/* Avatar */}
        <div className="relative -mt-12 mb-3">
          <div className="relative inline-block">
            <Avatar className="w-20 h-20 border-4 border-card">
              <AvatarImage src={user.avatar} alt={user.displayName} />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                {user.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div
              className={cn(
                'absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-card',
                statusColors[user.status]
              )}
            />
          </div>
          {isFriend && !isOwnProfile && (
            <div className="absolute top-0 right-0">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[hsl(var(--online))]/20 text-[hsl(var(--online))] text-xs font-medium">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Ami</span>
              </div>
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="space-y-3">
          <div>
            <h3 className="text-xl font-bold text-foreground">{user.displayName}</h3>
            <p className="text-sm text-muted-foreground">@{user.username.toLowerCase()}</p>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <div className={cn('w-2.5 h-2.5 rounded-full', statusColors[user.status])} />
            <span className="text-muted-foreground">{statusLabels[user.status]}</span>
          </div>

          {user.customStatus && (
            <p className="text-sm text-foreground/80 italic">"{user.customStatus}"</p>
          )}

          {user.createdAt && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Membre depuis le {formatMemberSince(user.createdAt)}</span>
            </div>
          )}

          {displayRoles && displayRoles.length > 0 && (
            <>
              <div className="border-t border-border" />
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground tracking-wide mb-2">
                  Rôles
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {displayRoles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium"
                      style={{
                        backgroundColor: role.color ? `${role.color}20` : 'hsl(var(--muted))',
                        borderLeft: `3px solid ${role.color || 'hsl(var(--muted-foreground))'}`,
                        color: role.color || 'hsl(var(--foreground))',
                      }}
                    >
                      {role.icon_url ? (
                        role.icon_url.startsWith('http') ? (
                          <img src={role.icon_url} alt="" className="w-3 h-3 object-contain" />
                        ) : (
                          <span className="text-xs">{role.icon_url}</span>
                        )
                      ) : (
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: role.color || 'hsl(var(--muted-foreground))' }}
                        />
                      )}
                      {role.name}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {canManageRoles && !isOwnProfile && serverId && memberId && assignableRoles.length > 0 && (
            <>
              <div className="border-t border-border" />
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground tracking-wide mb-2 flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5" />
                  Gérer les rôles
                </h4>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {assignableRoles.map((role) => (
                    <div key={role.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={userRoleIds.includes(role.id)}
                        onCheckedChange={(checked) => handleRoleToggle(role.id, !!checked)}
                        disabled={assignRole.isPending || removeRole.isPending}
                      />
                      <Label 
                        htmlFor={`role-${role.id}`} 
                        className="flex items-center gap-1.5 cursor-pointer text-sm"
                      >
                        <RoleIcon role={role} />
                        <span style={{ color: role.color || undefined }}>{role.name}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="border-t border-border" />

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground tracking-wide mb-1">
              À Propos de Moi
            </h4>
            <p className={cn(
              "text-sm",
              user.bio ? "text-foreground/90" : "text-muted-foreground/50"
            )}>
              {user.bio || 'Aucune biographie définie.'}
            </p>
          </div>

          {!isOwnProfile && (
            <>
              <div className="border-t border-border" />
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={handleSendMessage}
                  disabled={isCreatingDM || dmCreated}
                >
                  {isCreatingDM ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : dmCreated ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <MessageSquare className="w-4 h-4" />
                  )}
                  {dmCreated ? 'Ouvert' : 'Message'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={handleAddFriend}
                  disabled={isSendingRequest || isFriend || isPending}
                >
                  {isSendingRequest ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isFriend ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  {isFriend ? 'Ami' : isPending ? 'En attente' : 'Ajouter'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );

  // Mode Card - affichage en carte latérale
  if (mode === 'card' && open) {
    return (
      <Portal.Root>
        <div 
          className="fixed inset-0 z-50"
          onClick={() => onOpenChange(false)}
        >
          <div 
            className="absolute w-80 bg-card border border-border rounded-lg shadow-2xl overflow-hidden animate-slide-in-right"
            style={{ 
              top: cardPosition?.top ?? 100,
              right: cardPosition?.right ?? 280
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <ProfileContent />
          </div>
        </div>
      </Portal.Root>
    );
  }

  // Mode Dialog (comportement par défaut)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden max-w-sm bg-card border-border">
        <ProfileContent />
      </DialogContent>
    </Dialog>
  );
}