import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useFrequentDMContacts,
  type FrequentContact,
} from '@/hooks/useFrequentDMContacts';
import {
  useFavoriteFriendIds,
  useToggleFavoriteFriend,
} from '@/hooks/useFavoriteFriends';
import {
  useFriends,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useRemoveFriend,
  type FriendWithProfile,
} from '@/hooks/useFriends';
import { useCreateDMConversation } from '@/hooks/useDMs';
import { useAuth } from '@/contexts/AuthContext';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { MobileProfileSubpage } from './MobileProfileSubpage';
import { MobileFriendCard, type MobileFriendCardData } from './MobileFriendCard';
import { MobileFriendActionSheet } from './MobileFriendActionSheet';
import { AddFriendModal } from '@/components/friends/AddFriendModal';
import {
  UserPlus,
  Search,
  X,
  Users,
  Check,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

interface Props {
  onBack: () => void;
  onOpenDM: (conversationId: string) => void;
}

type FilterKey = 'all' | 'online' | 'favorites' | 'pending';

interface MergedFriend extends MobileFriendCardData {
  conversationId?: string;
  countDay: number;
  countWeek: number;
  countMonth: number;
  lastMessageAt: string | null;
  friendshipId?: string;
}

function buildMetric(c: { countDay: number; countWeek: number; countMonth: number }): string | null {
  if (c.countDay > 0) return `${c.countDay} message${c.countDay > 1 ? 's' : ''} aujourd'hui`;
  if (c.countWeek > 0) return `${c.countWeek} message${c.countWeek > 1 ? 's' : ''} cette semaine`;
  if (c.countMonth > 0) return `${c.countMonth} message${c.countMonth > 1 ? 's' : ''} ce mois-ci`;
  return null;
}

export function MobileFavoriteFriendsView({ onBack, onOpenDM }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: frequent = [], isLoading: loadingFreq } = useFrequentDMContacts();
  const { data: favoriteIds = [] } = useFavoriteFriendIds();
  const { data: friends = [], isLoading: loadingFriends } = useFriends();
  const toggleFavorite = useToggleFavoriteFriend();
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();
  const removeFriend = useRemoveFriend();
  const createDM = useCreateDMConversation();

  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionFriend, setActionFriend] = useState<MergedFriend | null>(null);
  const [pendingExpanded, setPendingExpanded] = useState(true);

  const isLoading = loadingFreq || loadingFriends;

  // Pull-to-refresh
  const { containerRef, pullDistance, refreshing, progress } = usePullToRefresh({
    onRefresh: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['friends'] }),
        queryClient.invalidateQueries({ queryKey: ['frequent-dm-contacts'] }),
        queryClient.invalidateQueries({ queryKey: ['friend-favorites'] }),
      ]);
    },
  });

  // Split pending vs accepted
  const acceptedFriends = useMemo(
    () => friends.filter((f) => f.status === 'accepted'),
    [friends],
  );
  const incomingPending = useMemo(
    () => friends.filter((f) => f.status === 'pending' && f.isIncoming),
    [friends],
  );
  const outgoingPending = useMemo(
    () => friends.filter((f) => f.status === 'pending' && !f.isIncoming),
    [friends],
  );

  // Merge: accepted friends + frequent contact stats + favorite flag
  const merged = useMemo<MergedFriend[]>(() => {
    const freqMap = new Map<string, FrequentContact>();
    frequent.forEach((c) => freqMap.set(c.userId, c));

    const fromFriends: MergedFriend[] = acceptedFriends.map((f) => {
      const c = freqMap.get(f.profile.id);
      return {
        userId: f.profile.id,
        friendshipId: f.id,
        conversationId: c?.conversationId,
        displayName: f.profile.display_name,
        username: f.profile.username,
        avatarUrl: f.profile.avatar_url,
        status: f.profile.status,
        customStatus: f.profile.custom_status,
        isFavorite: favoriteIds.includes(f.profile.id),
        countDay: c?.countDay ?? 0,
        countWeek: c?.countWeek ?? 0,
        countMonth: c?.countMonth ?? 0,
        lastMessageAt: c?.lastMessageAt ?? null,
        metricLabel: c ? buildMetric(c) : null,
      };
    });

    // Add frequent contacts that are not in friends (e.g. DM strangers)
    const knownIds = new Set(fromFriends.map((m) => m.userId));
    frequent.forEach((c) => {
      if (knownIds.has(c.userId)) return;
      fromFriends.push({
        userId: c.userId,
        conversationId: c.conversationId,
        displayName: c.displayName,
        username: c.username,
        avatarUrl: c.avatarUrl,
        status: c.status,
        customStatus: c.customStatus,
        isFavorite: favoriteIds.includes(c.userId),
        countDay: c.countDay,
        countWeek: c.countWeek,
        countMonth: c.countMonth,
        lastMessageAt: c.lastMessageAt,
        metricLabel: buildMetric(c),
      });
    });

    return fromFriends;
  }, [acceptedFriends, frequent, favoriteIds]);

  // Apply search + filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return merged.filter((m) => {
      if (q) {
        const hay = `${m.displayName} ${m.username}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter === 'online') return m.status === 'online' || m.status === 'idle' || m.status === 'dnd';
      if (filter === 'favorites') return m.isFavorite;
      return true;
    });
  }, [merged, search, filter]);

  // Bucket by recency (only when not in 'favorites' filter)
  const buckets = useMemo(() => {
    if (filter === 'favorites') {
      return { day: [], week: [], month: [], rest: filtered };
    }
    const day: MergedFriend[] = [];
    const week: MergedFriend[] = [];
    const month: MergedFriend[] = [];
    const rest: MergedFriend[] = [];
    filtered.forEach((m) => {
      if (m.countDay > 0) day.push(m);
      else if (m.countWeek > 0) week.push(m);
      else if (m.countMonth > 0) month.push(m);
      else rest.push(m);
    });
    rest.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return { day, week, month, rest };
  }, [filtered, filter]);

  const handleOpenDM = async (m: MergedFriend) => {
    if (m.conversationId) {
      onOpenDM(m.conversationId);
      return;
    }
    try {
      const res = await createDM.mutateAsync(m.userId);
      onOpenDM(res.conversation_id);
    } catch {
      // toast handled by hook
    }
  };

  const totalAccepted = acceptedFriends.length;
  const totalPending = incomingPending.length + outgoingPending.length;

  const filters: { key: FilterKey; label: string; badge?: number }[] = [
    { key: 'all', label: 'Tous', badge: totalAccepted },
    { key: 'online', label: 'En ligne' },
    { key: 'favorites', label: 'Favoris', badge: favoriteIds.length },
    { key: 'pending', label: 'En attente', badge: totalPending },
  ];

  const showPendingSection =
    (filter === 'all' || filter === 'pending') && totalPending > 0;
  const showAcceptedSections = filter !== 'pending';

  const subtitle = isLoading
    ? 'Chargement…'
    : `${totalAccepted} ami${totalAccepted > 1 ? 's' : ''}${
        totalPending > 0 ? ` · ${totalPending} en attente` : ''
      }`;

  return (
    <MobileProfileSubpage
      title="Amis"
      onBack={onBack}
      rightAction={
        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setShowAddModal(true);
          }}
          className="w-9 h-9 rounded-full flex items-center justify-center active:bg-muted/60 mr-1"
          aria-label="Ajouter un ami"
        >
          <UserPlus className="w-5 h-5" />
        </button>
      }
    >
      {/* Subtitle + filters + search live in a sticky-ish header area */}
      <div className="px-4 pt-3 pb-2">
        <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>

        {/* Filter pills */}
        <div
          role="tablist"
          aria-label="Filtres d'amis"
          className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  haptics.selection();
                  setFilter(f.key);
                }}
                className={cn(
                  'shrink-0 h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors min-h-[36px]',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/60 text-foreground active:bg-muted',
                )}
              >
                <span>{f.label}</span>
                {f.badge != null && f.badge > 0 && (
                  <span
                    className={cn(
                      'min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center',
                      active
                        ? 'bg-primary-foreground/25 text-primary-foreground'
                        : f.key === 'pending'
                        ? 'bg-[hsl(var(--destructive))] text-destructive-foreground'
                        : 'bg-foreground/10 text-foreground',
                    )}
                  >
                    {f.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un ami…"
            aria-label="Rechercher un ami"
            className="w-full h-10 pl-9 pr-9 rounded-xl bg-muted/60 text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center active:bg-muted text-muted-foreground"
              aria-label="Effacer la recherche"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Pull-to-refresh indicator */}
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className="flex-1 overflow-y-auto"
        style={{ overscrollBehavior: 'contain' }}
      >
        {(pullDistance > 0 || refreshing) && (
          <div
            className="flex items-center justify-center text-muted-foreground"
            style={{ height: pullDistance, transition: refreshing ? 'none' : 'height 200ms' }}
          >
            <Loader2
              className={cn('w-4 h-4', refreshing && 'animate-spin')}
              style={{ transform: `rotate(${progress * 360}deg)` }}
            />
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="mx-4 mt-2 rounded-2xl bg-card border border-border/50 p-6 text-center">
            <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Chargement…</p>
          </div>
        )}

        {/* Pending requests */}
        {!isLoading && showPendingSection && (
          <section className="mt-2">
            <button
              type="button"
              onClick={() => setPendingExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-6 pt-4 pb-2"
              aria-expanded={pendingExpanded}
            >
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                En attente
                <span className="bg-[hsl(var(--destructive))] text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                  {totalPending}
                </span>
              </h3>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-muted-foreground transition-transform',
                  pendingExpanded && 'rotate-180',
                )}
              />
            </button>

            {pendingExpanded && (
              <div className="mx-4 rounded-2xl bg-card border border-border/50 overflow-hidden divide-y divide-border/40">
                {incomingPending.map((f) => (
                  <PendingRow
                    key={f.id}
                    friend={f}
                    direction="incoming"
                    onAccept={() => {
                      haptics.success();
                      acceptRequest.mutate(f.id);
                    }}
                    onDecline={() => {
                      haptics.warning();
                      declineRequest.mutate(f.id);
                    }}
                  />
                ))}
                {outgoingPending.map((f) => (
                  <PendingRow
                    key={f.id}
                    friend={f}
                    direction="outgoing"
                    onAccept={() => {}}
                    onDecline={() => {
                      haptics.warning();
                      declineRequest.mutate(f.id);
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Accepted friends sections */}
        {!isLoading && showAcceptedSections && (
          <>
            {filter === 'favorites' ? (
              <FriendSection
                title={`Favoris (${buckets.rest.length})`}
                friends={buckets.rest}
                onTap={handleOpenDM}
                onLongPress={(f) => {
                  haptics.medium();
                  setActionFriend(f);
                }}
                onToggleFavorite={(f) =>
                  toggleFavorite.mutate({ friendUserId: f.userId, isFavorite: f.isFavorite })
                }
                onMessage={handleOpenDM}
              />
            ) : (
              <>
                {buckets.day.length > 0 && (
                  <FriendSection
                    title={`Aujourd'hui (${buckets.day.length})`}
                    friends={buckets.day}
                    onTap={handleOpenDM}
                    onLongPress={(f) => {
                      haptics.medium();
                      setActionFriend(f);
                    }}
                    onToggleFavorite={(f) =>
                      toggleFavorite.mutate({ friendUserId: f.userId, isFavorite: f.isFavorite })
                    }
                    onMessage={handleOpenDM}
                  />
                )}
                {buckets.week.length > 0 && (
                  <FriendSection
                    title={`Cette semaine (${buckets.week.length})`}
                    friends={buckets.week}
                    onTap={handleOpenDM}
                    onLongPress={(f) => {
                      haptics.medium();
                      setActionFriend(f);
                    }}
                    onToggleFavorite={(f) =>
                      toggleFavorite.mutate({ friendUserId: f.userId, isFavorite: f.isFavorite })
                    }
                    onMessage={handleOpenDM}
                  />
                )}
                {buckets.month.length > 0 && (
                  <FriendSection
                    title={`Ce mois-ci (${buckets.month.length})`}
                    friends={buckets.month}
                    onTap={handleOpenDM}
                    onLongPress={(f) => {
                      haptics.medium();
                      setActionFriend(f);
                    }}
                    onToggleFavorite={(f) =>
                      toggleFavorite.mutate({ friendUserId: f.userId, isFavorite: f.isFavorite })
                    }
                    onMessage={handleOpenDM}
                  />
                )}
                {buckets.rest.length > 0 && (
                  <FriendSection
                    title={`Tous les amis (${buckets.rest.length})`}
                    friends={buckets.rest}
                    onTap={handleOpenDM}
                    onLongPress={(f) => {
                      haptics.medium();
                      setActionFriend(f);
                    }}
                    onToggleFavorite={(f) =>
                      toggleFavorite.mutate({ friendUserId: f.userId, isFavorite: f.isFavorite })
                    }
                    onMessage={handleOpenDM}
                  />
                )}
              </>
            )}
          </>
        )}

        {/* Empty states */}
        {!isLoading && filtered.length === 0 && !showPendingSection && (
          <EmptyState
            search={search}
            filter={filter}
            onAdd={() => setShowAddModal(true)}
            onClearSearch={() => setSearch('')}
          />
        )}

        <div className="h-8" />
      </div>

      {/* Long-press action sheet */}
      <MobileFriendActionSheet
        friend={actionFriend}
        open={!!actionFriend}
        onOpenChange={(o) => !o && setActionFriend(null)}
        onMessage={() => actionFriend && handleOpenDM(actionFriend)}
        onToggleFavorite={() =>
          actionFriend &&
          toggleFavorite.mutate({
            friendUserId: actionFriend.userId,
            isFavorite: actionFriend.isFavorite,
          })
        }
        onViewProfile={() => actionFriend && handleOpenDM(actionFriend)}
        onRemove={() => {
          if (actionFriend?.friendshipId) removeFriend.mutate(actionFriend.friendshipId);
        }}
      />

      {/* Add friend modal */}
      {showAddModal && <AddFriendModal onClose={() => setShowAddModal(false)} />}
    </MobileProfileSubpage>
  );
}

// -----------------------------------------------------------------------------

function FriendSection({
  title,
  friends,
  onTap,
  onLongPress,
  onToggleFavorite,
  onMessage,
}: {
  title: string;
  friends: MergedFriend[];
  onTap: (f: MergedFriend) => void;
  onLongPress: (f: MergedFriend) => void;
  onToggleFavorite: (f: MergedFriend) => void;
  onMessage: (f: MergedFriend) => void;
}) {
  return (
    <section className="mt-2">
      <h3 className="px-6 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="mx-4 rounded-2xl bg-card border border-border/50 overflow-hidden divide-y divide-border/40">
        {friends.map((f) => (
          <MobileFriendCard
            key={f.userId}
            friend={f}
            onTap={() => onTap(f)}
            onLongPress={() => onLongPress(f)}
            onToggleFavorite={() => onToggleFavorite(f)}
            onMessage={() => onMessage(f)}
          />
        ))}
      </div>
    </section>
  );
}

function PendingRow({
  friend,
  direction,
  onAccept,
  onDecline,
}: {
  friend: FriendWithProfile;
  direction: 'incoming' | 'outgoing';
  onAccept: () => void;
  onDecline: () => void;
}) {
  const data: MobileFriendCardData = {
    userId: friend.profile.id,
    displayName: friend.profile.display_name,
    username: friend.profile.username,
    avatarUrl: friend.profile.avatar_url,
    status: friend.profile.status,
    customStatus: friend.profile.custom_status,
    isFavorite: false,
    metricLabel: direction === 'incoming' ? 'Demande reçue' : 'Demande envoyée',
  };

  return (
    <MobileFriendCard
      friend={data}
      onTap={() => {}}
      onLongPress={() => {}}
      onToggleFavorite={() => {}}
      onMessage={() => {}}
      swipeDisabled
      rightSlot={
        direction === 'incoming' ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAccept();
              }}
              className="w-11 h-11 rounded-full bg-[hsl(var(--online))]/15 text-[hsl(var(--online))] flex items-center justify-center active:bg-[hsl(var(--online))]/25"
              aria-label="Accepter la demande d'ami"
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDecline();
              }}
              className="w-11 h-11 rounded-full bg-[hsl(var(--destructive))]/15 text-[hsl(var(--destructive))] flex items-center justify-center active:bg-[hsl(var(--destructive))]/25"
              aria-label="Refuser la demande d'ami"
            >
              <X className="w-5 h-5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDecline();
            }}
            className="h-9 px-3 rounded-full bg-muted/60 text-xs font-semibold text-muted-foreground active:bg-muted"
            aria-label="Annuler la demande envoyée"
          >
            Annuler
          </button>
        )
      }
    />
  );
}

function EmptyState({
  search,
  filter,
  onAdd,
  onClearSearch,
}: {
  search: string;
  filter: FilterKey;
  onAdd: () => void;
  onClearSearch: () => void;
}) {
  if (search) {
    return (
      <div className="mx-4 mt-4 rounded-2xl bg-card border border-border/50 p-8 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground mb-3">
          <Search className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium">Aucun résultat</p>
        <p className="text-xs text-muted-foreground/80 mt-1 mb-4">
          Aucun ami ne correspond à « {search} »
        </p>
        <button
          type="button"
          onClick={onClearSearch}
          className="h-10 px-5 rounded-full bg-muted/60 text-sm font-semibold active:bg-muted"
        >
          Effacer la recherche
        </button>
      </div>
    );
  }

  const messages: Record<FilterKey, { title: string; subtitle: string }> = {
    all: {
      title: 'Aucun ami pour le moment',
      subtitle: 'Ajoute ton premier ami pour commencer à discuter.',
    },
    online: {
      title: 'Personne en ligne',
      subtitle: 'Aucun de tes amis n\'est connecté actuellement.',
    },
    favorites: {
      title: 'Aucun favori',
      subtitle: 'Marque tes amis préférés en étoile pour les retrouver ici.',
    },
    pending: {
      title: 'Aucune demande',
      subtitle: 'Tu n\'as pas de demande d\'ami en attente.',
    },
  };

  const { title, subtitle } = messages[filter];

  return (
    <div className="mx-4 mt-4 rounded-2xl bg-card border border-border/50 p-8 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
        <Users className="w-7 h-7" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground/80 mt-1 mb-4 max-w-[260px]">{subtitle}</p>
      {filter === 'all' && (
        <button
          type="button"
          onClick={onAdd}
          className="h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 active:opacity-90"
        >
          <UserPlus className="w-4 h-4" />
          Ajouter un ami
        </button>
      )}
    </div>
  );
}
