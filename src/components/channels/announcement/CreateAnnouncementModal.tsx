import { useState, useRef, useEffect } from 'react';
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
import { useCreateAnnouncement, useUpdateAnnouncement, useUploadAnnouncementBanner, type AnnouncementCategory, type Announcement } from '@/hooks/useAnnouncements';

const NONE_CATEGORY = '__none__';

interface CreateAnnouncementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  categories: AnnouncementCategory[];
  announcement?: Announcement; // For edit mode
}

export function CreateAnnouncementModal({ open, onOpenChange, channelId, categories, announcement }: CreateAnnouncementModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [pinned, setPinned] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!announcement;
  const createAnnouncement = useCreateAnnouncement();
  const updateAnnouncement = useUpdateAnnouncement();
  const uploadBanner = useUploadAnnouncementBanner();

  const isSubmitting = createAnnouncement.isPending || updateAnnouncement.isPending || uploadBanner.isPending;

  // Pre-fill form when editing
  useEffect(() => {
    if (announcement && open) {
      setTitle(announcement.title);
      setContent(announcement.content);
      setCategoryId(announcement.category?.id || '');
      setPinned(announcement.pinned || false);
      setFeatured(announcement.featured || false);
      if (announcement.banner_url) {
        setBannerPreview(announcement.banner_url);
      }
    }
  }, [announcement, open]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setCategoryId('');
    setPinned(false);
    setFeatured(false);
    setBannerFile(null);
    setBannerPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

    let bannerUrl: string | undefined = isEditMode ? announcement.banner_url || undefined : undefined;

    if (bannerFile) {
      bannerUrl = await uploadBanner.mutateAsync(bannerFile);
    } else if (!bannerPreview && isEditMode) {
      // Banner was cleared
      bannerUrl = undefined;
    }

    if (isEditMode) {
      await updateAnnouncement.mutateAsync({
        id: announcement.id,
        channelId,
        title: title.trim(),
        content: content.trim(),
        categoryId: categoryId || undefined,
        bannerUrl,
        pinned,
        featured,
      });
    } else {
      await createAnnouncement.mutateAsync({
        channelId,
        title: title.trim(),
        content: content.trim(),
        categoryId: categoryId || undefined,
        bannerUrl,
        pinned,
        featured,
      });
    }

    resetForm();
    onOpenChange(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      if (!isEditMode) {
        resetForm();
      }
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Modifier l'annonce" : 'Nouvelle annonce'}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? "Modifiez les détails de l'annonce" 
              : 'Créez une annonce importante pour les membres du serveur'}
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
            <Select 
              value={categoryId || NONE_CATEGORY} 
              onValueChange={(value) => setCategoryId(value === NONE_CATEGORY ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_CATEGORY}>Aucune catégorie</SelectItem>
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
            {isEditMode ? 'Enregistrer' : "Publier l'annonce"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
