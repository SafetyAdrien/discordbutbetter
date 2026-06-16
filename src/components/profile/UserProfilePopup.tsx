import { useState, useRef, useEffect, forwardRef } from 'react';
import { User } from '@/types/app';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { useBreakpoint } from '@/hooks/useBreakpoint';

// Global trigger-rect registry: a single document-level mousedown listener
// captures the bounding rect of whatever element the user last clicked.
// The floating profile card uses this rect as its anchor.
let lastProfileTriggerRect: DOMRect | null = null;
if (typeof window !== 'undefined' && !(window as any).__profileTriggerListenerInstalled) {
  (window as any).__profileTriggerListenerInstalled = true;
  document.addEventListener(
    'mousedown',
    (e) => {
      const target = e.target as HTMLElement | null;
      if (target && typeof target.getBoundingClientRect === 'function') {
        lastProfileTriggerRect = target.getBoundingClientRect();
      } else {
        lastProfileTriggerRect = new DOMRect(e.clientX, e.clientY, 0, 0);
      }
    },
    true,
  );
}
export function rememberProfileTrigger(e: React.MouseEvent | MouseEvent) {
  const target = e.currentTarget as HTMLElement | null;
  if (target && typeof target.getBoundingClientRect === 'function') {
    lastProfileTriggerRect = target.getBoundingClientRect();
  }
}


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
import { useServerProfile } from '@/hooks/useServerProfile';

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
  const [fullBioOpen, setFullBioOpen] = useState(false);
  const [removingRoleId, setRemovingRoleId] = useState<string | null>(null);

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

  // Server profile override (Discord-style nickname/avatar/banner/bio per server)
  const { data: serverProfile } = useServerProfile(user?.id ?? null, serverId ?? null);

  if (!user) return null;

  // Apply server profile overrides on top of the global user when in a server context
  const effectiveUser: User = serverId && serverProfile
    ? {
        ...user,
        displayName: serverProfile.display_name || user.displayName,
        avatar: serverProfile.avatar_url || user.avatar,
        banner: serverProfile.banner_url || user.banner,
        bio: serverProfile.bio ?? user.bio,
        ...(serverProfile.pronouns ? { pronouns: serverProfile.pronouns } as any : {}),
      }
    : user;

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
    if (effectiveUser.banner) {
      return { background: `url(${effectiveUser.banner}) center/cover` };
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

  const userBadges: string[] = Array.isArray((user as any).badges) ? (user as any).badges : [];
  const bioText = effectiveUser.bio ?? '';
  const bioIsLong = bioText.length > 180;
  const truncatedBio = bioIsLong ? bioText.slice(0, 180).trimEnd() + '…' : bioText;
  const language = (user as any).language ?? (user as any).locale ?? null;
  const effectivePronouns = (effectiveUser as any).pronouns ?? (user as any).pronouns;

  const handleRemoveRole = async (roleId: string, roleName: string) => {
    if (!serverId || !memberId || removingRoleId) return;
    setRemovingRoleId(roleId);
    membersMutationLockRef.current = true;
    lockPermissionsMutation(600);

    const previousMembers = queryClient.getQueryData(['members', serverId]);
    queryClient.setQueryData(['members', serverId], (old: MemberWithProfile[] | undefined) =>
      old?.map((m) =>
        m.id !== memberId
          ? m
          : { ...m, roles: (m.roles ?? []).filter((r: any) => r.id !== roleId) }
      )
    );

    try {
      const { error } = await supabase
        .from('member_roles')
        .delete()
        .eq('member_id', memberId)
        .eq('role_id', roleId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['members', serverId] });
      queryClient.invalidateQueries({ queryKey: ['role-member-counts', serverId] });
    } catch (err: any) {
      if (previousMembers) queryClient.setQueryData(['members', serverId], previousMembers);
      toast.error(`Impossible de retirer le rôle ${roleName}`, {
        description: err?.message,
      });
    } finally {
      setRemovingRoleId(null);
      setTimeout(() => {
        membersMutationLockRef.current = false;
      }, 350);
    }
  };

  const ProfileContent = forwardRef<HTMLDivElement>((_, ref) => (
    <div ref={ref} className="font-ginto">
      {/* Banner */}
      <div className="relative">
        <div
          className="h-[88px] w-full bg-[hsl(var(--primary))]"
          style={getBannerStyle()}
        />

        {/* Header Actions */}
        {isOwnProfile && serverId ? (
          <div className="absolute top-2 right-2 flex items-center gap-2">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setServerProfileEditOpen(true)}
                  className="p-1.5 text-white hover:scale-110 transition-transform drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Modifier le profil serveur</TooltipContent>
            </Tooltip>
          </div>
        ) : !isOwnProfile ? (
          <div className="absolute top-2 right-2 flex items-center gap-2">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={handleSendMessage}
                  disabled={isCreatingDM}
                  className="p-1.5 text-white hover:scale-110 transition-transform drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                >
                  {isCreatingDM ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : dmCreated ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <MessageSquare className="w-4 h-4" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>{dmCreated ? 'Conversation ouverte' : 'Envoyer un message'}</TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={!isFriend && !isPending ? handleAddFriend : undefined}
                  disabled={isSendingRequest || isFriend}
                  className={cn(
                    'p-1.5 transition-transform drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]',
                    isFriend ? 'text-[hsl(var(--online))]' : 'text-white hover:scale-110',
                    !isFriend && !isPending && 'cursor-pointer'
                  )}
                >
                  {isSendingRequest ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isFriend ? (
                    <UserCheck className="w-4 h-4" />
                  ) : isPending ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
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

      {/* Body */}
      <div className="px-3 pb-3">
        {/* Avatar row with floating custom status bubble */}
        <div className="relative -mt-10 mb-2 flex items-end gap-2">
          <div className="relative inline-block">
            <Avatar className="w-[72px] h-[72px] border-[5px] border-card">
              <AvatarImage src={effectiveUser.avatar} alt={effectiveUser.displayName} />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                {effectiveUser.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div
              className={cn(
                'absolute bottom-0.5 right-0.5 w-[18px] h-[18px] rounded-full border-[4px] border-card',
                statusColors[user.status]
              )}
            />
          </div>

          {user.customStatus && (
            <div className="relative mb-1 max-w-[200px] rounded-2xl bg-popover px-3 py-1.5 text-xs text-foreground/90 shadow-md border border-border/40">
              <span className="absolute -left-1 bottom-2 h-2 w-2 rotate-45 bg-popover border-l border-b border-border/40" />
              <span className="block truncate">{user.customStatus}</span>
            </div>
          )}
        </div>

        {/* Inner card */}
        <div className="rounded-lg bg-background/40 p-3 space-y-2.5">
          {/* Name + pronouns */}
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-base font-bold text-foreground leading-tight">
                {effectiveUser.displayName}
              </h3>
              {effectivePronouns && (
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-muted text-muted-foreground">
                  {effectivePronouns}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <span>{user.username.toLowerCase()}</span>
              {language && (
                <>
                  <span className="opacity-60">·</span>
                  <span className="uppercase">{language}</span>
                </>
              )}
            </div>
          </div>

          {/* Badges row */}
          {userBadges.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {userBadges.map((key) => {
                const def = BADGE_ICONS[key];
                if (!def) return null;
                const Icon = def.icon;
                return (
                  <Tooltip key={key} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <span
                        className="inline-flex items-center justify-center w-5 h-5 rounded"
                        style={{ color: def.color }}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{def.label}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          )}

          {/* Activity */}
          {(user as any).activity_type && (user as any).activity_text && ActivityIcon && (
            <div className="flex items-center gap-1.5 text-xs">
              <ActivityIcon className="w-3.5 h-3.5 text-primary" />
              <span className="text-muted-foreground">
                {activityLabels[(user as any).activity_type]}
              </span>
              <span className="font-medium text-foreground truncate">
                {(user as any).activity_text}
              </span>
            </div>
          )}

          {/* Bio */}
          <div>
            <h4 className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-1">
              À Propos de Moi
            </h4>
            {bioText ? (
              <>
                <div className="text-xs text-foreground/90 prose prose-invert prose-sm max-w-none line-clamp-3">
                  {(() => {
                    const prevCtx = getMarkdownContext();
                    setMarkdownContext({ ...prevCtx, variant: 'bio' });
                    const result = parseMarkdown(truncatedBio);
                    setMarkdownContext(prevCtx);
                    return result;
                  })()}
                </div>
                {bioIsLong && (
                  <button
                    onClick={() => setFullBioOpen(true)}
                    className="mt-1 text-[11px] text-primary hover:underline"
                  >
                    Voir la bio complète
                  </button>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground/50">
                Aucune biographie définie.
              </p>
            )}
          </div>

          {/* Roles */}
          {((displayRoles && displayRoles.length > 0) ||
            (canManageRoles && serverId && memberId && assignableRoles.length > 0)) && (
            <div ref={rolesSectionRef}>
              <h4 className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-1.5">
                Rôles
              </h4>
              <div className="flex flex-wrap gap-1">
                {displayRoles.map((role) => (
                  <div
                    key={role.id}
                    className="group/role inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded text-[11px] font-medium bg-muted/40 border border-border/40"
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: role.color || 'hsl(var(--muted-foreground))' }}
                    />
                    <span style={{ color: role.color || undefined }} className="truncate max-w-[120px]">
                      {role.name}
                    </span>
                    {canManageRoles && (
                      <button
                        onClick={() => handleRemoveRole(role.id, role.name)}
                        disabled={removingRoleId === role.id}
                        className="ml-0.5 p-0.5 rounded opacity-0 group-hover/role:opacity-100 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-opacity"
                        aria-label={`Retirer ${role.name}`}
                      >
                        {removingRoleId === role.id ? (
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        ) : (
                          <X className="w-2.5 h-2.5" />
                        )}
                      </button>
                    )}
                  </div>
                ))}
                {canManageRoles && serverId && memberId && assignableRoles.length > 0 && (
                  <button
                    onClick={() => setShowRolePanel(true)}
                    className="inline-flex items-center justify-center w-5 h-5 rounded bg-muted/40 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Ajouter un rôle"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Volume Slider — voice */}
          {isInVoiceWithTarget && (
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase flex items-center gap-1.5">
                  {displayVolume === 0 ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  Volume
                </h4>
                <span className="text-[10px] text-muted-foreground">{displayVolume}%</span>
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
                <p className="text-[10px] text-orange-400 mt-1">Volume amplifié au-delà de 100%</p>
              )}
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="mt-2.5 space-y-2">
          {isOwnProfile && serverId ? (
            <Button
              onClick={() => setServerProfileEditOpen(true)}
              className="w-full h-9 rounded-md"
              size="sm"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Modifier le profil
            </Button>
          ) : !isOwnProfile ? (
            <Button
              onClick={handleSendMessage}
              disabled={isCreatingDM}
              className="w-full h-9 rounded-md"
              size="sm"
            >
              {isCreatingDM ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <MessageSquare className="w-4 h-4 mr-2" />
              )}
              Envoyer un message
            </Button>
          ) : null}

          {showKickBan && (canKick || canBan) && (
            <div className="flex gap-2">
              {canKick && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-orange-500 border-orange-500/30 hover:bg-orange-500/10"
                  onClick={handleKick}
                  disabled={kickMember.isPending}
                >
                  <UserMinus className="w-3.5 h-3.5 mr-1.5" />
                  Expulser
                </Button>
              )}
              {canBan && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={handleBan}
                  disabled={banMember.isPending}
                >
                  <Ban className="w-3.5 h-3.5 mr-1.5" />
                  Bannir
                </Button>
              )}
            </div>
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

  const fullBioModal = (
    <FullUserProfileModal
      open={fullBioOpen}
      onOpenChange={setFullBioOpen}
      user={{
        id: user.id,
        display_name: user.displayName,
        username: user.username,
        avatar_url: user.avatar ?? null,
        banner_url: user.banner ?? null,
        bio: user.bio ?? null,
        status: user.status,
        created_at: user.createdAt ?? null,
      }}
      onNavigateToDM={onOpenDM}
    />
  );

  // Mobile: Drawer from bottom (unchanged)
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
        {fullBioModal}
      </>
    );
  }

  // Desktop: floating anchored card (universal, no backdrop)
  if (!open) {
    return (
      <>
        {serverProfileModal}
        {fullBioModal}
      </>
    );
  }

  return (
    <>
      <FloatingProfileCard
        cardPosition={cardPosition}
        onClose={() => { setShowRolePanel(false); onOpenChange(false); }}
        showRolePanel={showRolePanel && canManageRoles && !!serverId && !!memberId && assignableRoles.length > 0}
        roleSidePanel={<RoleSidePanel />}
      >
        <ProfileContent />
      </FloatingProfileCard>
      {serverProfileModal}
      {fullBioModal}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FloatingProfileCard: anchors next to last clicked trigger, no backdrop,
// closes on outside click or Escape.
// ─────────────────────────────────────────────────────────────────────────────
interface FloatingProfileCardProps {
  children: React.ReactNode;
  onClose: () => void;
  cardPosition?: { top: number; right: number };
  showRolePanel?: boolean;
  roleSidePanel?: React.ReactNode;
}

const CARD_WIDTH = 300;
const CARD_MAX_HEIGHT_ESTIMATE = 520;
const GAP = 8;

function computePosition(): { top: number; left: number; openLeft: boolean } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const rect = lastProfileTriggerRect;

  if (!rect) {
    return {
      top: Math.max(GAP, vh - CARD_MAX_HEIGHT_ESTIMATE - GAP),
      left: Math.max(GAP, (vw - CARD_WIDTH) / 2),
      openLeft: false,
    };
  }

  // Prefer opening to the right of the trigger
  let left = rect.right + GAP;
  let openLeft = false;
  if (left + CARD_WIDTH + GAP > vw) {
    // Not enough room on the right → open to the left
    left = rect.left - CARD_WIDTH - GAP;
    openLeft = true;
    if (left < GAP) {
      // Still doesn't fit → clamp to right edge
      left = Math.max(GAP, vw - CARD_WIDTH - GAP);
    }
  }

  // Vertical: align top with trigger, clamp to viewport
  let top = rect.top;
  if (top + CARD_MAX_HEIGHT_ESTIMATE + GAP > vh) {
    top = Math.max(GAP, vh - CARD_MAX_HEIGHT_ESTIMATE - GAP);
  }
  if (top < GAP) top = GAP;

  return { top, left, openLeft };
}

function FloatingProfileCard({ children, onClose, cardPosition, showRolePanel, roleSidePanel }: FloatingProfileCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(() => {
    if (cardPosition) {
      return { top: cardPosition.top, left: window.innerWidth - cardPosition.right - CARD_WIDTH, openLeft: true };
    }
    return computePosition();
  });

  useEffect(() => {
    if (cardPosition) return;
    setPos(computePosition());
  }, [cardPosition]);

  useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      if (!cardRef.current) return;
      if (!cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Defer so the click that opened the card doesn't immediately close it
    const id = window.setTimeout(() => {
      document.addEventListener('mousedown', handleDown);
      document.addEventListener('keydown', handleKey);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        ref={cardRef}
        className="absolute flex items-start pointer-events-auto"
        style={{ top: pos.top, left: pos.left }}
      >
        {pos.openLeft && showRolePanel && roleSidePanel}
        <div className="relative w-[340px] bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-fade-in">
          {children}
        </div>
        {!pos.openLeft && showRolePanel && roleSidePanel}
      </div>
    </div>,
    document.body
  );
}