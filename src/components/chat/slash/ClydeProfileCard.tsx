import { useEffect } from 'react';
import { toast } from 'sonner';
import { Check } from '@/components/icons/discord/lucide';
import { ClydeAvatar } from './SlashIcons';

/*
 * Fiche de Clyde (video de reference) : bandeau bleu, avatar cerclé, nom +
 * badge APP, pseudo. Ouverte depuis l'avatar ou le nom d'un message ephemere.
 */
export function ClydeProfileCard({ anchor, onClose }: { anchor: DOMRect; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const W = 300;
  const H = 223;
  const left = Math.min(window.innerWidth - W - 8, anchor.right + 8);
  const top = Math.max(8, Math.min(window.innerHeight - H - 8, anchor.top + anchor.height / 2 - H / 2));

  return (
    <>
      <div className="fixed inset-0 z-40" onMouseDown={onClose} />
      <div role="dialog" aria-label="Clyde" style={{ left, top, width: W }} className="fixed z-50 overflow-hidden rounded-lg bg-[#2a2a32] shadow-[0_8px_16px_rgba(0,0,0,0.24)] ring-1 ring-white/[0.06]">
        <div className="relative h-[84px] bg-[#5865f2]">
          <button
            type="button"
            aria-label="Plus"
            onClick={() => toast.info('Bientôt disponible')}
            className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
          >
            <span className="mb-1 text-[16px] leading-none">…</span>
          </button>
        </div>
        <div className="px-3 pb-3">
          <span className="relative z-10 -mt-[46px] block h-[92px] w-[92px] rounded-full border-[6px] border-[#2a2a32] bg-[#2a2a32]">
            <ClydeAvatar className="h-full w-full" />
          </span>
          <p className="mt-1 flex items-center gap-1.5 text-[20px] font-semibold leading-6 text-white">
            Clyde
            <span className="inline-flex h-[16px] items-center gap-0.5 rounded-[3px] bg-[#5865f2] px-1 text-[10px] font-semibold uppercase leading-none text-white">
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
              APP
            </span>
          </p>
          <p className="text-[14px] leading-[18px] text-[#dbdee1]">Clyde</p>
        </div>
      </div>
    </>
  );
}
