import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { useServerEmojis, useServerStickers } from '@/hooks/useServerAssets';
import { EMOJI_CATEGORIES } from '@/data/emojis';
import { getEmojiKeywords, preloadEmojiKeywords } from '@/data/emojiKeywords';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { DiscordPickerPanel } from './emoji-picker/DiscordPickerPanel';
import { useAllServerAssets } from '@/hooks/useAllServerAssets';
import { EmojiPickerHeader, type PickerTab } from './emoji-picker/EmojiPickerHeader';
import { EmojiCategoryNav, type CategoryEntry } from './emoji-picker/EmojiCategoryNav';
import { EmojiGrid, type EmojiGridHandle, type EmojiSection } from './emoji-picker/EmojiGrid';
import { StickerGrid } from './emoji-picker/StickerGrid';
import { GifGrid } from './emoji-picker/GifGrid';
import { useGifSearch } from './emoji-picker/useGifSearch';
import { useRecentEmojis } from './emoji-picker/useRecentEmojis';
import { useFavorites, type FavoriteItem } from './emoji-picker/useFavorites';
import { FavoritesRow } from './emoji-picker/FavoritesRow';

interface EmojiStickerPickerProps {
  serverId: string | null;
  /** `custom` est renseigne pour un emoji de serveur (nom + image) : de quoi ecrire son vrai jeton. */
  onEmojiSelect: (emoji: string, custom?: { id: string; name: string; url: string }) => void;
  onStickerSelect?: (stickerUrl: string, stickerName: string) => void;
  onGifSelect?: (gifUrl: string, gifName: string) => void;
  trigger: React.ReactNode;
  defaultTab?: PickerTab;
  /** Ouverture pilotee de l'exterieur (menu d'un message > "Voir plus"). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  /** Texte du champ de recherche de l'onglet emoji (ex. "Trouve la réaction parfaite"). */
  searchPlaceholder?: string;
}

export function EmojiStickerPicker({
  serverId,
  onEmojiSelect,
  onStickerSelect,
  onGifSelect,
  trigger,
  defaultTab = 'emoji',
  open: openProp,
  onOpenChange,
  side = 'top',
  align = 'end',
  searchPlaceholder,
}: EmojiStickerPickerProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = useCallback((v: boolean) => { setOpenState(v); onOpenChange?.(v); }, [onOpenChange]);
  useEffect(() => { if (open) void preloadEmojiKeywords(); }, [open]);
  const [tab, setTab] = useState<PickerTab>(defaultTab);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('recent');
  const gridRef = useRef<EmojiGridHandle>(null);

  // The CLDR keyword indexes (~700 KB) are only needed once the user types in
  // the search box. Fetch them on first keystroke so they stay out of the
  // entry bundle while keyword search still works.
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (value.trim()) void preloadEmojiKeywords();
  }, []);

  const { data: serverEmojis = [] } = useServerEmojis(serverId);
  const { data: serverStickers = [] } = useServerStickers(serverId);
  const { isMobile } = useBreakpoint();
  const { recent, push: pushRecent, clear: clearRecent } = useRecentEmojis();
  const { favorites, isFavorite, toggle: toggleFavorite, byKind: favoritesByKind } = useFavorites();

  const {
    data: gifs = [],
    isLoading: gifsLoading,
    isFetching: gifsFetching,
  } = useGifSearch(tab === 'gif' ? search : '');

  const sections: EmojiSection[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out: EmojiSection[] = [];

    // Recent
    if (!q && recent.length > 0) {
      out.push({
        id: 'recent',
        label: 'Fréquemment utilisés',
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
    if (!q) {
      EMOJI_CATEGORIES.forEach((cat) => {
        out.push({
          id: cat.name,
          label: cat.name,
          items: cat.emojis.map((char) => ({ kind: 'unicode' as const, char })),
        });
      });
    } else {
      // Match against French + English CLDR keywords per emoji, falling back
      // to the category name so broad terms like "nourriture"/"food" work too.
      const matched: Array<{ kind: 'unicode'; char: string }> = [];
      const seen = new Set<string>();
      EMOJI_CATEGORIES.forEach((cat) => {
        const catMatches = cat.name.toLowerCase().includes(q);
        cat.emojis.forEach((char) => {
          if (seen.has(char)) return;
          const keywords = getEmojiKeywords(char);
          const emojiMatches = keywords.some((k) => k.includes(q));
          if (catMatches || emojiMatches) {
            seen.add(char);
            matched.push({ kind: 'unicode', char });
          }
        });
      });
      if (matched.length > 0) {
        out.push({ id: 'search-results', label: 'Résultats', items: matched });
      }
    }

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

  const handleEmojiPick = (insert: string, custom?: { id: string; name: string; url: string }) => {
    // Only push unicode chars to recents (avoid :name: shortcodes).
    if (!insert.startsWith(':')) pushRecent(insert);
    onEmojiSelect(insert, custom);
    setOpen(false);
  };

  const handleStickerPick = (url: string, name: string) => {
    onStickerSelect?.(url, name);
    setOpen(false);
  };

  const handleGifPick = (url: string, name: string) => {
    onGifSelect?.(url, name);
    setOpen(false);
  };

  const handleFavoritePick = (item: FavoriteItem) => {
    if (item.kind === 'emoji-unicode') handleEmojiPick(item.char);
    else if (item.kind === 'emoji-custom') handleEmojiPick(item.insertText, { id: item.id, name: item.name, url: item.url });
    else if (item.kind === 'sticker') handleStickerPick(item.url, item.name);
    else if (item.kind === 'gif') handleGifPick(item.url, item.name);
  };

  const toggleFavoriteUnicode = (char: string) => {
    toggleFavorite({ kind: 'emoji-unicode', id: `emoji-${char}`, char });
  };

  const toggleFavoriteCustomEmoji = (item: { id: string; name: string; url: string; insertText: string }) => {
    toggleFavorite({ kind: 'emoji-custom', id: `emoji-custom-${item.id}`, name: item.name, url: item.url, insertText: item.insertText });
  };

  const toggleFavoriteSticker = (sticker: { id: string; name: string; url: string }) => {
    toggleFavorite({ kind: 'sticker', id: `sticker-${sticker.id}`, name: sticker.name, url: sticker.url });
  };

  const toggleFavoriteGif = (gif: { id: string; title: string; url: string; previewUrl: string }) => {
    toggleFavorite({ kind: 'gif', id: `gif-${gif.id}`, name: gif.title || 'GIF', url: gif.url, previewUrl: gif.previewUrl });
  };

  const favoriteEmojis = useMemo(
    () => [...favoritesByKind('emoji-unicode'), ...favoritesByKind('emoji-custom')],
    [favoritesByKind],
  );
  const favoriteStickers = useMemo(() => favoritesByKind('sticker'), [favoritesByKind]);
  const favoriteGifs = useMemo(() => favoritesByKind('gif'), [favoritesByKind]);

  const gridHeight = isMobile ? Math.round(window.innerHeight * 0.45) : 280;

  const pickerContent = (
    <div className="w-full">
      <EmojiPickerHeader
        tab={tab}
        onTabChange={(t) => {
          setTab(t);
          setSearch('');
        }}
        search={search}
        onSearchChange={handleSearchChange}
      />

      {!search.trim() && tab === 'emoji' && (
        <FavoritesRow items={favoriteEmojis} onPick={handleFavoritePick} isMobile={isMobile} />
      )}
      {tab === 'sticker' && (
        <FavoritesRow items={favoriteStickers} onPick={handleFavoritePick} isMobile={isMobile} />
      )}
      {!search.trim() && tab === 'gif' && (
        <FavoritesRow items={favoriteGifs} onPick={handleFavoritePick} isMobile={isMobile} />
      )}

      {tab === 'emoji' && (
        <>
          <div className={search.trim() ? 'invisible pointer-events-none' : undefined}>
            <EmojiCategoryNav
              categories={categories}
              activeId={activeCategory}
              onSelect={(id) => {
                setActiveCategory(id);
                gridRef.current?.scrollToSection(id);
              }}
              orientation="horizontal"
            />
          </div>
          <EmojiGrid
            ref={gridRef}
            sections={sections}
            onPick={handleEmojiPick}
            onClearRecent={clearRecent}
            height={gridHeight}
            isMobile={isMobile}
            onActiveSectionChange={setActiveCategory}
            isFavorite={isFavorite}
            onToggleFavoriteUnicode={toggleFavoriteUnicode}
            onToggleFavoriteCustom={toggleFavoriteCustomEmoji}
          />
        </>
      )}

      {tab === 'sticker' && (
        <StickerGrid
          stickers={filteredStickers}
          onPick={handleStickerPick}
          height={gridHeight + 32}
          isMobile={isMobile}
          isFavorite={(id) => isFavorite(`sticker-${id}`)}
          onToggleFavorite={toggleFavoriteSticker}
        />
      )}

      {tab === 'gif' && (
        <GifGrid
          gifs={gifs}
          isLoading={gifsLoading}
          isSearching={gifsFetching && !gifsLoading}
          onPick={handleGifPick}
          height={gridHeight + 32}
          isMobile={isMobile}
          isFavorite={(id) => isFavorite(`gif-${id}`)}
          onToggleFavorite={toggleFavoriteGif}
        />
      )}
    </div>
  );

  // Selecteur de bureau universel (video de reference) : voir DiscordPickerPanel.
  const [wave] = useState(() => ['👏', '😀', '😎', '🎉', '👍', '🔥', '😂', '🤔'][Math.floor(Math.random() * 8)]);
  const allAssets = useAllServerAssets(open && !isMobile);
  // Le serveur courant reste disponible meme si la liste des serveurs n'est pas encore chargee.
  const panelEmojis = useMemo(() => {
    const ids = new Set(allAssets.emojis.map((e) => e.id));
    return [...allAssets.emojis, ...serverEmojis.filter((e) => !ids.has(e.id))];
  }, [allAssets.emojis, serverEmojis]);
  const panelStickers = useMemo(() => {
    const ids = new Set(allAssets.stickers.map((e) => e.id));
    return [...allAssets.stickers, ...serverStickers.filter((e) => !ids.has(e.id))];
  }, [allAssets.stickers, serverStickers]);
  const panelServers = useMemo(() => {
    const list = [...allAssets.servers];
    if (serverId && !list.some((x) => x.id === serverId)) list.push({ id: serverId, name: 'Ce serveur', icon_url: null });
    return list;
  }, [allAssets.servers, serverId]);
  const desktopContent = (
    <DiscordPickerPanel
      searchPlaceholder={searchPlaceholder}
      tab={tab}
      onTabChange={setTab}
      showGif={!!onGifSelect}
      showSticker={!!onStickerSelect}
      search={search}
      onSearch={handleSearchChange}
      currentServerId={serverId}
      servers={panelServers}
      emojis={panelEmojis}
      stickers={panelStickers}
      recent={recent}
      favorites={favorites}
      isFavorite={isFavorite}
      onToggleFavorite={toggleFavorite}
      onPickEmoji={handleEmojiPick}
      onPickSticker={handleStickerPick}
      onPickGif={handleGifPick}
      gifs={gifs}
      gifsLoading={gifsLoading}
      gifsFetching={gifsFetching}
      wave={wave}
    />
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
        side={side}
        align={align}
        collisionPadding={12}
        className="z-[110] w-[497px] max-w-[calc(100vw-24px)] p-0 bg-popover border border-white/[0.08] rounded-lg overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
        style={{
          boxShadow: 'var(--shadow-elevation-3)',
          maxHeight: 'var(--radix-popover-content-available-height)',
        }}
      >
        {desktopContent}
      </PopoverContent>
    </Popover>
  );
}
