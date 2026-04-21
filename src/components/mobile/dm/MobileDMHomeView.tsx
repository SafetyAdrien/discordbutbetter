import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useDMConversations } from '@/hooks/useDMs';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { useFavoriteFriendIds, useToggleFavoriteFriend } from '@/hooks/useFavoriteFriends';
import { useDMCalls } from '@/hooks/useDMCalls';
import { useDMLocalSet } from '@/lib/dm-local-prefs';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { MobilePullIndicator } from '@/components/mobile/MobilePullIndicator';
import { MobileDMListItem, type MobileDMListItemData } from './MobileDMListItem';
import { MobileDMActionSheet } from './MobileDMActionSheet';
import { NewDMSheet } from '@/components/dm/NewDMSheet';
import { NewMessageModal } from '@/components/dm/NewMessageModal';
import { CreateGroupModal } from '@/components/dm/CreateGroupModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, MessageSquarePlus, Search, Star, UsersRound, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';

type FilterId = 'all' | 'unread' | 'groups' | 'favorites';

interface Props {
  activeDMId: string | null;
  onConversationSelect: (id: string) => void;
  onOpenProfile?: () => void;
}

const TODAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * TODAY_MS;

export function MobileDMHomeView({
  activeDMId: _activeDMId,
  onConversationSelect,
  onOpenProfile,
}: Props) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: conversations = [] } = useDMConversations();
  const { unreadCounts, markAsRead } = useUnreadCounts();
  const { data: favoriteIds = [] } = useFavoriteFriendIds();
  const toggleFavorite = useToggleFavoriteFriend();
  const muted = useDMLocalSet(user?.id, 'muted');
  const archived = useDMLocalSet(user?.id, 'archived');

  const [filter, setFilter] = useState<FilterId>('all');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [actionItem, setActionItem] = useState<MobileDMListItemData | null>(null);
  const fabHoldRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { containerRef, pullDistance, progress, refreshing } = usePullToRefresh<HTMLDivElement>({
    onRefresh: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dm-conversations'] }),
        queryClient.invalidateQueries({ queryKey: ['unread-counts'] }),
        queryClient.invalidateQueries({ queryKey: ['friend-favorites'] }),
      ]);
    },
  });

  // Cleanup any held FAB timer
  useEffect(() => () => {
    if (fabHoldRef.current) clearTimeout(fabHoldRef.current);
  }, []);

  // Compute list items with all metadata baked in
  const items: MobileDMListItemData[] = useMemo(() => {
    return conversations
      .filter((c) => !archived.set.has(c.id))
      .map((c) => {
        const p = c.participants?.[0];
        const isGroup = !!c.is_group;
        const otherUserId = p?.id ?? null;
        const last = c.lastMessage;
        const lastIsOwn = !!user && last?.author_id === user.id;
        return {
          conversationId: c.id,
          displayName: isGroup ? c.name || 'Groupe' : p?.display_name || 'Utilisateur',
          username: isGroup ? null : p?.username || null,
          avatarUrl: isGroup ? c.icon_url || null : p?.avatar_url || null,
          isGroup,
          groupSize: isGroup ? (c.participants?.length || 0) + 1 : undefined,
          status: (p?.status as any) || null,
          customStatus: undefined,
          lastMessage: last
            ? {
                content: last.content,
                createdAt: last.created_at,
                authorName: last.author_display_name,
                isOwn: lastIsOwn,
                hasAttachment: null,
              }
            : undefined,
          unreadCount: unreadCounts[c.id] || 0,
          isMuted: muted.set.has(c.id),
          isFavorite: !!otherUserId && favoriteIds.includes(otherUserId),
          isTyping: false,
        } satisfies MobileDMListItemData;
      });
  }, [conversations, user, unreadCounts, muted.set, archived.set, favoriteIds]);

  // Filter + search
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (filter === 'unread' && it.unreadCount === 0) return false;
      if (filter === 'groups' && !it.isGroup) return false;
      if (filter === 'favorites' && !it.isFavorite) return false;
      if (!q) return true;
      const hay = [
        it.displayName,
        it.username || '',
        it.lastMessage?.content || '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, filter, search]);

  // Section grouping (only when filter === 'all' & no search)
  const sections = useMemo(() => {
    if (filter !== 'all' || search.trim()) {
      return [{ id: 'flat' as const, label: '', items: visible }];
    }
    const now = Date.now();
    const favs: MobileDMListItemData[] = [];
    const today: MobileDMListItemData[] = [];
    const week: MobileDMListItemData[] = [];
    const older: MobileDMListItemData[] = [];
    visible.forEach((it) => {
      if (it.isFavorite) {
        favs.push(it);
        return;
      }
      const t = it.lastMessage?.createdAt ? new Date(it.lastMessage.createdAt).getTime() : 0;
      const age = now - t;
      if (!t) {
        older.push(it);
      } else if (age < TODAY_MS) {
        today.push(it);
      } else if (age < WEEK_MS) {
        week.push(it);
      } else {
        older.push(it);
      }
    });
    return [
      { id: 'fav' as const, label: 'Favoris', icon: Star, items: favs },
      { id: 'today' as const, label: "Aujourd'hui", items: today },
      { id: 'week' as const, label: 'Cette semaine', items: week },
      { id: 'older' as const, label: 'Plus ancien', items: older },
    ].filter((s) => s.items.length > 0);
  }, [visible, filter, search]);

  const totalUnread = useMemo(
    () => Object.values(unreadCounts).reduce((sum, n) => sum + (n || 0), 0),
    [unreadCounts],
  );
  const subtitle = `${conversations.length} conversation${conversations.length > 1 ? 's' : ''}${totalUnread > 0 ? ` · ${totalUnread} non lue${totalUnread > 1 ? 's' : ''}` : ''}`;

  const handleArchive = (item: MobileDMListItemData) => {
    archived.add(item.conversationId);
    toast.success('Conversation archivée', {
      description: 'Elle est masquée localement.',
      action: {
        label: 'Annuler',
        onClick: () => archived.remove(item.conversationId),
      },
    });
  };

  const handleToggleMute = (item: MobileDMListItemData) => {
    muted.toggle(item.conversationId);
    toast.success(
      item.isMuted ? 'Notifications réactivées' : 'Notifications coupées',
    );
  };

  const handleMarkRead = (item: MobileDMListItemData) => {
    if (item.unreadCount === 0) return;
    markAsRead.mutate(item.conversationId);
  };

  const filters: { id: FilterId; label: string; icon?: typeof Star; badge?: number }[] = [
    { id: 'all', label: 'Tous' },
    { id: 'unread', label: 'Non lus', badge: totalUnread },
    { id: 'groups', label: 'Groupes', icon: UsersRound },
    { id: 'favorites', label: 'Favoris', icon: Star },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header
        className="px-3 pt-3 pb-2 flex items-center gap-2 border-b border-border bg-[hsl(var(--surface-header))]"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)' }}
      >
        <button
          type="button"
          onClick={() => {
            haptics.selection();
            onOpenProfile?.();
          }}
          aria-label="Mon profil"
          className="shrink-0 active:opacity-70"
        >
          <Avatar className="w-9 h-9">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary text-sm">
              {(profile?.display_name || '?').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold leading-tight">Messages</h1>
          <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              haptics.selection();
              onShowInbox();
            }}
            aria-label="Boîte de réception"
            className="w-11 h-11 rounded-full active:bg-muted/60 flex items-center justify-center relative"
          >
            <Inbox className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              haptics.selection();
              onShowFriends();
            }}
            aria-label="Amis"
            className="w-11 h-11 rounded-full active:bg-muted/60 flex items-center justify-center"
          >
            <Users className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              haptics.selection();
              setShowSearch(true);
            }}
            aria-label="Rechercher une conversation"
            className="w-11 h-11 rounded-full active:bg-muted/60 flex items-center justify-center"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Search bar */}
      <div className="px-3 py-2 bg-[hsl(var(--surface-header))] border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une conversation…"
            aria-label="Rechercher une conversation"
            className="w-full h-10 pl-9 pr-9 rounded-xl bg-[hsl(var(--surface-2))] text-sm placeholder:text-muted-foreground border-0 outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Effacer la recherche"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full active:bg-muted/60"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Filter pills */}
      <div
        className="sticky top-0 z-20 px-3 py-2 flex gap-1.5 overflow-x-auto bg-[hsl(var(--surface-header))] border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Filtres de conversations"
      >
        {filters.map(({ id, label, icon: Icon, badge }) => {
          const active = filter === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              onClick={() => {
                haptics.selection();
                setFilter(id);
              }}
              className={cn(
                'h-9 px-3.5 rounded-full text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-[hsl(var(--surface-2))] text-foreground/80 active:bg-[hsl(var(--surface-3))]',
              )}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{label}</span>
              {id === 'unread' && (badge ?? 0) > 0 && (
                <span
                  className={cn(
                    'min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center',
                    active ? 'bg-primary-foreground/25 text-primary-foreground' : 'bg-destructive text-destructive-foreground',
                  )}
                >
                  {badge! > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List with pull-to-refresh */}
      <div ref={containerRef} className="relative flex-1 overflow-y-auto overscroll-contain">
        <MobilePullIndicator pullDistance={pullDistance} progress={progress} refreshing={refreshing} />

        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center px-8 py-16">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mb-3">
              <MessageCircle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold">
              {search
                ? 'Aucun résultat'
                : filter === 'unread'
                  ? 'Aucun message non lu'
                  : filter === 'groups'
                    ? 'Aucun groupe'
                    : filter === 'favorites'
                      ? 'Aucun favori'
                      : 'Démarre une conversation'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {search
                ? 'Essaie un autre mot-clé.'
                : 'Touche le bouton pour envoyer ton premier message.'}
            </p>
            {!search && filter === 'all' && (
              <button
                type="button"
                onClick={() => {
                  haptics.selection();
                  setShowNew(true);
                }}
                className="mt-4 px-4 h-10 rounded-full bg-primary text-primary-foreground text-sm font-medium active:bg-primary/90"
              >
                Nouveau message
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {sections.map((section) => (
              <div key={section.id}>
                {section.label && (
                  <div className="sticky top-0 z-10 bg-background/95 backdrop-blur px-4 py-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {section.id === 'fav' && <Star className="w-3 h-3 text-[hsl(var(--idle))]" />}
                    {section.label}
                  </div>
                )}
                <div className="flex flex-col">
                  {section.items.map((item) => (
                    <MobileDMListItem
                      key={item.conversationId}
                      item={item}
                      onTap={() => onConversationSelect(item.conversationId)}
                      onLongPress={() => setActionItem(item)}
                      onToggleMute={() => handleToggleMute(item)}
                      onArchive={() => handleArchive(item)}
                      onMarkRead={() => handleMarkRead(item)}
                    />
                  ))}
                </div>
              </div>
            ))}
            <div className="h-24" />
          </div>
        )}
      </div>

      {/* FAB — tap = new DM, long-press = create group */}
      <button
        type="button"
        onClick={() => {
          haptics.selection();
          setShowNew(true);
        }}
        onTouchStart={() => {
          if (fabHoldRef.current) clearTimeout(fabHoldRef.current);
          fabHoldRef.current = setTimeout(() => {
            haptics.medium();
            setShowCreateGroup(true);
          }, 480);
        }}
        onTouchEnd={() => {
          if (fabHoldRef.current) {
            clearTimeout(fabHoldRef.current);
            fabHoldRef.current = null;
          }
        }}
        onTouchCancel={() => {
          if (fabHoldRef.current) {
            clearTimeout(fabHoldRef.current);
            fabHoldRef.current = null;
          }
        }}
        aria-label="Nouveau message — appui long pour créer un groupe"
        className="fixed right-4 z-30 h-14 px-5 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center gap-2 active:scale-95 transition-transform"
        style={{ bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}
      >
        <MessageSquarePlus className="w-5 h-5" />
        <span className="text-sm font-semibold">Nouveau</span>
      </button>

      {/* Action sheet on long-press of a list item */}
      <MobileDMActionSheet
        item={actionItem}
        open={!!actionItem}
        onOpenChange={(o) => !o && setActionItem(null)}
        onViewProfile={() => actionItem && onConversationSelect(actionItem.conversationId)}
        onMessage={() => actionItem && onConversationSelect(actionItem.conversationId)}
        onVoiceCall={() => {
          if (actionItem) onConversationSelect(actionItem.conversationId);
          toast.message('Lance l\'appel depuis la conversation');
        }}
        onVideoCall={() => {
          if (actionItem) onConversationSelect(actionItem.conversationId);
          toast.message('Lance l\'appel vidéo depuis la conversation');
        }}
        onToggleFavorite={() => {
          if (!actionItem) return;
          const conv = conversations.find((c) => c.id === actionItem.conversationId);
          const otherId = conv?.participants?.[0]?.id;
          if (!otherId) return;
          toggleFavorite.mutate({ friendUserId: otherId, isFavorite: actionItem.isFavorite });
        }}
        onMarkReadToggle={() => {
          if (actionItem) handleMarkRead(actionItem);
        }}
        onToggleMute={() => actionItem && handleToggleMute(actionItem)}
        onArchive={() => actionItem && handleArchive(actionItem)}
      />

      {/* Modals */}
      {showNew && <NewDMSheet onClose={() => setShowNew(false)} onOpenDM={onConversationSelect} />}
      {showSearch && <NewMessageModal onClose={() => setShowSearch(false)} onOpenDM={onConversationSelect} />}
      {showCreateGroup && <CreateGroupModal onClose={() => setShowCreateGroup(false)} onOpenDM={onConversationSelect} />}
    </div>
  );
}
