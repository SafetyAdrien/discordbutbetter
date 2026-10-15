import { useState, useEffect, useMemo } from 'react';
import { X, Tag as TagIcon, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  useForumTags,
  useForumChannelConfig,
  MAX_APPLIED_TAGS_PER_POST,
  type ForumTag,
} from '@/hooks/useForumTags';

interface Props {
  open: boolean;
  channelId: string;
  onClose: () => void;
  /**
   * `appliedTags` are ids from public.forum_tags; `tags` is the legacy free-text
   * array, kept so the post still renders if no tag entity is defined yet.
   */
  onSubmit: (data: { title: string; content: string; tags: string[]; appliedTags: string[] }) => void;
  isPending?: boolean;
  /** When true, moderated tags cannot be applied by this user. */
  canModerate?: boolean;
}

export function CreateForumPostModal({
  open, channelId, onClose, onSubmit, isPending, canModerate = false,
}: Props) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [appliedTags, setAppliedTags] = useState<string[]>([]);

  const { data: definedTags = [] } = useForumTags(channelId);
  const { data: config } = useForumChannelConfig(channelId);

  useEffect(() => {
    if (!open) {
      setTitle(''); setContent(''); setTagInput(''); setTags([]); setAppliedTags([]);
    }
  }, [open]);

  // When the channel declares tags, they are the only valid vocabulary.
  const hasDefinedTags = definedTags.length > 0;
  const requireTag = config?.require_tag ?? false;

  const selectable = useMemo(
    () => (canModerate ? definedTags : definedTags.filter((t) => !t.moderated)),
    [definedTags, canModerate],
  );

  const toggleTag = (tag: ForumTag) => {
    setAppliedTags((prev) =>
      prev.includes(tag.id)
        ? prev.filter((id) => id !== tag.id)
        : prev.length >= MAX_APPLIED_TAGS_PER_POST
          ? prev
          : [...prev, tag.id],
    );
  };

  // Legacy free-text path, only used when the channel defines no tags at all.
  const addFreeTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t || tags.includes(t) || tags.length >= MAX_APPLIED_TAGS_PER_POST) return;
    setTags([...tags, t]);
    setTagInput('');
  };

  const tagCount = hasDefinedTags ? appliedTags.length : tags.length;
  const canSubmit =
    title.trim().length > 0 &&
    !isPending &&
    // REQUIRE_TAG (Fluxer's ChannelFlags.REQUIRE_TAG): a post needs at least one tag.
    (!requireTag || tagCount > 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nouveau sujet</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Titre</label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Pose ta question ou démarre la discussion"
              maxLength={120}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Message</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Détaille ton sujet (optionnel)"
              rows={6}
              maxLength={4000}
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 flex items-center gap-1.5">
              Étiquettes
              <span className="text-muted-foreground/60 normal-case">
                ({tagCount}/{MAX_APPLIED_TAGS_PER_POST})
              </span>
              {requireTag && <span className="text-destructive normal-case">— obligatoire</span>}
            </label>

            {hasDefinedTags ? (
              <div className="flex flex-wrap gap-1.5">
                {selectable.map((tag) => {
                  const active = appliedTags.includes(tag.id);
                  const full = !active && appliedTags.length >= MAX_APPLIED_TAGS_PER_POST;
                  return (
                    <Tooltip key={tag.id}>
                      <TooltipTrigger asChild>
                        <Badge
                          variant={active ? 'default' : 'outline'}
                          className={cn('cursor-pointer gap-1', full && 'opacity-40')}
                          onClick={() => !full && toggleTag(tag)}
                        >
                          {tag.emoji_name
                            ? <span className="mr-0.5">{tag.emoji_name}</span>
                            : <TagIcon className="w-3 h-3" />}
                          {tag.name}
                          {active && <X className="w-3 h-3" />}
                          {tag.moderated && <Lock className="w-2.5 h-2.5 opacity-70" />}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        {tag.moderated ? 'Tag modéré — réservé aux modérateurs' : tag.name}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
                {selectable.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Aucun tag ne t'est accessible dans ce salon.
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFreeTag(); } }}
                    placeholder="Ajouter un tag"
                    disabled={tags.length >= MAX_APPLIED_TAGS_PER_POST}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={addFreeTag}
                    disabled={tags.length >= MAX_APPLIED_TAGS_PER_POST}
                  >
                    Ajouter
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tags.map((t) => (
                      <Badge key={t} variant="secondary" className="cursor-pointer" onClick={() => setTags(tags.filter(x => x !== t))}>
                        <TagIcon className="w-3 h-3 mr-1" />{t}<X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>Annuler</Button>
            <Button
              disabled={!canSubmit}
              onClick={() => onSubmit({
                title: title.trim(),
                content: content.trim(),
                tags,
                appliedTags,
              })}
            >
              {isPending ? 'Publication…' : 'Publier'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}