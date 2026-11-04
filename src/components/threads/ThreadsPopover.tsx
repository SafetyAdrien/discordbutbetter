import React, { useMemo, useState } from 'react';
import { Search, X } from '@/components/icons/discord/lucide';
import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu';
import { ThreadContextMenuBody } from './ThreadContextMenuBody';
import { DeleteThreadDialog } from './DeleteThreadDialog';
import { ThreadSettingsPage } from './ThreadSettingsPage';
import { useAuth } from '@/contexts/AuthContext';
import { useMultipleChannelPermissions } from '@/hooks/useUserChannelPermissions';
import { Loader2 } from 'lucide-react';
import { UserAvatarImage } from '@/components/ui/user-avatar-image';
import { useThreads, useDeleteThread } from '@/hooks/useThreads';
import { useFollowedThreads } from '@/hooks/useFollowedThreads';
import { Thread } from '@/types/thread';
import { shortAgo } from '@/lib/shortAgo';
import { openNewThread } from '@/lib/threadEvents';
import StreamlineThreads from '@/components/icons/StreamlineThreads';
import { cn } from '@/lib/utils';

/*
 * Liste des fils d'un salon (video de reference) : en-tete "Fils" avec recherche (contour bleu) et "Creer", puis
 * "N fils rejoints" et "N autres fils" ; chaque fil est une carte (nom, "auteur : dernier message • il y a ...",
 * avatar a droite). Les fils inactifs depuis plus que leur duree de masquage passent dans "anciens fils".
 */

interface Props {
  channelId: string;
  channelName?: string;
  onSelectThread: (threadId: string) => void;
  onDone?: () => void;
  /** Presentation en fenetre centree (lien "Voir tous les fils") : ajoute le bouton fermer. */
  onClose?: () => void;
}

const lastActivity = (t: Thread) => new Date(t.last_message_at || t.created_at).getTime();
const isOld = (t: Thread, now: number) => now - lastActivity(t) > (t.auto_archive_minutes ?? 4320) * 60_000;

function ThreadCard({ thread, onClick, menu }: { thread: Thread; onClick: () => void; menu?: React.ReactNode }) {
  const last = thread.last_message;
  const when = shortAgo(new Date(thread.last_message_at || thread.created_at));
  const author = last?.author ?? (thread.creator ? { id: thread.creator.id, display_name: thread.creator.display_name, avatar_url: thread.creator.avatar_url } : null);
  const card = (
    <button type="button" onClick={onClick} className="w-full px-[15px] pt-4 pb-3.5 rounded-lg bg-[#3b3b45] hover:bg-[#41414b] border border-[#454550] flex items-center gap-3 text-left transition-colors">
      <div className="min-w-0 flex-1">
        <p translate="no" className={cn('text-base leading-5 font-semibold truncate', thread.closed || thread.locked ? 'text-[#b5bac1]' : 'text-white')}>{thread.name}</p>
        <p className="flex items-center gap-1.5 text-[15px] leading-5 text-[#dbdee1] min-w-0">
          {author && <UserAvatarImage src={author.avatar_url} alt="" className="w-4 h-4 shrink-0" fallbackClassName="text-[8px]" fallback={author.display_name.charAt(0).toUpperCase()} ownerId={author.id} />}
          <span translate="no" className="truncate">
            {last ? <><span className="font-medium text-white">{author?.display_name}</span>: {last.content}</> : <span className="italic">Commencé par <span className="font-medium text-white">{author?.display_name}</span></span>}
          </span>
          <span aria-hidden className="shrink-0">•</span>
          <span className="shrink-0">{last ? when : `Dernière activité : ${when}`}</span>
        </p>
      </div>
      {author && <UserAvatarImage src={author.avatar_url} alt="" className="w-6 h-6 shrink-0" fallbackClassName="text-[10px]" fallback={author.display_name.charAt(0).toUpperCase()} ownerId={author.id} />}
    </button>
  );
  if (!menu) return card;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{card}</ContextMenuTrigger>
      {menu}
    </ContextMenu>
  );
}

const ThreadsPopover: React.FC<Props> = ({ channelId, channelName, onSelectThread, onDone, onClose }) => {
  const { user } = useAuth();
  const { can } = useMultipleChannelPermissions(channelId, ['manage_threads']);
  const deleteThread = useDeleteThread();
  const [editThread, setEditThread] = useState<Thread | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const { data: threads = [], isLoading } = useThreads(channelId);
  const { data: followed = [] } = useFollowedThreads(channelId);
  const followedIds = useMemo(() => new Set(followed.map((t) => t.id)), [followed]);
  const now = Date.now();

  const filtered = threads.filter((t) => t.name.toLowerCase().includes(query.trim().toLowerCase()));
  const active = filtered.filter((t) => !isOld(t, now) && !t.archived);
  const joined = active.filter((t) => followedIds.has(t.id));
  const others = active.filter((t) => !followedIds.has(t.id));
  const old = filtered.filter((t) => isOld(t, now) || t.archived);

  const pick = (id: string) => { onSelectThread(id); onDone?.(); };
  const section = (label: string) => <p className="px-1 pt-[9px] pb-[10px] text-sm leading-5 font-medium text-[#dbdee1]">{label}</p>;

  return (
    <div className="flex flex-col w-full max-h-[480px]">
      <div className="flex items-center gap-3 px-4 h-[56px] shrink-0 border-b border-white/[0.06]">
        <span className="flex items-center gap-2 shrink-0 text-[15px] font-semibold text-white"><StreamlineThreads className="w-[21px] h-[21px] text-[#b5bac1]" /> Fils</span>
        <span aria-hidden className="h-[22px] w-px bg-white/[0.12]" />
        <label className="w-[318px] max-w-full min-w-0 flex items-center gap-2 h-[30px] px-2 rounded-[4px] bg-[#303038] border-2 border-transparent focus-within:border-[#5b63e4] transition-colors">
          <Search className="w-[11px] h-[11px] text-[#b5bac1] shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un nom de fil"
            aria-label="Rechercher un nom de fil"
            className="flex-1 min-w-0 bg-transparent outline-none text-sm text-white placeholder:text-[#80848e]"
          />
        </label>
        <button type="button" onClick={() => { openNewThread(channelId); onDone?.(); }} className="ml-auto h-[30px] px-[13px] rounded-[4px] bg-[#5865f2] hover:bg-[#4752c4] text-sm font-medium text-white transition-colors shrink-0">Créer</button>
        {onClose && (
          <button type="button" aria-label="Fermer" onClick={onClose} className="w-7 h-7 flex items-center justify-center text-[#b5bac1] hover:text-white shrink-0"><X className="w-[14px] h-[14px]" /></button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-4 pb-6">
        {isLoading && threads.length === 0 ? (
          <div role="status" className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">{query ? 'Aucun fil ne correspond à ta recherche.' : "Il n'y a pas encore de fil dans ce salon."}</p>
        ) : (
          <>
            {joined.length > 0 && section(`${joined.length} fils rejoints`)}
            <div className="space-y-2">{joined.map((t) => <ThreadCard key={t.id} thread={t} onClick={() => pick(t.id)} menu={<ThreadContextMenuBody thread={t} channelId={channelId} canManage={can('manage_threads') || t.created_by === user?.id} onEdit={() => setEditThread(t)} onDelete={() => setDeleteId(t.id)} />} />)}</div>
            {others.length > 0 && section(joined.length ? `${others.length} autres fils` : `${others.length} fils actifs`)}
            <div className="space-y-2">{others.map((t) => <ThreadCard key={t.id} thread={t} onClick={() => pick(t.id)} menu={<ThreadContextMenuBody thread={t} channelId={channelId} canManage={can('manage_threads') || t.created_by === user?.id} onEdit={() => setEditThread(t)} onDelete={() => setDeleteId(t.id)} />} />)}</div>
            {old.length > 0 && section('anciens fils')}
            <div className="space-y-2">{old.map((t) => <ThreadCard key={t.id} thread={t} onClick={() => pick(t.id)} menu={<ThreadContextMenuBody thread={t} channelId={channelId} canManage={can('manage_threads') || t.created_by === user?.id} onEdit={() => setEditThread(t)} onDelete={() => setDeleteId(t.id)} />} />)}</div>
          </>
        )}
      </div>
      <DeleteThreadDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} name={threads.find((t) => t.id === deleteId)?.name ?? ''} onConfirm={() => { if (deleteId) deleteThread.mutate({ threadId: deleteId, channelId }); setDeleteId(null); }} />
      {editThread && <ThreadSettingsPage thread={editThread} channelName={channelName ?? ''} onClose={() => setEditThread(null)} onDelete={() => deleteThread.mutate({ threadId: editThread.id, channelId })} />}
    </div>
  );
};

export default ThreadsPopover;
