import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { EyeOff, ImageIcon } from 'lucide-react';

interface CreateMediaPostModalProps {
  file: File;
  onClose: () => void;
  onPublish: (data: {
    file: File;
    title: string;
    description: string;
    altText: string;
    isSpoiler: boolean;
  }) => void;
  isPending?: boolean;
}

export function CreateMediaPostModal({
  file,
  onClose,
  onPublish,
  isPending = false,
}: CreateMediaPostModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [altText, setAltText] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const descLength = description.length;
  const isValid = title.trim().length > 0 && descLength >= 10 && descLength <= 500;

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    urlRef.current = url;
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [file]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onPublish({
      file,
      title: title.trim(),
      description: description.trim(),
      altText: altText.trim(),
      isSpoiler,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Créer un poste</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Preview */}
          {previewUrl && (
            <div className="relative rounded-lg overflow-hidden bg-muted max-h-56 flex items-center justify-center">
              {isImage && (
                <img
                  src={previewUrl}
                  alt="Aperçu"
                  className="max-h-56 w-auto object-contain"
                />
              )}
              {isVideo && (
                <video
                  src={previewUrl}
                  className="max-h-56 w-auto object-contain"
                  controls
                  muted
                />
              )}
              {isSpoiler && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-xl flex items-center justify-center">
                  <EyeOff className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="media-title">Titre *</Label>
            <Input
              id="media-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre du poste"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="media-desc">Description *</Label>
              <span
                className={`text-xs ${
                  descLength > 500 ? 'text-destructive' : descLength >= 10 ? 'text-muted-foreground' : 'text-destructive'
                }`}
              >
                {descLength}/500
              </span>
            </div>
            <Textarea
              id="media-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              placeholder="Décrivez votre poste (minimum 10 caractères)"
              className="resize-none min-h-[80px]"
            />
            {descLength > 0 && descLength < 10 && (
              <p className="text-xs text-destructive">
                Minimum 10 caractères ({10 - descLength} restant{10 - descLength > 1 ? 's' : ''})
              </p>
            )}
          </div>

          {/* ALT text */}
          <div className="space-y-2">
            <Label htmlFor="media-alt" className="flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              Texte alternatif (ALT)
            </Label>
            <Input
              id="media-alt"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Décrivez l'image pour l'accessibilité"
            />
          </div>

          {/* Spoiler */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="media-spoiler"
              checked={isSpoiler}
              onCheckedChange={(v) => setIsSpoiler(v === true)}
            />
            <Label htmlFor="media-spoiler" className="cursor-pointer text-sm">
              Marquer comme spoiler
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isPending}
              className="bg-[#5865f2] hover:bg-[#5865f2]/90"
            >
              {isPending ? 'Publication...' : 'Publier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
