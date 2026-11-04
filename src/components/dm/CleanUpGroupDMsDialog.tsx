import { useMemo, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, Users } from '@/components/icons/discord/lucide';
import { cn } from '@/lib/utils';
import { useDMConversations } from '@/hooks/useDMs';
import { useDMPrefs } from '@/hooks/useDMPrefs';
import { shortAgo } from '@/lib/shortAgo';

/*
 * "Nettoyer les MP de groupe inactifs" (video de reference) : liste les MP de groupe sans message depuis 30 jours et
 * les ferme (ils reapparaissent a leur prochain message). Sans MP concerne : "Aucun MP de groupe a nettoyer".
 */

const INACTIVE_MS = 30 * 24 * 3600 * 1000;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CleanUpGroupDMsDialog({ open, onOpenChange }: Props) {
  const { data: conversations = [] } = useDMConversations();
  const { hidden, close } = useDMPrefs();
  const [picked, setPicked] = useState<Set<string> | null>(null);

  const inactive = useMemo(
    () =>
      conversations.filter((c) => {
        if (!c.is_group || hidden.includes(c.id)) return false;
        const last = c.lastMessage?.created_at ?? c.created_at;
        return !last || Date.now() - new Date(last).getTime() > INACTIVE_MS;
      }),
    [conversations, hidden],
  );
  const selected = picked ?? new Set(inactive.map((c) => c.id));
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };
  const run = () => {
    selected.forEach((id) => close(id));
    setPicked(null);
    onOpenChange(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) setPicked(null); onOpenChange(o); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[120] bg-black/85 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-100" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[130] flex min-h-[300px] w-[464px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-white/[0.08] bg-[#383840] shadow-[0_8px_16px_rgba(0,0,0,0.24)] outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] duration-100"
        >
          <div className="flex items-center justify-between px-6 pt-6">
            <DialogPrimitive.Title className="text-xl font-semibold leading-6 text-white">Nettoyer les MP de groupe inactifs</DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label="Fermer" className="flex h-6 w-6 items-center justify-center text-[hsl(var(--icon-default))] hover:text-white">
              <X className="h-[14px] w-[14px]" />
            </DialogPrimitive.Close>
          </div>

          {inactive.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <h3 className="text-base font-medium leading-5 text-white">Aucun MP de groupe à nettoyer</h3>
              <p className="mt-1 text-sm leading-[18px] text-[#b5bac1]">On dirait que tout est déjà bien rangé.</p>
            </div>
          ) : (
            <div className="scrollbar-thin mt-4 max-h-[360px] flex-1 overflow-y-auto px-4">
              {inactive.map((c) => {
                const last = c.lastMessage?.created_at ?? c.created_at;
                const on = selected.has(c.id);
                return (
                  <button key={c.id} type="button" onClick={() => toggle(c.id)} className="flex h-[52px] w-full items-center gap-3 rounded-lg px-2 text-left transition-colors hover:bg-white/[0.05]">
                    <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-2', on ? 'border-[#5865f2] bg-[#5865f2]' : 'border-[#80848e]')}>
                      {on && <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3.5" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
                    </span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5865f2] text-white"><Users className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span translate="no" className="block truncate text-base font-medium leading-5 text-white">{c.name || c.participants.map((p) => p.display_name).join(', ') || 'Groupe'}</span>
                      <span className="block text-xs leading-4 text-[#b5bac1]">{last ? `Dernière activité · ${shortAgo(new Date(last))}` : 'Aucune activité'}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className={cn('grid gap-2 p-4', inactive.length > 0 ? 'grid-cols-2' : 'grid-cols-1')}>
            <button type="button" onClick={() => onOpenChange(false)} className="h-[38px] rounded-[4px] bg-white/[0.08] text-base font-medium text-white transition-colors hover:bg-white/[0.12]">Annuler</button>
            {inactive.length > 0 && (
              <button type="button" disabled={selected.size === 0} onClick={run} className="h-[38px] rounded-[4px] bg-[#da373c] text-base font-medium text-white transition-colors hover:bg-[#a12d2f] disabled:opacity-50">
                Nettoyer {selected.size} MP
              </button>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
