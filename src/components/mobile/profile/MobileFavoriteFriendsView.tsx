import { useMemo } from 'react';
import { useFriends } from '@/hooks/useFriends';
import { useFavoriteFriendIds, useToggleFavoriteFriend } from '@/hooks/useFavoriteFriends';
import { useDMConversations, useCreateDMConversation } from '@/hooks/useDMs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MessageCircle, Users } from 'lucide-react';
import { MobileProfileSubpage } from './MobileProfileSubpage';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

interface Props {
  onBack: () => void;
  onOpenDM: (conversationId: string) => void;
}

const statusColors: Record<string, string> = {
  online: 'bg-[hsl(var(--online))]',
  idle: 'bg-[hsl(var(--idle))]',
  dnd: 'bg-[hsl(var(--dnd))]',
  offline: 'bg-[hsl(var(--offline))]',
};

export function MobileFavoriteFriendsView({ onBack, onOpenDM }: Props) {
  const { data: friends = [] } = useFriends();
  const { data: favoriteIds = [] } = useFavoriteFriendIds();
  const { data: conversations = [] } = useDMConversations();
  const toggleFavorite = useToggleFavoriteFriend();
  const createDM = useCreateDMConversation();

  const acceptedFriends = useMemo(
    () => friends.filter((f: any) => f.status === 'accepted'),
    [friends]
  );

  // Frequent contacts: 1-on-1 DMs sorted by latest message (most recent first)
  const frequentContacts = useMemo(() => {
    return conversations
      .filter((c) => !c.is_group && c.participants.length === 1)
      .slice(0, 8);
  }, [conversations]);

  const favoriteFriends = useMemo(
    () => acceptedFriends.filter((f: any) => favoriteIds.includes(f.profile.id)),
    [acceptedFriends, favoriteIds]
  );

  const otherFriends = useMemo(
    () => acceptedFriends.filter((f: any) => !favoriteIds.includes(f.profile.id)),
    [acceptedFriends, favoriteIds]
  );

  const handleOpenDM = async (userId: string) => {
    haptics.light();
    const result = await createDM.mutateAsync(userId);
    if (result?.conversation_id) onOpenDM(result.conversation_id);
  };

  const handleToggleFavorite = (e: React.MouseEvent, friendUserId: string, isFav: boolean) => {
    e.stopPropagation();
    haptics.light();
    toggleFavorite.mutate({ friendUserId, isFavorite: isFav });
  };

  return (
    <MobileProfileSubpage title="Amis" onBack={onBack}>
      {/* Frequent contacts */}
      {frequentContacts.length > 0 && (
        <>
          <SectionHeader>Conversations récentes</SectionHeader>
          <div className="px-4 pb-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <div className="flex gap-3 pb-1">
              {frequentContacts.map((c) => {
                const p = c.participants[0];
                if (!p) return null;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      haptics.light();
                      onOpenDM(c.id);
                    }}
                    className="flex flex-col items-center gap-1.5 w-16 shrink-0 active:opacity-70"
                  >
                    <div className="relative">
                      <Avatar className="w-14 h-14">
                        <AvatarImage src={p.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                          {(p.display_name || '?').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          'absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-background',
                          statusColors[p.status || 'offline']
                        )}
                      />
                    </div>
                    <p className="text-[11px] text-center truncate max-w-full">
                      {p.display_name}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Favorites */}
      <SectionHeader>
        <span className="flex items-center gap-1.5">
          <Star className="w-3 h-3 fill-current" />
          Favoris ({favoriteFriends.length})
        </span>
      </SectionHeader>
      {favoriteFriends.length === 0 ? (
        <EmptyState
          icon={<Star className="w-6 h-6" />}
          text="Marque tes amis préférés en étoile"
        />
      ) : (
        <FriendList
          friends={favoriteFriends}
          favoriteIds={favoriteIds}
          onOpenDM={handleOpenDM}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      {/* All friends */}
      <SectionHeader>Tous les amis ({otherFriends.length})</SectionHeader>
      {otherFriends.length === 0 ? (
        <EmptyState icon={<Users className="w-6 h-6" />} text="Aucun autre ami" />
      ) : (
        <FriendList
          friends={otherFriends}
          favoriteIds={favoriteIds}
          onOpenDM={handleOpenDM}
          onToggleFavorite={handleToggleFavorite}
        />
      )}
    </MobileProfileSubpage>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="px-6 pt-6 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="mx-4 rounded-2xl bg-card border border-border/50 p-6 flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground mb-2">
        {icon}
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function FriendList({
  friends,
  favoriteIds,
  onOpenDM,
  onToggleFavorite,
}: {
  friends: any[];
  favoriteIds: string[];
  onOpenDM: (userId: string) => void;
  onToggleFavorite: (e: React.MouseEvent, friendUserId: string, isFav: boolean) => void;
}) {
  return (
    <section className="mx-4 rounded-2xl bg-card border border-border/50 overflow-hidden">
      {friends.map((f, idx) => {
        const isFav = favoriteIds.includes(f.profile.id);
        return (
          <div key={f.id}>
            {idx > 0 && <div className="h-px bg-border/40 mx-4" />}
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={() => onOpenDM(f.profile.id)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left active:opacity-70"
              >
                <div className="relative">
                  <Avatar className="w-11 h-11">
                    <AvatarImage src={f.profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                      {(f.profile.display_name || '?').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card',
                      statusColors[f.profile.status || 'offline']
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.profile.display_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {f.profile.custom_status || `@${f.profile.username}`}
                  </p>
                </div>
              </button>
              <button
                onClick={(e) => onToggleFavorite(e, f.profile.id, isFav)}
                className="w-9 h-9 rounded-full flex items-center justify-center active:bg-muted/60 transition-colors"
                aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                <Star
                  className={cn(
                    'w-4 h-4 transition-colors',
                    isFav ? 'fill-[hsl(var(--idle))] text-[hsl(var(--idle))]' : 'text-muted-foreground'
                  )}
                />
              </button>
              <button
                onClick={() => onOpenDM(f.profile.id)}
                className="w-9 h-9 rounded-full flex items-center justify-center active:bg-muted/60 transition-colors"
                aria-label="Envoyer un message"
              >
                <MessageCircle className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
