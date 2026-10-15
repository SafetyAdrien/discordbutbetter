import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { MarkdownTextarea } from '@/components/chat/MarkdownTextarea';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { MediaPost } from '@/hooks/useMediaPosts';

interface Props {
  post: MediaPost;
  channelId: string;
  onClose: () => void;
}

export function EditMediaPostModal({ post, channelId, onClose }: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(post.title ?? '');
  const [description, setDescription] = useState(post.description ?? '');
  const [isSpoiler, setIsSpoiler] = useState(post.is_spoiler ?? false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { data, error } = await (supabase.from('media_posts') as any)
      .update({ title: title.trim(), description: description.trim(), is_spoiler: isSpoiler })
      .eq('id', post.id)
      .select('*, items:media_post_items(*)')
      .single();
    setSaving(false);
    if (error || !data) { toast.error('Échec de la mise à jour'); return; }
    queryClient.setQueryData<MediaPost[]>(['media-posts', channelId], (old = []) =>
      old.map((p) => (p.id === post.id ? { ...p, ...data } : p))
    );
    onClose();
  };

  const descLen = description.length;
  const valid = title.trim().length > 0 && descLen >= 10 && descLen <= 500;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier le post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Titre</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-desc">Description</Label>
              <span className={`text-xs ${descLen > 500 || descLen < 10 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {descLen}/500
              </span>
            </div>
            <MarkdownTextarea
              id="edit-desc"
              value={description}
              onChange={(v) => setDescription(v.slice(0, 500))}
              className="resize-none min-h-[100px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="edit-spoiler" checked={isSpoiler} onCheckedChange={(v) => setIsSpoiler(v === true)} />
            <Label htmlFor="edit-spoiler" className="cursor-pointer text-sm">Marquer comme spoiler</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} disabled={!valid || saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
