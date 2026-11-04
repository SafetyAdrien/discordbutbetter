import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Phone, Search, UserPlus, Video } from '@/components/icons/discord/lucide';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { UserAvatarImage } from '@/components/ui/user-avatar-image';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { ServerTagBadge } from '@/components/server-tags/ServerTagBadge';
import { DMPinnedMessagesPopover } from './DMPinnedMessagesPopover';
import { CreateGroupModal } from './CreateGroupModal';
import { useBlockUser, useFriends, useSendFriendRequest, useUnblockUser, useRelationTo } from '@/hooks/useFriends';
import { useRelations } from '@/hooks/useRelations';
import { RemoveFriendDialog } from './RelationDialogs';
import { useMutualServers } from '@/hooks/useMutualServers';
import { cn } from '@/lib/utils';

/*
 * En-tete et introduction d'un MP (video de reference). En-tete : avatar 24px + pastille, nom (et statut perso quand
 * ce n'est pas un ami), appel, video, messages epingles, "ajouter des amis au MP", profil, recherche. Introduction :
 * grand avatar, nom, identifiant, "debut de votre historique", "Aucun serveur en commun", boutons selon le lien d'amitie.
 */

export interface DMPerson {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  status: string | null;
  custom_status?: string | null;
}

const ICON = 'flex h-6 w-6 items-center justify-center text-[hsl(var(--interactive-icon-default))] transition-colors hover:text-white disabled:opacity-40 disabled:hover:text-[hsl(var(--interactive-icon-default))]';

const Tip = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent side="bottom">{label}</TooltipContent>
  </Tooltip>
);

export function DMHeader({
  person,
  title,
  isGroup,
  conversationId,
  panelOpen,
  onTogglePanel,
  onVoice,
  onVideo,
  callDisabled,
  onBack,
  onSearch,
  onOpenDM,
  dark = false,
  callState = null,
}: {
  person: DMPerson | null;
  title: string;
  isGroup: boolean;
  conversationId: string;
  panelOpen: boolean;
  onTogglePanel: () => void;
  onVoice: () => void;
  onVideo: () => void;
  callDisabled: boolean;
  onBack?: () => void;
  onSearch: (q: string) => void;
  onOpenDM: (id: string) => void;
  /** Appel en cours : en-tete noir. */
  dark?: boolean;
  /** "in" : je suis dans l'appel ; "other" : un appel est en cours sans moi. */
  callState?: 'in' | 'other' | null;
}) {
  const { data: friends = [] } = useFriends();
  const isFriend = !!person && friends.some((f) => f.status === 'accepted' && f.profile.id === person.id);
  const [q, setQ] = useState('');
  const [groupOpen, setGroupOpen] = useState(false);
  const { nicknameOf } = useRelations();
  const { data: mutual = [] } = useMutualServers(person?.id ?? null);
  const aliased = person && nicknameOf(person.id) ? person : null;
  const serverNicks = mutual.filter((m) => m.nickname);

  const titleNode = <span translate="no" className="truncate text-base font-semibold text-white">{title}</span>;

  return (
    <div className={cn('flex h-12 shrink-0 items-center gap-3 px-4', dark ? 'bg-black' : 'border-b border-[hsl(var(--frame-border))]')}>
      {onBack && (
        <button type="button" onClick={onBack} aria-label="Retour" className={cn(ICON, 'mr-1')}><ArrowLeft className="h-5 w-5" /></button>
      )}
      <button type="button" onClick={onTogglePanel} className="flex min-w-0 items-center gap-2 rounded text-left">
        <span className="relative shrink-0">
          <UserAvatarImage src={person?.avatar_url} alt="" className="h-6 w-6" fallbackClassName="text-[11px]" fallback={title.charAt(0).toUpperCase()} ownerId={person?.id} />
          {person && <StatusIndicator status={person.status || 'offline'} className="absolute -bottom-0.5 -right-1 h-3 w-3 border-2 border-background" bgClassName="bg-background" />}
        </span>
        {aliased ? (
          <Tooltip>
            <TooltipTrigger asChild>{titleNode}</TooltipTrigger>
            <TooltipContent side="bottom" align="start" className="w-[232px] !rounded-xl !px-0 !py-0 !font-normal">
              <div className="flex items-baseline gap-2 px-3.5 pb-2.5 pt-3">
                <span translate="no" className="truncate text-base font-semibold leading-5 text-white">{aliased.username}</span>
                <span className="text-xs font-medium text-[#b5bac1]">Alias</span>
              </div>
              {serverNicks.length > 0 && (
                <div className="mx-3.5 border-t border-white/[0.06] pb-3 pt-2.5">
                  {serverNicks.map((m) => (
                    <div key={m.id} className="flex h-6 items-center justify-between gap-2">
                      <span translate="no" className="truncate text-sm text-white">{m.nickname}</span>
                      <UserAvatarImage src={m.icon_url} alt="" className="h-6 w-6 !rounded-md" fallbackClassName="text-[10px] !rounded-md" fallback={m.name.charAt(0).toUpperCase()} />
                    </div>
                  ))}
                </div>
              )}
            </TooltipContent>
          </Tooltip>
        ) : (
          titleNode
        )}
        {person && <ServerTagBadge userId={person.id} variant="compact" interactive={false} />}
        {callState && (
          <span className="ml-2 flex items-center gap-1.5 text-sm font-normal text-[#dbdee1]">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#23a55a]" fill="currentColor" aria-hidden><path d="M17.7 13.3a1 1 0 00-1.2-.2l-2 1a12 12 0 01-4.8-4.8l1-2a1 1 0 00-.2-1.2L8.6 3.6a1 1 0 00-1.3-.1L4.8 5.3a2 2 0 00-.7 2 18 18 0 0012.4 12.4 2 2 0 002-.7l1.8-2.5a1 1 0 00-.1-1.3l-2.5-1.9z" /></svg>
            Dans un appel
          </span>
        )}
        {!callState && person && !isFriend && person.custom_status && <span translate="no" className="ml-2 truncate text-base font-normal text-[#dbdee1]">{person.custom_status}</span>}
      </button>

      <div className="ml-auto flex items-center gap-4">
        {callState !== 'in' && <Tip label={callState === 'other' ? "Rejoindre l'appel" : 'Démarrer un appel vocal'}><button type="button" aria-label={callState === 'other' ? "Rejoindre l'appel" : 'Démarrer un appel vocal'} onClick={onVoice} disabled={callDisabled && callState !== 'other'} className={ICON}><Phone className="h-6 w-6" /></button></Tip>}
        {!callState && <Tip label="Démarrer un appel vidéo"><button type="button" aria-label="Démarrer un appel vidéo" onClick={onVideo} disabled={callDisabled} className={ICON}><Video className="h-6 w-6" /></button></Tip>}
        <Tip label="Messages épinglés"><div><DMPinnedMessagesPopover conversationId={conversationId} /></div></Tip>
        <Tip label="Ajouter des amis au MP"><button type="button" aria-label="Ajouter des amis au MP" onClick={() => setGroupOpen(true)} className={ICON}><UserPlus className="h-6 w-6" /></button></Tip>
        <Tip label={panelOpen ? "Masquer le profil de l'utilisateur" : "Afficher le profil de l'utilisateur"}>
          <button type="button" aria-label="Profil de l'utilisateur" onClick={onTogglePanel} className={cn(ICON, panelOpen && 'text-white')}>
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden><path d="M12 12a5 5 0 100-10 5 5 0 000 10zM2.5 20.2C2.5 16.6 6.7 14 12 14c1.5 0 2.9.2 4.1.6A6 6 0 0020 22H4a1.5 1.5 0 01-1.5-1.8zM18 15a4 4 0 110 8 4 4 0 010-8zm0 1.5a1 1 0 100 2 1 1 0 000-2zm-1.8 5h3.6c-.4-.9-1.1-1.4-1.8-1.4s-1.4.5-1.8 1.4z" /></svg>
          </button>
        </Tip>
        <label className="flex h-[30px] w-[218px] items-center rounded-[4px] bg-[hsl(var(--surface-card))] pl-2 pr-1.5">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && q.trim() && onSearch(q.trim())}
            placeholder={isGroup || isFriend ? 'Rechercher dans les MP' : `Rechercher ${person?.username ?? ''}`}
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#80848e]"
          />
          <Search className="h-4 w-4 shrink-0 text-[#b5bac1]" />
        </label>
      </div>
      {groupOpen && <CreateGroupModal onClose={() => setGroupOpen(false)} onOpenDM={onOpenDM} />}
    </div>
  );
}

/** "N messages bloques (ou ignores) - Afficher" : remplace les messages d'un compte bloque / ignore. */
export function HiddenMessagesRow({ count, blocked, onShow }: { count: number; blocked: boolean; onShow: () => void }) {
  const plural = count > 1;
  return (
    <div className="flex h-[44px] items-center text-base leading-[22px] text-[#dbdee1]">
      <span className="flex w-[56px] shrink-0 justify-center">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#b5bac1]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></svg>
      </span>
      <span>
        {count} message{plural ? 's' : ''} {blocked ? 'bloqué' : 'ignoré'}{plural ? 's' : ''} —{' '}
        <button type="button" onClick={onShow} className="text-[#949ba4] hover:underline">Afficher</button>
      </span>
    </div>
  );
}

export function DMIntro({ person, title, isGroup }: { person: DMPerson | null; title: string; isGroup: boolean }) {
  const { data: friends = [] } = useFriends();
  const sendRequest = useSendFriendRequest();
  const block = useBlockUser();
  const unblock = useUnblockUser();
  const { data: mutual = [] } = useMutualServers(person?.id ?? '');
  const { row: friendship, isFriend, isPending: requested, isBlocked } = useRelationTo(person?.id);
  const [removeOpen, setRemoveOpen] = useState(false);
  const soon = () => toast.info('Bientôt disponible');
  const btn = 'h-6 shrink-0 rounded-[4px] bg-[hsl(var(--button-secondary))] px-2 text-sm font-medium text-white transition-colors hover:brightness-110';

  return (
    <div className="px-4 pb-4 pt-12">
      <UserAvatarImage src={person?.avatar_url} alt="" className="h-[76px] w-[76px]" fallbackClassName="text-3xl" fallback={title.charAt(0).toUpperCase()} ownerId={person?.id} />
      <h1 translate="no" className="mt-3 break-words text-[32px] font-extrabold leading-10 text-white">{title}</h1>
      {!isGroup && person && <p translate="no" className="text-2xl leading-8 text-[#dbdee1]">{person.username}</p>}
      <p className="mt-4 text-base leading-[22px] text-[#dbdee1]">
        {isGroup ? <>C'est le début de votre historique de messages dans <strong className="font-semibold text-white">{title}</strong>.</> : <>C'est le début de votre historique de messages privés avec <strong className="font-semibold text-white">{title}</strong>.</>}
      </p>
      {!isGroup && person && (
        <div className="mt-2 flex items-center gap-2 text-base text-[#dbdee1]">
          <span>{mutual.length === 0 ? 'Aucun serveur en commun' : `${mutual.length} serveur${mutual.length > 1 ? 's' : ''} en commun`}</span>
          <span aria-hidden className="h-1 w-1 rounded-full bg-[#4e5058]" />
          {isFriend ? (
            <button type="button" className={btn} onClick={() => setRemoveOpen(true)}>Retirer l'ami</button>
          ) : isBlocked ? null : (
            <button type="button" disabled={requested} className="h-6 shrink-0 rounded-[4px] bg-[#5865f2] px-2 text-sm font-medium text-white transition-colors hover:bg-[#4752c4] disabled:opacity-60" onClick={() => sendRequest.mutate(person.username)}>
              {requested ? 'Demande envoyée' : 'Ajouter en ami'}
            </button>
          )}
          <button type="button" className={btn} onClick={() => (isBlocked ? unblock.mutate(person.id) : block.mutate({ id: person.id, name: title }))}>{isBlocked ? 'Débloquer' : 'Bloquer'}</button>
          {(!isFriend || isBlocked) && <button type="button" className="h-6 shrink-0 rounded-[4px] bg-[#da373c] px-2 text-sm font-medium text-white transition-colors hover:bg-[#a12d2f]" onClick={soon}>Signaler le spam</button>}
        </div>
      )}
      {person && <RemoveFriendDialog open={removeOpen} onOpenChange={setRemoveOpen} friendshipId={friendship?.id ?? null} username={person.username} />}
    </div>
  );
}
