import { useMemo, useState } from 'react';
import { X } from '@/components/icons/discord/lucide';
import { BarChart2 } from 'lucide-react';
import StreamlineThreads from '@/components/icons/StreamlineThreads';
import { MessageInput } from '@/components/chat/MessageInput';
import type { PollDraft } from '@/components/chat/CreatePollModal';
import { usePendingAttachments } from '@/hooks/usePendingAttachments';
import { useMembers } from '@/hooks/useMembers';
import { useServerRoles } from '@/hooks/useRoles';
import { useChannels } from '@/hooks/useChannels';
import { useCreateThreadFlow } from '@/hooks/useCreateThreadFlow';
import { ThreadAccessPicker } from './ThreadAccessPicker';
import { useAuth } from '@/contexts/AuthContext';
import { useThreadFirstMessageRequired } from '@/hooks/useThreadFirstMessageRequired';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/*
 * Panneau "Nouveau fil" (video de reference) : a droite du salon, en-tete "Nouveau fil" + fermer, grand cercle avec
 * l'icone des fils, "Nom du fil" (champ), "Fil prive" (case a cocher), puis le champ "Ecris un message pour commencer
 * la conversation !". Entree cree le fil (nom par defaut "Nouveau fil"), envoie le premier message et ouvre le fil.
 */

interface Props {
  channelId: string;
  serverId?: string | null;
  messageId?: string | null;
  /** Les fils des salons d'annonces sont toujours publics. */
  forcePublic?: boolean;
  onClose: () => void;
  onCreated: (threadId: string) => void;
}

export function NewThreadPanel({ channelId, serverId, messageId, forcePublic, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [priv, setPriv] = useState(false);
  const [accessRoleIds, setAccessRoleIds] = useState<string[]>([]);
  const [accessUserIds, setAccessUserIds] = useState<string[]>([]);
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [polls, setPolls] = useState<PollDraft[]>([]);
  const createThreadFlow = useCreateThreadFlow();
  const pending = usePendingAttachments();
  const { data: required } = useThreadFirstMessageRequired(channelId);
  const [error, setError] = useState<string | null>(null);

  // Donnees de mention / salons, comme dans un fil existant.
  const { data: membersData = [] } = useMembers(serverId || '');
  const { data: serverRoles = [] } = useServerRoles(serverId || '');
  const { data: channelsData } = useChannels(serverId || null);
  const mentionMembers = useMemo(() => membersData.map((m) => ({ id: m.user?.id || m.id, displayName: m.user?.display_name || m.nickname || 'Unknown', username: m.user?.username || '', avatar: m.user?.avatar_url || undefined })), [membersData]);
  const mentionRoles = useMemo(() => serverRoles.filter((r) => !r.is_default).map((r) => ({ id: r.id, name: r.name, color: r.color || undefined })), [serverRoles]);
  // Le createur a toujours acces : il n'est pas propose dans la liste.
  const accessMembers = useMemo(() => mentionMembers.filter((m) => m.id !== user?.id), [mentionMembers, user?.id]);
  const allChannels = useMemo(() => {
    const out: Array<{ id: string; name: string; type: string }> = [];
    channelsData?.categories.forEach((c) => c.channels.forEach((ch) => out.push({ id: ch.id, name: ch.name, type: ch.type || 'text' })));
    channelsData?.orphanChannels?.forEach((ch) => out.push({ id: ch.id, name: ch.name, type: ch.type || 'text' }));
    return out;
  }, [channelsData]);

  const hasContent = !!text.trim() || pending.attachments.length > 0 || polls.length > 0;

  const create = async (external?: { url: string; name: string; type: 'sticker' | 'gif' }) => {
    if (busy) return;
    // Premier message obligatoire (option du salon) : sans lui, on n'ouvre pas le fil.
    if (required && !hasContent && !external && !messageId) {
      setError('Un premier message est obligatoire dans ce salon.');
      return;
    }
    setError(null);
    setBusy(true);
    const isPrivate = forcePublic ? false : priv;
    try {
      const thread = await createThreadFlow({
        channelId,
        name,
        messageId,
        isPrivate,
        accessRoleIds,
        accessUserIds,
        text,
        files: pending.attachments,
        external,
        polls,
      });
      pending.clearAttachments();
      onCreated(thread.id);
    } catch {
      toast.error('Impossible de créer le fil');
      setBusy(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background border-l border-black/[0.2] min-w-0">
      <div className="flex items-center gap-3 pl-4 pr-3 h-[48px] shrink-0 border-b border-black/[0.2]">
        <StreamlineThreads className="w-6 h-6 text-[#b5bac1] shrink-0" />
        <span className="flex-1 min-w-0 truncate text-base font-medium text-white">Nouveau fil</span>
        <button type="button" aria-label="Fermer" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded text-[#b5bac1] hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin flex flex-col justify-end px-4 pb-4">
        <span className="w-[76px] h-[76px] rounded-full bg-[hsl(var(--button-secondary))] flex items-center justify-center text-white mb-7">
          <StreamlineThreads className="w-10 h-10" />
        </span>

        <label htmlFor="new-thread-name" className="mb-2 text-base font-semibold text-white">Nom du fil</label>
        <input
          id="new-thread-name"
          autoFocus
          value={name}
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nouveau fil"
          autoComplete="off"
          className="h-12 px-4 rounded-lg bg-[#2f2f37] border border-white/[0.04] focus:border-[#5b63e4] outline-none text-base text-white placeholder:text-[#80848e] transition-colors"
        />

        {!forcePublic && (
          <>
            <p className="mt-6 mb-2 text-base font-semibold text-white">Fil privé</p>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={priv} onChange={(e) => setPriv(e.target.checked)} className="sr-only peer" />
              <span className={cn('mt-0.5 w-6 h-6 rounded-[4px] border-2 shrink-0 flex items-center justify-center transition-colors', priv ? 'bg-[#5865f2] border-[#5865f2]' : 'border-[#80848e]')} aria-hidden>
                {priv && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>}
              </span>
              <span className="text-base leading-[22px] text-[#dbdee1] peer-focus-visible:underline">Seules les personnes que tu as invitées ainsi que les modérateurs peuvent voir ce fil</span>
            </label>
            {priv && (
              <ThreadAccessPicker
                roles={mentionRoles}
                members={accessMembers}
                selectedRoleIds={accessRoleIds}
                selectedUserIds={accessUserIds}
                onChange={({ roleIds, userIds }) => { setAccessRoleIds(roleIds); setAccessUserIds(userIds); }}
                disabled={busy}
              />
            )}
          </>
        )}
        <button
          type="button"
          onClick={() => void create()}
          disabled={busy}
          className="mt-5 h-10 px-4 self-start rounded-lg bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-60 text-base font-medium text-white transition-colors"
        >
          Créer le fil
        </button>
      </div>

      <div className="shrink-0">
        {polls.length > 0 && (
          <ul className="px-4 pb-2 space-y-1.5">
            {polls.map((p, i) => (
              <li key={i} className="flex items-center gap-2 h-9 pl-3 pr-1 rounded-lg bg-[#383840] text-sm text-white">
                <BarChart2 className="w-4 h-4 text-[#b5bac1] shrink-0" />
                <span translate="no" className="flex-1 truncate">Sondage : {p.question}</span>
                <button type="button" aria-label="Retirer le sondage" onClick={() => setPolls((l) => l.filter((_, j) => j !== i))} className="w-7 h-7 rounded flex items-center justify-center text-[#b5bac1] hover:text-white"><X className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
        )}
        {error && <p role="alert" className="px-4 pb-2 text-sm text-[#f57976]">{error}</p>}
        <MessageInput
          value={text}
          onChange={(v) => { setText(v); if (error) setError(null); }}
          onSend={() => void create()}
          onSendExternalAttachment={(a) => void create(a)}
          placeholder={required ? 'Écris un message pour commencer la conversation ! (obligatoire)' : 'Écris un message pour commencer la conversation !'}
          disabled={busy}
          isSending={busy}
          serverId={serverId ?? null}
          channelId={channelId}
          members={mentionMembers}
          roles={mentionRoles}
          channels={allChannels}
          attachments={pending.attachments}
          onAddFiles={pending.addFiles}
          onRemoveAttachment={pending.removeAttachment}
          onUpdateAttachment={pending.updateAttachment}
          onToggleSpoiler={pending.toggleSpoiler}
          onDraftPoll={(d) => setPolls((l) => [...l, d])}
        />
      </div>
    </div>
  );
}
