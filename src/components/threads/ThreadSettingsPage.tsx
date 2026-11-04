import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X } from '@/components/icons/discord/lucide';
import { ChevronDown } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useUpdateThread } from '@/hooks/useThreads';
import StreamlineThreads from '@/components/icons/StreamlineThreads';
import { DeleteThreadDialog } from './DeleteThreadDialog';
import type { Thread } from '@/types/thread';
import { cn } from '@/lib/utils';

/*
 * "Modifier le fil" : page plein ecran "Vue d'ensemble" (video de reference). Colonne de gauche avec le fil et son
 * salon, "Vue d'ensemble" et "Supprimer le fil" (rouge) ; a droite Nom du fil, Mode lent, Masquer apres une periode
 * d'inactivite et Salon de spoiler, bouton ESC, et la barre "modifications non enregistrees". Echap ferme.
 */

export const SLOWMODE: { v: number; label: string }[] = [
  { v: 0, label: 'Désactivé' }, { v: 5, label: '5 s' }, { v: 10, label: '10 s' }, { v: 15, label: '15 s' }, { v: 30, label: '30 s' },
  { v: 60, label: '1 min' }, { v: 120, label: '2 min' }, { v: 300, label: '5 min' }, { v: 600, label: '10 min' }, { v: 900, label: '15 min' },
  { v: 1800, label: '30 min' }, { v: 3600, label: '1 h' }, { v: 7200, label: '2 h' }, { v: 21600, label: '6 h' },
];
export const ARCHIVE: { v: number; label: string }[] = [
  { v: 60, label: '1 heure' }, { v: 1440, label: '24 heures' }, { v: 4320, label: '3 jours' }, { v: 10080, label: '1 semaine' },
];

export function Select({ value, options, onChange, label }: { value: number; options: { v: number; label: string }[]; onChange: (v: number) => void; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={label} className="w-full h-12 px-4 rounded-lg bg-[#2f2f37] border border-white/[0.06] hover:border-white/15 flex items-center justify-between text-base text-white transition-colors">
          {options.find((o) => o.v === value)?.label ?? ''}
          <ChevronDown className={cn('w-6 h-6 transition-transform', open && 'rotate-180')} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-[150] w-[var(--radix-popover-trigger-width)] p-1.5 rounded-lg bg-[#2f2f37] border border-white/[0.08] max-h-[300px] overflow-y-auto scrollbar-thin">
        {options.map((o) => (
          <button key={o.v} type="button" onClick={() => { onChange(o.v); setOpen(false); }} className={cn('w-full h-10 px-3 rounded-[4px] text-left text-base text-white hover:bg-white/[0.07]', o.v === value && 'bg-white/[0.08]')}>{o.label}</button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

interface Props {
  thread: Thread;
  channelName: string;
  onClose: () => void;
  onDelete: () => void;
}

export function ThreadSettingsPage({ thread, channelName, onClose, onDelete }: Props) {
  const update = useUpdateThread();
  const [name, setName] = useState(thread.name);
  const [slow, setSlow] = useState(thread.slowmode_seconds ?? 0);
  const [archive, setArchive] = useState(thread.auto_archive_minutes ?? 4320);
  const [spoiler, setSpoiler] = useState(!!thread.spoiler);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const dirty = name.trim() !== thread.name || slow !== (thread.slowmode_seconds ?? 0) || archive !== (thread.auto_archive_minutes ?? 4320) || spoiler !== !!thread.spoiler;
  const reset = () => { setName(thread.name); setSlow(thread.slowmode_seconds ?? 0); setArchive(thread.auto_archive_minutes ?? 4320); setSpoiler(!!thread.spoiler); };
  const save = () => {
    if (!name.trim()) return;
    update.mutate({ threadId: thread.id, name: name.trim(), slowmode_seconds: slow, auto_archive_minutes: archive, spoiler });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('[role="dialog"], [data-radix-popper-content-wrapper]')) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex bg-[#383840]" role="dialog" aria-label="Paramètres du fil">
      <aside className="w-[calc(50%-290px)] min-w-[260px] shrink-0 bg-[#2f2f37] flex justify-end pt-[60px]">
        <nav className="w-[286px] pr-3">
          <p className="px-3 pb-2 flex items-center gap-1.5 text-sm text-[#b5bac1] truncate">
            <StreamlineThreads className="w-4 h-4 shrink-0" />
            <span translate="no" className="truncate">{thread.name}</span>
            <span translate="no" className="font-bold text-white shrink-0">{channelName}</span>
          </p>
          <button type="button" className="w-full h-10 px-3 rounded-[4px] bg-white/[0.08] text-left text-base font-medium text-white">Vue d'ensemble</button>
          <div className="my-2 mx-3 h-px bg-white/[0.08]" />
          <button type="button" onClick={() => setConfirmOpen(true)} className="w-full h-10 px-3 rounded-[4px] flex items-center justify-between text-left text-base font-medium text-[#f57976] hover:bg-white/[0.05]">
            Supprimer le fil <Trash2 className="w-5 h-5" />
          </button>
        </nav>
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto scrollbar-thin pt-[60px] pb-28 pl-10">
        <div className="max-w-[792px]">
          <h2 className="text-xl leading-6 font-semibold text-white">Vue d'ensemble</h2>

          <label htmlFor="thread-name" className="block mt-7 mb-2 text-base font-medium text-white">Nom du fil</label>
          <input
            id="thread-name"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-12 px-4 rounded-lg bg-[#2f2f37] border border-white/[0.06] focus:border-[#5b63e4] outline-none text-base text-white transition-colors"
          />

          <p className="mt-7 mb-2 text-base font-medium text-white">Mode lent</p>
          <Select value={slow} options={SLOWMODE} onChange={setSlow} label="Mode lent" />
          <p className="mt-2 text-sm leading-5 text-[#b5bac1]">Les membres n'auront le droit d'envoyer qu'un message lors de cet intervalle de temps, à moins qu'ils ne possèdent la permission Ignorer le mode lent.</p>

          <p className="mt-9 mb-2 text-base font-medium text-white">Masquer après une période d'inactivité</p>
          <Select value={archive} options={ARCHIVE} onChange={setArchive} label="Masquer après une période d'inactivité" />
          <p className="mt-2 text-sm leading-5 text-[#b5bac1]">Les fils n'apparaîtront plus dans la liste des salons après une période d'inactivité préalablement définie.</p>

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
          <button type="button" onClick={save} disabled={update.isPending || !name.trim()} className="h-8 px-4 rounded-md bg-[#248046] hover:bg-[#1a6334] disabled:opacity-60 text-sm font-medium text-white">Enregistrer les modifications</button>
        </div>
      )}

      <DeleteThreadDialog open={confirmOpen} onOpenChange={setConfirmOpen} name={thread.name} onConfirm={() => { onDelete(); onClose(); }} />
    </div>,
    document.body,
  );
}
