import { Star } from '@/components/icons/discord/lucide';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import type { FavoriteItem } from './useFavorites';

interface Props {
  items: FavoriteItem[];
  onPick: (item: FavoriteItem) => void;
  isMobile: boolean;
}

/**
 * Compact horizontal strip of favorited items for the active tab, shown
 * between the header (tabs + search) and the grid. Hidden entirely when
 * there are no favorites for the current tab.
 */
export function FavoritesRow({ items, onPick, isMobile }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="px-3 pt-2 pb-1.5 border-b border-border/40">
      <div className="flex items-center gap-1 mb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
        <Star className="w-3 h-3 fill-current" />
        Favoris
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (isMobile) haptics.selection();
              onPick(item);
            }}
            title={item.kind === 'emoji-custom' || item.kind === 'sticker' || item.kind === 'gif' ? item.name : undefined}
            className={cn(
              'flex-shrink-0 rounded-lg bg-muted/40 hover:bg-muted active:scale-95 transition-all duration-150',
              'flex items-center justify-center',
              item.kind === 'gif' ? 'w-16 h-10 overflow-hidden' : 'w-9 h-9',
            )}
          >
            {item.kind === 'emoji-unicode' && <span className="text-xl leading-none">{item.char}</span>}
            {item.kind === 'emoji-custom' && (
              <img src={item.url} alt={item.name} loading="lazy" className="w-6 h-6 object-contain" />
            )}
            {item.kind === 'sticker' && (
              <img src={item.url} alt={item.name} loading="lazy" className="max-w-full max-h-full object-contain p-1" />
            )}
            {item.kind === 'gif' && (
              <img src={item.previewUrl} alt={item.name} loading="lazy" className="w-full h-full object-cover rounded-lg" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
