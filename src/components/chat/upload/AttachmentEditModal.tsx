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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Modifier le fichier</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Preview */}
          <div className="relative mx-auto max-w-[200px] rounded-lg overflow-hidden">
            {attachment.file.type.startsWith('video/') ? (
              <video
                src={attachment.previewUrl}
                className={cn(
                  "w-full h-auto max-h-[150px] object-contain",
                  isSpoiler && "blur-xl"
                )}
                muted
              />
            ) : (
              <img
                src={attachment.previewUrl}
                alt={name}
                className={cn(
                  "w-full h-auto max-h-[150px] object-contain",
                  isSpoiler && "blur-xl"
                )}
              />
            )}
            
            {isSpoiler && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="text-sm font-semibold text-white uppercase tracking-wider">
                  Spoiler
                </span>
              </div>
            )}

            {description && (
              <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-white rounded text-[10px] font-bold text-black">
                ALT
              </div>
            )}
          </div>

          {/* Filename */}
          <div className="space-y-2">
            <Label htmlFor="filename">Nom du fichier</Label>
            <Input
              id="filename"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom du fichier"
              className="bg-input border-border"
            />
          </div>

          {/* Description (Alt Text) */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description (texte alternatif)
              <span className="text-muted-foreground text-xs ml-2">Pour les lecteurs d'écran</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez cette image pour les utilisateurs de lecteurs d'écran..."
              className="bg-input border-border resize-none h-20"
            />
          </div>

          {/* Spoiler checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="spoiler"
              checked={isSpoiler}
              onCheckedChange={(checked) => setIsSpoiler(checked === true)}
            />
            <Label htmlFor="spoiler" className="text-sm cursor-pointer">
              Marquer comme spoiler
            </Label>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave}>
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
