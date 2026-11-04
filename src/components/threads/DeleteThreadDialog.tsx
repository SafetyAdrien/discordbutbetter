import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from '@/components/icons/discord/lucide';

/* Confirmation "Supprimer le fil" (video de reference) : petite fenetre, texte, Annuler / Supprimer le fil (rouge). */
export function DeleteThreadDialog({ open, onOpenChange, name, onConfirm }: { open: boolean; onOpenChange: (o: boolean) => void; name: string; onConfirm: () => void }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[120] bg-black/85 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-100" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[130] -translate-x-1/2 -translate-y-1/2 w-[385px] max-w-[calc(100vw-32px)] rounded-lg bg-[#383840] border border-white/[0.08] p-[22px] shadow-[0_8px_16px_rgba(0,0,0,0.24)] outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] duration-100"
        >
          <DialogPrimitive.Title className="text-xl leading-6 font-semibold text-white">Supprimer le fil</DialogPrimitive.Title>
          <DialogPrimitive.Close aria-label="Fermer" className="absolute top-[15px] right-[15px] w-6 h-6 flex items-center justify-center text-[hsl(var(--icon-default))] hover:text-white">
            <X className="w-[14px] h-[14px]" />
          </DialogPrimitive.Close>
          <p className="mt-1.5 text-base leading-5 text-[#dbdee1]">
            Tu es sûr(e) de vouloir supprimer "<span translate="no" className="font-semibold text-white">{name}</span>" ? Cette action est irréversible.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onOpenChange(false)} className="h-[38px] rounded-[4px] bg-white/[0.08] hover:bg-white/[0.12] text-base font-medium text-white transition-colors">Annuler</button>
            <button type="button" onClick={() => { onConfirm(); onOpenChange(false); }} className="h-[38px] rounded-[4px] bg-[#da373c] hover:bg-[#a12d2f] text-base font-medium text-white transition-colors">Supprimer le fil</button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
