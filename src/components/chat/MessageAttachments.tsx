import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { FileIcon, Download, ExternalLink, Play, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselPrevious, 
  CarouselNext,
  type CarouselApi 
} from '@/components/ui/carousel';

export interface StoredAttachment {
  id: string;
  url: string;
  name: string;
  type: 'image' | 'video' | 'file';
  size: number;
  description?: string;
  isSpoiler?: boolean;
}

interface MessageAttachmentsProps {
  attachments: StoredAttachment[];
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
  isActive = true
}: { 
  attachment: StoredAttachment;
  onOpenLightbox: () => void;
  isActive?: boolean;
}) {
  const [revealed, setRevealed] = useState(!attachment.isSpoiler);
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative group">
      <img
        src={attachment.url}
        alt={attachment.description || attachment.name}
        className={cn(
          'rounded-lg cursor-pointer transition-[filter,opacity] duration-200 max-h-80 w-full object-cover',
          !revealed && 'blur-2xl brightness-50',
          !loaded && 'opacity-0',
          !isActive && revealed && 'blur-[2px] brightness-90'
        )}
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
          <span className="bg-background/90 px-3 py-1.5 rounded-md text-sm font-medium">
            SPOILER
          </span>
        </div>
      )}
      {attachment.description && revealed && (
        <p className="text-xs text-muted-foreground mt-1 italic">
          {attachment.description}
        </p>
      )}
    </div>
  );
}

function ImageCarousel({ 
  images, 
  onOpenLightbox 
}: { 
  images: StoredAttachment[];
  onOpenLightbox: (index: number) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [api, setApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!api) return;
    
    const onSelect = () => {
      setCurrentIndex(api.selectedScrollSnap());
    };
    
    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

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
                isActive={index === currentIndex}
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
          <button
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

function VideoAttachment({ attachment }: { attachment: StoredAttachment }) {
  const [revealed, setRevealed] = useState(!attachment.isSpoiler);
  const [isPlaying, setIsPlaying] = useState(false);

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
    <div className="relative group max-w-md">
      <video
        src={attachment.url}
        controls
        className="rounded-lg max-h-80"
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

function FileAttachment({ attachment }: { attachment: StoredAttachment }) {
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
      <a
        href={attachment.url}
        download={attachment.name}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-md hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
      >
        <Download className="w-4 h-4 text-muted-foreground" />
      </a>
    </div>
  );
}

export function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const images = attachments?.filter(a => a.type === 'image') ?? [];
  const videos = attachments?.filter(a => a.type === 'video') ?? [];
  const files = attachments?.filter(a => a.type === 'file') ?? [];

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

  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      {/* Single image - no carousel */}
      {images.length === 1 && (
        <div className="max-w-md">
          <ImageAttachment
            attachment={images[0]}
            onOpenLightbox={() => setLightboxIndex(0)}
          />
        </div>
      )}

      {/* Multiple images - carousel */}
      {images.length > 1 && (
        <ImageCarousel 
          images={images}
          onOpenLightbox={setLightboxIndex}
        />
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <div className="space-y-2">
          {videos.map(video => (
            <VideoAttachment key={video.id} attachment={video} />
          ))}
        </div>
      )}

      {/* Files */}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map(file => (
            <FileAttachment key={file.id} attachment={file} />
          ))}
        </div>
      )}

      {/* Enhanced Lightbox with navigation */}
      <Dialog open={lightboxIndex !== null} onOpenChange={() => setLightboxIndex(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-transparent border-none">
          {/* Close button */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 p-2 bg-background/80 rounded-full z-50 hover:bg-background transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Previous button */}
          {images.length > 1 && lightboxIndex !== null && lightboxIndex > 0 && (
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-background/80 rounded-full z-50 hover:bg-background transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Next button */}
          {images.length > 1 && lightboxIndex !== null && lightboxIndex < images.length - 1 && (
            <button
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
              
              {/* External link */}
              <a
                href={currentLightboxImage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-background/80 rounded-full hover:bg-background transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
