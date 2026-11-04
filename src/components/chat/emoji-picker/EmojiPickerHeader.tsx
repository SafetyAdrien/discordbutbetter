import { Search, Smile, Sticker, Clapperboard, X } from '@/components/icons/discord/lucide';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';

export type PickerTab = 'emoji' | 'sticker' | 'gif';

interface Props {
  tab: PickerTab;
  onTabChange: (t: PickerTab) => void;
  search: string;
  onSearchChange: (v: string) => void;
}

const TAB_ICON: Record<PickerTab, typeof Smile> = {
  emoji: Smile,
  sticker: Sticker,
  gif: Clapperboard,
};

const TAB_LABEL: Record<PickerTab, string> = {
  emoji: 'Emojis',
  sticker: 'Autocollants',
  gif: 'GIFs',
};

/**
 * Modern segmented header with pill toggle for Emojis / Stickers
 * and a rounded search field with clear button.
 */
export function EmojiPickerHeader({
  tab,
  onTabChange,
  search,
  onSearchChange,
}: Props) {
  return (
    <div className="px-3 pt-3 pb-2 space-y-3 border-b border-border/40">
      {/* Segmented pill toggle */}
      <div
        role="tablist"
        aria-label="Sélection emoji, autocollant ou GIF"
        className="relative inline-flex items-center bg-muted/60 rounded-2xl p-1"
      >
        {(['emoji', 'sticker', 'gif'] as const).map((t) => {
          const active = tab === t;
          return (
            <button type="button"
              key={t}
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(t)}
              className={cn(
                'relative flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200',
                active
                  ? 'bg-primary text-primary-foreground shadow-[var(--shadow-elevation-1)]'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon
                icon={TAB_ICON[t]}
                size="sm"
                variant={active ? 'filled' : 'outline'}
              />
              {TAB_LABEL[t]}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Icon
          icon={Search}
          size="sm"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher…"
          aria-label="Rechercher un emoji ou un autocollant"
          className="w-full bg-muted/60 border-0 rounded-2xl pl-9 pr-9 h-9 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Effacer la recherche"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 inline-flex items-center justify-center rounded-full bg-muted hover:bg-muted-foreground/20 transition-colors"
          >
            <Icon icon={X} size="xs" />
          </button>
        )}
      </div>
    </div>
  );
}
