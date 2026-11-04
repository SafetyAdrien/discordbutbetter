import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { X, Check } from '@/components/icons/discord/lucide';
import { useAuth } from '@/contexts/AuthContext';
import { useClearMyServerTag, useMyServerTags, useMyTagSelection, useSetMyServerTag, useUserServerTag } from '@/hooks/useServerTags';
import { ServerTagPill } from './ServerTagBadge';
import { tagErrorMessage } from '@/lib/serverTags';
import { cn } from '@/lib/utils';

/*
 * "Tag du serveur" dans les parametres de profil : tuile avec le tag actif, puis fenetre listant les tags des
 * serveurs dont on est membre. Choisir un tag remplace le precedent (un seul tag actif) ; la selection n'est
 * affichee comme enregistree qu'apres confirmation du serveur.
 */

export function ServerTagPicker() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: current } = useUserServerTag(user?.id);
  const { data: selection } = useMyTagSelection();
  const { data: tags = [], isLoading, isError, refetch } = useMyServerTags();
  const setTag = useSetMyServerTag();
  const clear = useClearMyServerTag();
  const [pending, setPending] = useState<string | null>(null);

  const chosen = tags.find((t) => t.server_id === selection?.server_id);
  const outdated = !!selection && !!chosen && chosen.version !== selection.applied_version;

  const pick = (serverId: string) => {
    setPending(serverId);
    setTag.mutate(serverId, {
      onSuccess: () => { toast.success('Tag du serveur enregistré'); setPending(null); },
      onError: (e) => { toast.error(tagErrorMessage(e)); setPending(null); },
    });
  };

  return (
    <>
      <h3 className="mt-7 mb-[10px] text-sm leading-5 font-medium text-[#dbdee1]">Tag du serveur</h3>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full h-[50px] px-3 rounded-lg bg-[#43434b] hover:bg-[#4a4a53] transition-colors flex items-center justify-between gap-2 text-left"
      >
        {current ? <ServerTagPill tag={current} /> : <span className="text-sm text-muted-foreground">Aucun tag</span>}
        <span className="text-xs text-[#b5bac1]">Modifier</span>
      </button>
      {outdated && <p className="mt-2 text-xs text-[#f0b232]">Le tag de ce serveur a été modifié : sélectionne-le à nouveau.</p>}

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[120] bg-black/85 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed left-1/2 top-1/2 z-[130] -translate-x-1/2 -translate-y-1/2 w-[460px] max-w-[calc(100vw-32px)] max-h-[min(640px,90vh)] flex flex-col rounded-xl bg-[#383840] border border-white/[0.08] shadow-[0_8px_16px_rgba(0,0,0,0.24)] outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97]"
          >
            <div className="p-5 pb-3">
              <DialogPrimitive.Title className="text-xl leading-6 font-semibold text-white">Tag du serveur</DialogPrimitive.Title>
              <p className="mt-1 text-sm text-muted-foreground">Affiche le tag d'un de tes serveurs à côté de ton nom. Un seul tag est actif à la fois.</p>
              <DialogPrimitive.Close aria-label="Fermer" className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center text-[hsl(var(--icon-default))] hover:text-white">
                <X className="w-5 h-5" />
              </DialogPrimitive.Close>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-3 pb-2">
              {isLoading && <div role="status" className="flex items-center gap-2 px-2 py-8 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>}
              {isError && (
                <div role="alert" className="px-2 py-6 text-sm text-white">
                  Impossible de charger tes tags. <button type="button" onClick={() => void refetch()} className="text-[hsl(var(--text-link))] hover:underline">Réessayer</button>
                </div>
              )}
              {!isLoading && !isError && tags.length === 0 && (
                <p className="px-2 py-8 text-sm text-muted-foreground text-center">Aucun de tes serveurs n'a de tag pour le moment.</p>
              )}
              {tags.map((t) => {
                const active = selection?.server_id === t.server_id && selection.applied_version === t.version;
                return (
                  <button
                    key={t.server_id}
                    type="button"
                    disabled={!!pending}
                    onClick={() => !active && pick(t.server_id)}
                    aria-pressed={active}
                    className={cn('w-full min-h-[58px] px-3 py-2 rounded-lg flex items-center gap-3 text-left transition-colors', active ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]')}
                  >
                    {t.server_icon ? (
                      <img src={t.server_icon} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
                    ) : (
                      <span className="w-9 h-9 rounded-xl bg-primary/25 flex items-center justify-center text-sm font-semibold text-white shrink-0">{t.server_name.slice(0, 2).toUpperCase()}</span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span translate="no" className="block text-base leading-5 font-semibold text-white truncate">{t.server_name}</span>
                      <span className="mt-1 block"><ServerTagPill tag={{ serverId: t.server_id, name: t.name, badgeId: t.badge_id, color: t.color }} /></span>
                    </span>
                    {pending === t.server_id ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : active ? <Check className="w-5 h-5 text-[#5865f2]" /> : null}
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t border-white/[0.06] flex justify-between items-center">
              <button
                type="button"
                disabled={!selection || clear.isPending}
                onClick={() => clear.mutate(undefined, { onSuccess: () => toast.success('Tag retiré'), onError: (e) => toast.error(tagErrorMessage(e)) })}
                className="h-9 px-3 rounded-lg text-sm font-medium text-[#f57976] hover:bg-[#da373c]/10 disabled:opacity-40 disabled:pointer-events-none"
              >
                Retirer mon tag
              </button>
              <DialogPrimitive.Close className="h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-sm font-medium text-white">Terminé</DialogPrimitive.Close>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
