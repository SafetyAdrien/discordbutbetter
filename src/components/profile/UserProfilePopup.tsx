import { useState, useRef, forwardRef } from 'react';
import { User } from '@/types/app';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { MessageSquare, UserPlus, Check, Loader2, UserCheck, Clock, Gamepad2, Radio, Headphones, Eye, Swords, X, UserMinus, Ban, Pencil, Volume2, VolumeX, Plus, Sparkles, Shield, Star, Crown, Heart, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateDMConversation } from '@/hooks/useDMs';
import { useSendFriendRequest, useFriends } from '@/hooks/useFriends';
import { useServerRoles, RoleWithPermissions } from '@/hooks/useRoles';
import { useKickMember, useBanMember } from '@/hooks/useMemberActions';
import { MemberWithProfile, membersMutationLockRef } from '@/hooks/useMembers';
import { RoleCheckboxItem } from '@/components/profile/RoleCheckboxItem';
import { lockPermissionsMutation } from '@/hooks/usePermissionsRealtime';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { parseMarkdown, setMarkdownContext, getMarkdownContext } from '@/lib/markdown';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import { ServerProfileEditModal } from '@/components/profile/ServerProfileEditModal';
import { FullUserProfileModal } from '@/components/profile/FullUserProfileModal';
import { useVoice } from '@/contexts/VoiceContext';
import { useVoiceUserSettings } from '@/hooks/useVoiceUserSettings';

const BADGE_ICONS: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  staff: { icon: Shield, label: 'Équipe', color: '#5865F2' },
  partner: { icon: Star, label: 'Partenaire', color: '#5865F2' },
  hypesquad: { icon: Sparkles, label: 'HypeSquad', color: '#F47B67' },
  bug_hunter: { icon: Zap, label: 'Bug Hunter', color: '#3BA55C' },
  early_supporter: { icon: Heart, label: 'Soutien de la première heure', color: '#FF73FA' },
  owner: { icon: Crown, label: 'Propriétaire', color: '#FAA61A' },
};



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
  secondaryOwnerId?: string;
  memberId?: string;
  canManageRoles?: boolean;
  canKick?: boolean;
  canBan?: boolean;
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

const activityIcons: Record<string, React.ElementType> = {
  playing: Gamepad2,
  streaming: Radio,
  listening: Headphones,
  watching: Eye,
  competing: Swords,
};

const activityLabels: Record<string, string> = {
  playing: 'Joue à',
  streaming: 'Diffuse',
  listening: 'Écoute',
  watching: 'Regarde',
  competing: 'En compétition sur',
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
  secondaryOwnerId,
  memberId,
  canManageRoles = false,
  canKick = false,
  canBan = false,
  mode = 'dialog',
  cardPosition,
}: UserProfilePopupProps) {
  const { isMobile } = useBreakpoint();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { mutate: createDM, isPending: isCreatingDM } = useCreateDMConversation();
  const { mutate: sendFriendRequest, isPending: isSendingRequest } = useSendFriendRequest();
  const { data: friends } = useFriends();
  const { data: allRoles = [] } = useServerRoles(serverId || null);
  const kickMember = useKickMember();
  const banMember = useBanMember();
  const [dmCreated, setDmCreated] = useState(false);
  const [showRolePanel, setShowRolePanel] = useState(false);
  const [serverProfileEditOpen, setServerProfileEditOpen] = useState(false);
  const rolesSectionRef = useRef<HTMLDivElement>(null);
  const { voiceState } = useVoice();
  const { getUserVolume, setUserVolume } = useVoiceUserSettings();
  const [localVolume, setLocalVolume] = useState<number | null>(null);

  // Reactive roles from members cache — updates instantly on optimistic/realtime changes
  const { data: reactiveRoles } = useQuery<MemberWithProfile[], Error, Role[]>({
    queryKey: ["members", serverId],
    queryFn: () => Promise.resolve(queryClient.getQueryData<MemberWithProfile[]>(["members", serverId]) ?? []),
    select: (members) => {
      const member = members?.find((m) => m.id === memberId);
      return (member?.roles as Role[]) ?? [];
    },
    enabled: !!serverId && !!memberId,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  if (!user) return null;

  const isOwnProfile = currentUser?.id === user.id;
  const isInVoiceWithTarget = !isOwnProfile && !!voiceState.channelId && !!user;
  const targetVolume = user ? getUserVolume(user.id) : 100;
  const displayVolume = localVolume ?? targetVolume;
  
  const isTargetOwner = user.id === ownerId || user.id === secondaryOwnerId;
  
  // Can't kick/ban owners or yourself
  const showKickBan = !isOwnProfile && !isTargetOwner && serverId;
  
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

  const handleKick = () => {
    if (!serverId) return;
    kickMember.mutate(
      { serverId, userId: user.id },
      {
        onSuccess: () => {
          toast.success(`${user.displayName} a été expulsé du serveur`);
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error('Erreur lors de l\'expulsion');
          console.error(error);
        },
      }
    );
  };

  const handleBan = () => {
    if (!serverId) return;
    banMember.mutate(
      { serverId, userId: user.id },
      {
        onSuccess: () => {
          toast.success(`${user.displayName} a été banni du serveur`);
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error('Erreur lors du bannissement');
          console.error(error);
        },
      }
    );
  };

  const displayRoles = (reactiveRoles ?? roles ?? [])
    .filter(role => role.name !== '@everyone')
    .sort((a, b) => (b.position ?? 0) - (a.position ?? 0));

  const assignableRoles = allRoles
    .filter(role => !role.is_default)
    .sort((a, b) => (b.position ?? 0) - (a.position ?? 0));

  // Get banner style based on theme settings
  const getBannerStyle = () => {
    if (user.banner) {
      return { background: `url(${user.banner}) center/cover` };
    }
    if ((user as any).theme_gradient) {
      const [start, end] = (user as any).theme_gradient.split(',');
      return { background: `linear-gradient(135deg, ${start}, ${end})` };
    }
    if ((user as any).theme_color) {
      return { background: (user as any).theme_color };
    }
    return {};
  };

  const ActivityIcon = (user as any).activity_type ? activityIcons[(user as any).activity_type] : null;

  const ProfileContent = forwardRef<HTMLDivElement>((_, ref) => (
    <div ref={ref}>
      {/* Banner */}
      <div className="relative">
        <div 
          className="h-24 w-full bg-[hsl(var(--primary))]"
          style={getBannerStyle()}
        />
        
        {/* Header Actions - Message & Friend or Edit */}
        {isOwnProfile && serverId ? (
          <div className="absolute top-2 right-2 flex items-center gap-2">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setServerProfileEditOpen(true)}
                  className="p-1.5 text-white hover:scale-110 transition-transform drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                >
                  <Pencil className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Modifier le profil serveur</TooltipContent>
            </Tooltip>
          </div>
        ) : !isOwnProfile ? (
          <div className="absolute top-2 right-2 flex items-center gap-2">
            {/* Message Icon */}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={handleSendMessage}
                  disabled={isCreatingDM}
                  className="p-1.5 text-white hover:scale-110 transition-transform drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                >
                  {isCreatingDM ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : dmCreated ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <MessageSquare className="w-5 h-5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>{dmCreated ? 'Conversation ouverte' : 'Envoyer un message'}</TooltipContent>
            </Tooltip>

            {/* Friend Icon */}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={!isFriend && !isPending ? handleAddFriend : undefined}
                  disabled={isSendingRequest || isFriend}
                  className={cn(
                    "p-1.5 transition-transform drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]",
                    isFriend ? "text-[hsl(var(--online))]" : "text-white hover:scale-110",
                    !isFriend && !isPending && "cursor-pointer"
                  )}
                >
                  {isSendingRequest ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isFriend ? (
                    <UserCheck className="w-5 h-5" />
                  ) : isPending ? (
                    <Clock className="w-5 h-5" />
                  ) : (
                    <UserPlus className="w-5 h-5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {isFriend ? 'Ami' : isPending ? 'Demande en attente' : 'Ajouter en ami'}
              </TooltipContent>
            </Tooltip>
          </div>
        ) : null}
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
        </div>

        {/* User Info */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-foreground">{user.displayName}</h3>
              {/* Pronouns Badge */}
              {(user as any).pronouns && (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                      {(user as any).pronouns}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Pronoms de l'utilisateur</TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{user.username.toLowerCase()}</p>
          </div>

          {/* Activity / Rich Presence */}
          {(user as any).activity_type && (user as any).activity_text && ActivityIcon && (
            <div className="flex items-center gap-2 text-sm">
              <ActivityIcon className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">
                {activityLabels[(user as any).activity_type]}
              </span>
              <span className="font-medium text-foreground">
                {(user as any).activity_type === 'streaming' ? (
                  <a href={(user as any).activity_text} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {(user as any).activity_text}
                  </a>
                ) : (
                  (user as any).activity_text
                )}
              </span>
            </div>
          )}

          {user.customStatus && (
            <p className="text-sm text-foreground/80 italic">"{user.customStatus}"</p>
          )}

          {user.createdAt && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Membre depuis le {formatMemberSince(user.createdAt)}</span>
            </div>
          )}

          {/* Afficher la section Rôles si l'utilisateur a des rôles OU si on peut les gérer */}
          {((displayRoles && displayRoles.length > 0) || (canManageRoles && serverId && memberId && assignableRoles.length > 0)) && (
            <>
              <div className="border-t border-border" />
              <div ref={rolesSectionRef}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-muted-foreground tracking-wide">
                    Rôles
                  </h4>
                  {canManageRoles && serverId && memberId && assignableRoles.length > 0 && (
                    <button
                      onClick={() => setShowRolePanel(true)}
                      className="text-xs text-primary hover:underline transition-colors"
                    >
                      Gérer les rôles
                    </button>
                  )}
                </div>
                {displayRoles && displayRoles.length > 0 ? (
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
                ) : (
                  <p className="text-xs text-muted-foreground/50">Aucun rôle assigné</p>
                )}
              </div>
            </>
          )}

          <div className="border-t border-border" />

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground tracking-wide mb-1">
              À Propos de Moi
            </h4>
            {user.bio ? (
              <div className="text-sm text-foreground/90 prose prose-invert prose-sm max-w-none">
                {(() => {
                  const prevCtx = getMarkdownContext();
                  setMarkdownContext({ ...prevCtx, variant: 'bio' });
                  const result = parseMarkdown(user.bio);
                  setMarkdownContext(prevCtx);
                  return result;
                })()}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/50">
                Aucune biographie définie.
              </p>
            )}
          </div>

          {/* Volume Slider — shown when in voice with this user */}
          {isInVoiceWithTarget && (
            <>
              <div className="border-t border-border" />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-muted-foreground tracking-wide flex items-center gap-1.5">
                    {displayVolume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    Volume utilisateur
                  </h4>
                  <span className="text-xs text-muted-foreground">{displayVolume}%</span>
                </div>
                <Slider
                  value={[displayVolume]}
                  max={200}
                  step={5}
                  onValueChange={(v) => setLocalVolume(v[0])}
                  onValueCommit={(v) => {
                    setUserVolume.mutate({ targetUserId: user.id, volume: v[0] });
                    setLocalVolume(null);
                  }}
                  className="w-full"
                />
                {displayVolume > 100 && (
                  <p className="text-xs text-orange-400 mt-1">Volume amplifié au-delà de 100%</p>
                )}
              </div>
            </>
          )}

          {showKickBan && (canKick || canBan) && (
            <>
              <div className="border-t border-border" />
              <div className="flex gap-2">
                {canKick && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-orange-500 border-orange-500/30 hover:bg-orange-500/10"
                    onClick={handleKick}
                    disabled={kickMember.isPending}
                  >
                    <UserMinus className="w-4 h-4 mr-2" />
                    Expulser
                  </Button>
                )}
                {canBan && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={handleBan}
                    disabled={banMember.isPending}
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Bannir
                  </Button>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  ));
  ProfileContent.displayName = 'ProfileContent';

  // Role Management Side Panel Component
  const RoleSidePanel = () => {
    // Calculer l'offset vertical pour aligner avec la section Rôles
    const topOffset = rolesSectionRef.current?.offsetTop ?? 0;
    
    return (
      <div 
        className="absolute right-full mr-2 w-64 bg-card border border-border rounded-lg shadow-2xl overflow-hidden animate-slide-in-left"
        style={{ top: topOffset }}
        onClick={(e) => e.stopPropagation()}
      >
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h4 className="font-semibold text-sm">Gérer les rôles</h4>
        <button 
          onClick={() => setShowRolePanel(false)} 
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <ScrollArea className="max-h-[300px]">
          <div className="p-2 space-y-1">
            {serverId && memberId && assignableRoles.map((role) => (
              <RoleCheckboxItem
                key={role.id}
                role={role}
                serverId={serverId}
                memberId={memberId}
                userId={user.id}
              />
            ))}
          </div>
      </ScrollArea>
    </div>
  );
  };

  const serverProfileModal = (
    <ServerProfileEditModal
      open={serverProfileEditOpen}
      onOpenChange={setServerProfileEditOpen}
      initialServerId={serverId}
    />
  );

  // Mode Card - affichage en carte latérale
  if (mode === 'card' && open) {
    return (
      <>
        {createPortal(
          <div 
            className="fixed inset-0 z-50"
            onClick={() => { setShowRolePanel(false); onOpenChange(false); }}
          >
            <div 
              className="absolute flex items-start"
              style={{ 
                top: cardPosition?.top ?? 100,
                right: cardPosition?.right ?? 280
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Role Side Panel */}
              {showRolePanel && canManageRoles && serverId && memberId && assignableRoles.length > 0 && (
                <RoleSidePanel />
              )}
              
              {/* Main Profile Card */}
              <div className="relative w-80 bg-card border border-border rounded-lg shadow-2xl overflow-hidden animate-slide-in-right">
                <ProfileContent />
              </div>
            </div>
          </div>,
          document.body
        )}
        {serverProfileModal}
      </>
    );
  }

  // Mobile: Drawer from bottom
  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="p-0 overflow-hidden bg-card border-border max-h-[85vh]">
            <div className="overflow-y-auto">
              <ProfileContent />
            </div>
          </DrawerContent>
        </Drawer>
        {serverProfileModal}
      </>
    );
  }

  // Desktop: Dialog
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="p-0 overflow-hidden max-w-sm bg-card border-border">
          <ProfileContent />
        </DialogContent>
      </Dialog>
      {serverProfileModal}
    </>
  );
}