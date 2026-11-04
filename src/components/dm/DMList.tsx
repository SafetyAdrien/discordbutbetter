import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Phone, Pin, Star, X, Users, MessageCircle } from '@/components/icons/discord/lucide';
import { IdCard, Image as ImageIcon } from '@/components/icons/discord/lucide';
import { cn } from '@/lib/utils';
import { useDMConversations, type DMConversation } from '@/hooks/useDMs';
import { useAllDMCalls } from '@/hooks/useDMCalls';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { useDMMentionCounts } from '@/hooks/useDMMentionCounts';
import { useDMPrefs } from '@/hooks/useDMPrefs';
import { useFavorites } from '@/hooks/useFavorites';
import { useBlockUser, useRelationTo, useSendFriendRequest, useUnblockUser } from '@/hooks/useFriends';
import { useRelations } from '@/hooks/useRelations';
import { useInviteUserToServer } from '@/hooks/useInviteUserToServer';
import { FriendNicknameDialog, RemoveFriendDialog } from './RelationDialogs';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useServers } from '@/hooks/useServers';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatarImage } from '@/components/ui/user-avatar-image';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { MentionBadge } from '@/components/ui/MentionBadge';
import { ServerTagBadge } from '@/components/server-tags/ServerTagBadge';
import { FullUserProfileModal } from '@/components/profile/FullUserProfileModal';
import { copyToClipboard } from '@/lib/clipboard';
import { uuidToSnowflake } from '@/lib/snowflake';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

/*
 * Liste des messages prives (video de reference) : lignes de 42px (avatar 32px + pastille de statut, nom, tag de
 * serveur, statut perso dessous), epingle a droite, croix au survol pour fermer le MP, epingles en tete. Clic droit :
 * menu du MP (epingler, favoris, profil, appel, note, fermer, applications, inviter, ami, ignorer, bloquer, muet,
 * avatar, identifiants).
 */

interface DMListProps {
  activeConversationId: string | null;
  onConversationSelect: (conversationId: string) => void;
}

const ITEM = 'min-h-[33px] px-2 py-1.5 text-sm whitespace-nowrap';
const SUB = cn(ITEM, '[&>svg:last-child]:!h-[11px] [&>svg:last-child]:!w-[11px]');
const MINUTE = 60_000;
const MUTES: { label: string; ms: number | null }[] = [
  { label: 'Pendant 15 minutes', ms: 15 * MINUTE },
  { label: 'Pendant 1 heure', ms: 60 * MINUTE },
  { label: 'Pendant 3 heures', ms: 180 * MINUTE },
  { label: 'Pendant 8 heures', ms: 480 * MINUTE },
  { label: 'Pendant 24 heures', ms: 1440 * MINUTE },
  { label: "Jusqu'à ce que je le réactive", ms: null },
];

function SkeletonRows() {
  return (
    <div className="px-2" aria-busy>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex h-[42px] items-center gap-3 px-2" style={{ opacity: Math.max(0.15, 1 - i * 0.09) }}>
          <span className="h-8 w-8 shrink-0 rounded-full bg-white/[0.05]" />
          <span className="h-3 rounded-full bg-white/[0.05]" style={{ width: 90 + ((i * 37) % 60) }} />
        </div>
      ))}
    </div>
  );
}

export function DMList({ activeConversationId, onConversationSelect }: DMListProps) {
  const { data: conversations = [], isLoading } = useDMConversations();
  const { unreadCounts } = useUnreadCounts();
  const { mentionCounts } = useDMMentionCounts();
  const { pinned, hidden } = useDMPrefs();
  const calls = useAllDMCalls();
  const callIds = useMemo(() => new Set(calls.map((c) => c.conversation_id)), [calls]);

  const list = useMemo(() => {
    const visible = conversations.filter((c) => !hidden.includes(c.id) || c.id === activeConversationId);
    const rank = (c: DMConversation) => (pinned.includes(c.id) ? pinned.indexOf(c.id) : 1e6);
    return [...visible].sort((a, b) => rank(a) - rank(b));
  }, [conversations, hidden, pinned, activeConversationId]);

  if (isLoading && conversations.length === 0) return <SkeletonRows />;

  if (list.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <MessageCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Pas de conversations</p>
      </div>
    );
  }

  return (
    <div className="px-2">
      {list.map((conv) => (
        <DMConversationItem
          key={conv.id}
          conversation={conv}
          isActive={activeConversationId === conv.id}
          inCall={callIds.has(conv.id)}
          unreadCount={unreadCounts[conv.id] || 0}
          mentionCount={mentionCounts[conv.id] || 0}
          onClick={() => onConversationSelect(conv.id)}
        />
      ))}
    </div>
  );
}

function DMConversationItem({
  conversation,
  isActive,
  inCall,
  unreadCount,
  mentionCount,
  onClick,
}: {
  conversation: DMConversation;
  isActive: boolean;
  inCall: boolean;
  unreadCount: number;
  mentionCount: number;
  onClick: () => void;
}) {
  const { user } = useAuth();
  const participants = conversation.participants || [];
  const participant = participants.find((p) => p.id !== user?.id) ?? participants[0];
  const displayName = conversation.is_group ? conversation.name || participants.map((p) => p.display_name).join(', ') || 'Groupe' : participant?.display_name || 'Utilisateur';
  const avatarUrl = conversation.is_group ? conversation.icon_url : participant?.avatar_url;
  const status = participant?.status || 'offline';
  const customStatus = (participant as { custom_status?: string | null } | undefined)?.custom_status ?? null;

  const prefs = useDMPrefs();
  const isPinned = prefs.pinned.includes(conversation.id);
  const muted = prefs.isMuted(conversation.id);
  const fav = useFavorites();
  const favorite = fav.find('dm', conversation.id);
  const { markAsRead } = useUnreadCounts();
  const { row: friendship, isFriend, isBlocked } = useRelationTo(participant?.id);
  const { nameFor, nicknameOf, isIgnored, toggleIgnore } = useRelations();
  const block = useBlockUser();
  const unblock = useUnblockUser();
  const sendRequest = useSendFriendRequest();
  const invite = useInviteUserToServer();
  const queryClient = useQueryClient();
  // Appel direct (sans abonnement temps reel : la conversation ouverte a deja le sien).
  const startCall = async () => {
    if (!user) return;
    const { error } = await supabase.from('dm_calls').insert({ conversation_id: conversation.id, initiator_id: user.id, call_type: 'voice', status: 'ringing' });
    if (error) toast.error("Impossible de lancer l'appel");
    else void queryClient.invalidateQueries({ queryKey: ['dm-call', conversation.id] });
  };
  const { data: servers = [] } = useServers();
  const [profileOpen, setProfileOpen] = useState(false);
  const [nickOpen, setNickOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const ignored = isIgnored(participant?.id);
  const nickname = nicknameOf(participant?.id);
  const shownName = conversation.is_group ? displayName : nameFor(participant?.id, displayName);

  const addToFavorites = (categoryId: string | null) =>
    fav.add([{ kind: 'dm', ref_id: conversation.id, server_id: null, channel_id: null, name: shownName, sub: conversation.is_group ? null : participant?.username ?? null, icon_url: avatarUrl ?? null, ch_type: null, category_id: categoryId }]);

  const subLine = customStatus || (conversation.is_group ? `${participants.length} membres` : null);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={cn(
              'group relative flex h-[42px] w-full items-center gap-3 rounded-lg px-2 text-left transition-colors',
              isActive ? 'bg-[hsl(var(--interactive-background-selected))] text-white' : 'text-[hsl(var(--interactive-icon-default))] hover:bg-[hsl(var(--interactive-background-hover))] hover:text-[hsl(var(--interactive-text-hover))]',
              (unreadCount > 0 || mentionCount > 0) && !muted && !isActive && 'text-white',
              muted && !isActive && 'opacity-50',
            )}
          >
            <span className="relative shrink-0">
              {conversation.is_group ? (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5865f2] text-white"><Users className="h-4 w-4" /></span>
              ) : (
                <UserAvatarImage src={avatarUrl} alt="" className="h-8 w-8" fallbackClassName="text-sm" fallback={displayName.charAt(0).toUpperCase()} ownerId={participant?.id} />
              )}
              {!conversation.is_group && (
                <StatusIndicator status={status} className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 border-[3px] border-[hsl(var(--surface-1))]" bgClassName="bg-[hsl(var(--surface-1))]" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span translate="no" className="truncate text-base font-medium leading-5">{shownName}</span>
                {!conversation.is_group && participant && <ServerTagBadge userId={participant.id} variant="compact" interactive={false} />}
              </span>
              {inCall ? (
                <span className="flex items-center gap-1 truncate text-xs leading-4 text-[hsl(var(--interactive-icon-default))]">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-[#23a55a]" fill="currentColor" aria-hidden><path d="M17.7 13.3a1 1 0 00-1.2-.2l-2 1a12 12 0 01-4.8-4.8l1-2a1 1 0 00-.2-1.2L8.6 3.6a1 1 0 00-1.3-.1L4.8 5.3a2 2 0 00-.7 2 18 18 0 0012.4 12.4 2 2 0 002-.7l1.8-2.5a1 1 0 00-.1-1.3l-2.5-1.9z" /></svg>
                  Dans un appel
                </span>
              ) : subLine && <span translate="no" className="block truncate text-xs leading-4 text-[hsl(var(--interactive-icon-default))]">{subLine}</span>}
            </span>
            {!muted && (mentionCount > 0 ? <MentionBadge count={mentionCount} size="sm" /> : unreadCount > 0 ? <span aria-label="Messages non lus" className="h-2 w-2 shrink-0 rounded-full bg-white" /> : null)}
            {isPinned && <Pin className="h-4 w-4 shrink-0 text-[hsl(var(--interactive-icon-default))] group-hover:hidden" />}
            <span
              role="button"
              aria-label="Fermer le MP"
              onClick={(e) => {
                e.stopPropagation();
                prefs.close(conversation.id);
              }}
              className="hidden h-4 w-4 shrink-0 items-center justify-center text-[hsl(var(--interactive-icon-default))] hover:text-white group-hover:flex"
            >
              <X className="h-4 w-4" />
            </span>
          </button>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-max min-w-[221px] max-h-[calc(100vh-16px)] overflow-y-auto scrollbar-thin">
          <ContextMenuItem className={ITEM} disabled={unreadCount === 0 && mentionCount === 0} onSelect={() => markAsRead.mutate(conversation.id)}>Marquer comme lu</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem className={ITEM} onSelect={() => prefs.togglePin(conversation.id)}><Pin className="h-[18px] w-[18px]" /> {isPinned ? 'Désépingler' : 'Épingler'}</ContextMenuItem>
          {favorite ? (
            <ContextMenuItem className={ITEM} onSelect={() => fav.remove(favorite.id)}><Star className="h-[18px] w-[18px] fill-current" /> Retirer des favoris</ContextMenuItem>
          ) : (
            <ContextMenuSub>
              <ContextMenuSubTrigger className={SUB}><Star className="h-[18px] w-[18px]" /> Ajouter aux favoris</ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-[180px]">
                <ContextMenuItem className={ITEM} onSelect={() => addToFavorites(null)}>Favoris</ContextMenuItem>
                {fav.categories.map((c) => <ContextMenuItem key={c.id} className={ITEM} onSelect={() => addToFavorites(c.id)}>{c.name}</ContextMenuItem>)}
              </ContextMenuSubContent>
            </ContextMenuSub>
          )}
          <ContextMenuSeparator />
          {!conversation.is_group && <ContextMenuItem className={ITEM} onSelect={() => setProfileOpen(true)}>Profil</ContextMenuItem>}
          <ContextMenuItem className={ITEM} onSelect={() => { onClick(); void startCall(); }}>Commence un appel</ContextMenuItem>
          {!conversation.is_group && (
            <ContextMenuItem className={cn(ITEM, 'min-h-[44px]')} onSelect={() => setProfileOpen(true)}>
              <span className="flex flex-col"><span>Ajouter une note</span><span className="text-xs font-normal text-[#b5bac1]">Seulement visible par toi</span></span>
            </ContextMenuItem>
          )}
          {!conversation.is_group && isFriend && <ContextMenuItem className={ITEM} onSelect={() => setNickOpen(true)}>{nickname ? "Modifier un pseudo d'ami" : "Ajouter un pseudo d'ami"}</ContextMenuItem>}
          <ContextMenuItem className={ITEM} onSelect={() => prefs.close(conversation.id)}>Fermer le MP</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuSub>
            <ContextMenuSubTrigger className={SUB}>Applications</ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-max min-w-[200px]"><ContextMenuItem className={ITEM} disabled>Aucune commande n'est disponible</ContextMenuItem></ContextMenuSubContent>
          </ContextMenuSub>
          {!conversation.is_group && participant && (
            <ContextMenuSub>
              <ContextMenuSubTrigger className={SUB}>Inviter sur le serveur</ContextMenuSubTrigger>
              <ContextMenuSubContent className="max-h-[420px] w-max min-w-[220px] max-w-[380px] overflow-y-auto scrollbar-thin">
                {servers.length === 0 ? <ContextMenuItem className={ITEM} disabled>Aucun serveur</ContextMenuItem> : servers.map((sv) => <ContextMenuItem key={sv.id} translate="no" className={cn(ITEM, 'truncate')} onSelect={() => void invite(participant.id, sv.id, sv.name)}>{sv.name}</ContextMenuItem>)}
              </ContextMenuSubContent>
            </ContextMenuSub>
          )}
          {!conversation.is_group && isFriend && <ContextMenuItem className={ITEM} onSelect={() => setRemoveOpen(true)}>Retirer l'ami</ContextMenuItem>}
          {!conversation.is_group && !isFriend && !isBlocked && participant && <ContextMenuItem className={ITEM} disabled={!!friendship} onSelect={() => sendRequest.mutate(participant.username)}>{friendship ? "Demande d'ami envoyée" : 'Ajouter'}</ContextMenuItem>}
          {participant && !conversation.is_group && (
            <>
              <ContextMenuItem className={ITEM} onSelect={() => { toggleIgnore(participant.id); toast.success(ignored ? `${displayName} n'est plus ignoré` : `${displayName} est ignoré`); }}>{ignored ? 'Ne plus ignorer' : 'Ignorer'}</ContextMenuItem>
              <ContextMenuItem className={cn(ITEM, 'text-[#f57976] focus:text-[#f57976] data-[highlighted]:text-[#f57976]')} onSelect={() => (isBlocked ? unblock.mutate(participant.id) : block.mutate({ id: participant.id, name: displayName }))}>{isBlocked ? 'Débloquer' : 'Bloquer'}</ContextMenuItem>
            </>
          )}
          <ContextMenuSeparator />
          <ContextMenuSub>
            <ContextMenuSubTrigger className={SUB}>{muted ? 'Réactiver le son' : `Rendre muet ${conversation.is_group ? 'le groupe' : `@${shownName}`}`}</ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-[260px]">
              {muted ? (
                <ContextMenuItem className={ITEM} onSelect={() => prefs.unmute(conversation.id)}>Réactiver le son</ContextMenuItem>
              ) : (
                MUTES.map((m) => <ContextMenuItem key={m.label} className={ITEM} onSelect={() => prefs.mute(conversation.id, m.ms)}>{m.label}</ContextMenuItem>)
              )}
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          {avatarUrl && <ContextMenuItem className={ITEM} onSelect={() => window.open(avatarUrl, '_blank', 'noopener,noreferrer')}><ImageIcon className="h-[18px] w-[18px]" /> View Avatar</ContextMenuItem>}
          <ContextMenuSeparator />
          {participant && !conversation.is_group && (
            <ContextMenuItem className={ITEM} onSelect={() => void copyToClipboard(uuidToSnowflake(participant.id), 'Identifiant copié')}><IdCard className="h-[18px] w-[18px]" /> Copier l'identifiant de l'utilisateur</ContextMenuItem>
          )}
          <ContextMenuItem className={ITEM} onSelect={() => void copyToClipboard(uuidToSnowflake(conversation.id), 'Identifiant copié')}><IdCard className="h-[18px] w-[18px]" /> Copier l'identifiant du salon</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {participant && !conversation.is_group && (
        <FullUserProfileModal
          user={{ id: participant.id, display_name: participant.display_name, username: participant.username, avatar_url: participant.avatar_url, banner_url: participant.banner_url ?? null, bio: participant.bio ?? null, status: status as string }}
          open={profileOpen}
          onOpenChange={setProfileOpen}
          initialTab="about"
        />
      )}
      {participant && !conversation.is_group && (
        <>
          <FriendNicknameDialog open={nickOpen} onOpenChange={setNickOpen} userId={participant.id} displayName={participant.display_name} />
          <RemoveFriendDialog open={removeOpen} onOpenChange={setRemoveOpen} friendshipId={friendship?.id ?? null} username={participant.username} />
        </>
      )}
    </>
  );
}
