import * as DialogPrimitive from '@radix-ui/react-dialog';
import ThreadsPopover from './ThreadsPopover';

/* "Voir tous les fils" (lien du message "a commence un fil") : la liste des fils en fenetre centree, avec bouton fermer. */
export function ThreadsModal({ open, onOpenChange, channelId, channelName, onSelectThread }: { open: boolean; onOpenChange: (o: boolean) => void; channelId: string; channelName?: string; onSelectThread: (id: string) => void }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[120] bg-black/85 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-100" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[130] -translate-x-1/2 -translate-y-1/2 w-[659px] max-w-[calc(100vw-32px)] rounded-xl bg-[#383840] border border-white/[0.06] shadow-[0_8px_24px_rgba(0,0,0,0.4)] outline-none overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] duration-100"
        >
          <DialogPrimitive.Title className="sr-only">Fils</DialogPrimitive.Title>
          <ThreadsPopover channelId={channelId} channelName={channelName} onSelectThread={onSelectThread} onDone={() => onOpenChange(false)} onClose={() => onOpenChange(false)} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
