import { Sticker as StickerIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { Icon } from '@/components/ui/icon';

interface StickerEntry {
  id: string;
  name: string;
  url: string;
}

interface Props {
  stickers: StickerEntry[];
  onPick: (url: string, name: string) => void;
  height: number;
  isMobile: boolean;
}

export function StickerGrid({ stickers, onPick, height, isMobile }: Props) {
  if (stickers.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center text-center px-6 py-12 text-muted-foreground"
        style={{ height }}
      >
        <div className="w-14 h-14 rounded-3xl bg-muted/60 inline-flex items-center justify-center mb-3">
          <Icon icon={StickerIcon} size="xl" variant="filled" className="text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">Aucun autocollant</p>
        <p className="text-xs mt-1">
          Les administrateurs peuvent en ajouter dans les paramètres du serveur
        </p>
      </div>
    );
  }

  return (
    <ScrollArea style={{ height }}>
      <div
        className={cn(
          'grid gap-2 p-3',
          isMobile ? 'grid-cols-3' : 'grid-cols-4',
        )}
      >
        {stickers.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              if (isMobile) haptics.selection();
              onPick(s.url, s.name);
            }}
            title={s.name}
            className="aspect-square rounded-2xl bg-muted/40 hover:bg-muted active:scale-95 transition-all duration-150 p-2 flex items-center justify-center hover:shadow-[var(--shadow-elevation-1)]"
          >
            <img
              src={s.url}
              alt={s.name}
              loading="lazy"
              className="max-w-full max-h-full object-contain"
            />
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
