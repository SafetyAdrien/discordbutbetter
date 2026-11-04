import { Loader2 } from 'lucide-react';
import { Clapperboard, Star } from '@/components/icons/discord/lucide';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { Icon } from '@/components/ui/icon';
import type { GifEntry } from './useGifSearch';

interface Props {
  gifs: GifEntry[];
  isLoading: boolean;
  isSearching: boolean;
  onPick: (url: string, name: string) => void;
  height: number;
  isMobile: boolean;
  isFavorite?: (id: string) => boolean;
  onToggleFavorite?: (gif: GifEntry) => void;
}

export function GifGrid({ gifs, isLoading, isSearching, onPick, height, isMobile, isFavorite, onToggleFavorite }: Props) {
  if (isLoading && gifs.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground" style={{ height }}>
        <Icon icon={Loader2} size="lg" className="animate-spin" />
      </div>
    );
  }

  if (gifs.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center text-center px-6 py-12 text-muted-foreground"
        style={{ height }}
      >
        <div className="w-14 h-14 rounded-3xl bg-muted/60 inline-flex items-center justify-center mb-3">
          <Icon icon={Clapperboard} size="xl" variant="filled" className="text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">Aucun GIF trouvé</p>
        <p className="text-xs mt-1">Essayez un autre mot-clé</p>
      </div>
    );
  }

  return (
    <ScrollArea style={{ height }}>
      <div
        className={cn(
          'grid gap-1.5 p-3 transition-opacity duration-150',
          isMobile ? 'grid-cols-2' : 'grid-cols-2',
          isSearching && 'opacity-60'
        )}
      >
        {gifs.map((g) => (
          <div key={g.id} className="relative group">
            <button
              type="button"
              onClick={() => {
                if (isMobile) haptics.selection();
                onPick(g.url, g.title || 'GIF');
              }}
              title={g.title}
              className="aspect-video w-full rounded-xl overflow-hidden bg-muted/40 hover:ring-2 hover:ring-primary/60 active:scale-95 transition-all duration-150"
            >
              <img
                src={g.previewUrl}
                alt={g.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </button>
            {onToggleFavorite && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(g);
                }}
                aria-label={isFavorite?.(g.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                className={cn(
                  'absolute top-1 right-1 p-1 rounded-full bg-background/80 backdrop-blur-sm transition-opacity',
                  isFavorite?.(g.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                )}
              >
                <Star className={cn('w-3 h-3', isFavorite?.(g.id) ? 'fill-yellow-400 text-yellow-400' : 'text-white drop-shadow')} />
              </button>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
