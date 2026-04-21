import { forwardRef, useImperativeHandle, useRef } from 'react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { ScrollArea } from '@/components/ui/scroll-area';

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
}

export interface EmojiGridHandle {
  scrollToSection: (id: string) => void;
}

export const EmojiGrid = forwardRef<EmojiGridHandle, Props>(function EmojiGrid(
  { sections, onPick, onClearRecent, height, isMobile },
  ref,
) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useImperativeHandle(ref, () => ({
    scrollToSection: (id) => {
      const el = sectionRefs.current[id];
      const container = scrollRef.current;
      if (!el || !container) return;
      container.scrollTo({ top: el.offsetTop - 4, behavior: 'smooth' });
    },
  }));

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
    <ScrollArea style={{ height }} viewportRef={scrollRef as any}>
      <div className="px-2 pb-3 space-y-3">
        {sections.map((section) => (
          <div
            key={section.id}
            ref={(el) => {
              sectionRefs.current[section.id] = el;
            }}
          >
            <div className="flex items-center justify-between px-1 mb-1.5 sticky top-0 bg-popover/95 backdrop-blur-sm py-1 z-[1]">
              <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                {section.label}
              </h4>
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
                isMobile ? 'grid-cols-7' : 'grid-cols-8',
              )}
            >
              {section.items.map((item, idx) =>
                item.kind === 'unicode' ? (
                  <button
                    key={`${section.id}-${idx}-${item.char}`}
                    type="button"
                    onClick={() => handlePick(item.char)}
                    title={item.name ?? item.char}
                    className={cn(
                      'flex items-center justify-center rounded-xl transition-transform duration-150 hover:bg-muted active:scale-90',
                      isMobile ? 'w-9 h-9 text-2xl' : 'w-9 h-9 text-xl hover:scale-110',
                    )}
                  >
                    {item.char}
                  </button>
                ) : (
                  <button
                    key={`${section.id}-${idx}-${item.id}`}
                    type="button"
                    onClick={() => handlePick(item.insertText)}
                    title={`:${item.name}:`}
                    className={cn(
                      'flex items-center justify-center rounded-xl transition-transform duration-150 hover:bg-muted active:scale-90',
                      isMobile ? 'w-9 h-9' : 'w-9 h-9 hover:scale-110',
                    )}
                  >
                    <img
                      src={item.url}
                      alt={item.name}
                      loading="lazy"
                      className="w-6 h-6 object-contain"
                    />
                  </button>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
});
