import { useMemo, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { useServerEmojis, useServerStickers } from '@/hooks/useServerAssets';
import { EMOJI_CATEGORIES } from '@/data/emojis';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { EmojiPickerHeader } from './emoji-picker/EmojiPickerHeader';
import { EmojiCategoryNav, type CategoryEntry } from './emoji-picker/EmojiCategoryNav';
import { EmojiGrid, type EmojiGridHandle, type EmojiSection } from './emoji-picker/EmojiGrid';
import { StickerGrid } from './emoji-picker/StickerGrid';
import { useRecentEmojis } from './emoji-picker/useRecentEmojis';

interface EmojiStickerPickerProps {
  serverId: string | null;
  onEmojiSelect: (emoji: string) => void;
  onStickerSelect?: (stickerUrl: string, stickerName: string) => void;
  trigger: React.ReactNode;
  defaultTab?: 'emoji' | 'sticker';
}

export function EmojiStickerPicker({
  serverId,
  onEmojiSelect,
  onStickerSelect,
  trigger,
  defaultTab = 'emoji',
}: EmojiStickerPickerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'emoji' | 'sticker'>(defaultTab);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('recent');
  const gridRef = useRef<EmojiGridHandle>(null);

  const { data: serverEmojis = [] } = useServerEmojis(serverId);
  const { data: serverStickers = [] } = useServerStickers(serverId);
  const { isMobile } = useBreakpoint();
  const { recent, push: pushRecent, clear: clearRecent } = useRecentEmojis();

  const totalEmojis = useMemo(
    () => EMOJI_CATEGORIES.reduce((acc, c) => acc + c.emojis.length, 0) + serverEmojis.length,
    [serverEmojis.length],
  );

  const sections: EmojiSection[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out: EmojiSection[] = [];

    // Recent
    if (!q && recent.length > 0) {
      out.push({
        id: 'recent',
        label: 'Récemment utilisés',
        items: recent.map((char) => ({ kind: 'unicode' as const, char })),
      });
    }

    // Server emojis
    const filteredServer = serverEmojis.filter(
      (e) => !q || e.name.toLowerCase().includes(q),
    );
    if (filteredServer.length > 0) {
      out.push({
        id: 'server',
        label: 'Emojis du serveur',
        items: filteredServer.map((e) => ({
          kind: 'custom' as const,
          id: e.id,
          name: e.name,
          url: e.url,
          insertText: `:${e.name}:`,
        })),
      });
    }

    // Standard categories
    EMOJI_CATEGORIES.forEach((cat) => {
      // Without alias data, search matches by category name only.
      const matchesCat = !q || cat.name.toLowerCase().includes(q);
      if (!matchesCat && q) return;
      out.push({
        id: cat.name,
        label: cat.name,
        items: cat.emojis.map((char) => ({ kind: 'unicode' as const, char })),
      });
    });

    return out;
  }, [search, recent, serverEmojis]);

  const categories: CategoryEntry[] = useMemo(() => {
    const list: CategoryEntry[] = [];
    if (recent.length > 0) list.push({ id: 'recent', label: 'Récents' });
    if (serverEmojis.length > 0) list.push({ id: 'server', label: 'Serveur' });
    EMOJI_CATEGORIES.forEach((c) => list.push({ id: c.name, label: c.name }));
    return list;
  }, [recent.length, serverEmojis.length]);

  const filteredStickers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return serverStickers.filter((s) => !q || s.name.toLowerCase().includes(q));
  }, [search, serverStickers]);

  const handleEmojiPick = (insert: string) => {
    // Only push unicode chars to recents (avoid :name: shortcodes).
    if (!insert.startsWith(':')) pushRecent(insert);
    onEmojiSelect(insert);
    setOpen(false);
  };

  const handleStickerPick = (url: string, name: string) => {
    onStickerSelect?.(url, name);
    setOpen(false);
  };

  const gridHeight = isMobile ? Math.round(window.innerHeight * 0.45) : 280;

  const pickerContent = (
    <div className="w-full">
      <EmojiPickerHeader
        tab={tab}
        onTabChange={setTab}
        search={search}
        onSearchChange={setSearch}
        totalCount={totalEmojis}
        serverCount={serverEmojis.length}
      />

      {tab === 'emoji' ? (
        <>
          <EmojiCategoryNav
            categories={categories}
            activeId={activeCategory}
            onSelect={(id) => {
              setActiveCategory(id);
              gridRef.current?.scrollToSection(id);
            }}
            orientation="horizontal"
          />
          <EmojiGrid
            ref={gridRef}
            sections={sections}
            onPick={handleEmojiPick}
            onClearRecent={clearRecent}
            height={gridHeight}
            isMobile={isMobile}
          />
        </>
      ) : (
        <StickerGrid
          stickers={filteredStickers}
          onPick={handleStickerPick}
          height={gridHeight + 32}
          isMobile={isMobile}
        />
      )}
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div onClick={() => setOpen(true)}>{trigger}</div>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="p-0 bg-popover rounded-t-3xl">
            <div className="mx-auto mt-1.5 mb-1 h-1 w-10 rounded-full bg-muted-foreground/30" aria-hidden />
            {pickerContent}
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="w-[380px] p-0 bg-popover border-0 rounded-2xl overflow-hidden"
        style={{ boxShadow: 'var(--shadow-elevation-3)' }}
      >
        {pickerContent}
      </PopoverContent>
    </Popover>
  );
}
