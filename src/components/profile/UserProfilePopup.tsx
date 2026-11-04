import { useState, useRef, useEffect, forwardRef } from 'react';
import { User } from '@/types/app';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { StatusIndicator } from '@/components/ui/StatusIndicator';

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
import { UserAvatarImage } from '@/components/ui/user-avatar-image';
import { useImageGuardProps } from '@/hooks/useDownloadPermissions';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Loader2, UserCheck, Radio, Swords, UserMinus, Ban, VolumeX, Crown, Zap } from 'lucide-react';
import { MessageSquare, UserPlus, Check, Clock, Gamepad2, Headphones, Eye, X, Pencil, Volume2, Plus, Sparkles, Shield, Star, Heart } from '@/components/icons/discord/lucide';
import { cn } from '@/lib/utils';
import { ProfileCardHeader } from './ProfileCardHeader';
import { ProfileMoreMenu } from './ProfileMoreMenu';
import { VoiceActivityCard } from './VoiceActivityCard';
import { openUserSettings } from '@/lib/settingsEvents';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useClearCustomStatus } from '@/hooks/useClearCustomStatus';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateDMConversation } from '@/hooks/useDMs';
import { useSendFriendRequest, useFriends } from '@/hooks/useFriends';
import { FriendStateButton } from '@/components/profile/FriendStateButton';
import { useServerRoles, RoleWithPermissions } from '@/hooks/useRoles';
import { useKickMember, useBanMember } from '@/hooks/useMemberActions';
import { MemberWithProfile } from '@/hooks/useMembers';
import { RoleCheckboxItem } from '@/components/profile/RoleCheckboxItem';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { setRoleMutationPending, clearRoleMutationPending } from '@/lib/role-mutation-tracker';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { parseMarkdown, setMarkdownContext, getMarkdownContext } from '@/lib/markdown';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import { ServerProfileEditModal } from '@/components/profile/ServerProfileEditModal';
import { FullUserProfileModal } from '@/components/profile/FullUserProfileModal';
import { CustomStatusModal } from '@/components/profile/CustomStatusModal';
import { useVoice } from '@/contexts/VoiceContext';
import { useVoiceUserSettings } from '@/hooks/useVoiceUserSettings';
import { useServerProfile } from '@/hooks/useServerProfile';
import { InlineBadgeStrip } from '@/components/badges/InlineBadgeStrip';

import { appLocale } from '@/i18n/locale';
const ROLE_PANEL_TOP_FALLBACK = 366;

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
  return date.toLocaleDateString(appLocale(), { 
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
  const [customStatusOpen, setCustomStatusOpen] = useState(false);
  const clearCustomStatus = useClearCustomStatus();
  const rolePanelTopRef = useRef(ROLE_PANEL_TOP_FALLBACK);

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

  // Hook guard MUST be called before any early-return to keep hook order stable across renders.
  const isOwnProfileForGuard = currentUser?.id === user?.id;
  const bannerGuard = useImageGuardProps(isOwnProfileForGuard ? null : user?.id ?? null);

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

  const isOwnProfile = isOwnProfileForGuard;
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

  const toggleRolePanel = () => {
    setShowRolePanel((prev) => {
      const next = !prev;
      if (next && rolesSectionRef.current) {
        rolePanelTopRef.current = rolesSectionRef.current.offsetTop;
      }
      return next;
    });
  };

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
    if (!serverId || !memberId) return;
    setRoleMutationPending(serverId, memberId, roleId, 'remove');

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
      // Do NOT invalidate ['members', serverId] here — the optimistic patch
      // plus the realtime subscription keep the cache in sync without flicker.
      queryClient.invalidateQueries({ queryKey: ['role-member-counts', serverId] });
      [
        'channel-permission', 'channel-permissions', 'user-channel-permissions',
        'user-permissions', 'category-permissions', 'role-permissions',
        'member-roles', 'server-channel-permissions',
      ].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));

      clearRoleMutationPending(serverId, memberId, roleId);
    } catch (err: any) {
      if (previousMembers) queryClient.setQueryData(['members', serverId], previousMembers);
      clearRoleMutationPending(serverId, memberId, roleId);
      toast.error(`Impossible de retirer le rôle ${roleName}`, {
        description: err?.message,
      });
    }
  };

  const ProfileContent = forwardRef<HTMLDivElement>((_, ref) => (
    <div ref={ref} className="font-ginto bg-[#383840] rounded-lg">
      <ProfileCardHeader
        size="sm"
        isOwn={isOwnProfile}
        user={{
          id: user.id,
          display_name: effectiveUser.displayName,
          username: user.username,
          avatar_url: effectiveUser.avatar ?? null,
          banner_url: effectiveUser.banner ?? null,
          bio: bioText || null,
          status: user.status,
          pronouns: effectivePronouns ?? null,
          custom_status: user.customStatus ?? null,
        }}
        bannerStyle={Object.keys(getBannerStyle()).length ? getBannerStyle() : { background: 'hsl(var(--primary))' }}
        bannerGuard={bannerGuard}
        topRight={<ProfileMoreMenu variant="round" profile={{ id: user.id, display_name: effectiveUser.displayName, username: user.username, avatar_url: effectiveUser.avatar ?? null }} />}
        className="pb-4"
      >
        {/* Bio */}
        <div className="mt-3">
          {bioText ? (
            <>
              <div className="text-base leading-[22px] text-white markdown-preview max-w-none line-clamp-3 break-words">
                {(() => {
                  const prevCtx = getMarkdownContext();
                  setMarkdownContext({ ...prevCtx, variant: 'bio' });
                  const result = parseMarkdown(truncatedBio);
                  setMarkdownContext(prevCtx);
                  return result;
                })()}
              </div>
              {bioIsLong && (
                <button type="button" onClick={() => setFullBioOpen(true)} className="mt-1 text-xs text-primary hover:underline">
                  Voir la bio complète
                </button>
              )}
            </>
          ) : isOwnProfile ? (
            <button type="button" onClick={() => setServerProfileEditOpen(true)} className="text-sm text-muted-foreground hover:text-white transition-colors text-left">
              Ajouter une biographie…
            </button>
          ) : null}
        </div>

        <VoiceActivityCard className="mt-3" user={{ id: user.id, display_name: effectiveUser.displayName, avatar_url: effectiveUser.avatar ?? null }} />

        {/* Activite */}
        {(user as any).activity_type && (user as any).activity_text && ActivityIcon && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <ActivityIcon className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">{activityLabels[(user as any).activity_type]}</span>
            <span className="font-medium text-white truncate">{(user as any).activity_text}</span>
          </div>
        )}

        {/* Roles */}
        {((displayRoles && displayRoles.length > 0) || (canManageRoles && serverId && memberId && assignableRoles.length > 0)) && (
          <div ref={rolesSectionRef} className="mt-3 flex flex-wrap gap-1.5 items-center">
            {displayRoles.map((role) => (
              <div
                key={role.id}
                className="group/role inline-flex items-center gap-1.5 h-6 pl-2 pr-2 rounded-md text-xs font-medium bg-white/[0.06] border border-white/[0.06]"
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: role.color || 'hsl(var(--muted-foreground))' }} />
                <span translate="no" className="truncate max-w-[120px] text-white">{role.name}</span>
                {canManageRoles && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRole(role.id, role.name)}
                    className="-mr-1 p-0.5 rounded opacity-0 group-hover/role:opacity-100 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-opacity"
                    aria-label={`Retirer ${role.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {canManageRoles && serverId && memberId && assignableRoles.length > 0 && (
              <AddRolePopover roles={assignableRoles} serverId={serverId} memberId={memberId} userId={user.id} />
            )}
          </div>
        )}

        {/* Volume — vocal */}
        {isInVoiceWithTarget && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                {displayVolume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                Volume
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
            {displayVolume > 100 && <p className="text-[11px] text-orange-400 mt-1">Volume amplifié au-delà de 100%</p>}
          </div>
        )}

        {/* Action principale */}
        <div className="mt-4 space-y-2">
          {isOwnProfile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="w-full h-10 rounded-lg gap-2 text-base font-medium">
                  <Pencil className="w-4 h-4" />
                  Modifier le profil
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="bottom" sideOffset={6} className="z-[140] w-[300px] p-2 rounded-lg bg-[#3b3b45] border border-white/[0.08] shadow-[0_8px_16px_rgba(0,0,0,0.24)]">
                {serverId && (
                  <DropdownMenuItem className="flex-col items-start gap-0.5 px-3 py-2 rounded-[4px]" onSelect={() => setServerProfileEditOpen(true)}>
                    <span className="text-sm font-medium text-white">Modifier le profil du serveur</span>
                    <span className="text-xs text-muted-foreground">Visible uniquement dans ce serveur</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="flex-col items-start gap-0.5 px-3 py-2 rounded-[4px]"
                  onSelect={() => {
                    onOpenChange(false);
                    openUserSettings('profile');
                  }}
                >
                  <span className="text-sm font-medium text-white">Modifier le profil principal</span>
                  <span className="text-xs text-muted-foreground">Profil par défaut, visible par tout le monde</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button onClick={handleSendMessage} disabled={isCreatingDM} className="flex-1 h-10 rounded-lg gap-2 text-base font-medium">
                {isCreatingDM ? <Loader2 className="w-4 h-4 animate-spin" /> : dmCreated ? <Check className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                Envoyer un message
              </Button>
              <FriendStateButton user={{ id: user.id, username: user.username }} variant="square" className="!h-10 !w-10 !rounded-lg" />
            </div>
          )}

          {showKickBan && (canKick || canBan) && (
            <div className="flex gap-2">
              {canKick && (
                <Button variant="outline" size="sm" className="flex-1 h-8 text-orange-500 border-orange-500/30 hover:bg-orange-500/10" onClick={handleKick} disabled={kickMember.isPending}>
                  <UserMinus className="w-3.5 h-3.5 mr-1.5" />
                  Expulser
                </Button>
              )}
              {canBan && (
                <Button variant="outline" size="sm" className="flex-1 h-8 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleBan} disabled={banMember.isPending}>
                  <Ban className="w-3.5 h-3.5 mr-1.5" />
                  Bannir
                </Button>
              )}
            </div>
          )}
        </div>
      </ProfileCardHeader>
    </div>
  ));
  ProfileContent.displayName = 'ProfileContent';

  const roleSidePanel = (
    <div 
      className="absolute right-full mr-2 w-64 bg-card border border-border rounded-lg shadow-2xl overflow-hidden"
      style={{ top: rolePanelTopRef.current }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h4 className="font-semibold text-sm">Gérer les rôles</h4>
        <button type="button" 
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
        custom_status: user.customStatus ?? null,
        pronouns: (user as any).pronouns ?? null,
      }}
      onNavigateToDM={onOpenDM}
    />
  );

  const customStatusModal = isOwnProfile ? (
    <CustomStatusModal open={customStatusOpen} onOpenChange={setCustomStatusOpen} />
  ) : null;

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
        {customStatusModal}
      </>
    );
  }

  // Desktop: floating anchored card (universal, no backdrop)
  if (!open) {
    return (
      <>
        {serverProfileModal}
        {fullBioModal}
        {customStatusModal}
      </>
    );
  }

  return (
    <>
      <FloatingProfileCard
        cardPosition={cardPosition}
        onClose={() => { setShowRolePanel(false); onOpenChange(false); }}
        showRolePanel={showRolePanel && canManageRoles && !!serverId && !!memberId && assignableRoles.length > 0}
        roleSidePanel={roleSidePanel}
      >
        <ProfileContent />
      </FloatingProfileCard>
      {serverProfileModal}
      {fullBioModal}
      {customStatusModal}
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

const CARD_WIDTH = 360;
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
      const target = e.target as Element | null;
      if (!target) return;
      // Inside our own card
      if (cardRef.current.contains(target)) return;
      // Inside any portal "owned" by the card (tooltips, popovers, dropdowns, dialogs, context menus, sheets...)
      // Radix portals carry these data attributes; Sonner toasts use [data-sonner-toast].
      if (
        target.closest(
          '[data-radix-popper-content-wrapper], [data-radix-portal], [data-radix-tooltip-content], [data-radix-popover-content], [data-radix-dropdown-menu-content], [data-radix-context-menu-content], [data-radix-dialog-content], [data-radix-dialog-overlay], [data-radix-alert-dialog-content], [data-radix-alert-dialog-overlay], [data-radix-hover-card-content], [role="dialog"], [role="menu"], [role="tooltip"], [data-sonner-toast], [data-floating-profile-portal]'
        )
      ) {
        return;
      }
      onClose();
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
        <div className="relative w-[360px] bg-[#383840] border border-white/[0.06] rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.4)] overflow-hidden animate-fade-in max-h-[85vh] overflow-y-auto">
          {children}
        </div>
        {!pos.openLeft && showRolePanel && roleSidePanel}
      </div>
    </div>,
    document.body
  );
}

/*
 * "+ Ajouter un role" (video de reference) : liste deroulante sous le bouton, champ de recherche
 * a contour bleu puis les roles pas encore attribues (pastille de couleur + nom). Un clic
 * attribue le role : la pastille apparait dans la carte et la ligne disparait de la liste.
 */
function AddRolePopover({ roles, serverId, memberId, userId }: { roles: RoleWithPermissions[]; serverId: string; memberId: string; userId: string }) {
  const [query, setQuery] = useState('');
  const shown = roles.filter((r) => !query.trim() || r.name.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <Popover onOpenChange={(o) => o || setQuery('')}>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex items-center gap-1.5 h-6 text-sm text-[#b5bac1] hover:text-white transition-colors">
          <Plus className="w-4 h-4" /> Ajouter un rôle
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" sideOffset={8} className="z-[140] w-[280px] p-2 rounded-lg bg-[hsl(var(--input))] border border-white/[0.08] shadow-[0_8px_16px_rgba(0,0,0,0.24)]">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rôle"
          aria-label="Rechercher un rôle"
          style={{ boxShadow: 'inset 0 0 0 2px #5b63e4' }}
          className="w-full h-10 px-3 rounded-lg bg-[#33333b] border-0 text-base text-white placeholder:text-muted-foreground outline-none border-0"
        />
        <div className="mt-2 max-h-[260px] overflow-y-auto scrollbar-thin">
          {shown.map((role) => (
            <RoleCheckboxItem key={role.id} role={role} serverId={serverId} memberId={memberId} userId={userId} hideWhenChecked />
          ))}
          {shown.length === 0 && <p className="px-3 py-3 text-sm text-muted-foreground">Aucun rôle à ajouter.</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
