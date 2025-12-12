import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImagePlus, X, Pin, Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownText } from '@/lib/markdown';
import { useCreateAnnouncement, useUploadAnnouncementBanner, type AnnouncementCategory } from '@/hooks/useAnnouncements';

interface CreateAnnouncementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  categories: AnnouncementCategory[];
}

export function CreateAnnouncementModal({ open, onOpenChange, channelId, categories }: CreateAnnouncementModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [pinned, setPinned] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createAnnouncement = useCreateAnnouncement();
  const uploadBanner = useUploadAnnouncementBanner();

  const isSubmitting = createAnnouncement.isPending || uploadBanner.isPending;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        return; // Max 5MB
      }
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const clearBanner = () => {
    setBannerFile(null);
    setBannerPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;

    let bannerUrl: string | undefined;

    if (bannerFile) {
      bannerUrl = await uploadBanner.mutateAsync(bannerFile);
    }

    await createAnnouncement.mutateAsync({
      channelId,
      title: title.trim(),
      content: content.trim(),
      categoryId: categoryId || undefined,
      bannerUrl,
      pinned,
      featured,
    });

    // Reset form
    setTitle('');
    setContent('');
    setCategoryId('');
    setPinned(false);
    setFeatured(false);
    clearBanner();
    onOpenChange(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle annonce</DialogTitle>
          <DialogDescription>
            Créez une annonce importante pour les membres du serveur
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              placeholder="Titre de l'annonce"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <span className="text-xs text-muted-foreground">{title.length}/100</span>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Contenu *</Label>
            <Textarea
              id="content"
              placeholder="Rédigez votre annonce... (Markdown supporté)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              maxLength={4000}
            />
            <span className="text-xs text-muted-foreground">{content.length}/4000</span>
            {content.trim() && (
              <div className="p-3 bg-muted/30 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-2">Aperçu</p>
                <MarkdownText content={content} />
              </div>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Aucune catégorie</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.icon && <span>{cat.icon}</span>}
                      <span>{cat.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Banner upload */}
          <div className="space-y-2">
            <Label>Image bannière (optionnel)</Label>
            <div
              className={cn(
                'relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer',
                'hover:border-primary/50 transition-colors',
                bannerPreview && 'border-primary'
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              {bannerPreview ? (
                <div className="relative">
                  <img
                    src={bannerPreview}
                    alt="Preview"
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearBanner();
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <ImagePlus className="w-10 h-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Cliquez pour ajouter une image de bannière
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, WebP • Max 5MB • Ratio 16:9 recommandé
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="pinned"
                checked={pinned}
                onCheckedChange={(checked) => setPinned(checked === true)}
              />
              <Label htmlFor="pinned" className="flex items-center gap-1.5 cursor-pointer">
                <Pin className="w-4 h-4" /> Épingler
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="featured"
                checked={featured}
                onCheckedChange={(checked) => setFeatured(checked === true)}
              />
              <Label htmlFor="featured" className="flex items-center gap-1.5 cursor-pointer">
                <Star className="w-4 h-4" /> Mettre en vedette
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim() || isSubmitting}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Publier l'annonce
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
