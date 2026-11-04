import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useFriends, useAcceptFriendRequest, useDeclineFriendRequest, useRemoveFriend, useSendFriendRequest, type FriendWithProfile } from '@/hooks/useFriends';
import { useCreateDMConversation } from '@/hooks/useDMs';
import { useDMPrefs } from '@/hooks/useDMPrefs';
import { UserAvatarImage } from '@/components/ui/user-avatar-image';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Check, X, Search, Users, MessageCircle, MoreVertical, Info, ChevronRight, Compass } from '@/components/icons/discord/lucide';
import { MentionBadge } from '@/components/ui/MentionBadge';
import { openUserSettings } from '@/lib/settingsEvents';
import { CreateGroupModal } from '@/components/dm/CreateGroupModal';

/*
 * Page "Amis" (video de reference) : en-tete "Amis · En ligne · Tous · En attente · Ajouter un ami" (les onglets
 * apparaissent quand ils ont du contenu), puis la liste (bandeau comptes bloques, recherche, lignes de 62px), les
 * demandes recues / envoyees, ou la page "Ajouter un ami" ; colonne "En ce moment" a droite.
 */

type Tab = 'online' | 'all' | 'pending' | 'add';
export const OPEN_DISCOVER_EVENT = 'app:open-discover';

interface Props {
  onOpenDM: (conversationId: string) => void;
}

const TAB = 'h-8 shrink-0 rounded-[4px] px-2.5 text-base font-medium transition-colors';

export function FriendsPanel({ onOpenDM }: Props) {
  const { data: friends = [] } = useFriends();
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();
  const removeFriend = useRemoveFriend();
  const createDM = useCreateDMConversation();
  const prefs = useDMPrefs();
  const [tab, setTab] = useState<Tab>('online');
  const [query, setQuery] = useState('');
  const [groupOpen, setGroupOpen] = useState(false);

  const accepted = useMemo(() => friends.filter((f) => f.status === 'accepted'), [friends]);
  const pending = useMemo(() => friends.filter((f) => f.status === 'pending'), [friends]);
  const incoming = pending.filter((f) => f.isIncoming);
  const sent = pending.filter((f) => !f.isIncoming);
  const online = accepted.filter((f) => f.profile.status && f.profile.status !== 'offline');

  const showLists = accepted.length > 0;
  const showPending = pending.length > 0;
  // Un onglet disparu (plus d'amis) ramene a "Ajouter" ; l'onglet "En attente" reste ouvert, vide, apres la derniere demande.
  const current: Tab = tab === 'add' ? 'add' : tab === 'pending' ? 'pending' : showLists ? tab : 'add';
  useEffect(() => setQuery(''), [current]);

  const openDM = async (userId: string) => {
    const r = await createDM.mutateAsync(userId);
    prefs.reopen(r.conversation_id);
    onOpenDM(r.conversation_id);
  };

  const list = current === 'online' ? online : accepted;
  const shown = list.filter((f) => !query.trim() || f.profile.display_name.toLowerCase().includes(query.toLowerCase()) || f.profile.username.toLowerCase().includes(query.toLowerCase()));

  const headerTab = (id: Tab, label: string, badge?: number) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      className={cn(TAB, 'flex items-center gap-2', current === id ? 'bg-[#43434b] text-white' : 'text-[hsl(var(--interactive-icon-default))] hover:bg-[hsl(var(--interactive-background-hover))] hover:text-white')}
    >
      {label}
      {!!badge && <MentionBadge count={badge} size="sm" />}
    </button>
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-background">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-[hsl(var(--frame-border))] px-4">
        <Users className="mr-1 h-6 w-6 shrink-0 text-[hsl(var(--interactive-icon-default))]" />
        <h2 className="shrink-0 text-base font-semibold text-white">Amis</h2>
        <span aria-hidden className="mx-2 h-1 w-1 shrink-0 rounded-full bg-[#4e5058]" />
        {showLists && headerTab('online', 'En ligne')}
        {showLists && headerTab('all', 'Tous')}
        {showPending && headerTab('pending', 'En attente', incoming.length)}
        <button
          type="button"
          onClick={() => setTab('add')}
          className={cn(TAB, current === 'add' ? 'bg-[#5865f2]/25 text-[#a5b0ff]' : 'bg-[#5865f2] text-white hover:bg-[#4752c4]')}
        >
          Ajouter
        </button>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label="Nouveau MP de groupe" onClick={() => setGroupOpen(true)} className="ml-auto flex h-8 w-8 items-center justify-center text-[hsl(var(--interactive-icon-default))] transition-colors hover:text-white">
              <MessageCircle className="h-6 w-6" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Nouveau MP de groupe</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="scrollbar-thin min-w-0 flex-1 overflow-y-auto">
          {current === 'add' ? (
            <AddFriendPage />
          ) : current === 'pending' ? (
            <div className="px-5 pb-6 pt-5">
              {showPending && <Banner />}
              {showPending && <SearchBox value={query} onChange={setQuery} />}
              {!showPending && <p className="px-6 pt-[210px] text-center text-sm leading-[18px] text-[#80848e]">Il n'y a aucune demande d'ami en attente. Clique sur « Ajouter » pour envoyer des demandes d'ami.</p>}
              {incoming.length > 0 && <SectionTitle>Reçue(s) — {incoming.length}</SectionTitle>}
              {incoming.map((r) => (
                <PendingRow key={r.id} request={r} onAccept={() => acceptRequest.mutate(r.id)} onDecline={() => declineRequest.mutate(r.id)} />
              ))}
              {sent.length > 0 && <SectionTitle>Envoyée(s) — {sent.length}</SectionTitle>}
              {sent.map((r) => (
                <PendingRow key={r.id} request={r} onDecline={() => declineRequest.mutate(r.id)} />
              ))}
            </div>
          ) : (
            <div className="px-5 pb-6 pt-5">
              <Banner />
              <SearchBox value={query} onChange={setQuery} />
              <SectionTitle>{current === 'online' ? 'En ligne' : 'Tous les amis'} {current === 'online' ? '—' : '-'} {shown.length}</SectionTitle>
              {shown.map((f) => (
                <FriendRow key={f.id} friend={f} onMessage={() => void openDM(f.profile.id)} onRemove={() => removeFriend.mutate(f.id)} />
              ))}
              {shown.length === 0 && <p className="py-10 text-center text-sm text-[#b5bac1]">{query ? 'Aucun ami ne correspond à ta recherche.' : 'Personne en ligne pour le moment.'}</p>}
            </div>
          )}
        </div>
        <ActiveNow />
      </div>

      {groupOpen && <CreateGroupModal onClose={() => setGroupOpen(false)} onOpenDM={onOpenDM} />}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 mt-4 text-base font-medium leading-5 text-[#dbdee1]">{children}</h3>;
}

function Banner() {
  const prefs = useDMPrefs();
  if (!prefs.showBlockedBanner) return null;
  return (
    <div className="mb-4 flex h-[50px] items-center gap-3 rounded-lg bg-[hsl(var(--surface-card))] px-4">
      <Info className="h-5 w-5 shrink-0 text-[#dbdee1]" />
      <p className="flex-1 truncate text-base text-white">
        Tu cherches des comptes que tu as bloqués ou ignorés ? <button type="button" onClick={() => openUserSettings('privacy')} className="text-[hsl(var(--text-link))] hover:underline">Aller aux paramètres</button>
      </p>
      <button type="button" aria-label="Fermer" onClick={prefs.hideBlockedBanner} className="text-[#b5bac1] transition-colors hover:text-white"><X className="h-5 w-5" /></button>
    </div>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex h-[42px] items-center gap-3 rounded-lg border border-[hsl(var(--frame-border))] bg-[hsl(var(--surface-card))] px-3 transition-colors focus-within:border-[#5b63e4]">
      <Search className="h-5 w-5 shrink-0 text-[#b5bac1]" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Rechercher" className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-[#80848e]" />
      {value && <button type="button" aria-label="Effacer" onClick={() => onChange('')} className="text-[#b5bac1] hover:text-white"><X className="h-4 w-4" /></button>}
    </label>
  );
}

const RoundBtn = ({ label, onClick, children, danger }: { label: string; onClick: () => void; children: React.ReactNode; danger?: boolean }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button type="button" aria-label={label} onClick={onClick} className={cn('flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--surface-card))] text-[#b5bac1] transition-colors group-hover/row:bg-background', danger ? 'hover:text-[#f23f43]' : label === 'Accepter' ? 'hover:text-[#23a55a]' : 'hover:text-white')}>
        {children}
      </button>
    </TooltipTrigger>
    <TooltipContent side="top">{label}</TooltipContent>
  </Tooltip>
);

function FriendRow({ friend, onMessage, onRemove }: { friend: FriendWithProfile; onMessage: () => void; onRemove: () => void }) {
  const p = friend.profile;
  const sub = p.custom_status || (p.status === 'online' ? 'En ligne' : p.status === 'idle' ? 'Inactif' : p.status === 'dnd' ? 'Ne pas déranger' : 'Hors ligne');
  return (
    <div className="group/row flex h-[62px] items-center gap-3 border-t border-[hsl(var(--frame-border))] px-2 transition-colors hover:rounded-lg hover:border-transparent hover:bg-[hsl(var(--interactive-background-hover))]">
      <span className="relative shrink-0">
        <UserAvatarImage src={p.avatar_url} alt="" className="h-8 w-8" fallbackClassName="text-sm" fallback={p.display_name.charAt(0).toUpperCase()} ownerId={p.id} />
        <StatusIndicator status={p.status || 'offline'} className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 border-[3px] border-background group-hover/row:border-[hsl(var(--interactive-background-hover))]" bgClassName="bg-background" />
      </span>
      <div className="min-w-0 flex-1">
        <p translate="no" className="truncate text-base font-semibold leading-5 text-white">{p.display_name}</p>
        <p translate="no" className="truncate text-sm leading-[18px] text-[#b5bac1]">{sub}</p>
      </div>
      <RoundBtn label="Message" onClick={onMessage}><MessageCircle className="h-5 w-5" /></RoundBtn>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Plus" className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--surface-card))] text-[#b5bac1] transition-colors hover:text-white group-hover/row:bg-background data-[state=open]:text-white">
                <MoreVertical className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">Plus</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-[190px] rounded-lg border border-white/[0.08] bg-[#3b3b45] p-2 shadow-[0_8px_16px_rgba(0,0,0,0.24)]">
          <DropdownMenuItem className="min-h-[33px] px-2 py-1.5 text-sm" onSelect={onMessage}>Envoyer un message</DropdownMenuItem>
          <DropdownMenuItem className="min-h-[33px] px-2 py-1.5 text-sm text-[#f57976] focus:text-[#f57976]" onSelect={onRemove}>Retirer l'ami</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function PendingRow({ request, onAccept, onDecline }: { request: FriendWithProfile; onAccept?: () => void; onDecline: () => void }) {
  const p = request.profile;
  return (
    <div className="group/row flex h-[78px] items-center gap-3 border-t border-[hsl(var(--frame-border))] px-2 transition-colors hover:rounded-lg hover:border-transparent hover:bg-[hsl(var(--interactive-background-hover))]">
      <UserAvatarImage src={p.avatar_url} alt="" className="h-8 w-8" fallbackClassName="text-sm" fallback={p.display_name.charAt(0).toUpperCase()} ownerId={p.id} />
      <div className="min-w-0 flex-1">
        <p translate="no" className="truncate text-base font-semibold leading-5 text-white">{p.display_name}</p>
        <p translate="no" className="truncate text-sm leading-[18px] text-[#b5bac1]">{p.username}</p>
      </div>
      {onAccept && <RoundBtn label="Accepter" onClick={onAccept}><Check className="h-5 w-5" /></RoundBtn>}
      <RoundBtn label={onAccept ? 'Ignorer' : 'Annuler'} onClick={onDecline} danger><X className="h-5 w-5" /></RoundBtn>
    </div>
  );
}

/* ---------------------------------- Ajouter un ami ---------------------------------- */

function AddFriendPage() {
  const send = useSendFriendRequest();
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [state, setState] = useState<{ kind: 'ok' | 'err'; text: string; to: string } | null>(null);
  const [focus, setFocus] = useState(false);
  const ready = name.trim().length > 0 && !send.isPending;

  const submit = async () => {
    if (!ready) return;
    const to = name.trim().replace(/^@/, '');
    try {
      await send.mutateAsync(to);
      setState({ kind: 'ok', text: '', to });
      setName('');
      setNote('');
    } catch (e) {
      const m = e instanceof Error ? e.message : '';
      setState({ kind: 'err', to, text: m === 'Utilisateur non trouvé' ? `${to} n'accepte pas les demandes d'ami, ou n'existe pas. Il faudra qu'il t'ajoute pour devenir amis.` : m || "Impossible d'envoyer la demande." });
    }
  };

  return (
    <div>
      <div className="px-8 pb-6 pt-8">
        <div className="flex items-start">
          <div className="flex-1">
            <h2 className="text-xl font-semibold leading-6 text-white">Ajouter un ami</h2>
            <p className="mt-1 text-base leading-[22px] text-[#dbdee1]">Tu peux ajouter des amis avec leur nom d'utilisateur Discord.</p>
          </div>
          <WumpusFriends />
        </div>
        <div
          className={cn(
            'mt-3 overflow-hidden rounded-lg border bg-[hsl(var(--surface-card))] transition-colors',
            state?.kind === 'err' ? 'border-[#8b3a44]' : state?.kind === 'ok' ? 'border-[#2d7d46]' : focus ? 'border-[#5b63e4]' : 'border-[hsl(var(--frame-border))]',
          )}
        >
          <div className="flex h-[54px] items-center gap-3 border-b border-[hsl(var(--frame-border))] px-4">
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setState(null); }}
              onFocus={() => setFocus(true)}
              onBlur={() => setFocus(false)}
              onKeyDown={(e) => e.key === 'Enter' && void submit()}
              placeholder="Entre un nom d'utilisateur"
              className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-[#80848e]"
            />
            <button type="button" disabled={!ready} onClick={() => void submit()} className="h-8 shrink-0 rounded-[4px] bg-[#5865f2] px-3 text-sm font-medium text-white transition-colors hover:bg-[#4752c4] disabled:opacity-50 disabled:hover:bg-[#5865f2]">
              Envoyer une demande d'ami
            </button>
          </div>
          <div className="relative h-[116px]">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 120))}
              onFocus={() => setFocus(true)}
              onBlur={() => setFocus(false)}
              placeholder="Personnalise ta demande (facultatif)"
              className="h-full w-full resize-none bg-transparent px-4 py-3 text-base text-white outline-none placeholder:text-[#80848e]"
            />
            <span className="pointer-events-none absolute bottom-3 right-4 text-sm text-[#80848e]">{120 - note.length}</span>
          </div>
        </div>
        {state?.kind === 'err' && <p className="mt-2 text-sm text-[#f57976]"><span className="font-semibold">{state.to}</span>{' '}{state.text.replace(state.to, '').trimStart()}</p>}
        {state?.kind === 'ok' && <p className="mt-2 text-sm text-[#3ba55d]">Réussi ! Ta demande d'ami à <span className="font-semibold">{state.to}</span> a bien été envoyée.</p>}
        {!state && <p className="mt-2 text-sm text-[#b5bac1]">Ce que tu écris ici s'affichera aussi dans votre MP si vous devenez amis.</p>}
        {note.trim() && <p className="mt-1 text-xs text-[#b5bac1]">Le message d'accompagnement n'est pas encore transmis — Bientôt disponible.</p>}
      </div>
      <div className="border-t border-[hsl(var(--frame-border))] px-8 py-8">
        <h2 className="text-xl font-semibold leading-6 text-white">Autres endroits pour se faire des amis</h2>
        <p className="mt-2 max-w-[760px] text-base leading-[22px] text-[#dbdee1]">Pas de nom d'utilisateur sous la main ? Parcours notre liste de serveurs publics : on y trouve de tout, du gaming à la cuisine en passant par la musique et les animés.</p>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_DISCOVER_EVENT))}
          className="mt-4 flex h-[56px] w-[480px] max-w-full items-center gap-4 rounded-lg border border-[hsl(var(--frame-border))] bg-[hsl(var(--surface-card))] px-2 text-left text-base font-medium text-white transition-colors hover:bg-[hsl(var(--interactive-background-hover))]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#23a55a]"><Compass className="h-6 w-6" /></span>
          <span className="flex-1">Explorer les serveurs à découvrir</span>
          <ChevronRight className="h-6 w-6 text-[#b5bac1]" />
        </button>
      </div>
    </div>
  );
}

function WumpusFriends() {
  return (
    <svg viewBox="0 0 90 70" className="-mr-1 h-[70px] w-[90px] shrink-0" aria-hidden>
      <ellipse cx="46" cy="40" rx="30" ry="24" fill="#5b6be8" />
      <rect x="28" y="28" width="36" height="22" rx="11" fill="#2b2f6b" />
      <ellipse cx="38" cy="38" rx="4" ry="5.5" fill="#8affc8" />
      <ellipse cx="54" cy="38" rx="4" ry="5.5" fill="#8affc8" />
      <path d="M34 14c6-8 16-8 22 0z" fill="#3ba55d" />
      <path d="M72 30l14-10" stroke="#5b6be8" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------------------------- En ce moment ---------------------------------- */

function ActiveNow() {
  return (
    <aside className="scrollbar-thin hidden w-[348px] shrink-0 overflow-y-auto border-l border-[hsl(var(--frame-border))] px-5 py-4 lg:block">
      <h2 className="text-xl font-extrabold leading-6 text-white">En ligne</h2>
      <div className="mt-4 rounded-lg bg-[hsl(var(--surface-card))] px-4 py-4 text-center">
        <p className="text-base font-semibold leading-5 text-white">C'est calme pour l'instant…</p>
        <p className="mt-1 text-base leading-5 text-[#b5bac1]">Quand un ami lance une activité — comme jouer à un jeu ou discuter en vocal — on l'affichera ici !</p>
      </div>
    </aside>
  );
}

