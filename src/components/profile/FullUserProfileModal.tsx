import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { CustomStatusBubble } from './CustomStatusBubble';
import { CustomStatusModal } from './CustomStatusModal';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserAvatarImage } from '@/components/ui/user-avatar-image';
import { useImageGuardProps } from '@/hooks/useDownloadPermissions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useMutualServers } from '@/hooks/useMutualServers';
import { useMutualFriends } from '@/hooks/useMutualFriends';
import { useCreateDMConversation, useDMConversations } from '@/hooks/useDMs';
import { useFriends, useSendFriendRequest, useRemoveFriend } from '@/hooks/useFriends';
import { useUserNote, useSaveUserNote } from '@/hooks/useUserNotes';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageCircle, UserPlus, UserMinus, Check, CalendarDays, Users, Server, Copy } from 'lucide-react';
import { parseMarkdown, setMarkdownContext, getMarkdownContext } from '@/lib/markdown';
import { toast } from 'sonner';
import { ProfileCalendar } from '@/components/profile/calendar/ProfileCalendar';
import { EventListBelow } from '@/components/profile/calendar/EventListBelow';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { UserBadgeList } from '@/components/badges/UserBadgeList';
import { InlineBadgeStrip } from '@/components/badges/InlineBadgeStrip';
import { useIsBirthday } from '@/hooks/useBirthday';
import { BirthdayRibbon } from '@/components/profile/BirthdayRibbon';
import { ConfettiCanvas } from '@/components/effects/ConfettiCanvas';

const statusColors: Record<string, string> = {
  online: 'bg-green-500',
  idle: 'bg-yellow-500',
  dnd: 'bg-red-500',
  offline: 'bg-gray-500',
};

export interface FullProfileUser {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  status: string;
  created_at?: string | null;
  pronouns?: string | null;
  custom_status?: string | null;
}

interface FullUserProfileModalProps {
  user: FullProfileUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToDM?: (conversationId: string) => void;
  initialTab?: 'about' | 'servers' | 'friends';
}

export function FullUserProfileModal({
  user,
  open,
  onOpenChange,
  onNavigateToDM,
}: FullUserProfileModalProps) {
  const [noteInput, setNoteInput] = useState('');
  const [customStatusOpen, setCustomStatusOpen] = useState(false);

  const { user: currentUser } = useAuth();
  const { data: mutualServers, isFetching: mutualServersFetching } = useMutualServers(user?.id || null);
  const { data: mutualFriends, isFetching: mutualFriendsFetching } = useMutualFriends(user?.id || null);
  const { data: conversations = [] } = useDMConversations();
  const createDM = useCreateDMConversation();
  const { data: friends = [] } = useFriends();
  const sendRequest = useSendFriendRequest();
  const removeFriend = useRemoveFriend();
  const { data: userNote } = useUserNote(user?.id || null);
  const { saveWithDebounce } = useSaveUserNote();

  useEffect(() => {
    setNoteInput(userNote?.content ?? '');
  }, [userNote?.content, user?.id]);

  const handleNoteChange = (value: string) => {
    setNoteInput(value);
    if (user?.id) saveWithDebounce(user.id, value);
  };

  const isOwnProfile = currentUser?.id === user?.id;
  const bannerGuard = useImageGuardProps(isOwnProfile ? null : user?.id ?? null);
  const isBirthday = useIsBirthday(user?.id ?? null);
  const [birthdayConfetti, setBirthdayConfetti] = useState(false);
  useEffect(() => {
    if (open && isBirthday) {
      setBirthdayConfetti(false);
      const t = window.setTimeout(() => setBirthdayConfetti(true), 200);
      return () => window.clearTimeout(t);
    }
  }, [open, isBirthday, user?.id]);

  const friendship = friends.find(
    (f) =>
      (f.user_id === currentUser?.id && f.friend_id === user?.id) ||
      (f.friend_id === currentUser?.id && f.user_id === user?.id),
  );
  const isFriend = friendship?.status === 'accepted';
  const isPending = friendship?.status === 'pending';

  const memberSince = user?.created_at
    ? format(new Date(user.created_at), 'd MMMM yyyy', { locale: fr })
    : null;

  const handleSendMessage = async () => {
    if (!user) return;
    const existing = conversations.find((c) => c.participants.some((p) => p.id === user.id));
    if (existing) {
      onNavigateToDM?.(existing.id);
      onOpenChange(false);
      return;
    }
    try {
      const result = await createDM.mutateAsync(user.id);
      onNavigateToDM?.(result.conversation_id);
      onOpenChange(false);
    } catch {
      toast.error('Impossible de créer la conversation');
    }
  };

  const handleFriendAction = () => {
    if (!user) return;
    if (isFriend && friendship) removeFriend.mutate(friendship.id);
    else if (!friendship) sendRequest.mutate(user.username);
  };

  if (!user) return null;

  const renderedBio = user.bio
    ? (() => {
        const prev = getMarkdownContext();
        setMarkdownContext({ ...prev, variant: 'bio' });
        const out = parseMarkdown(user.bio);
        setMarkdownContext(prev);
        return out;
      })()
    : null;

  return (
    <>
    {birthdayConfetti && (
      <ConfettiCanvas
        active
        count={90}
        duration={3000}
        colors={[
          'hsl(45, 95%, 58%)',
          'hsl(38, 95%, 60%)',
          'hsl(50, 100%, 65%)',
          'hsl(30, 100%, 55%)',
        ]}
        onComplete={() => setBirthdayConfetti(false)}
      />
    )}
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-background shadow-2xl max-h-[88vh] flex flex-col">
        {/* Hero — Banner + Avatar */}
        <section className="relative shrink-0">
          {isBirthday && <BirthdayRibbon displayName={user.display_name} />}
          <div
            className={user.banner_url ? 'h-44 w-full' : 'h-32 w-full'}
            style={{
              backgroundColor: user.banner_url ? undefined : 'hsl(var(--primary))',
              backgroundImage: user.banner_url
                ? `url(${user.banner_url})`
                : isBirthday
                  ? 'linear-gradient(135deg, #ff9500 0%, #f5b301 50%, #ffd54a 100%)'
                  : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            {...bannerGuard}
          />
          <div className="px-6 -mt-14 relative z-10 flex items-end justify-between gap-3">
            <div className="relative min-w-0 shrink-0">
              <div className="relative">
                <UserAvatarImage
                  src={user.avatar_url}
                  alt={user.display_name}
                  className="w-28 h-28 ring-[5px] ring-background"
                  fallbackClassName="bg-primary/20 text-primary text-4xl font-semibold"
                  fallback={user.display_name?.charAt(0).toUpperCase()}
                  ownerId={user.id}
                />

                <StatusIndicator
                  status={user.status || 'offline'}
                  className="absolute bottom-1 right-1 w-6 h-6 border-[4px] border-background"
                  bgClassName="bg-background"
                />
              </div>
              {(user.custom_status || isOwnProfile) && user.status !== 'offline' && (
                <div className="absolute left-[128px] bottom-[14px] z-20 max-w-[260px]">
                  <CustomStatusBubble
                    customStatus={user.custom_status}
                    status={user.status}
                    size="md"
                    showPlaceholder={isOwnProfile}
                    onClick={isOwnProfile ? () => setCustomStatusOpen(true) : undefined}
                  />
                </div>
              )}
            </div>
            {!isOwnProfile && (
              <div className="flex gap-2 mb-2 shrink-0">
                <Button size="sm" onClick={handleSendMessage} disabled={createDM.isPending} className="rounded-full">
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  Message
                </Button>
                <Button
                  size="sm"
                  variant={isFriend ? 'destructive' : isPending ? 'secondary' : 'outline'}
                  onClick={handleFriendAction}
                  disabled={isPending}
                  className="rounded-full"
                >
                  {isFriend ? (
                    <>
                      <UserMinus className="w-4 h-4 mr-1.5" />
                      Retirer
                    </>
                  ) : isPending ? (
                    <>
                      <Check className="w-4 h-4 mr-1.5" />
                      En attente
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-1.5" />
                      Ajouter
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6 space-y-4">
          {/* Identity */}
          <section className="rounded-2xl bg-card border border-border/50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold leading-tight truncate">{user.display_name}</h2>
                <p className="text-sm text-muted-foreground truncate">@{user.username.toLowerCase()}</p>
                {user.pronouns && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{user.pronouns}</span>
                  </div>
                )}
                {memberSince && (
                  <p className="mt-3 text-[11px] text-muted-foreground">Membre depuis {memberSince}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <InlineBadgeStrip userId={user.id} max={5} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    void navigator.clipboard.writeText(`@${user.username.toLowerCase()}`);
                    toast.success("Nom d'utilisateur copié");
                  }}
                  aria-label="Copier le nom d'utilisateur"
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </section>

          {/* Badges */}
          <section className="rounded-2xl bg-card border border-border/50 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Badges</h4>
            <UserBadgeList userId={user.id} size="lg" showEmpty />
          </section>

          {/* About */}
          <section className="rounded-2xl bg-card border border-border/50 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">À propos de moi</h4>
            {renderedBio ? (
              <div className="text-sm markdown-preview prose prose-invert prose-sm max-w-none">{renderedBio}</div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune biographie définie.</p>
            )}
          </section>

          {/* Calendar */}
          <section className="rounded-2xl bg-card border border-border/50 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Calendrier</h4>
            </div>
            <ProfileCalendar userId={isOwnProfile ? undefined : user.id} readOnly={!isOwnProfile} />
            <EventListBelow userId={isOwnProfile ? undefined : user.id} readOnly={!isOwnProfile} />
          </section>

          {/* Mutual servers */}
          <section className="rounded-2xl bg-card border border-border/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Server className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {mutualServers
                  ? `${mutualServers.length} serveur${mutualServers.length !== 1 ? 's' : ''} en commun`
                  : 'Serveurs en commun'}
              </h4>
            </div>
            {!mutualServers ? null : mutualServers.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun serveur en commun.</p>

            ) : (
              <div className="space-y-1">
                {mutualServers.map((server) => (
                  <div key={server.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={server.icon_url || undefined} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                        {server.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate">{server.name}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Mutual friends */}
          {mutualFriends && mutualFriends.length > 0 ? (

            <section className="rounded-2xl bg-card border border-border/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amis en commun</h4>
              </div>
              <div className="space-y-1">
                {mutualFriends.map((friend) => (
                  <div key={friend.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="relative">
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={friend.avatar_url || undefined} />
                        <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                          {friend.display_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <StatusIndicator
                        status={friend.status || 'offline'}
                        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-card"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{friend.display_name}</p>
                      <p className="text-xs text-muted-foreground truncate">@{friend.username.toLowerCase()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Private note */}
          {!isOwnProfile && (
            <section className="rounded-2xl bg-card border border-border/50 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Note</h4>
              <Textarea
                value={noteInput}
                onChange={(e) => handleNoteChange(e.target.value)}
                placeholder="Cliquez pour ajouter une note"
                className="min-h-[60px] resize-none text-sm bg-muted/30 rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Visible que par vous • Sauvegarde automatique</p>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
    {isOwnProfile && (
      <CustomStatusModal open={customStatusOpen} onOpenChange={setCustomStatusOpen} />
    )}
    </>
  );
}
