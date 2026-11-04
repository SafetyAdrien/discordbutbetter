import { useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, ChevronDown } from '@/components/icons/discord/lucide';
import { setVoiceViewPref } from '@/hooks/useVoiceViewPrefs';
import { cn } from '@/lib/utils';
import { userKey } from '@/lib/userScope';

/*
 * Fenetres de l'appel de MP (video de reference) : "Pret pour le chat video ?" (apercu de la camera) et "Es-tu sur(e) ?"
 * (masquer ma propre camera).
 */

const OVERLAY = 'fixed inset-0 z-[120] bg-black/85 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-100';
const CONTENT = 'fixed left-1/2 top-1/2 z-[130] -translate-x-1/2 -translate-y-1/2 max-w-[calc(100vw-32px)] rounded-lg border border-white/[0.08] bg-[#383840] shadow-[0_8px_16px_rgba(0,0,0,0.24)] outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] duration-100';
const CLOSE = 'absolute right-[15px] top-[15px] flex h-6 w-6 items-center justify-center text-[hsl(var(--icon-default))] hover:text-white';

const PREVIEW_KEY = 'dm-call:always-preview';
export const readAlwaysPreview = () => {
  try { return localStorage.getItem(userKey(PREVIEW_KEY)) !== '0'; } catch { return true; }
};

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-white">
      <button type="button" role="checkbox" aria-checked={checked} onClick={() => onChange(!checked)} className={cn('flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border-2 transition-colors', checked ? 'border-[#5865f2] bg-[#5865f2]' : 'border-[#80848e]')}>
        {checked && <svg viewBox="0 0 24 24" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="4" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
      </button>
      {label}
    </label>
  );
}

export function CameraPreviewDialog({ open, onOpenChange, onConfirm }: { open: boolean; onOpenChange: (o: boolean) => void; onConfirm: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [always, setAlways] = useState(readAlwaysPreview);
  const [error, setError] = useState(false);
  const [label, setLabel] = useState('Caméra intégrée');

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    setError(false);
    navigator.mediaDevices
      ?.getUserMedia({ video: true })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        setLabel(s.getVideoTracks()[0]?.label || 'Caméra intégrée');
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open]);

  const confirm = () => {
    try { localStorage.setItem(userKey(PREVIEW_KEY), always ? '1' : '0'); } catch { /* stockage indisponible */ }
    onOpenChange(false);
    onConfirm();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={OVERLAY} />
        <DialogPrimitive.Content aria-describedby={undefined} className={cn(CONTENT, 'w-[440px] p-4')}>
          <DialogPrimitive.Title className="text-xl font-semibold leading-6 text-white">Prêt pour le chat vidéo ?</DialogPrimitive.Title>
          <DialogPrimitive.Close aria-label="Fermer" className={CLOSE}><X className="h-[14px] w-[14px]" /></DialogPrimitive.Close>
          <div className="mt-3 aspect-[4/3] overflow-hidden rounded-[4px] bg-black">
            {error ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[#b5bac1]">Impossible d'accéder à la caméra. Vérifie l'autorisation du navigateur.</div>
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
            )}
          </div>
          <div className="mt-3 flex h-10 items-center justify-between rounded-[4px] bg-[#1e1f22] px-3 text-sm text-white">
            <span className="truncate">{label}</span>
            <ChevronDown className="h-4 w-4 text-[#b5bac1]" />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Check checked={always} onChange={setAlways} label="Toujours afficher l'aperçu vidéo" />
            <button type="button" onClick={confirm} className="h-8 rounded-[4px] bg-[#5865f2] px-4 text-sm font-medium text-white transition-colors hover:bg-[#4752c4]">Activer la caméra</button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function HideSelfCameraDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [dontAsk, setDontAsk] = useState(false);
  const confirm = () => {
    setVoiceViewPref('showSelf', false);
    onOpenChange(false);
  };
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={OVERLAY} />
        <DialogPrimitive.Content aria-describedby={undefined} className={cn(CONTENT, 'w-[440px] p-[22px]')}>
          <DialogPrimitive.Title className="text-xl font-semibold leading-6 text-white">Es-tu sûr(e) ?</DialogPrimitive.Title>
          <DialogPrimitive.Close aria-label="Fermer" className={CLOSE}><X className="h-[14px] w-[14px]" /></DialogPrimitive.Close>
          <p className="mt-2 text-base leading-5 text-[#dbdee1]">Décocher « Afficher ma caméra » ne désactive pas ta vidéo, ça la masque seulement de ta propre vue. Les autres dans ce salon vocal verront toujours ta caméra. Si ce n'est pas ce que tu veux, confirme ta décision.</p>
          <div className="mt-6 flex items-center justify-between">
            <Check checked={dontAsk} onChange={setDontAsk} label="Ne plus demander" />
            <div className="flex gap-2">
              <button type="button" onClick={() => onOpenChange(false)} className="h-[38px] rounded-[4px] bg-white/[0.08] px-4 text-sm font-medium text-white transition-colors hover:bg-white/[0.12]">Annuler</button>
              <button type="button" onClick={confirm} className="h-[38px] rounded-[4px] bg-[#5865f2] px-6 text-sm font-medium text-white transition-colors hover:bg-[#4752c4]">OK</button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
