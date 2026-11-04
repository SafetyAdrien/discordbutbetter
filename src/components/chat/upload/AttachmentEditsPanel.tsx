import { useCallback, useEffect, useRef, useState } from 'react';
import { Music } from 'lucide-react';
import { FileText, Plus, Trash2 } from '@/components/icons/discord/lucide';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LazyMediaUploadModal as MediaUploadModal } from '@/components/lazy/LazyModals';
import { kindOfFile, MEDIA_KINDS, type MediaKind } from '@/lib/mediaTypes';
import { uploadAttachments, type StoredAttachment } from '@/hooks/useMessages';
import type { AttachmentMeta, PendingAttachment } from '@/hooks/usePendingAttachments';

/*
 * Pieces jointes d'un message en cours de modification : chaque media peut etre remplace (par un fichier du meme
 * type : image -> image, video -> video, musique -> musique) ou retire, et de nouveaux medias s'ajoutent via la
 * fenetre "Ajouter des medias". Le remplacement garde la position du media dans le message.
 */

const MAX_TOTAL = 10;
const REPLACE_TITLE: Record<MediaKind, string> = { image: "Remplacer l'image", video: 'Remplacer la vidéo', audio: 'Remplacer la musique', pdf: 'Remplacer le PDF' };

interface Incoming { file: File; meta: AttachmentMeta; previewUrl: string }
interface Added extends Incoming { id: string }

export function useAttachmentEdits() {
  const [original, setOriginal] = useState<StoredAttachment[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [replaced, setReplaced] = useState<Record<string, Incoming>>({});
  const [added, setAdded] = useState<Added[]>([]);
  const urls = useRef<string[]>([]);

  const revoke = () => { urls.current.forEach((u) => URL.revokeObjectURL(u)); urls.current = []; };
  useEffect(() => revoke, []);

  const reset = useCallback((initial: StoredAttachment[] = []) => {
    revoke();
    setOriginal(initial);
    setRemoved([]);
    setReplaced({});
    setAdded([]);
  }, []);

  const make = (file: File, meta: AttachmentMeta): Incoming => {
    const previewUrl = URL.createObjectURL(file);
    urls.current.push(previewUrl);
    return { file, meta, previewUrl };
  };

  const kept = original.filter((a) => !removed.includes(a.id));
  const count = kept.length + added.length;
  const hasChanges = removed.length > 0 || added.length > 0 || Object.keys(replaced).length > 0;

  /** Televerse les nouveaux fichiers et renvoie la liste finale (ordre conserve). `extra` : fichiers deja en attente dans la zone de saisie. */
  const resolve = useCallback(async (userId: string, extra: PendingAttachment[] = []): Promise<StoredAttachment[]> => {
    const pending: PendingAttachment[] = [];
    const toPending = (id: string, i: Incoming): PendingAttachment => ({
      id, file: i.file, previewUrl: '', name: i.meta.name || i.file.name, description: i.meta.description ?? '', isSpoiler: i.meta.isSpoiler ?? false,
    });
    for (const a of original) if (!removed.includes(a.id) && replaced[a.id]) pending.push(toPending(`rep-${a.id}`, replaced[a.id]));
    for (const a of added) pending.push(toPending(a.id, a));
    pending.push(...extra);
    const uploaded = await uploadAttachments(userId, pending);
    const byId = new Map(pending.map((p, i) => [p.id, uploaded[i]]));
    const out: StoredAttachment[] = [];
    for (const a of original) {
      if (removed.includes(a.id)) continue;
      out.push(replaced[a.id] ? byId.get(`rep-${a.id}`)! : a);
    }
    for (const a of added) out.push(byId.get(a.id)!);
    for (const p of extra) out.push(byId.get(p.id)!);
    return out;
  }, [original, removed, replaced, added]);

  return {
    original, kept, added, replaced, count, hasChanges, reset, resolve,
    remove: (id: string) => setRemoved((r) => [...r, id]),
    undoReplace: (id: string) => setReplaced((r) => { const { [id]: _drop, ...rest } = r; return rest; }),
    replace: (id: string, file: File, meta: AttachmentMeta) => setReplaced((r) => ({ ...r, [id]: make(file, meta) })),
    add: (files: File[], meta: AttachmentMeta[]) => setAdded((a) => [...a, ...files.map((f, i) => ({ id: crypto.randomUUID(), ...make(f, meta[i] ?? {}) }))]),
    removeAdded: (id: string) => setAdded((a) => a.filter((x) => x.id !== id)),
  };
}

export type AttachmentEdits = ReturnType<typeof useAttachmentEdits>;

function Preview({ kind, url, name, className }: { kind: MediaKind | null; url: string; name: string; className?: string }) {
  if (kind === 'video') return <video src={url} muted className={cn('object-cover', className)} />;
  if (kind === 'audio') return <div className={cn('flex flex-col items-center justify-center bg-[#2b2b32]', className)}><Music className="w-6 h-6 text-primary" /></div>;
  if (kind === 'pdf') return <div className={cn('flex flex-col items-center justify-center bg-[#2b2b32]', className)}><FileText className="w-6 h-6 text-destructive" /></div>;
  if (kind === 'image') return <img src={url} alt={name} className={cn('object-cover', className)} draggable={false} />;
  return <div className={cn('flex items-center justify-center bg-[#2b2b32]', className)}><FileText className="w-6 h-6 text-muted-foreground" /></div>;
}

const kindOfStored = (a: StoredAttachment): MediaKind | null => (a.type === 'image' || a.type === 'gif' || a.type === 'sticker' ? 'image' : a.type === 'video' ? 'video' : a.type === 'audio' ? 'audio' : kindOfFile({ type: '', name: a.name }));

function Tile({ kind, url, name, badge, onReplace, onRemove, onUndo }: { kind: MediaKind | null; url: string; name: string; badge?: string; onReplace?: () => void; onRemove: () => void; onUndo?: () => void }) {
  const btn = 'w-7 h-7 flex items-center justify-center rounded-md bg-black/70 text-white hover:bg-black/90 transition-colors';
  return (
    <div className="group relative w-[88px] shrink-0">
      <div className="relative w-[88px] h-[88px] rounded-lg overflow-hidden bg-black/30">
        <Preview kind={kind} url={url} name={name} className="w-full h-full" />
        {badge && <span className="absolute left-1 top-1 px-1.5 h-4 rounded bg-primary text-[10px] font-semibold leading-4 text-white">{badge}</span>}
        <div className="absolute inset-x-0 bottom-1 flex justify-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          {onReplace && <button type="button" aria-label={`Remplacer ${name}`} title="Remplacer" onClick={onReplace} className={btn}><RefreshCw className="w-3.5 h-3.5" /></button>}
          {onUndo && <button type="button" aria-label="Annuler le remplacement" title="Annuler le remplacement" onClick={onUndo} className={btn}>↺</button>}
          <button type="button" aria-label={`Retirer ${name}`} title="Retirer" onClick={onRemove} className={cn(btn, 'text-[#f57976]')}><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <p translate="no" className="mt-1 text-[11px] text-muted-foreground truncate" title={name}>{name}</p>
    </div>
  );
}

export function AttachmentEditsPanel({ edits, className }: { edits: AttachmentEdits; className?: string }) {
  const [addOpen, setAddOpen] = useState(false);
  const [replacing, setReplacing] = useState<StoredAttachment | null>(null);
  const roomLeft = MAX_TOTAL - edits.count;
  if (edits.original.length === 0 && edits.added.length === 0 && roomLeft <= 0) return null;
  const replacingKind = replacing ? kindOfStored(replacing) : null;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-start gap-2">
        {edits.kept.map((a) => {
          const rep = edits.replaced[a.id];
          return (
            <Tile
              key={a.id}
              kind={rep ? kindOfFile(rep.file) : kindOfStored(a)}
              url={rep ? rep.previewUrl : a.url}
              name={rep ? rep.meta.name || rep.file.name : a.name}
              badge={rep ? 'Remplacé' : undefined}
              onReplace={() => setReplacing(a)}
              onUndo={rep ? () => edits.undoReplace(a.id) : undefined}
              onRemove={() => edits.remove(a.id)}
            />
          );
        })}
        {edits.added.map((a) => (
          <Tile key={a.id} kind={kindOfFile(a.file)} url={a.previewUrl} name={a.meta.name || a.file.name} badge="Nouveau" onRemove={() => edits.removeAdded(a.id)} />
        ))}
        {roomLeft > 0 && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="w-[88px] h-[88px] shrink-0 rounded-lg border-2 border-dashed border-white/[0.14] hover:border-white/30 hover:bg-white/[0.03] flex flex-col items-center justify-center gap-1 text-xs font-medium text-[hsl(var(--icon-default))] hover:text-white transition-colors"
          >
            <Plus className="w-5 h-5" />
            Ajouter
          </button>
        )}
      </div>

      <MediaUploadModal
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Ajouter des médias"
        maxItems={roomLeft}
        onConfirm={(files, meta) => edits.add(files, meta)}
      />
      <MediaUploadModal
        open={!!replacing}
        onOpenChange={(o) => { if (!o) setReplacing(null); }}
        title={replacingKind ? REPLACE_TITLE[replacingKind] : 'Remplacer le média'}
        targetName={replacing?.name}
        allowedKinds={replacingKind ? [replacingKind] : undefined}
        maxItems={1}
        confirmLabel="Remplacer"
        onConfirm={(files, meta) => { if (replacing && files[0]) edits.replace(replacing.id, files[0], meta[0] ?? {}); }}
      />
    </div>
  );
}
