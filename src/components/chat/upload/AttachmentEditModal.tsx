import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PendingAttachment } from '@/hooks/usePendingAttachments';
import { cn } from '@/lib/utils';

interface AttachmentEditModalProps {
  attachment: PendingAttachment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: Partial<Pick<PendingAttachment, 'name' | 'description' | 'isSpoiler'>>) => void;
}

export function AttachmentEditModal({
  attachment,
  open,
  onOpenChange,
  onSave,
}: AttachmentEditModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);

  // Reset form when attachment changes
  useEffect(() => {
    if (attachment) {
      setName(attachment.name);
      setDescription(attachment.description);
      setIsSpoiler(attachment.isSpoiler);
    }
  }, [attachment]);

  const handleSave = () => {
    onSave({ name, description, isSpoiler });
  };

  if (!attachment) return null;

  const isVideo = attachment.file.type.startsWith('video/');
  const isImage = attachment.file.type.startsWith('image/');

  // "Modifier la piece jointe" de Discord : apercu, nom de fichier, texte
  // alternatif, spoiler, puis Annuler / Sauvegarder cote a cote.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-4 gap-0 bg-[hsl(var(--surface-card))] border-[hsl(var(--border-subtle))]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">Modifier la pièce jointe</DialogTitle>
        </DialogHeader>

        <div className="mt-4 relative w-fit max-w-full rounded-lg overflow-hidden bg-black/20">
          {isVideo ? (
            <video src={attachment.previewUrl} muted className={cn('max-h-[160px] max-w-full object-contain', isSpoiler && 'blur-xl')} />
          ) : isImage ? (
            <img src={attachment.previewUrl} alt={name} className={cn('max-h-[160px] max-w-full object-contain', isSpoiler && 'blur-xl')} />
          ) : (
            <div className="h-24 w-40 flex items-center justify-center text-sm text-muted-foreground">{name}</div>
          )}
          {isSpoiler && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="px-3 py-1 rounded-full bg-black/60 text-xs font-bold tracking-wider text-white">SPOILER</span>
            </span>
          )}
        </div>

        <Label htmlFor="attachment-filename" className="mt-4 mb-2 text-sm font-medium text-white">Nom de fichier</Label>
        <Input
          id="attachment-filename"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-10 bg-[hsl(var(--input))] border-white/[0.06]"
        />

        <Label htmlFor="attachment-description" className="mt-4 mb-2 text-sm font-medium text-white">Description (texte alternatif)</Label>
        <Textarea
          id="attachment-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1024}
          placeholder="Ajouter une description"
          className="min-h-[56px] h-14 resize-none bg-[hsl(var(--input))] border-white/[0.06]"
        />

        <label htmlFor="attachment-spoiler" className="mt-4 flex items-center gap-2 text-sm text-white cursor-pointer w-fit">
          <Checkbox id="attachment-spoiler" checked={isSpoiler} onCheckedChange={(checked) => setIsSpoiler(checked === true)} />
          Définir comme spoiler
        </label>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave}>Sauvegarder</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
