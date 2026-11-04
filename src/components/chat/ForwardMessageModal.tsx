import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Search, Send } from '@/components/icons/discord/lucide';
import StreamlineThreads from '@/components/icons/StreamlineThreads';
import { ChannelSheetIcon } from '@/components/icons/ChannelSheetIcon';
import { EmojiStickerPicker } from '@/components/chat/EmojiStickerPicker';
import { IconForward, IconImages, IconSmile } from '@/components/chat/message-menu/MessageMenuIcons';
import { useForwardMessage, useForwardTargets, type ForwardTarget } from '@/hooks/useForwardMessage';
import { OPEN_FORWARD_EVENT, attachmentsSummary, type ForwardPayload } from '@/lib/forwardMessage';
import { cn } from '@/lib/utils';

/*
 * Modale "Transferer a" (video de reference) : recherche, liste cochable des destinations (fils, messages prives,
 * salons), apercu du message (texte + "6 images" + miniature "+5"), message optionnel et bouton "Envoyer".
 */

export function toastMessageForwarded() {
  toast.custom(
    () => (
      <div role="status" className="flex items-center gap-2.5 h-10 px-4 rounded-lg bg-[#383840] border border-white/[0.06] shadow-[0_8px_16px_rgba(0,0,0,0.35)] text-sm font-medium text-white">
        <IconForward className="w-5 h-5 text-[#b5bac1]" />
        Message transféré !
      </div>
    ),
    { duration: 3000 },
  );
}

function Checkbox({ checked, disabled }: { checked: boolean; disabled?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'w-5 h-5 rounded-[4px] border-2 shrink-0 flex items-center justify-center transition-colors',
        checked ? 'bg-[#5865f2] border-[#5865f2]' : 'border-[#80848e]',
        disabled && 'opacity-40',
      )}
    >
      {checked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>}
    </span>
  );
}

function TargetAvatar({ target }: { target: ForwardTarget }) {
  return (
    <span className="relative w-8 h-8 shrink-0">
      {target.iconUrl ? (
        <img src={target.iconUrl} alt="" className={cn('w-8 h-8 object-cover', target.round ? 'rounded-full' : 'rounded-[10px]')} />
      ) : (
        <span className={cn('w-8 h-8 bg-[#4a4a54] text-white text-[11px] font-semibold flex items-center justify-center uppercase', target.round ? 'rounded-full' : 'rounded-[10px]')}>
          {target.iconFallback}
        </span>
      )}
      {target.badge && (
        <span className="absolute -right-1.5 -bottom-1.5 w-[18px] h-[18px] rounded-full bg-[#383840] flex items-center justify-center text-[#b5bac1]">
          {target.badge === 'thread' ? <StreamlineThreads className="w-3 h-3" /> : <ChannelSheetIcon name={target.badge === 'voice' ? 'voice' : 'text'} className="w-3 h-3" />}
        </span>
      )}
    </span>
  );
}

function ForwardDialog({ payload, onClose }: { payload: ForwardPayload; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const { targets, permOf } = useForwardTargets(true);
  const forward = useForwardMessage();
  const summary = attachmentsSummary(payload.attachments);
  const hasAttachments = payload.attachments.length > 0;

  const q = search.trim().toLowerCase();
  const rows = useMemo(
    () => targets.filter((t) => permOf(t).canSend && (!q || t.name.toLowerCase().includes(q) || t.subtitle.toLowerCase().includes(q))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [targets, q],
  );

  const toggle = (key: string) => setSelected((l) => (l.includes(key) ? l.filter((k) => k !== key) : [...l, key]));

  const send = () => {
    const chosen = targets.filter((t) => selected.includes(t.key));
    if (chosen.length === 0 || forward.isPending) return;
    forward.mutate(
      { payload, targets: chosen, note },
      {
        onSuccess: ({ failed }) => {
          onClose();
          toastMessageForwarded();
          if (failed > 0) toast.error(`${failed} destination${failed > 1 ? 's' : ''} n'ont pas pu recevoir le message`);
        },
        onError: () => toast.error('Impossible de transférer le message'),
      },
    );
  };

  return (
    <DialogContent
      className="w-[480px] max-w-[calc(100vw-32px)] p-0 gap-0 overflow-hidden rounded-xl [&>button.absolute]:right-5 [&>button.absolute]:top-5 [&>button.absolute]:opacity-100 [&>button.absolute]:text-[#b5bac1] [&>button.absolute:hover]:text-white [&>button.absolute_svg]:h-5 [&>button.absolute_svg]:w-5"
    >
      <div className="px-6 pt-6">
        <DialogTitle className="text-xl font-semibold leading-6 text-white">Transférer à</DialogTitle>
        <DialogDescription className="mt-2.5 text-sm leading-[18px] text-[#b5bac1]">Sélectionne où tu veux partager ce message.</DialogDescription>
        <label className="mt-[26px] flex items-center gap-2 h-10 px-3 rounded-lg bg-[#33333b] border border-white/[0.04] focus-within:border-[#5b63e4] transition-colors">
          <Search className="w-4 h-4 text-[#b5bac1] shrink-0" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher"
            aria-label="Rechercher une destination"
            className="flex-1 min-w-0 bg-transparent outline-none text-base text-white placeholder:text-[#80848e]"
          />
        </label>
      </div>

      <ul role="listbox" aria-multiselectable aria-label="Destinations" className="mt-3 h-[min(439px,calc(100vh-420px))] min-h-[168px] overflow-y-auto scrollbar-thin pl-6 pr-[18px] pb-1">
        {rows.map((t) => {
          const checked = selected.includes(t.key);
          const blocked = hasAttachments && !permOf(t).canAttach;
          return (
            <li key={t.key} role="option" aria-selected={checked} aria-disabled={blocked}>
              <button
                type="button"
                disabled={blocked}
                onClick={() => toggle(t.key)}
                className={cn('w-full h-12 -mx-1 pl-1 pr-1 flex items-center gap-3 rounded-md text-left transition-colors', blocked ? 'cursor-not-allowed' : 'hover:bg-white/[0.06]')}
              >
                <span className={cn(blocked && 'opacity-50')}><TargetAvatar target={t} /></span>
                <span className={cn('flex-1 min-w-0 leading-[18px]', blocked && 'opacity-50')}>
                  <span translate="no" className="block truncate text-sm font-semibold text-white">{t.name}</span>
                  <span translate="no" className="block truncate text-xs text-[#b5bac1]">{blocked ? 'Les pièces jointes sont désactivées dans ce salon.' : t.subtitle}</span>
                </span>
                <Checkbox checked={checked} disabled={blocked} />
              </button>
            </li>
          );
        })}
        {rows.length === 0 && <li className="py-10 text-center text-sm text-[#b5bac1]">Aucune destination trouvée.</li>}
      </ul>

      <div className="px-6 pb-6 pt-3 border-t border-white/[0.06]">
        <div className="flex items-stretch gap-3 pl-3 py-1">
          <span aria-hidden className="w-1 rounded-full bg-[#4a4a54] shrink-0" />
          <div className="flex-1 min-w-0 self-center leading-5">
            {payload.content ? (
              <p className="text-sm text-white line-clamp-2 break-words">
                {payload.content}
                {payload.edited && <span className="ml-1 text-[10px] text-[#b5bac1]">(modifié)</span>}
              </p>
            ) : null}
            {summary && (
              <p className="mt-1 flex items-center gap-1.5 text-[13px] text-[#b5bac1]"><IconImages className="w-4 h-4" />{summary.label}</p>
            )}
          </div>
          {summary?.thumb && (
            <span className="relative w-[55px] h-[55px] shrink-0 rounded-md overflow-hidden bg-[#2f2f37]">
              <img src={summary.thumb} alt="" className="w-full h-full object-cover" />
              {summary.count > 1 && <span className="absolute right-1 bottom-1 h-5 min-w-5 px-1 rounded-md bg-[#383840]/95 text-[11px] font-semibold text-white flex items-center justify-center">+{summary.count - 1}</span>}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 min-w-0 flex items-center h-10 pl-3 pr-2 rounded-lg bg-[#32323a] border border-white/[0.04] focus-within:border-[#5b63e4] transition-colors">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
              maxLength={2000}
              placeholder="Ajouter un message optionnel..."
              aria-label="Message optionnel"
              className="flex-1 min-w-0 bg-transparent outline-none text-sm text-white placeholder:text-[#80848e]"
            />
            <EmojiStickerPicker
              serverId={null}
              onEmojiSelect={(e) => setNote((n) => n + e)}
              trigger={<button type="button" aria-label="Emoji" className="w-8 h-8 flex items-center justify-center rounded text-[#b5bac1] hover:text-white"><IconSmile className="w-5 h-5" /></button>}
            />
          </div>
          <button
            type="button"
            onClick={send}
            disabled={selected.length === 0 || forward.isPending}
            className={cn(
              'h-10 pl-4 pr-3 rounded-lg flex items-center gap-1.5 text-base font-medium text-white transition-colors',
              selected.length === 0 ? 'bg-[#465198] text-white/60 cursor-not-allowed' : 'bg-[#5865f2] hover:bg-[#4752c4]',
            )}
          >
            Envoyer <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </DialogContent>
  );
}

/** Fenetre de transfert deja ouverte pour `payload` (chargee a la demande par LazyForwardMessageHost). */
export function ForwardMessageShell({ payload, onClose }: { payload: ForwardPayload; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <ForwardDialog payload={payload} onClose={onClose} />
    </Dialog>
  );
}

/** Ecoute l'evenement `openForwardMessage` et affiche la modale. Monte une fois pour toute l'application. */
export function ForwardMessageHost() {
  const [payload, setPayload] = useState<ForwardPayload | null>(null);
  useEffect(() => {
    const onOpen = (e: Event) => setPayload((e as CustomEvent<ForwardPayload>).detail);
    window.addEventListener(OPEN_FORWARD_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_FORWARD_EVENT, onOpen);
  }, []);
  return (
    <Dialog open={!!payload} onOpenChange={(o) => { if (!o) setPayload(null); }}>
      {payload && <ForwardDialog payload={payload} onClose={() => setPayload(null)} />}
    </Dialog>
  );
}

/** Modale seule (sans ecoute d'evenement) : utilisee par l'hote et par la page de test. */
export function ForwardMessageDialog({ payload, onClose }: { payload: ForwardPayload; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <ForwardDialog payload={payload} onClose={onClose} />
    </Dialog>
  );
}
