import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { MessageCircle, UserPlus, UserMinus, Check, CalendarDays, Users, Server } from 'lucide-react';
import { parseMarkdown, setMarkdownContext, getMarkdownContext } from '@/lib/markdown';
import { toast } from 'sonner';
import { ProfileCalendar } from '@/components/profile/calendar/ProfileCalendar';
import { EventListBelow } from '@/components/profile/calendar/EventListBelow';
import { StatusIndicator } from '@/components/ui/StatusIndicator';

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

  const { user: currentUser } = useAuth();
  const { data: mutualServers = [] } = useMutualServers(user?.id || null);
  const { data: mutualFriends = [] } = useMutualFriends(user?.id || null);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-background shadow-2xl max-h-[88vh] flex flex-col">
        {/* Hero — Banner + Avatar */}
        <section className="relative shrink-0">
          <div
            className={user.banner_url ? 'h-44 w-full' : 'h-32 w-full'}
            style={{
              backgroundColor: user.banner_url ? undefined : 'hsl(var(--primary))',
              backgroundImage: user.banner_url ? `url(${user.banner_url})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="px-6 -mt-14 relative z-10 flex items-end justify-between">
            <div className="relative shrink-0">
              <Avatar className="w-28 h-28 ring-[5px] ring-background">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-4xl font-semibold">
                  {user.display_name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <StatusIndicator
                status={user.status || 'offline'}
                className="absolute bottom-1 right-1 w-6 h-6 border-[4px] border-background"
                bgClassName="bg-background"
              />
            </div>
            {!isOwnProfile && (
              <div className="flex gap-2 mb-2">
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
            <h2 className="text-xl font-bold leading-tight">{user.display_name}</h2>
            <p className="text-sm text-muted-foreground">@{user.username.toLowerCase()}</p>
            {(user.pronouns || user.custom_status) && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                {user.pronouns && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{user.pronouns}</span>
                )}
                {user.custom_status && (
                  <CustomStatusBubble customStatus={user.custom_status} size="sm" />
                )}
              </div>
            )}
            {memberSince && (
              <p className="mt-3 text-[11px] text-muted-foreground">Membre depuis {memberSince}</p>
            )}
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
                {mutualServers.length} serveur{mutualServers.length !== 1 ? 's' : ''} en commun
              </h4>
            </div>
            {mutualServers.length === 0 ? (
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
          {mutualFriends.length > 0 && (
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
          )}

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
  );
}
