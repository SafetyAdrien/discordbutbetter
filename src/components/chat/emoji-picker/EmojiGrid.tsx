import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Star, ChevronDown, Clock } from '@/components/icons/discord/lucide';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

export interface EmojiSection {
  id: string;
  label: string;
  /** Either unicode emoji strings, or rendered server-emoji entries. */
  items: Array<
    | { kind: 'unicode'; char: string; name?: string }
    | { kind: 'custom'; id: string; name: string; url: string; insertText: string }
  >;
}

interface Props {
  sections: EmojiSection[];
  onPick: (insert: string) => void;
  onClearRecent?: () => void;
  height: number;
  isMobile: boolean;
  /** Called with the id of the section currently scrolled into view. */
  onActiveSectionChange?: (id: string) => void;
  isFavorite?: (id: string) => boolean;
  onToggleFavoriteUnicode?: (char: string) => void;
  onToggleFavoriteCustom?: (item: { id: string; name: string; url: string; insertText: string }) => void;
  /** Disposition du selecteur de bureau : 9 colonnes de 40px, intitules de section en casse normale. */
  wide?: boolean;
  onHoverItem?: (item: EmojiSection['items'][number]) => void;
}

export interface EmojiGridHandle {
  scrollToSection: (id: string) => void;
}

export const EmojiGrid = forwardRef<EmojiGridHandle, Props>(function EmojiGrid(
  { sections, onPick, onClearRecent, height, isMobile, onActiveSectionChange, isFavorite, onToggleFavoriteUnicode, onToggleFavoriteCustom, wide, onHoverItem },
  ref,
) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Scroll-driven category sync is suppressed briefly after a click-to-scroll
  // so the smooth-scroll animation doesn't fight the nav's active state.
  const suppressObserverRef = useRef(false);
  const suppressTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useImperativeHandle(ref, () => ({
    scrollToSection: (id) => {
      const el = sectionRefs.current[id];
      const container = scrollRef.current;
      if (!el || !container) return;
      suppressObserverRef.current = true;
      if (suppressTimeoutRef.current) clearTimeout(suppressTimeoutRef.current);
      container.scrollTo({ top: el.offsetTop - 4, behavior: 'smooth' });
      suppressTimeoutRef.current = setTimeout(() => {
        suppressObserverRef.current = false;
      }, 500);
    },
  }));

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !onActiveSectionChange) return;

    const updateActiveSection = () => {
      if (suppressObserverRef.current) return;
      const containerTop = container.getBoundingClientRect().top;
      let currentId: string | null = null;
      for (const section of sections) {
        const el = sectionRefs.current[section.id];
        if (!el) continue;
        const offset = el.getBoundingClientRect().top - containerTop;
        // Section counts as active once its header scrolls near the top.
        if (offset <= 40) {
          currentId = section.id;
        } else {
          break;
        }
      }
      if (currentId) onActiveSectionChange(currentId);
    };

    updateActiveSection();
    container.addEventListener('scroll', updateActiveSection, { passive: true });
    return () => container.removeEventListener('scroll', updateActiveSection);
  }, [sections, onActiveSectionChange]);

  const handlePick = (insert: string) => {
    if (isMobile) haptics.selection();
    onPick(insert);
  };

  const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);

  if (totalItems === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center text-center px-6 py-12 text-muted-foreground"
        style={{ height }}
      >
        <span className="text-4xl mb-2" role="img" aria-hidden>
          🔍
        </span>
        <p className="text-sm font-medium">Aucun résultat</p>
        <p className="text-xs mt-1">Essayez une autre recherche</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      style={{ height }}
      className="overflow-y-auto overflow-x-hidden custom-scrollbar"
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="px-2 pb-3 space-y-3">
        {sections.map((section) => (
          <div
            key={section.id}
            ref={(el) => {
              sectionRefs.current[section.id] = el;
            }}
          >
            <div className={cn('flex items-center justify-between px-1 sticky top-0 z-[1]', wide ? 'mb-0.5 py-2 bg-popover' : 'mb-1.5 bg-popover/95 backdrop-blur-sm py-1')}>
              {wide ? (
                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {section.id === 'recent' && <Clock className="w-4 h-4" />}
                  {section.label}
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </h4>
              ) : (
              <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                {section.label}
              </h4>
              )}
              {section.id === 'recent' && onClearRecent && (
                <button
                  type="button"
                  onClick={onClearRecent}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                >
                  Effacer
                </button>
              )}
            </div>
            <div
              className={cn(
                'grid gap-0.5',
                wide ? 'grid-cols-9 gap-0' : isMobile ? 'grid-cols-7' : 'grid-cols-8',
              )}
            >
              {section.items.map((item, idx) =>
                item.kind === 'unicode' ? (
                  <div key={`${section.id}-${idx}-${item.char}`} className="relative group">
                    <button
                      type="button"
                      onClick={() => handlePick(item.char)}
                      onMouseEnter={() => onHoverItem?.(item)}
                      title={wide ? undefined : item.name ?? item.char}
                      className={cn(
                        'flex items-center justify-center rounded-xl transition-transform duration-150 hover:bg-muted active:scale-90',
                        wide ? 'w-10 h-10 text-[28px] leading-none rounded-lg hover:bg-white/[0.09] active:scale-95' : isMobile ? 'w-9 h-9 text-2xl' : 'w-9 h-9 text-xl hover:scale-110',
                      )}
                    >
                      {item.char}
                    </button>
                    {onToggleFavoriteUnicode && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavoriteUnicode(item.char);
                        }}
                        aria-label={isFavorite?.(`emoji-${item.char}`) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                        className={cn(
                          'absolute -top-0.5 -right-0.5 p-0.5 rounded-full bg-background/90 transition-opacity',
                          isFavorite?.(`emoji-${item.char}`) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                        )}
                      >
                        <Star className={cn('w-2.5 h-2.5', isFavorite?.(`emoji-${item.char}`) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground')} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div key={`${section.id}-${idx}-${item.id}`} className="relative group">
                    <button
                      type="button"
                      onClick={() => handlePick(item.insertText)}
                      onMouseEnter={() => onHoverItem?.(item)}
                      title={wide ? undefined : `:${item.name}:`}
                      className={cn(
                        'flex items-center justify-center rounded-xl transition-transform duration-150 hover:bg-muted active:scale-90',
                        wide ? 'w-10 h-10 rounded-lg hover:bg-white/[0.09] active:scale-95' : isMobile ? 'w-9 h-9' : 'w-9 h-9 hover:scale-110',
                      )}
                    >
                      <img
                        src={item.url}
                        alt={item.name}
                        loading="lazy"
                        className={wide ? 'w-8 h-8 object-contain' : 'w-6 h-6 object-contain'}
                      />
                    </button>
                    {onToggleFavoriteCustom && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavoriteCustom(item);
                        }}
                        aria-label={isFavorite?.(`emoji-custom-${item.id}`) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                        className={cn(
                          'absolute -top-0.5 -right-0.5 p-0.5 rounded-full bg-background/90 transition-opacity',
                          isFavorite?.(`emoji-custom-${item.id}`) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                        )}
                      >
                        <Star className={cn('w-2.5 h-2.5', isFavorite?.(`emoji-custom-${item.id}`) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground')} />
                      </button>
                    )}
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
