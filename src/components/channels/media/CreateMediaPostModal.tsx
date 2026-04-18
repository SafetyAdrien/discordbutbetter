import { useState, useEffect, useRef, useMemo } from 'react';
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
import { EyeOff, ImageIcon, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateMediaPostModalProps {
  files: File[];
  onClose: () => void;
  onPublish: (data: {
    files: File[];
    title: string;
    description: string;
    altTexts: string[];
    isSpoiler: boolean;
  }) => void;
  isPending?: boolean;
}

export function CreateMediaPostModal({
  files: initialFiles,
  onClose,
  onPublish,
  isPending = false,
}: CreateMediaPostModalProps) {
  const [files, setFiles] = useState<File[]>(initialFiles);
  const [activeIndex, setActiveIndex] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [altTexts, setAltTexts] = useState<string[]>(initialFiles.map(() => ''));
  const [isSpoiler, setIsSpoiler] = useState(false);
  const urlsRef = useRef<string[]>([]);
  const addInputRef = useRef<HTMLInputElement>(null);

  const previewUrls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);

  useEffect(() => {
    // Cleanup previous URLs whenever files change
    const previous = urlsRef.current;
    urlsRef.current = previewUrls;
    return () => {
      previous.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previewUrls]);

  // Cleanup all on unmount
  useEffect(() => {
    return () => {
      urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const descLength = description.length;
  const isValid = title.trim().length > 0 && descLength >= 10 && descLength <= 500 && files.length > 0;

  const activeFile = files[activeIndex];
  const activeUrl = previewUrls[activeIndex];
  const isImage = activeFile?.type.startsWith('image/');
  const isVideo = activeFile?.type.startsWith('video/');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onPublish({
      files,
      title: title.trim(),
      description: description.trim(),
      altTexts: altTexts.map((a) => a.trim()),
      isSpoiler,
    });
  };

  const handleAddFiles = (newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;
    const accepted = Array.from(newFiles).filter(
      (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
    );
    if (accepted.length === 0) return;
    setFiles((prev) => [...prev, ...accepted]);
    setAltTexts((prev) => [...prev, ...accepted.map(() => '')]);
  };

  const handleRemoveFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setAltTexts((prev) => prev.filter((_, i) => i !== idx));
    setActiveIndex((curr) => {
      if (idx < curr) return curr - 1;
      if (idx === curr) return Math.max(0, curr - (curr === files.length - 1 ? 1 : 0));
      return curr;
    });
  };

  const updateActiveAlt = (value: string) => {
    setAltTexts((prev) => prev.map((v, i) => (i === activeIndex ? value : v)));
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
          <DialogTitle>
            Créer un poste {files.length > 1 && <span className="text-xs font-normal text-muted-foreground">({files.length} médias)</span>}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Main preview */}
          {activeUrl && (
            <div className="relative rounded-lg overflow-hidden bg-muted max-h-56 flex items-center justify-center">
              {isImage && (
                <img
                  src={activeUrl}
                  alt="Aperçu"
                  className="max-h-56 w-auto object-contain"
                />
              )}
              {isVideo && (
                <video
                  src={activeUrl}
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

              {/* Carousel arrows */}
              {files.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveIndex((i) => (i - 1 + files.length) % files.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/70 hover:bg-background/90 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveIndex((i) => (i + 1) % files.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/70 hover:bg-background/90 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-background/80 text-xs font-medium">
                    {activeIndex + 1} / {files.length}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Thumbnails */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {previewUrls.map((url, idx) => {
              const f = files[idx];
              const isVid = f?.type.startsWith('video/');
              return (
                <div key={url} className="relative flex-shrink-0 group">
                  <button
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    className={cn(
                      'w-14 h-14 rounded-md overflow-hidden border-2 transition-all bg-muted',
                      idx === activeIndex ? 'border-primary' : 'border-transparent'
                    )}
                  >
                    {isVid ? (
                      <video src={url} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    )}
                  </button>
                  {files.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => addInputRef.current?.click()}
              className="w-14 h-14 rounded-md border-2 border-dashed border-border hover:border-primary hover:bg-muted/50 transition flex items-center justify-center flex-shrink-0"
            >
              <Plus className="w-4 h-4 text-muted-foreground" />
            </button>
            <input
              ref={addInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handleAddFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </div>

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

          {/* ALT text per active media */}
          <div className="space-y-2">
            <Label htmlFor="media-alt" className="flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              Texte alternatif (ALT)
              {files.length > 1 && (
                <span className="text-xs font-normal text-muted-foreground">— média {activeIndex + 1}</span>
              )}
            </Label>
            <Input
              id="media-alt"
              value={altTexts[activeIndex] ?? ''}
              onChange={(e) => updateActiveAlt(e.target.value)}
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
