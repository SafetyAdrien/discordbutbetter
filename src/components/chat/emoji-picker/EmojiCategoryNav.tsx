import { cn } from '@/lib/utils';
import { Clock, Smile, Cat, UtensilsCrossed, Trophy, Plane, Lightbulb, Hash, Flag, Sparkles } from 'lucide-react';
import { Icon } from '@/components/ui/icon';

export interface CategoryEntry {
  id: string;
  label: string;
}

const ICON_FOR_ID: Record<string, typeof Clock> = {
  recent: Clock,
  server: Sparkles,
  'Smileys & Personnes': Smile,
  'Animaux & Nature': Cat,
  'Nourriture & Boissons': UtensilsCrossed,
  Activités: Trophy,
  'Voyages & Lieux': Plane,
  Objets: Lightbulb,
  Symboles: Hash,
  Drapeaux: Flag,
};

interface Props {
  categories: CategoryEntry[];
  activeId: string;
  onSelect: (id: string) => void;
  orientation: 'horizontal' | 'vertical';
}

/**
 * Quick-jump category navigation. Horizontal sticky strip on mobile,
 * vertical sidebar on desktop.
 */
export function EmojiCategoryNav({ categories, activeId, onSelect, orientation }: Props) {
  return (
    <nav
      aria-label="Catégories d'emojis"
      className={cn(
        orientation === 'horizontal'
          ? 'flex items-center gap-1 overflow-x-auto px-2 py-1.5 border-b border-border/40 sticky top-0 z-10 bg-popover/95 backdrop-blur-sm scrollbar-none'
          : 'flex flex-col gap-1 p-2 border-r border-border/40 bg-muted/30',
      )}
      style={orientation === 'horizontal' ? { scrollbarWidth: 'none' } : undefined}
    >
      {categories.map(({ id, label }) => {
        const IconComp = ICON_FOR_ID[id] ?? Smile;
        const active = activeId === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-label={label}
            aria-current={active ? 'true' : undefined}
            title={label}
            className={cn(
              'shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-2xl transition-all duration-200',
              active
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
            )}
          >
            <Icon icon={IconComp} size="sm" variant={active ? 'filled' : 'outline'} />
          </button>
        );
      })}
    </nav>
  );
}
