import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from '@/components/icons/discord/lucide';
import { cn } from '@/lib/utils';

/* Fenetre des Favoris (video de reference) : 466px, titre a gauche, fermer a droite, fond #3b3b45. */
export function FavDialog({ open, onOpenChange, title, children, className }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; children: React.ReactNode; className?: string }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[120] bg-black/85 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-100" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            'fixed left-1/2 top-1/2 z-[130] -translate-x-1/2 -translate-y-1/2 w-[466px] max-w-[calc(100vw-32px)] rounded-lg bg-[#3b3b45] border border-white/[0.06] p-4 shadow-[0_8px_16px_rgba(0,0,0,0.24)] outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] duration-100',
            className,
          )}
        >
          <DialogPrimitive.Title className="text-xl leading-6 font-semibold text-white">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Close aria-label="Fermer" className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center text-[hsl(var(--icon-default))] hover:text-white">
            <X className="w-[14px] h-[14px]" />
          </DialogPrimitive.Close>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export const FAV_INPUT =
  'w-full h-10 px-4 rounded-lg bg-[#2f2f37] border-2 border-transparent focus:border-[#5b63e4] outline-none text-base text-white placeholder:text-[#80848e] transition-colors';
export const FAV_BTN_GREY = 'h-10 rounded-lg bg-[#4a4a54] hover:bg-[#53535e] text-base font-medium text-white transition-colors';
export const FAV_BTN_BLUE = 'h-10 rounded-lg bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 disabled:hover:bg-[#5865f2] text-base font-medium text-white transition-colors';

/** Fenetre a un champ : "Creer une categorie" et "Changer le pseudo". */
export function FavTextDialog({
  open,
  onOpenChange,
  title,
  label,
  placeholder,
  initial = '',
  hint,
  confirm,
  onConfirm,
  allowEmpty,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  label: string;
  placeholder?: string;
  initial?: string;
  hint?: string;
  confirm: string;
  onConfirm: (value: string) => void;
  allowEmpty?: boolean;
}) {
  return (
    <FavDialog open={open} onOpenChange={onOpenChange} title={title}>
      <TextBody key={`${open}`} {...{ onOpenChange, label, placeholder, initial, hint, confirm, onConfirm, allowEmpty }} />
    </FavDialog>
  );
}

function TextBody({ onOpenChange, label, placeholder, initial, hint, confirm, onConfirm, allowEmpty }: { onOpenChange: (o: boolean) => void; label: string; placeholder?: string; initial: string; hint?: string; confirm: string; onConfirm: (v: string) => void; allowEmpty?: boolean }) {
  const [v, setV] = useState(initial);
  const ok = allowEmpty || v.trim().length > 0;
  const submit = () => {
    if (!ok) return;
    onConfirm(v.trim());
    onOpenChange(false);
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label className="mt-4 mb-2 block text-base font-semibold leading-5 text-white">{label}</label>
      <input autoFocus value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} maxLength={100} className={FAV_INPUT} />
      {hint && <p className="mt-2 text-sm leading-[18px] text-[#dbdee1]">{hint}</p>}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button type="button" onClick={() => onOpenChange(false)} className={FAV_BTN_GREY}>Annuler</button>
        <button type="submit" disabled={!ok} className={FAV_BTN_BLUE}>{confirm}</button>
      </div>
    </form>
  );
}
