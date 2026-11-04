import { useEffect, useRef, useState } from 'react';
import { Tag as TagIcon, X, Eye, EyeOff, Smile, ImagePlus, MessageCircle } from '@/components/icons/discord/lucide';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EmojiStickerPicker } from '@/components/chat/EmojiStickerPicker';
import { AttachmentEditModal } from '@/components/chat/upload/AttachmentEditModal';
import { MarkdownText } from '@/lib/markdown';
import { usePendingAttachments, type PendingAttachment } from '@/hooks/usePendingAttachments';
import type { ForumTag } from '@/hooks/useForumTags';
import type { CreateForumPostInput } from '@/hooks/useForumThreads';
import { cn } from '@/lib/utils';
import { ForumTagChip } from './ForumTagChip';

/*
 * Composeur de post (Forum et Multimedia, videos de reference) : il remplace
 * la barre de recherche. Titre, message, medias (miniature en haut a droite
 * pour un Forum ; vignette + "Upload ton media" pour un salon Multimedia),
 * tags du salon, emoji, "Mode apercu" et bouton Post.
 */

const MAX_TITLE = 100;
const MAX_MEDIA = 10;

interface ForumComposerProps {
  mode: 'forum' | 'media';
  serverId: string | null;
  initialTitle?: string;
  /** Tags deja coches (creation depuis un filtre de tags). */
  initialTags?: string[];
  tags: ForumTag[];
  requireTag: boolean;
  /** Peut appliquer les tags moderes. */
  canModerate: boolean;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (input: CreateForumPostInput) => void;
}

export function ForumComposer({ mode, serverId, initialTitle = '', initialTags, tags, requireTag, canModerate, submitting, onCancel, onSubmit }: ForumComposerProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState('');
  const [appliedTags, setAppliedTags] = useState<string[]>(() => (initialTags ?? []).filter((id) => tags.some((t) => t.id === id)).slice(0, 5));
  const [preview, setPreview] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [editing, setEditing] = useState<PendingAttachment | null>(null);
  const [thumbnail, setThumbnail] = useState<PendingAttachment | null>(null);
  const { attachments, addFiles, removeAttachment, updateAttachment, clearAttachments } = usePendingAttachments();
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    const el = titleRef.current;
    if (el) el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  useEffect(
    () => () => {
      if (thumbnail) URL.revokeObjectURL(thumbnail.previewUrl);
    },
    [thumbnail],
  );

  const media = attachments.filter((a) => a.file.type.startsWith('image/') || a.file.type.startsWith('video/'));
  const tagMissing = requireTag && tags.length > 0 && appliedTags.length === 0;
  const mediaMissing = mode === 'media' && attachments.length === 0;
  const contentMissing = mode === 'forum' && !content.trim() && attachments.length === 0;
  const canPost = !!title.trim() && !tagMissing && !mediaMissing && !contentMissing && !submitting;

  const toggleTag = (id: string) =>
    setAppliedTags((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : prev.length >= 5 ? prev : [...prev, id]));

  const submit = () => {
    setTriedSubmit(true);
    if (!canPost) return;
    onSubmit({ title: title.trim(), content: content.trim(), attachments, appliedTags, thumbnail });
  };

  const reset = () => {
    clearAttachments();
    onCancel();
  };

  const pickThumbnail = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    setThumbnail({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file), name: file.name, description: '', isSpoiler: false });
  };

  const insertEmoji = (emoji: string) => {
    const el = contentRef.current;
    if (!el) return setContent((c) => c + emoji);
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const next = content.slice(0, start) + emoji + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const usableTags = tags.filter((t) => canModerate || !t.moderated);
  const firstMedia = media[0];

  return (
    <div
      className="rounded-lg bg-[#2d2d35] border border-white/[0.04] animate-step-in"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          reset();
        }
      }}
    >
      <input
        ref={fileRef}
        type="file"
        multiple
        accept={mode === 'media' ? 'image/*,video/*' : 'image/*,video/*,application/pdf'}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(Array.from(e.target.files).slice(0, MAX_MEDIA - attachments.length));
          e.target.value = '';
        }}
      />
      <input ref={thumbRef} type="file" accept="image/*" className="hidden" onChange={(e) => { pickThumbnail(e.target.files?.[0]); e.target.value = ''; }} />

      <div className="flex gap-3 px-3 pt-2.5 pb-2">
        <button type="button" aria-label="Annuler le post" onClick={reset} className="mt-0.5 h-6 w-6 shrink-0 flex items-center justify-center text-[#dbdee1] hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0 flex flex-col min-h-[124px]">
          <input
            ref={titleRef}
            value={title}
            maxLength={MAX_TITLE}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                contentRef.current?.focus();
              }
            }}
            placeholder="Titre"
            aria-label="Titre du post"
            className="bg-transparent outline-none text-xl leading-6 text-white placeholder:text-[#80848e]"
          />
          {preview ? (
            <div className="flex-1 mt-1 text-[15px] text-foreground min-h-[48px]">
              {content.trim() ? <MarkdownText content={content} variant="chat" /> : <span className="text-muted-foreground">Rien à prévisualiser.</span>}
            </div>
          ) : (
            <textarea
              ref={contentRef}
              value={content}
              maxLength={4000}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={2}
              placeholder="Saisis un message..."
              aria-label="Message du post"
              className="flex-1 mt-1.5 bg-transparent outline-none resize-none text-base text-foreground placeholder:text-[#80848e] min-h-[48px]"
            />
          )}
          {preview && <span className="self-end text-xs text-muted-foreground">Mode aperçu</span>}
        </div>

        {/* Forum : pieces jointes ; Multimedia : vignette du post */}
        {mode === 'forum' ? (
          firstMedia ? (
            <button
              type="button"
              onClick={() => setEditing(firstMedia)}
              className="relative h-[76px] w-[76px] shrink-0 rounded-lg overflow-hidden ring-1 ring-white/10 self-start"
              aria-label="Modifier la pièce jointe"
            >
              {firstMedia.file.type.startsWith('video/') ? (
                <video src={firstMedia.previewUrl} muted className="h-full w-full object-cover" />
              ) : (
                <img src={firstMedia.previewUrl} alt="" className="h-full w-full object-cover" />
              )}
              {attachments.length > 1 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center">{attachments.length}</span>
              )}
              {firstMedia.description && <span className="absolute bottom-1 left-1 px-1 rounded bg-black/70 text-[9px] font-bold text-white">ALT</span>}
            </button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  aria-label="Ajouter une pièce jointe"
                  className="h-[76px] w-[76px] shrink-0 self-start rounded-lg bg-[#3e3e46] hover:bg-[#45454e] flex items-center justify-center text-[#dbdee1] hover:text-white transition-colors"
                >
                  <ImagePlus className="w-7 h-7" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Ajouter une pièce jointe</TooltipContent>
            </Tooltip>
          )
        ) : (
          <button
            type="button"
            onClick={() => thumbRef.current?.click()}
            className="relative h-[72px] w-24 shrink-0 self-start rounded-lg overflow-hidden bg-[hsl(var(--background))] border border-[hsl(var(--border-subtle))] flex flex-col items-center justify-center gap-1 text-[hsl(var(--icon-default))] hover:text-white"
            aria-label="Uploader la vignette"
          >
            {thumbnail || firstMedia ? (
              <img src={(thumbnail ?? firstMedia)!.previewUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <>
                <ImagePlus className="w-5 h-5" />
                <span className="text-[10px] leading-3">Uploader la vignette</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Multimedia : medias du post */}
      {mode === 'media' && (
        <div className="px-12 pb-2">
          <p className="text-sm font-semibold text-white">Upload ton média</p>
          <p className="text-xs text-muted-foreground">Ajoute n'importe quelle vidéo, photo et fichiers que tu veux partager avec les membres.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {attachments.map((a) => (
              <MediaTile key={a.id} attachment={a} onEdit={() => setEditing(a)} onRemove={() => removeAttachment(a.id)} />
            ))}
            {attachments.length < MAX_MEDIA && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Ajouter un média"
                className="h-16 w-16 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border-subtle))] flex items-center justify-center text-[hsl(var(--icon-default))] hover:text-white"
              >
                <ImagePlus className="w-6 h-6" />
              </button>
            )}
          </div>
          {triedSubmit && mediaMissing && <p className="mt-1 text-xs text-[#f57976]">Ajoute au moins un média pour publier.</p>}
        </div>
      )}

      {/* Forum : pieces jointes supplementaires */}
      {mode === 'forum' && attachments.length > 1 && (
        <div className="px-12 pb-2 flex flex-wrap gap-2">
          {attachments.map((a) => (
            <MediaTile key={a.id} attachment={a} small onEdit={() => setEditing(a)} onRemove={() => removeAttachment(a.id)} />
          ))}
        </div>
      )}

      {usableTags.length > 0 && (
        <div className="px-3 pb-3 flex items-center gap-2 flex-wrap">
          <TagIcon className="w-5 h-5 text-[#dbdee1]" />
          {usableTags.map((t) => (
            <ForumTagChip key={t.id} tag={t} selected={appliedTags.includes(t.id)} onClick={() => toggleTag(t.id)} />
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-3 border-t border-[#373740]">
        <EmojiStickerPicker
          serverId={serverId}
          onEmojiSelect={insertEmoji}
          trigger={
            <button type="button" aria-label="Ajouter un émoji" className="p-1 text-[hsl(var(--icon-default))] hover:text-white">
              <Smile className="w-5 h-5" />
            </button>
          }
        />
        {mode === 'forum' && attachments.length > 0 && attachments.length < MAX_MEDIA && (
          <button type="button" onClick={() => fileRef.current?.click()} className="text-xs text-[hsl(var(--text-link))] hover:underline">
            Ajouter une pièce jointe
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {triedSubmit && tagMissing && <span className="text-xs text-[#f57976]">Un tag est requis pour créer un post dans ce salon</span>}
          {triedSubmit && contentMissing && <span className="text-xs text-[#f57976]">Ajoute un message ou une pièce jointe.</span>}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setPreview((p) => !p)}
                aria-pressed={preview}
                aria-label={preview ? 'Quitter l’aperçu' : 'Aperçu'}
                className={cn('h-9 w-9 rounded-lg flex items-center justify-center text-[#dbdee1] bg-white/[0.04] hover:text-white hover:bg-white/[0.08]', preview && 'text-white bg-white/[0.12]')}
              >
                {preview ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent>{preview ? 'Quitter l’aperçu' : 'Aperçu'}</TooltipContent>
          </Tooltip>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className={cn('h-9 px-3.5 rounded-lg bg-[#5865f2] text-white text-sm font-medium flex items-center gap-1.5 transition-opacity', !canPost && 'opacity-55')}
          >
            <MessageCircle className="w-4 h-4" />
            {submitting ? 'Publication…' : 'Post'}
          </button>
        </div>
      </div>

      <AttachmentEditModal
        attachment={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        onSave={(updates) => {
          if (editing) updateAttachment(editing.id, updates);
          setEditing(null);
        }}
      />
    </div>
  );
}

function MediaTile({ attachment, onEdit, onRemove, small = false }: { attachment: PendingAttachment; onEdit: () => void; onRemove: () => void; small?: boolean }) {
  const isVideo = attachment.file.type.startsWith('video/');
  return (
    <div className={cn('group relative rounded-lg overflow-hidden bg-black/30 ring-1 ring-white/10', small ? 'h-12 w-12' : 'h-16 w-16')}>
      <button type="button" onClick={onEdit} aria-label={`Modifier ${attachment.name}`} className="absolute inset-0">
        {attachment.isSpoiler ? (
          <span className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--button-secondary))] text-[10px] font-bold tracking-wider text-white">SPOILER</span>
        ) : isVideo ? (
          <video src={attachment.previewUrl} muted className="h-full w-full object-cover" />
        ) : attachment.file.type.startsWith('image/') ? (
          <img src={attachment.previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground px-1 truncate">{attachment.name}</span>
        )}
      </button>
      {attachment.description && <span className="absolute bottom-0.5 left-0.5 px-1 rounded bg-black/70 text-[9px] font-bold text-white pointer-events-none">ALT</span>}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Retirer ${attachment.name}`}
        className="absolute top-0.5 right-0.5 h-5 w-5 rounded bg-black/70 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 flex items-center justify-center"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
