import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useScrollAwareContextMenuGuard } from '@/hooks/useScrollAwareContextMenuGuard';
import { Users, Plus, MoreHorizontal } from '@/components/icons/discord/lucide';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useFriends } from '@/hooks/useFriends';
import { NitroIcon, ShopIcon, QuestIcon } from './DMNavIcons';
import { DMList } from './DMList';
import { LazyDMConversation as DMConversation, LazyInboxPanel as InboxPanel } from '@/components/lazy/LazyModals';
import { NewMessageModal } from './NewMessageModal';
import { CleanUpGroupDMsDialog } from './CleanUpGroupDMsDialog';
import { FriendsPanel } from '@/components/friends/FriendsPanel';
import { MentionBadge } from '@/components/ui/MentionBadge';

export type DMView = 'friends' | 'inbox' | 'conversation';

interface DMSidebarProps {
  activeDMId: string | null;
  currentView: DMView;
  onConversationSelect: (conversationId: string) => void;
  onShowFriends: () => void;
  onShowInbox: () => void;
}

/**
 * Left-hand DM sidebar. Index mounts it inside the sidebar column, next to
 * the server rail and above the user panel, exactly where ChannelList sits
 * in a server. It used to live inside DMPage, i.e. outside that column: the
 * column then held only the 72px rail, the user panel stretched it to its
 * own intrinsic width, and an empty strip opened up next to the rail.
 */
const SOON_NAV = [
  { key: 'nitro', label: 'Nitro', badge: false, icon: NitroIcon },
  { key: 'shop', label: 'Boutique', badge: true, icon: ShopIcon },
  { key: 'quests', label: 'Quêtes', badge: false, icon: QuestIcon },
];

export function DMSidebar({
  activeDMId,
  currentView,
  onConversationSelect,
  onShowFriends,
}: DMSidebarProps) {
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [cleanOpen, setCleanOpen] = useState(false);
  const { data: friends = [] } = useFriends();
  const incoming = friends.filter((f) => f.status === 'pending' && f.isIncoming).length;
  const navCls = (active: boolean) =>
    cn(
      'mx-2 flex h-[42px] w-[calc(100%-16px)] items-center gap-3 rounded-lg px-3 text-base font-medium transition-colors',
      active ? 'bg-[hsl(var(--interactive-background-selected))] text-white' : 'text-[hsl(var(--interactive-icon-default))] hover:bg-[hsl(var(--interactive-background-hover))] hover:text-[hsl(var(--interactive-text-hover))]',
    );

  return (
    <div className="w-[280px] h-full min-h-0 bg-surface-1 flex flex-col rounded-tl-[11px]">
      <div className="h-12 px-2.5 flex items-center shrink-0 border-b border-[hsl(var(--frame-border))]">
        <button
          type="button"
          onClick={() => setShowNewMessageModal(true)}
          className="h-[30px] w-full truncate rounded-[6px] bg-[hsl(var(--surface-card))] px-2.5 text-center text-sm font-medium text-[#dbdee1] transition-colors hover:text-white"
        >
          Trouver ou commencer une conversation
        </button>
      </div>

      <div className="pt-2 space-y-[2px] shrink-0">
        <button type="button" onClick={onShowFriends} className={navCls(currentView === 'friends')}>
          <Users className="h-6 w-6 shrink-0" />
          <span className="flex-1 truncate text-left">Amis</span>
          {incoming > 0 && <MentionBadge count={incoming} size="sm" />}
        </button>
        {SOON_NAV.map((n) => (
          <Tooltip key={n.key}>
            <TooltipTrigger asChild>
              <button type="button" onClick={() => toast.info('Bientôt disponible')} className={navCls(false)}>
                <n.icon className="h-6 w-6 shrink-0" />
                <span className="flex-1 truncate text-left">{n.label}</span>
                {n.badge && <span className="rounded-full bg-white px-2 text-[11px] font-bold uppercase leading-[18px] text-[#1e1f22]">Nouveau</span>}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{n.label} — Bientôt disponible</TooltipContent>
          </Tooltip>
        ))}
      </div>

      <div className="mx-2 mt-2 h-px bg-[hsl(var(--frame-border))] shrink-0" />
      <div className="group/hdr flex h-[42px] shrink-0 items-center px-4 pt-3">
        <h3 className="flex-1 text-sm font-medium text-[hsl(var(--interactive-icon-default))] group-hover/hdr:text-[hsl(var(--interactive-text-hover))]">Messages privés</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label="Nettoyer les MP de groupe inactifs" onClick={() => setCleanOpen(true)} className="mr-2 hidden h-4 w-4 items-center justify-center text-[hsl(var(--interactive-icon-default))] hover:text-white group-hover/hdr:flex">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Nettoyer les MP de groupe…</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label="Créer un MP" onClick={() => setShowNewMessageModal(true)} className="flex h-4 w-4 items-center justify-center text-[hsl(var(--interactive-icon-default))] hover:text-white">
              <Plus className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Créer un MP</TooltipContent>
        </Tooltip>
      </div>

      <DMListScroll activeDMId={activeDMId} onOpen={onConversationSelect} />
      <CleanUpGroupDMsDialog open={cleanOpen} onOpenChange={setCleanOpen} />

      {showNewMessageModal && (
        <NewMessageModal
          onClose={() => setShowNewMessageModal(false)}
          onOpenDM={onConversationSelect}
        />
      )}
    </div>
  );
}

interface DMPageProps {
  activeDMId: string | null;
  currentView: DMView;
  onConversationSelect: (conversationId: string) => void;
  onShowFriends: () => void;
}

/** Main content of the home view (friends, inbox or an open conversation). */
export function DMPage({
  activeDMId,
  currentView,
  onConversationSelect,
  onShowFriends
}: DMPageProps) {
  return (
    <div className="flex-1 flex min-w-0 bg-background">
      {currentView === 'inbox' ? (
        <InboxPanel />
      ) : currentView === 'friends' ? (
        <FriendsPanel onOpenDM={onConversationSelect} />
      ) : activeDMId ? (
        <DMConversation conversationId={activeDMId} onBack={onShowFriends} />
      ) : null}
    </div>
  );
}

function DMListScroll({
  activeDMId,
  onOpen,
}: {
  activeDMId: string | null;
  onOpen: (id: string) => void;
}) {
  const guard = useScrollAwareContextMenuGuard();
  return (
    // pb : le panneau utilisateur flotte par-dessus le bas de la colonne.
    <div className="flex-1 overflow-y-auto pb-[76px]" {...guard}>
      <DMList activeConversationId={activeDMId} onConversationSelect={onOpen} />
    </div>
  );
}