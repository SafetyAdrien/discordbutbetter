import { useState } from 'react';
import { User } from '@/types/app';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquare, UserPlus, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateDMConversation } from '@/hooks/useDMs';
import { useSendFriendRequest, useFriends } from '@/hooks/useFriends';

interface Role {
  id: string;
  name: string;
  color: string | null;
  position: number | null;
}

interface UserProfilePopupProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles?: Role[];
  onOpenDM?: (conversationId: string) => void;
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

export function UserProfilePopup({ user, open, onOpenChange, roles, onOpenDM }: UserProfilePopupProps) {
  const { user: currentUser } = useAuth();
  const { mutate: createDM, isPending: isCreatingDM } = useCreateDMConversation();
  const { mutate: sendFriendRequest, isPending: isSendingRequest } = useSendFriendRequest();
  const { data: friends } = useFriends();
  const [dmCreated, setDmCreated] = useState(false);

  if (!user) return null;

  const isOwnProfile = currentUser?.id === user.id;
  
  const friendship = friends?.find(
    f => (f.profile?.id === user.id)
  );
  const isFriend = friendship?.status === 'accepted';
  const isPending = friendship?.status === 'pending';

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

  // Filter out @everyone role and sort by position
  const displayRoles = roles
    ?.filter(role => role.name !== '@everyone')
    .sort((a, b) => (b.position ?? 0) - (a.position ?? 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden max-w-sm bg-card border-border">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-br from-primary/60 via-glow-purple/40 to-glow-cyan/30" />

        {/* Profile Content */}
        <div className="px-4 pb-4">
          {/* Avatar - positioned to overlap banner */}
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
                  statusColors[user.status],
                  user.status === 'online' && 'animate-pulse-ring'
                )}
              />
            </div>
          </div>

          {/* User Info */}
          <div className="space-y-3">
            <div>
              <h3 className="text-xl font-bold text-foreground">{user.displayName}</h3>
              <p className="text-sm text-muted-foreground">@{user.username.toLowerCase()}</p>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 text-sm">
              <div className={cn('w-2.5 h-2.5 rounded-full', statusColors[user.status])} />
              <span className="text-muted-foreground">{statusLabels[user.status]}</span>
            </div>

            {/* Custom Status */}
            {user.customStatus && (
              <p className="text-sm text-foreground/80 italic">"{user.customStatus}"</p>
            )}

            {/* Roles */}
            {displayRoles && displayRoles.length > 0 && (
              <>
                <div className="border-t border-border" />
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
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
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: role.color || 'hsl(var(--muted-foreground))' }}
                        />
                        {role.name}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Bio Section */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                À propos de moi
              </h4>
              <p className="text-sm text-foreground/90">
                {user.bio || 'Aucune biographie définie.'}
              </p>
            </div>

            {/* Action Buttons - Hide for own profile */}
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
      </DialogContent>
    </Dialog>
  );
}
