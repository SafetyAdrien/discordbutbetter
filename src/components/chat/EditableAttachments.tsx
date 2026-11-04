import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MessageAttachments, type StoredAttachment } from '@/components/chat/MessageAttachments';
import { cn } from '@/lib/utils';

/*
 * Pieces jointes d'un message, avec "Modifier" (description, spoiler) et "Supprimer" au survol quand le message
 * est celui de l'utilisateur (video de reference).
 */

export type AttachmentScope = { kind: 'channel' | 'thread' | 'dm'; scopeId: string };
const TABLE = { channel: 'messages', thread: 'thread_messages', dm: 'dm_messages' } as const;

function useSaveAttachments(scope: AttachmentScope, messageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (attachments: StoredAttachment[]) => {
      const { error } = await (supabase as unknown as { from: (t: string) => any })
        .from(TABLE[scope.kind])
        .update({ attachments, edited_at: new Date().toISOString() })
        .eq('id', messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      if (scope.kind === 'channel') queryClient.invalidateQueries({ queryKey: ['messages', scope.scopeId] });
      else if (scope.kind === 'thread') queryClient.invalidateQueries({ queryKey: ['thread-messages', scope.scopeId] });
      else queryClient.invalidateQueries({ predicate: (q) => q.queryKey.includes(scope.scopeId) && String(q.queryKey[0]).toLowerCase().includes('dm') });
    },
    onError: () => toast.error('Impossible de modifier la pièce jointe'),
  });
}

export function EditableAttachments({
  attachments,
  authorId,
  messageId,
  scope,
  editable,
  hasText,
}: {
  attachments: StoredAttachment[];
  authorId?: string | null;
  messageId: string;
  scope: AttachmentScope;
  editable: boolean;
  /** Le message a aussi du texte : on peut alors retirer sa derniere piece jointe. */
  hasText: boolean;
}) {
  const [editing, setEditing] = useState<StoredAttachment | null>(null);
  const [removing, setRemoving] = useState<StoredAttachment | null>(null);
  const [description, setDescription] = useState('');
  const [spoiler, setSpoiler] = useState(false);
  const save = useSaveAttachments(scope, messageId);

  if (!editable) return <MessageAttachments attachments={attachments} authorId={authorId} />;

  const patch = (id: string, change: Partial<StoredAttachment>) => attachments.map((a) => (a.id === id ? { ...a, ...change } : a));

  return (
    <>
      <MessageAttachments
        attachments={attachments}
        authorId={authorId}
        onEditAttachment={(a) => { setEditing(a); setDescription(a.description ?? ''); setSpoiler(!!a.isSpoiler); }}
        onRemoveAttachment={(a) => {
          if (attachments.length === 1 && !hasText) { toast.info('Supprime plutôt le message : il ne contient que cette pièce jointe.'); return; }
          setRemoving(a);
        }}
      />

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="w-[440px] max-w-[calc(100vw-32px)] gap-0 p-6 rounded-xl">
          <DialogTitle className="text-xl font-semibold text-white">Modifier la pièce jointe</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-[#b5bac1] truncate">{editing?.name}</DialogDescription>
          <label htmlFor="attachment-description" className="mt-5 mb-2 text-xs font-bold uppercase tracking-wide text-[#b5bac1]">Description (texte alternatif)</label>
          <input
            id="attachment-description"
            autoFocus
            value={description}
            maxLength={1024}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décris cette image pour les personnes malvoyantes"
            className="h-10 px-3 rounded-lg bg-[#33333b] border border-white/[0.04] focus:border-[#5b63e4] outline-none text-base text-white placeholder:text-[#80848e] transition-colors"
          />
          <label className="mt-4 flex items-center gap-3 cursor-pointer select-none">
            <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} className="sr-only peer" />
            <span aria-hidden className={cn('w-5 h-5 rounded-[4px] border-2 flex items-center justify-center transition-colors', spoiler ? 'bg-[#5865f2] border-[#5865f2]' : 'border-[#80848e]')}>
              {spoiler && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>}
            </span>
            <span className="text-base text-[#dbdee1] peer-focus-visible:underline">Marquer comme spoiler</span>
          </label>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setEditing(null)} className="h-10 px-4 rounded-lg text-base font-medium text-white hover:underline">Annuler</button>
            <button
              type="button"
              disabled={save.isPending}
              onClick={() => editing && save.mutate(patch(editing.id, { description: description.trim() || undefined, isSpoiler: spoiler }), { onSuccess: () => setEditing(null) })}
              className="h-10 px-4 rounded-lg bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-60 text-base font-medium text-white transition-colors"
            >
              Enregistrer
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removing} onOpenChange={(o) => { if (!o) setRemoving(null); }}>
        <AlertDialogContent>
          <AlertDialogTitle>Supprimer la pièce jointe</AlertDialogTitle>
          <AlertDialogDescription>Cette pièce jointe sera retirée du message. Cette action est irréversible.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => removing && save.mutate(attachments.filter((a) => a.id !== removing.id))}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
