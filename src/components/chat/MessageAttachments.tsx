import { useState } from 'react';
import { cn } from '@/lib/utils';
import { FileIcon, Download, ExternalLink, Play, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

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
  onOpenLightbox 
}: { 
  attachment: StoredAttachment;
  onOpenLightbox: () => void;
}) {
  const [revealed, setRevealed] = useState(!attachment.isSpoiler);
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative group max-w-md">
      <img
        src={attachment.url}
        alt={attachment.description || attachment.name}
        className={cn(
          'rounded-lg cursor-pointer transition-all duration-200 max-h-80 object-contain',
          !revealed && 'blur-2xl brightness-50',
          !loaded && 'opacity-0'
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
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) return null;

  const images = attachments.filter(a => a.type === 'image');
  const videos = attachments.filter(a => a.type === 'video');
  const files = attachments.filter(a => a.type === 'file');

  return (
    <div className="mt-2 space-y-2">
      {/* Images Grid */}
      {images.length > 0 && (
        <div className={cn(
          'flex flex-wrap gap-2',
          images.length === 1 && 'flex-col',
          images.length >= 2 && 'grid grid-cols-2 max-w-lg'
        )}>
          {images.map(img => (
            <ImageAttachment
              key={img.id}
              attachment={img}
              onOpenLightbox={() => setLightboxImage(img.url)}
            />
          ))}
        </div>
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

      {/* Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-transparent border-none">
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 bg-background/80 rounded-full z-50 hover:bg-background transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          {lightboxImage && (
            <img
              src={lightboxImage}
              alt="Image agrandie"
              className="max-w-full max-h-[85vh] object-contain rounded-lg mx-auto"
            />
          )}
          {lightboxImage && (
            <a
              href={lightboxImage}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-4 right-4 p-2 bg-background/80 rounded-full hover:bg-background transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
