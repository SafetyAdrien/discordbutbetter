import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Clipboard, FlipHorizontal2, FlipVertical2, Loader2, Music, RotateCcw } from 'lucide-react';
import { ArrowLeft, ArrowRight, EyeOff, FileText, Image as ImageIcon, Link as LinkIcon, RotateCw, Trash2, Upload, X } from '@/components/icons/discord/lucide';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { AttachmentMeta } from '@/hooks/usePendingAttachments';
import { ALL_MEDIA_KINDS, MEDIA_KINDS, acceptFor, formatsLabel, kindOfFile, type MediaKind } from '@/lib/mediaTypes';

/*
 * Fenetre "Ajouter des medias" ouverte depuis le "+" de la zone de saisie.
 * Sources : appareil (glisser-deposer / parcourir), presse-papiers, lien.
 * Types acceptes choisis par categorie (images, videos, musiques, PDF) : le
 * selecteur de fichiers et le depot ne retiennent que le type choisi. Chaque media se renomme, recoit un texte alternatif,
 * passe en spoiler, se reordonne, et les images se tournent / retournent
 * / redimensionnent avant l'envoi (traitement canvas local).
 */

const MAX_ITEMS = 10;
const MAX_ALT = 1024;

type Source = 'device' | 'link';
type ResizeMode = 'original' | '2048' | '1280' | '720';

interface Item {
  id: string;
  file: File;
  url: string;
  name: string;
  description: string;
  isSpoiler: boolean;
  rotation: 0 | 90 | 180 | 270;
  flipX: boolean;
  flipY: boolean;
  resize: ResizeMode;
}

const isEditableImage = (f: File) => f.type.startsWith('image/') && f.type !== 'image/gif' && f.type !== 'image/svg+xml';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function makeItem(file: File): Item {
  return {
    id: crypto.randomUUID(),
    file,
    url: URL.createObjectURL(file),
    name: file.name,
    description: '',
    isSpoiler: false,
    rotation: 0,
    flipX: false,
    flipY: false,
    resize: 'original',
  };
}

const hasEdits = (it: Item) => it.rotation !== 0 || it.flipX || it.flipY || it.resize !== 'original';

/** Applique rotation / miroir / redimensionnement sur un canvas et renvoie le nouveau fichier. */
async function renderEdits(it: Item): Promise<File> {
  if (!isEditableImage(it.file) || !hasEdits(it)) return it.file;
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = it.url;
  });
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (it.resize !== 'original') {
    const max = Number(it.resize);
    const k = Math.min(1, max / Math.max(w, h));
    w = Math.round(w * k);
    h = Math.round(h * k);
  }
  const quarter = it.rotation === 90 || it.rotation === 270;
  const canvas = document.createElement('canvas');
  canvas.width = quarter ? h : w;
  canvas.height = quarter ? w : h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return it.file;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((it.rotation * Math.PI) / 180);
  ctx.scale(it.flipX ? -1 : 1, it.flipY ? -1 : 1);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  const mime = it.file.type === 'image/png' || it.file.type === 'image/webp' ? it.file.type : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, 0.92));
  if (!blob) return it.file;
  return new File([blob], it.file.name, { type: mime, lastModified: Date.now() });
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Nom du salon / de la conversation, affiche dans le titre. */
  targetName?: string;
  onConfirm: (files: File[], meta: AttachmentMeta[]) => void;
  /** Types proposes (par defaut tous). Un seul type : pas de selecteur, ex. remplacer une image par une image. */
  allowedKinds?: MediaKind[];
  /** Nombre maximal de fichiers (1 = remplacement d'un media). */
  maxItems?: number;
  title?: string;
  confirmLabel?: string;
}

export function MediaUploadModal({ open, onOpenChange, targetName, onConfirm, allowedKinds = ALL_MEDIA_KINDS, maxItems = MAX_ITEMS, title = 'Ajouter des médias', confirmLabel = 'Ajouter' }: Props) {
  const [kindFilter, setKindFilter] = useState<MediaKind | 'all'>('all');
  const kinds = kindFilter === 'all' ? allowedKinds : [kindFilter];
  const accept = acceptFor(kinds);
  const kindsRef = useRef(kinds);
  kindsRef.current = kinds;
  const isAccepted = (f: File) => {
    const k = kindOfFile(f);
    return !!k && kindsRef.current.includes(k);
  };
  const acceptedText = kinds.map((k) => MEDIA_KINDS[k].plural.toLowerCase()).join(', ');
  const [items, setItems] = useState<Item[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [source, setSource] = useState<Source>('device');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Liberer les URL d'apercu a la fermeture.
  const reset = useCallback(() => {
    itemsRef.current.forEach((it) => URL.revokeObjectURL(it.url));
    setItems([]);
    setSelectedId(null);
    setLinkUrl('');
    setSource('device');
    setKindFilter('all');
  }, []);
  useEffect(() => () => itemsRef.current.forEach((it) => URL.revokeObjectURL(it.url)), []);

  const close = useCallback(() => {
    reset();
    onOpenChange(false);
  }, [onOpenChange, reset]);

  const add = useCallback((files: File[]) => {
    const ok = files.filter(isAccepted);
    if (ok.length < files.length) toast.error(`Format non accepté ici : ${formatsLabel(kindsRef.current, 8)}.`);
    const room = maxItems - itemsRef.current.length;
    if (ok.length > room) toast.error(maxItems === 1 ? 'Un seul fichier peut remplacer ce média.' : `Tu peux joindre ${maxItems} fichiers maximum par message.`);
    const next = ok.slice(0, Math.max(0, room)).map(makeItem);
    if (!next.length) return;
    setItems((prev) => [...prev, ...next]);
    setSelectedId((cur) => cur ?? next[0].id);
  }, [maxItems]);

  // Coller (Ctrl+V) n'importe ou dans la fenetre.
  useEffect(() => {
    if (!open) return;
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      const files = Array.from(e.clipboardData?.files ?? []);
      if (!files.length) return;
      if (target?.tagName === 'TEXTAREA' || (target?.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text')) return;
      e.preventDefault();
      add(files);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [open, add]);

  const pasteFromClipboard = async () => {
    try {
      const entries = await navigator.clipboard.read();
      const files: File[] = [];
      for (const entry of entries) {
        const type = entry.types.find((t) => t.startsWith('image/'));
        if (!type) continue;
        const blob = await entry.getType(type);
        files.push(new File([blob], `presse-papiers-${Date.now()}.${type.split('/')[1] || 'png'}`, { type }));
      }
      if (files.length) add(files);
      else toast.error('Aucune image dans le presse-papiers.');
    } catch {
      toast.error('Accès au presse-papiers refusé. Utilise Ctrl+V dans la fenêtre.');
    }
  };

  const importLink = async () => {
    const raw = linkUrl.trim();
    let url: URL;
    try {
      url = new URL(raw);
      if (!/^https?:$/.test(url.protocol)) throw new Error();
    } catch {
      toast.error('Lien invalide.');
      return;
    }
    setLinkLoading(true);
    try {
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const type = blob.type || 'application/octet-stream';
      const base = decodeURIComponent(url.pathname.split('/').pop() || '') || 'media';
      const file = new File([blob], base.includes('.') ? base : `${base}.${type.split('/')[1] || 'bin'}`, { type });
      if (!isAccepted(file)) throw new Error('type');
      add([file]);
      setLinkUrl('');
    } catch (e) {
      toast.error(
        e instanceof Error && e.message === 'type'
          ? "Ce lien ne pointe pas vers une image, une vidéo ou un PDF."
          : "Impossible de récupérer ce média (le site bloque peut-être le téléchargement).",
      );
    } finally {
      setLinkLoading(false);
    }
  };

  const update = (id: string, patch: Partial<Item>) => setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const remove = (id: string) => {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.id === id);
      const it = prev[idx];
      if (it) URL.revokeObjectURL(it.url);
      const next = prev.filter((x) => x.id !== id);
      setSelectedId((cur) => (cur === id ? next[Math.min(idx, next.length - 1)]?.id ?? null : cur));
      return next;
    });
  };

  const move = (id: string, delta: number) =>
    setItems((prev) => {
      const i = prev.findIndex((x) => x.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const dropOnItem = (targetId: string) => {
    if (!dragItemId || dragItemId === targetId) return;
    setItems((prev) => {
      const from = prev.findIndex((x) => x.id === dragItemId);
      const to = prev.findIndex((x) => x.id === targetId);
      const next = prev.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const selected = items.find((it) => it.id === selectedId) ?? null;
  const totalSize = useMemo(() => items.reduce((n, it) => n + it.file.size, 0), [items]);

  const submit = async () => {
    if (!items.length) return;
    setSubmitting(true);
    try {
      const files = await Promise.all(items.map(renderEdits));
      onConfirm(
        files,
        items.map((it) => ({ name: it.name.trim() || it.file.name, description: it.description.trim(), isSpoiler: it.isSpoiler })),
      );
      close();
    } catch {
      toast.error('Impossible de préparer les médias.');
    } finally {
      setSubmitting(false);
    }
  };

  const transformStyle = (it: Item) => ({
    transform: `rotate(${it.rotation}deg) scale(${it.flipX ? -1 : 1}, ${it.flipY ? -1 : 1})`,
  });

  const thumb = (it: Item, className: string) =>
    it.file.type.startsWith('video/') ? (
      <video src={it.url} muted playsInline className={className} style={transformStyle(it)} />
    ) : kindOfFile(it.file) === 'audio' ? (
      <div className={cn(className, 'flex flex-col items-center justify-center gap-1 bg-[hsl(var(--surface-card))]')}>
        <Music className="w-8 h-8 text-primary" />
        <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">{it.file.name.split('.').pop()}</span>
      </div>
    ) : it.file.type === 'application/pdf' ? (
      <div className={cn(className, 'flex items-center justify-center bg-[hsl(var(--surface-card))]')}>
        <FileText className="w-8 h-8 text-[hsl(var(--icon-default))]" />
      </div>
    ) : (
      <img src={it.url} alt="" className={className} style={transformStyle(it)} draggable={false} />
    );

  const sourceBtn = (id: Source, label: string, Icon: React.ElementType) => (
    <button
      type="button"
      onClick={() => setSource(id)}
      className={cn(
        'flex items-center gap-2 h-8 px-3 rounded-md text-sm font-medium transition-colors',
        source === id ? 'bg-[hsl(var(--interactive-background-selected))] text-white' : 'text-[hsl(var(--icon-default))] hover:text-white hover:bg-[hsl(var(--interactive-background-hover))]',
      )}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );

  const toolBtn = (label: string, Icon: React.ElementType, onClick: () => void, active = false) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'w-9 h-9 flex items-center justify-center rounded-md transition-colors',
        active ? 'bg-primary text-white' : 'bg-[hsl(var(--button-secondary))] text-[hsl(var(--icon-default))] hover:text-white',
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent
        className="max-w-[min(1040px,calc(100vw-32px))] w-full h-[min(720px,calc(100vh-32px))] p-0 gap-0 flex flex-col overflow-hidden bg-[hsl(var(--background))] border-white/[0.06] [&>button]:hidden"
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) add(Array.from(e.target.files));
            e.target.value = '';
          }}
        />

        {/* En-tete */}
        <div className="flex items-center gap-3 px-5 h-14 shrink-0 border-b border-white/[0.06]">
          <ImageIcon className="w-5 h-5 text-[hsl(var(--icon-default))]" />
          <DialogTitle className="flex-1 text-base font-semibold text-white truncate">
            {title}{targetName ? <span className="font-normal text-muted-foreground"> · {targetName}</span> : null}
          </DialogTitle>
          <button type="button" aria-label="Fermer" onClick={close} className="p-1 rounded text-[hsl(var(--icon-default))] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          {/* Colonne principale : sources + grille */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
            <div className="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-white/[0.06]">
              {sourceBtn('device', 'Appareil', Upload)}
              {sourceBtn('link', 'Lien', LinkIcon)}
              <span className="mx-1 h-5 w-px bg-white/[0.08]" />
              {kinds.includes('image') && (
                <button type="button" onClick={pasteFromClipboard} className="flex items-center gap-2 h-8 px-3 rounded-md text-sm font-medium text-[hsl(var(--icon-default))] hover:text-white hover:bg-[hsl(var(--interactive-background-hover))]">
                  <Clipboard className="w-4 h-4" /> Coller
                </button>
              )}
            </div>
            {allowedKinds.length > 1 && (
              <div role="radiogroup" aria-label="Type de média" className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-b border-white/[0.06]">
                <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</span>
                {(['all', ...allowedKinds] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={kindFilter === k}
                    onClick={() => setKindFilter(k)}
                    className={cn(
                      'h-7 px-3 rounded-full text-sm font-medium transition-colors',
                      kindFilter === k ? 'bg-primary text-white' : 'bg-[hsl(var(--button-secondary))] text-[hsl(var(--icon-default))] hover:text-white',
                    )}
                  >
                    {k === 'all' ? 'Tous' : MEDIA_KINDS[k].plural}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-4 space-y-4">
              {source === 'link' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void importLink();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    autoFocus
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://exemple.com/image.png"
                    aria-label="Lien du média"
                    className="flex-1 h-10 px-3 rounded-lg bg-[hsl(var(--input))] border border-white/[0.08] focus:border-primary outline-none text-sm text-foreground placeholder:text-muted-foreground"
                  />
                  <button type="submit" disabled={!linkUrl.trim() || linkLoading} className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                    {linkLoading && <Loader2 className="w-4 h-4 animate-spin" />} Importer
                  </button>
                </form>
              )}

              {/* Zone de depot */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
                onDragOver={(e) => {
                  if (!e.dataTransfer.types.includes('Files')) return;
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  if (!e.dataTransfer.files.length) return;
                  e.preventDefault();
                  setDragOver(false);
                  add(Array.from(e.dataTransfer.files));
                }}
                className={cn(
                  'flex flex-col items-center justify-center text-center rounded-xl border-2 border-dashed cursor-pointer transition-colors',
                  items.length ? 'py-5' : 'py-16',
                  dragOver ? 'border-primary bg-primary/10' : 'border-white/[0.12] hover:border-white/25 hover:bg-white/[0.02]',
                )}
              >
                <span className="w-12 h-12 rounded-full bg-[hsl(var(--button-secondary))] flex items-center justify-center">
                  <Upload className="w-6 h-6 text-white" />
                </span>
                <p className="mt-3 text-base font-semibold text-white">Glisse tes fichiers ici</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  ou <span className="text-[hsl(var(--text-link))]">parcours ton appareil</span> · Ctrl+V pour coller
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{formatsLabel(kinds)} · {items.length}/{maxItems}</p>
              </div>

              {/* Grille des medias */}
              {items.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {items.map((it, i) => (
                    <div
                      key={it.id}
                      draggable
                      onDragStart={() => setDragItemId(it.id)}
                      onDragEnd={() => setDragItemId(null)}
                      onDragOver={(e) => dragItemId && e.preventDefault()}
                      onDrop={(e) => {
                        if (!dragItemId) return;
                        e.preventDefault();
                        e.stopPropagation();
                        dropOnItem(it.id);
                      }}
                      onClick={() => setSelectedId(it.id)}
                      className={cn(
                        'group relative rounded-lg overflow-hidden bg-[hsl(var(--card))] cursor-pointer ring-2 transition-all',
                        selectedId === it.id ? 'ring-primary' : 'ring-transparent hover:ring-white/20',
                        dragItemId === it.id && 'opacity-40',
                      )}
                    >
                      <div className="relative aspect-square overflow-hidden flex items-center justify-center bg-black/30">
                        {thumb(it, cn('max-w-full max-h-full object-contain transition-transform', it.isSpoiler && 'blur-xl'))}
                        {it.isSpoiler && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="px-2 py-1 rounded-full bg-black/70 text-[11px] font-bold tracking-wider text-white">SPOILER</span>
                          </span>
                        )}
                        <span className="absolute top-1.5 left-1.5 min-w-5 h-5 px-1 rounded bg-black/70 text-[11px] font-semibold text-white flex items-center justify-center">{i + 1}</span>
                        <button
                          type="button"
                          aria-label="Retirer"
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(it.id);
                          }}
                          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-md bg-black/70 text-[#f57976] opacity-0 group-hover:opacity-100 focus:opacity-100 flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="px-2 py-1.5">
                        <p className="text-xs font-medium text-white truncate">{it.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatSize(it.file.size)}
                          {it.description && ' · ALT'}
                          {hasEdits(it) && ' · modifiée'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Panneau d'edition du media selectionne */}
          {selected && (
            <aside className="md:w-[320px] shrink-0 border-t md:border-t-0 md:border-l border-white/[0.06] bg-[hsl(var(--card))] overflow-y-auto scrollbar-thin p-4 space-y-4 max-h-[45%] md:max-h-none">
              <div className="rounded-lg overflow-hidden bg-black/40 h-44 flex items-center justify-center">
                {thumb(selected, 'max-w-full max-h-44 object-contain transition-transform')}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="media-name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nom du fichier</label>
                <input
                  id="media-name"
                  type="text"
                  value={selected.name}
                  onChange={(e) => update(selected.id, { name: e.target.value })}
                  className="w-full h-9 px-2.5 rounded-md bg-[hsl(var(--input))] border border-white/[0.08] focus:border-primary outline-none text-sm text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="media-alt" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description (texte alternatif)</label>
                  <span className="text-[11px] text-muted-foreground">{selected.description.length}/{MAX_ALT}</span>
                </div>
                <textarea
                  id="media-alt"
                  rows={3}
                  maxLength={MAX_ALT}
                  value={selected.description}
                  onChange={(e) => update(selected.id, { description: e.target.value })}
                  placeholder="Décris ce média pour les personnes malvoyantes"
                  className="w-full px-2.5 py-2 rounded-md bg-[hsl(var(--input))] border border-white/[0.08] focus:border-primary outline-none text-sm text-foreground resize-none placeholder:text-muted-foreground"
                />
              </div>

              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="flex items-center gap-2 text-sm text-white">
                  <EyeOff className="w-4 h-4 text-[hsl(var(--icon-default))]" /> Marquer comme spoiler
                </span>
                <input
                  type="checkbox"
                  checked={selected.isSpoiler}
                  onChange={(e) => update(selected.id, { isSpoiler: e.target.checked })}
                  className="peer sr-only"
                />
                <span className="relative w-10 h-6 rounded-full bg-[hsl(var(--button-secondary))] peer-checked:bg-primary transition-colors after:absolute after:top-1 after:left-1 after:w-4 after:h-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
              </label>

              {isEditableImage(selected.file) && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Retouche</p>
                  <div className="flex flex-wrap gap-1.5">
                    {toolBtn('Pivoter à gauche', RotateCcw, () => update(selected.id, { rotation: (((selected.rotation + 270) % 360) as Item['rotation']) }))}
                    {toolBtn('Pivoter à droite', RotateCw, () => update(selected.id, { rotation: (((selected.rotation + 90) % 360) as Item['rotation']) }))}
                    {toolBtn('Miroir horizontal', FlipHorizontal2, () => update(selected.id, { flipX: !selected.flipX }), selected.flipX)}
                    {toolBtn('Miroir vertical', FlipVertical2, () => update(selected.id, { flipY: !selected.flipY }), selected.flipY)}
                  </div>
                  <label htmlFor="media-size" className="block pt-1 text-xs text-muted-foreground">Taille</label>
                  <select
                    id="media-size"
                    value={selected.resize}
                    onChange={(e) => update(selected.id, { resize: e.target.value as ResizeMode })}
                    className="w-full h-9 px-2 rounded-md bg-[hsl(var(--input))] border border-white/[0.08] text-sm text-foreground outline-none focus:border-primary"
                  >
                    <option value="original">Originale</option>
                    <option value="2048">Grande (2048 px max)</option>
                    <option value="1280">Moyenne (1280 px max)</option>
                    <option value="720">Petite (720 px max)</option>
                  </select>
                  {hasEdits(selected) && (
                    <button
                      type="button"
                      onClick={() => update(selected.id, { rotation: 0, flipX: false, flipY: false, resize: 'original' })}
                      className="text-xs text-[hsl(var(--text-link))] hover:underline"
                    >
                      Réinitialiser les retouches
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center gap-1.5 pt-1">
                {toolBtn('Déplacer avant', ArrowLeft, () => move(selected.id, -1))}
                {toolBtn('Déplacer après', ArrowRight, () => move(selected.id, 1))}
                <button
                  type="button"
                  onClick={() => remove(selected.id)}
                  className="ml-auto h-9 px-3 rounded-md text-sm font-medium text-[#f57976] hover:bg-[#da373c]/15 flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Retirer
                </button>
              </div>
            </aside>
          )}
        </div>

        {/* Pied */}
        <div className="flex items-center gap-3 px-5 py-3 shrink-0 border-t border-white/[0.06] bg-[hsl(var(--card))]">
          <p className="flex-1 text-sm text-muted-foreground truncate">
            {items.length ? `${items.length} fichier${items.length > 1 ? 's' : ''} · ${formatSize(totalSize)}` : 'Aucun fichier sélectionné'}
          </p>
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => {
                items.forEach((it) => URL.revokeObjectURL(it.url));
                setItems([]);
                setSelectedId(null);
              }}
              className="h-9 px-3 text-sm font-medium text-white hover:underline"
            >
              Tout retirer
            </button>
          )}
          <button type="button" onClick={close} className="h-9 px-4 rounded-md text-sm font-medium text-white hover:underline">
            Annuler
          </button>
          <button
            type="button"
            disabled={!items.length || submitting}
            onClick={submit}
            className="h-9 px-4 rounded-md bg-primary hover:bg-primary/90 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}{items.length && maxItems > 1 ? ` (${items.length})` : ''}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
