import { useState, useEffect } from 'react';
import { X, Tag as TagIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; content: string; tags: string[] }) => void;
  isPending?: boolean;
}

export function CreateForumPostModal({ open, onClose, onSubmit, isPending }: Props) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setTitle(''); setContent(''); setTagInput(''); setTags([]);
    }
  }, [open]);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t || tags.includes(t) || tags.length >= 5) return;
    setTags([...tags, t]);
    setTagInput('');
  };

  const canSubmit = title.trim().length > 0 && !isPending;

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
            <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">
              Étiquettes <span className="text-muted-foreground/60 normal-case">({tags.length}/5)</span>
            </label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Ajouter un tag"
                disabled={tags.length >= 5}
              />
              <Button type="button" variant="secondary" onClick={addTag} disabled={tags.length >= 5}>Ajouter</Button>
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
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>Annuler</Button>
            <Button disabled={!canSubmit} onClick={() => onSubmit({ title: title.trim(), content: content.trim(), tags })}>
              {isPending ? 'Publication…' : 'Publier'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
