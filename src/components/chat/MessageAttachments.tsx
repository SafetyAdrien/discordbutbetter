import { StickerInfoPopover } from './StickerInfoPopover';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { FileIcon, Play, Music } from 'lucide-react';
import { Download, ExternalLink, X, ChevronLeft, ChevronRight, Pencil, Trash2 } from '@/components/icons/discord/lucide';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useImageGuardProps, useCanDownload } from '@/hooks/useDownloadPermissions';
import { SvgAttachment } from './SvgAttachment';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselPrevious, 
  CarouselNext,
  type CarouselApi 
} from '@/components/ui/carousel';
import { useUserSettingsValue } from '@/hooks/useUserSettings';

export interface StoredAttachment {
  id: string;
  url: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'gif';
  size: number;
  description?: string;
  isSpoiler?: boolean;
}

interface MessageAttachmentsProps {
  attachments: StoredAttachment[];
  /** Author id of the message — used to gate download/right-click/drag. */
  authorId?: string | null;
  /** Message de l'utilisateur : boutons "Modifier" / "Supprimer" au survol d'une image. */
  onEditAttachment?: (attachment: StoredAttachment) => void;
  onRemoveAttachment?: (attachment: StoredAttachment) => void;
}

/* Pastille "SPOILER" (video de reference) : capsule sombre, texte blanc en capitales grasses. */
const SPOILER_PILL = 'rounded-full bg-[#1b1b20]/90 px-3.5 py-1.5 text-sm font-bold uppercase tracking-wide text-white';

/** Boutons de modification d'une piece jointe, affiches au survol dans le coin haut droit. */
function AttachmentTools({ attachment, onEdit, onRemove }: { attachment: StoredAttachment; onEdit?: (a: StoredAttachment) => void; onRemove?: (a: StoredAttachment) => void }) {
  if (!onEdit && !onRemove) return null;
  const btn = 'w-8 h-8 flex items-center justify-center rounded-md text-[#dbdee1] hover:text-white hover:bg-white/10 transition-colors';
  return (
    <div className="absolute top-2 right-2 z-10 flex items-center rounded-lg bg-[#2b2b32]/95 border border-white/[0.06] p-0.5 opacity-0 group-hover/attachment:opacity-100 focus-within:opacity-100 transition-opacity">
      {onEdit && <button type="button" aria-label="Modifier la pièce jointe" title="Modifier" onClick={(e) => { e.stopPropagation(); onEdit(attachment); }} className={btn}><Pencil className="w-[18px] h-[18px]" /></button>}
      {onRemove && <button type="button" aria-label="Supprimer la pièce jointe" title="Supprimer" onClick={(e) => { e.stopPropagation(); onRemove(attachment); }} className={cn(btn, 'text-[#f57976] hover:text-[#f57976]')}><Trash2 className="w-[18px] h-[18px]" /></button>}
    </div>
  );
}

/*
 * Mosaique d'images (video de reference) : 2 = cotes a cote, 3 = une grande + deux empilees, 4 = 2x2, 5 = 2 + 3,
 * 6 et plus = rangees de 3. Largeur maximale 550 px, 4 px entre les vignettes.
 */
function ImageMosaic({
  images,
  onOpenLightbox,
  authorId,
  onEdit,
  onRemove,
}: {
  images: StoredAttachment[];
  onOpenLightbox: (index: number) => void;
  authorId?: string | null;
  onEdit?: (a: StoredAttachment) => void;
  onRemove?: (a: StoredAttachment) => void;
}) {
  const guard = useImageGuardProps(authorId);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const list = images.slice(0, 10);
  const n = list.length;

  // Colonnes sur 6 : [debut, fin, ligne debut, ligne fin] de chaque vignette + hauteurs de rangee (fraction de la largeur).
  type Cell = { c: number; w: number; r: number; h?: number };
  let cells: Cell[] = [];
  let rows: number[] = [];
  if (n === 2) { cells = [{ c: 1, w: 3, r: 1 }, { c: 4, w: 3, r: 1 }]; rows = [0.5]; }
  else if (n === 3) { cells = [{ c: 1, w: 3, r: 1, h: 2 }, { c: 4, w: 3, r: 1 }, { c: 4, w: 3, r: 2 }]; rows = [0.25, 0.25]; }
  else if (n === 4) { cells = [{ c: 1, w: 3, r: 1 }, { c: 4, w: 3, r: 1 }, { c: 1, w: 3, r: 2 }, { c: 4, w: 3, r: 2 }]; rows = [0.3, 0.3]; }
  else if (n === 5) { cells = [{ c: 1, w: 3, r: 1 }, { c: 4, w: 3, r: 1 }, { c: 1, w: 2, r: 2 }, { c: 3, w: 2, r: 2 }, { c: 5, w: 2, r: 2 }]; rows = [0.3, 0.33]; }
  else {
    cells = list.map((_, i) => ({ c: (i % 3) * 2 + 1, w: 2, r: Math.floor(i / 3) + 1 }));
    rows = Array.from({ length: Math.ceil(n / 3) }, () => 0.33);
  }

  return (
    <div className="w-[550px] max-w-full" style={{ containerType: 'inline-size' }}>
    <div
      className="grid gap-1 w-full rounded-lg overflow-hidden"
      style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gridTemplateRows: rows.map((r) => `calc(100cqw * ${r})`).join(' ') }}
    >
      {list.map((img, i) => {
        const cell = cells[i];
        const hidden = !!img.isSpoiler && !revealed[img.id];
        return (
          <div
            key={img.id}
            className="group/attachment relative min-h-0 min-w-0 overflow-hidden bg-[#2f2f37]"
            style={{ gridColumn: `${cell.c} / span ${cell.w}`, gridRow: `${cell.r} / span ${cell.h ?? 1}` }}
          >
            <img
              src={img.url}
              alt={img.description || img.name}
              loading="lazy"
              decoding="async"
              draggable={guard.draggable as any}
              onContextMenu={guard.onContextMenu}
              onClick={() => (hidden ? setRevealed((r) => ({ ...r, [img.id]: true })) : onOpenLightbox(i))}
              className={cn('absolute inset-0 w-full h-full object-cover cursor-pointer transition-[filter] duration-150', hidden && 'blur-2xl brightness-50 scale-110')}
            />
            {hidden && (
              <button type="button" onClick={() => setRevealed((r) => ({ ...r, [img.id]: true }))} className="absolute inset-0 flex items-center justify-center">
                <span className={SPOILER_PILL}>Spoiler</span>
              </button>
            )}
            {!hidden && <AttachmentTools attachment={img} onEdit={onEdit} onRemove={onRemove} />}
          </div>
        );
      })}
    </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function ImageAttachment({ 
  attachment, 
  onOpenLightbox,
  blurFactor = 0, // 0 = net, 1 = flou max
  authorId,
  onEdit,
  onRemove,
}: { 
  attachment: StoredAttachment;
  onOpenLightbox: () => void;
  blurFactor?: number;
  authorId?: string | null;
  onEdit?: (a: StoredAttachment) => void;
  onRemove?: (a: StoredAttachment) => void;
}) {
  const [revealed, setRevealed] = useState(!attachment.isSpoiler);
  const [loaded, setLoaded] = useState(false);
  const guard = useImageGuardProps(authorId);

  // Calculer les valeurs de style dynamiques basées sur blurFactor
  const blurValue = revealed ? blurFactor * 2 : 0; // 0-2px
  const brightnessValue = revealed ? 1 - (blurFactor * 0.1) : 1; // 100%-90%

  return (
    <div className="relative group group/attachment">
      <img
        src={attachment.url}
        alt={attachment.description || attachment.name}
        loading="lazy"
        decoding="async"
        draggable={guard.draggable as any}
        onContextMenu={guard.onContextMenu}
        className={cn(
          'rounded-lg cursor-pointer max-h-96 max-w-full object-contain',
          'transition-[filter,opacity] duration-150 ease-out',
          !revealed && 'blur-2xl brightness-50',
          !loaded && 'opacity-0'
        )}
        style={{
          // Appliquer le flou progressif uniquement si révélé
          filter: revealed && blurFactor > 0
            ? `blur(${blurValue}px) brightness(${brightnessValue})`
            : undefined
        }}
        onClick={() => revealed ? onOpenLightbox() : setRevealed(true)}
        onLoad={() => setLoaded(true)}
      />
      {!loaded && (
        <div className="absolute inset-0 bg-muted rounded-lg animate-pulse" />
      )}
      {attachment.isSpoiler && !revealed && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={() => setRevealed(true)}
        >
          <span className={SPOILER_PILL}>Spoiler</span>
        </div>
      )}
      {revealed && <AttachmentTools attachment={attachment} onEdit={onEdit} onRemove={onRemove} />}
      {attachment.description && revealed && (
        <p className="text-xs text-muted-foreground mt-1 italic">
          {attachment.description}
        </p>
      )}
    </div>
  );
}

function StickerOrGifAttachment({
  attachment,
  onOpenLightbox,
}: {
  attachment: StoredAttachment;
  onOpenLightbox: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const isSticker = attachment.type === 'sticker';

  const image = (
    <img
      src={attachment.url}
      alt={attachment.name}
      loading="lazy"
      decoding="async"
      onClick={isSticker ? undefined : onOpenLightbox}
      className={cn(
        'rounded-lg cursor-pointer transition-opacity duration-150',
        isSticker ? 'w-40 h-40 object-contain' : 'max-h-72 max-w-full object-contain',
        !loaded && 'opacity-0'
      )}
      onLoad={() => setLoaded(true)}
    />
  );

  return (
    <div className={cn('relative', isSticker ? 'w-40 h-40' : 'max-w-[280px]')}>
      {isSticker ? <StickerInfoPopover url={attachment.url} name={attachment.name}>{image}</StickerInfoPopover> : image}
      {!loaded && (
        <div className={cn('absolute inset-0 bg-muted rounded-lg animate-pulse', isSticker ? 'w-40 h-40' : '')} />
      )}
    </div>
  );
}

function ImageCarousel({
  images, 
  onOpenLightbox,
  authorId,
}: { 
  images: StoredAttachment[];
  onOpenLightbox: (index: number) => void;
  authorId?: string | null;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [api, setApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!api) return;
    
    let rafId: number;
    
    // Throttle scroll updates avec requestAnimationFrame
    const onScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setScrollProgress(api.scrollProgress());
      });
    };
    
    const onSelect = () => {
      setCurrentIndex(api.selectedScrollSnap());
    };
    
    // Initial values
    setScrollProgress(api.scrollProgress());
    setCurrentIndex(api.selectedScrollSnap());
    
    api.on('scroll', onScroll);
    api.on('select', onSelect);
    
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      api.off('scroll', onScroll);
      api.off('select', onSelect);
    };
  }, [api]);

  // Calculer le facteur de flou progressif pour chaque image
  const getBlurFactor = (index: number): number => {
    if (!api) return index === 0 ? 0 : 1;
    
    const snapList = api.scrollSnapList();
    if (snapList.length < 2) return 0;
    
    const snapPosition = snapList[index];
    
    // Distance entre la position actuelle et la position de l'image
    const distance = Math.abs(scrollProgress - snapPosition);
    
    // Normaliser : 0 = image active (pas de flou), 1 = loin (flou max)
    const snapGap = snapList[1] - snapList[0];
    const normalizedDistance = Math.min(distance / snapGap, 1);
    
    return normalizedDistance;
  };

  return (
    <div className="relative max-w-md group">
      <Carousel 
        setApi={setApi}
        opts={{ loop: false, align: 'start' }}
        className="w-full"
      >
        <CarouselContent className="-ml-2">
          {images.map((img, index) => (
            <CarouselItem key={img.id} className="pl-2 basis-[85%]">
              <ImageAttachment
                attachment={img}
                onOpenLightbox={() => onOpenLightbox(index)}
                blurFactor={getBlurFactor(index)}
                authorId={authorId}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        
        {/* Navigation arrows - visible on hover */}
        <CarouselPrevious 
          className="left-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 bg-background/80 hover:bg-background border-none" 
        />
        <CarouselNext 
          className="right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 bg-background/80 hover:bg-background border-none" 
        />
      </Carousel>
      
      {/* Pagination dots */}
      <div className="flex justify-center gap-1.5 mt-2">
        {images.map((_, index) => (
          <button type="button"
            key={index}
            onClick={() => api?.scrollTo(index)}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-colors",
              index === currentIndex 
                ? "bg-primary" 
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
            aria-label={`Aller à l'image ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function VideoAttachment({ attachment, authorId }: { attachment: StoredAttachment; authorId?: string | null }) {
  const [revealed, setRevealed] = useState(!attachment.isSpoiler);
  const [isPlaying, setIsPlaying] = useState(false);
  const guard = useImageGuardProps(authorId);

  if (attachment.isSpoiler && !revealed) {
    return (
      <div 
        className="relative max-w-md h-48 bg-muted rounded-lg flex items-center justify-center cursor-pointer"
        onClick={() => setRevealed(true)}
      >
        <div className="absolute inset-0 blur-2xl bg-surface" />
        <span className="relative bg-background/90 px-3 py-1.5 rounded-md text-sm font-medium z-10">
          SPOILER - Vidéo
        </span>
      </div>
    );
  }

  return (
    <div className="relative group max-w-md" onContextMenu={guard.onContextMenu}>
      <video
        src={attachment.url}
        controls
        preload="metadata"
        controlsList={guard.draggable === false ? 'nodownload' : undefined}
        className="rounded-lg max-h-80"
        onContextMenu={guard.onContextMenu}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      >
        Votre navigateur ne supporte pas la lecture vidéo.
      </video>
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-background/80 rounded-full p-3">
            <Play className="w-8 h-8 text-foreground" />
          </div>
        </div>
      )}
      {attachment.description && (
        <p className="text-xs text-muted-foreground mt-1 italic">
          {attachment.description}
        </p>
      )}
    </div>
  );
}

/** Musique / son : carte avec lecteur natif (le telechargement suit les permissions de l'auteur). */
function AudioAttachment({ attachment, authorId, onEdit, onRemove }: { attachment: StoredAttachment; authorId?: string | null; onEdit?: (a: StoredAttachment) => void; onRemove?: (a: StoredAttachment) => void }) {
  const { canDownload } = useCanDownload(authorId);
  return (
    <div className="group/attachment relative w-full max-w-[420px] rounded-lg bg-[#2b2b32] border border-white/[0.06] p-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-10 h-10 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0"><Music className="w-5 h-5" /></span>
        <div className="min-w-0 flex-1">
          <p translate="no" className="text-sm font-medium text-white truncate">{attachment.name}</p>
          <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
        </div>
      </div>
      <audio controls preload="metadata" src={attachment.url} controlsList={canDownload ? undefined : 'nodownload'} className="mt-2 w-full h-9" />
      {attachment.description && <p className="mt-1 text-xs text-muted-foreground italic">{attachment.description}</p>}
      <AttachmentTools attachment={attachment} onEdit={onEdit} onRemove={onRemove} />
    </div>
  );
}

function FileAttachment({ attachment, authorId }: { attachment: StoredAttachment; authorId?: string | null }) {
  const { canDownload, isLoading } = useCanDownload(authorId);
  const showDownload = canDownload && !isLoading;
  return (
    <div className="flex items-center gap-3 bg-surface-hover rounded-lg p-3 max-w-sm group">
      <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
        <FileIcon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-foreground">
          {attachment.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(attachment.size)}
        </p>
      </div>
      {showDownload && (
        <a
          href={attachment.url}
          download={attachment.name}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-md hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
        >
          <Download className="w-4 h-4 text-muted-foreground" />
        </a>
      )}
    </div>
  );
}

export function MessageAttachments({ attachments: rawAttachments, authorId, onEditAttachment, onRemoveAttachment }: MessageAttachmentsProps) {
  // "Lorsqu'ils sont uploades directement dans Discord" desactive : les
  // images et videos s'affichent comme des fichiers a ouvrir.
  const showUploadedMedia = useUserSettingsValue().appearance.show_uploaded_media;
  const attachments = showUploadedMedia
    ? rawAttachments
    : rawAttachments?.map((a) => (a.type === 'image' || a.type === 'video' ? { ...a, type: 'file' as const } : a));
  const lightboxGuard = useImageGuardProps(authorId);
  const { canDownload: lightboxCanDownload, isLoading: lightboxLoading } = useCanDownload(authorId);
  const showExternalLink = lightboxCanDownload && !lightboxLoading;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const allImages = attachments?.filter(a => a.type === 'image') ?? [];
  // SVG is stored as an image but must NOT be rendered through <img src>: it is
  // an active document format. It gets its own sanitized, sandboxed renderer.
  const isSvgAttachment = (a: StoredAttachment) =>
    a.type === 'image' && /\.svg$/i.test(a.name);
  const images = allImages.filter(a => !isSvgAttachment(a));
  const svgAttachments = allImages.filter(isSvgAttachment);
  const videos = attachments?.filter(a => a.type === 'video') ?? [];
  const audios = attachments?.filter(a => a.type === 'audio') ?? [];
  const files = attachments?.filter(a => a.type === 'file') ?? [];
  const stickersAndGifs = attachments?.filter(a => a.type === 'sticker' || a.type === 'gif') ?? [];

  const currentLightboxImage = lightboxIndex !== null ? images[lightboxIndex] : null;

  const goToPrevious = () => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    }
  };

  const goToNext = () => {
    if (lightboxIndex !== null && lightboxIndex < images.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };

  // Handle keyboard navigation in lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, images.length]);

  // Preload the adjacent images so prev/next navigation feels instant.
  useEffect(() => {
    if (lightboxIndex === null) return;
    [lightboxIndex - 1, lightboxIndex + 1].forEach((i) => {
      if (i >= 0 && i < images.length) {
        const img = new Image();
        img.src = images[i].url;
      }
    });
  }, [lightboxIndex, images]);

  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      {/* Stickers & GIFs — rendered directly, no file chrome */}
      {stickersAndGifs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stickersAndGifs.map((item) => (
            <StickerOrGifAttachment
              key={item.id}
              attachment={item}
              onOpenLightbox={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
            />
          ))}
        </div>
      )}

      {/* Single image - no carousel */}
      {images.length === 1 && (
        <div className="max-w-md">
          <ImageAttachment
            attachment={images[0]}
            onOpenLightbox={() => setLightboxIndex(0)}
            authorId={authorId}
            onEdit={onEditAttachment}
            onRemove={onRemoveAttachment}
          />
        </div>
      )}

      {/* Plusieurs images : mosaique */}
      {images.length > 1 && (
        <ImageMosaic
          images={images}
          onOpenLightbox={setLightboxIndex}
          authorId={authorId}
          onEdit={onEditAttachment}
          onRemove={onRemoveAttachment}
        />
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <div className="space-y-2">
          {videos.map(video => (
            <VideoAttachment key={video.id} attachment={video} authorId={authorId} />
          ))}
        </div>
      )}

      {/* Musiques */}
      {audios.length > 0 && (
        <div className="space-y-2">
          {audios.map(a => (
            <AudioAttachment key={a.id} attachment={a} authorId={authorId} onEdit={onEditAttachment} onRemove={onRemoveAttachment} />
          ))}
        </div>
      )}

      {/* SVG attachments (sanitized + sandboxed) */}
      {svgAttachments.length > 0 && (
        <div className="space-y-2">
          {svgAttachments.map(svg => (
            <SvgAttachment
              key={svg.id}
              url={svg.url}
              name={svg.name}
              description={svg.description}
              isSpoiler={svg.isSpoiler}
              size={svg.size}
              authorId={authorId}
            />
          ))}
        </div>
      )}

      {/* Files */}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map(file => (
            <FileAttachment key={file.id} attachment={file} authorId={authorId} />
          ))}
        </div>
      )}

      {/* Enhanced Lightbox with navigation */}
      <Dialog open={lightboxIndex !== null} onOpenChange={() => setLightboxIndex(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-transparent border-none">
          {/* Close button */}
          <button type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 p-2 bg-background/80 rounded-full z-50 hover:bg-background transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Previous button */}
          {images.length > 1 && lightboxIndex !== null && lightboxIndex > 0 && (
            <button type="button"
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-background/80 rounded-full z-50 hover:bg-background transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Next button */}
          {images.length > 1 && lightboxIndex !== null && lightboxIndex < images.length - 1 && (
            <button type="button"
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-background/80 rounded-full z-50 hover:bg-background transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Image */}
          {currentLightboxImage && (
            <img
              src={currentLightboxImage.url}
              alt={currentLightboxImage.description || currentLightboxImage.name}
              decoding="async"
              draggable={lightboxGuard.draggable as any}
              onContextMenu={lightboxGuard.onContextMenu}
              className="max-w-full max-h-[85vh] object-contain rounded-lg mx-auto"
            />
          )}

          {/* Bottom bar with counter and external link */}
          {currentLightboxImage && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
              {/* Counter */}
              {images.length > 1 && (
                <span className="bg-background/80 px-3 py-1.5 rounded-full text-sm font-medium">
                  {(lightboxIndex ?? 0) + 1} / {images.length}
                </span>
              )}
              
              {/* External link — hidden when viewer cannot download */}
              {showExternalLink && (
                <a
                  href={currentLightboxImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-background/80 rounded-full hover:bg-background transition-colors"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
