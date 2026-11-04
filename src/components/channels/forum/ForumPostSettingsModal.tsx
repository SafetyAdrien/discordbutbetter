import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X, Smile } from '@/components/icons/discord/lucide';
import { Switch } from '@/components/ui/switch';
import { EmojiStickerPicker } from '@/components/chat/EmojiStickerPicker';
import { Select, SLOWMODE, ARCHIVE } from '@/components/threads/ThreadSettingsPage';
import { StreamlineForum } from '@/components/icons/StreamlineForum';
import type { ForumThread, ForumThreadPatch } from '@/hooks/useForumThreads';

/*
 * "Modifier le post" (video de reference) : meme page plein ecran "Vue d'ensemble" que les fils. Colonne de gauche avec
 * le post et son salon, "Vue d'ensemble" et "Supprimer le post" (rouge) ; a droite Titre du post (avec le bouton emoji
 * a droite du champ), Mode lent (moderateurs), Masquer apres une periode d'inactivite et Salon de spoiler, bouton ESC.
 */

interface Props {
  post: ForumThread;
  channelName: string;
  serverId?: string | null;
  canModerate: boolean;
  onClose: () => void;
  onSave: (patch: ForumThreadPatch) => void;
  onDelete: () => void;
}

export function ForumPostSettingsModal({ post, channelName, serverId = null, canModerate, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState(post.name);
  const [slow, setSlow] = useState(post.slowmode_seconds ?? 0);
  const [archive, setArchive] = useState(post.auto_archive_minutes ?? 4320);
  const [spoiler, setSpoiler] = useState(!!post.spoiler);
  const dirty = name.trim() !== post.name || slow !== (post.slowmode_seconds ?? 0) || archive !== (post.auto_archive_minutes ?? 4320) || spoiler !== !!post.spoiler;
  const reset = () => { setName(post.name); setSlow(post.slowmode_seconds ?? 0); setArchive(post.auto_archive_minutes ?? 4320); setSpoiler(!!post.spoiler); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (document.querySelector('[role="dialog"][data-state="open"], [data-radix-popper-content-wrapper]')) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = () => {
    if (!name.trim()) return;
    const patch: ForumThreadPatch = {};
    if (name.trim() !== post.name) patch.name = name.trim();
    if (canModerate && slow !== (post.slowmode_seconds ?? 0)) patch.slowmode_seconds = slow;
    if (archive !== (post.auto_archive_minutes ?? 4320)) patch.auto_archive_minutes = archive;
    if (spoiler !== !!post.spoiler) patch.spoiler = spoiler;
    if (Object.keys(patch).length) onSave(patch);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex bg-[#383840] animate-fade-in" role="dialog" aria-label="Paramètres du post">
      <aside className="w-[calc(50%-290px)] min-w-[260px] shrink-0 bg-[#2f2f37] flex justify-end pt-[60px]">
        <nav className="w-[286px] pr-3">
          <p className="px-3 pb-2 flex items-center gap-1.5 text-sm text-[#b5bac1] truncate">
            <StreamlineForum size={16} className="shrink-0" />
            <span translate="no" className="truncate">{post.name}</span>
            <span translate="no" className="font-bold text-white shrink-0">{channelName}</span>
          </p>
          <button type="button" className="w-full h-10 px-3 rounded-[4px] bg-white/[0.08] text-left text-base font-medium text-white">Vue d'ensemble</button>
          <div className="my-2 mx-3 h-px bg-white/[0.08]" />
          <button type="button" onClick={onDelete} className="w-full h-10 px-3 rounded-[4px] flex items-center justify-between text-left text-base font-medium text-[#f57976] hover:bg-white/[0.05]">
            Supprimer le post <Trash2 className="w-5 h-5" />
          </button>
        </nav>
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto scrollbar-thin pt-[60px] pb-28 pl-10">
        <div className="max-w-[792px]">
          <h2 className="text-xl leading-6 font-semibold text-white">Vue d'ensemble</h2>

          <label htmlFor="post-title" className="block mt-7 mb-2 text-base font-medium text-white">Titre du post</label>
          <div className="relative">
            <input
              id="post-title"
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-12 pl-4 pr-12 rounded-lg bg-[#2f2f37] border border-white/[0.06] focus:border-[#5b63e4] outline-none text-base text-white transition-colors"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <EmojiStickerPicker
                serverId={serverId}
                onEmojiSelect={(e) => setName((n) => (n + e).slice(0, 100))}
                trigger={<button type="button" aria-label="Ajouter un émoji" className="w-6 h-6 flex items-center justify-center text-[#b5bac1] hover:text-white"><Smile className="w-5 h-5" /></button>}
              />
            </div>
          </div>

          {canModerate && (
            <>
              <p className="mt-7 mb-2 text-base font-medium text-white">Mode lent</p>
              <Select value={slow} options={SLOWMODE} onChange={setSlow} label="Mode lent" />
              <p className="mt-2 text-sm leading-5 text-[#b5bac1]">Les membres n'auront le droit d'envoyer qu'un message lors de cet intervalle de temps, à moins qu'ils ne possèdent la permission Ignorer le mode lent.</p>
            </>
          )}

          <p className="mt-9 mb-2 text-base font-medium text-white">Masquer après une période d'inactivité</p>
          <Select value={archive} options={ARCHIVE} onChange={setArchive} label="Masquer après une période d'inactivité" />
          <p className="mt-2 text-sm leading-5 text-[#b5bac1]">Les posts n'apparaîtront plus dans la liste des salons après une période d'inactivité préalablement définie.</p>

          <div className="mt-6 flex items-start justify-between gap-6">
            <div>
              <p className="text-base font-medium text-white">Salon de spoiler</p>
              <p className="mt-1 max-w-[670px] text-sm leading-[22px] text-[#b5bac1]">Marque ce salon comme contenant des spoilers, afin que les rebondissements de l'histoire, les sujets sensibles ou d'autres discussions importantes soient masqués jusqu'à ce que les utilisateurs et utilisatrices choisissent de les afficher.</p>
            </div>
            <Switch checked={spoiler} onCheckedChange={setSpoiler} aria-label="Salon de spoiler" className="shrink-0" />
          </div>
        </div>
      </main>

      <button type="button" aria-label="Fermer (Échap)" onClick={onClose} className="absolute top-[56px] left-[calc(50%+520px)] flex flex-col items-center gap-1 text-[#b5bac1] hover:text-white">
        <span className="w-9 h-9 rounded-full border-2 border-current flex items-center justify-center"><X className="w-5 h-5" /></span>
        <span className="text-xs font-semibold">ESC</span>
      </button>

      {dirty && (
        <div role="status" className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[min(660px,calc(100%-48px))] h-[52px] rounded-lg pl-4 pr-2 flex items-center gap-3 bg-[#111214] shadow-[0_8px_24px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-2 fade-in duration-200">
          <span className="flex-1 text-sm font-medium text-white truncate">Attention, il reste des modifications non enregistrées !</span>
          <button type="button" onClick={reset} className="h-8 px-3 text-sm font-medium text-white hover:underline">Réinitialiser</button>
          <button type="button" onClick={save} disabled={!name.trim()} className="h-8 px-4 rounded-md bg-[#248046] hover:bg-[#1a6334] disabled:opacity-60 text-sm font-medium text-white">Enregistrer les modifications</button>
        </div>
      )}
    </div>,
    document.body,
  );
}
