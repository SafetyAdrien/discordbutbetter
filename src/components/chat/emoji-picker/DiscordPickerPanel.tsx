import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Clock, Search as SearchIcon, Smile, Star, Sticker as StickerIcon, ChevronDown, ChevronRight, Trophy, Hash, Flag, X as XIcon } from '@/components/icons/discord/lucide';
import { Cat, UtensilsCrossed, Plane, Lightbulb } from 'lucide-react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EMOJI_CATEGORIES } from '@/data/emojis';
import { getEmojiKeywords } from '@/data/emojiKeywords';
import { copyToClipboard } from '@/lib/clipboard';
import { cn } from '@/lib/utils';
import type { PickerServer } from '@/hooks/useAllServerAssets';
import type { ServerEmoji, ServerSticker } from '@/hooks/useServerAssets';
import type { FavoriteItem } from './useFavorites';
import { GifPanel } from './GifPanel';
import type { GifEntry } from './useGifSearch';

/*
 * Selecteur universel (video de reference) : onglets GIF / Autocollants / Emoji, recherche avec
 * apercu aleatoire, rail a gauche (favoris, recents, serveurs, categories), sections repliables,
 * grille de 9 colonnes, menu contextuel et pied avec l'element survole.
 */

export type PanelTab = 'gif' | 'sticker' | 'emoji';

const CAT_ICON: Record<string, React.ElementType> = {
  'Smileys & Personnes': Smile,
  'Animaux & Nature': Cat,
  'Nourriture & Boissons': UtensilsCrossed,
  Activités: Trophy,
  'Voyages & Lieux': Plane,
  Objets: Lightbulb,
  Symboles: Hash,
  Drapeaux: Flag,
};

type EmojiItem =
  | { kind: 'unicode'; char: string }
  | { kind: 'custom'; id: string; name: string; url: string; insertText: string; server?: PickerServer };

interface Section {
  id: string;
  label: string;
  icon?: React.ReactNode;
  server?: PickerServer;
  items: EmojiItem[];
}

interface StickerSection {
  id: string;
  label: string;
  server?: PickerServer;
  items: ServerSticker[];
  empty?: boolean;
}

interface Props {
  tab: PanelTab;
  onTabChange: (t: PanelTab) => void;
  showGif: boolean;
  showSticker: boolean;
  search: string;
  onSearch: (v: string) => void;
  currentServerId: string | null;
  servers: PickerServer[];
  emojis: ServerEmoji[];
  stickers: ServerSticker[];
  recent: string[];
  favorites: FavoriteItem[];
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (f: FavoriteItem) => void;
  /** `custom` : emoji de serveur choisi (nom + image), pour ecrire son vrai jeton. */
  onPickEmoji: (insertText: string, custom?: { id: string; name: string; url: string }) => void;
  onPickSticker: (url: string, name: string) => void;
  onPickGif: (url: string, name: string) => void;
  gifs: GifEntry[];
  gifsLoading: boolean;
  gifsFetching: boolean;
  wave: string;
  searchPlaceholder?: string;
}

const COLS = 9;

/* Teinte de peau (main a droite de la recherche) : memorisee, appliquee aux emojis qui la gerent. */
const TONES = ['', '\u{1F3FB}', '\u{1F3FC}', '\u{1F3FD}', '\u{1F3FE}', '\u{1F3FF}'];
const TONE_KEY = 'picker:skin-tone';
const readTone = () => { try { return Math.min(5, Math.max(0, Number(localStorage.getItem(TONE_KEY)) || 0)); } catch { return 0; } };
const MODIFIABLE = /^\p{Emoji_Modifier_Base}\uFE0F?$/u;
const toned = (char: string, tone: number) => (tone > 0 && MODIFIABLE.test(char) ? char.replace(/\uFE0F/g, '') + TONES[tone] : char);
const aliases = (char: string) => {
  const k = getEmojiKeywords(char).slice(0, 4).map((x) => `:${x.replace(/\s+/g, '_')}:`);
  return k.length ? k.join(' ') : ':emoji:';
};

function ServerBadge({ server, size = 'w-8 h-8' }: { server: PickerServer; size?: string }) {
  return server.icon_url ? (
    <img src={server.icon_url} alt="" className={cn(size, 'rounded-lg object-cover')} />
  ) : (
    <span className={cn(size, 'rounded-lg bg-white/[0.08] flex items-center justify-center text-[11px] font-semibold text-foreground')}>
      {server.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

/*
 * Grille d'une section : boutons simples (aucun composant par case), clics / survols / clic droit geres une seule fois
 * par le conteneur via `data-k`. Memoisee : survoler une case ne redessine pas les ~2000 autres.
 */
const EmojiSectionGrid = memo(function EmojiSectionGrid({ sectionId, items, tone }: { sectionId: string; items: EmojiItem[]; tone: number }) {
  return (
    <div className="grid pb-1" style={{ gridTemplateColumns: `repeat(${COLS}, 48px)` }}>
      {items.map((it, i) => (
        <button key={i} type="button" data-k={`${sectionId}\u0000${i}`} className="w-12 h-12 rounded-lg flex items-center justify-center hover:bg-white/[0.09] active:bg-white/[0.14] transition-colors">
          {it.kind === 'unicode' ? <span className="text-[32px] leading-none pointer-events-none">{toned(it.char, tone)}</span> : <img src={it.url} alt={it.name} loading="lazy" decoding="async" width={36} height={36} draggable={false} className="w-9 h-9 object-contain pointer-events-none" />}
        </button>
      ))}
    </div>
  );
});

export function DiscordPickerPanel(p: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const [active, setActive] = useState<string>('');
  const [tone, setTone] = useState(readTone);
  const [toneOpen, setToneOpen] = useState(false);
  const [toneHover, setToneHover] = useState<number | null>(null);
  const chooseTone = (t: number) => { setTone(t); setToneOpen(false); try { localStorage.setItem(TONE_KEY, String(t)); } catch { /* stockage indisponible */ } };
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(['fav']));
  const [hover, setHover] = useState<{ title: string; sub?: string; node: React.ReactNode; server?: PickerServer } | null>(null);
  const deferredSearch = useDeferredValue(p.search);
  const q = deferredSearch.trim().toLowerCase().replace(/^:|:$/g, '');
  const toggle = (id: string) => setCollapsed((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const serverOf = useMemo(() => new Map(p.servers.map((s) => [s.id, s])), [p.servers]);
  const orderedServers = useMemo(
    () => [...p.servers].sort((a, b) => (a.id === p.currentServerId ? -1 : b.id === p.currentServerId ? 1 : 0)),
    [p.servers, p.currentServerId],
  );

  const favEmojis: EmojiItem[] = useMemo(
    () =>
      p.favorites.flatMap((f): EmojiItem[] =>
        f.kind === 'emoji-unicode' ? [{ kind: 'unicode', char: f.char }] : f.kind === 'emoji-custom' ? [{ kind: 'custom', id: f.id, name: f.name, url: f.url, insertText: f.insertText }] : [],
      ),
    [p.favorites],
  );

  const emojiSections: Section[] = useMemo(() => {
    const out: Section[] = [];
    const match = (name: string) => !q || name.toLowerCase().includes(q);
    if (!q) {
      if (favEmojis.length) out.push({ id: 'fav', label: 'Favoris', icon: <Star className="w-4 h-4" />, items: favEmojis });
      if (p.recent.length) out.push({ id: 'recent', label: 'Fréquemment utilisés', icon: <Clock className="w-4 h-4" />, items: p.recent.map((char) => ({ kind: 'unicode' as const, char })) });
    }
    for (const s of orderedServers) {
      const items = p.emojis.filter((e) => e.server_id === s.id && match(e.name)).map((e) => ({ kind: 'custom' as const, id: e.id, name: e.name, url: e.url, insertText: `:${e.name}:`, server: s }));
      if (items.length) out.push({ id: `srv:${s.id}`, label: s.name, server: s, items });
    }
    if (!q) {
      EMOJI_CATEGORIES.forEach((c) => out.push({ id: c.name, label: c.name, items: c.emojis.map((char) => ({ kind: 'unicode' as const, char })) }));
    } else {
      const seen = new Set<string>();
      const items: EmojiItem[] = [];
      EMOJI_CATEGORIES.forEach((c) => {
        const cat = c.name.toLowerCase().includes(q);
        c.emojis.forEach((char) => {
          if (seen.has(char)) return;
          if (cat || getEmojiKeywords(char).some((k) => k.includes(q))) { seen.add(char); items.push({ kind: 'unicode', char }); }
        });
      });
      if (items.length) out.push({ id: 'results', label: 'Résultats', items });
    }
    return out;
  }, [q, favEmojis, p.recent, p.emojis, orderedServers]);

  const stickerSections: StickerSection[] = useMemo(() => {
    const out: StickerSection[] = [];
    const match = (name: string) => !q || name.toLowerCase().includes(q);
    const favs = p.favorites.flatMap((f) => (f.kind === 'sticker' ? [{ id: f.id.replace(/^sticker-/, ''), name: f.name, url: f.url, description: null, server_id: '', created_at: null } as ServerSticker] : []));
    if (!q && favs.length) out.push({ id: 'fav', label: 'Favoris', items: favs });
    for (const s of orderedServers) {
      const items = p.stickers.filter((st) => st.server_id === s.id && match(st.name));
      if (items.length) out.push({ id: `srv:${s.id}`, label: s.name, server: s, items });
      else if (!q && s.id === p.currentServerId) out.push({ id: `srv:${s.id}`, label: s.name, server: s, items: [], empty: true });
    }
    return out;
  }, [q, p.favorites, p.stickers, orderedServers, p.currentServerId]);

  const sections = p.tab === 'sticker' ? stickerSections : emojiSections;

  // Delegation : une seule paire de gestionnaires pour toutes les cases.
  const itemAt = (k: string | undefined): EmojiItem | null => {
    if (!k) return null;
    const [sid, idx] = k.split('\u0000');
    return emojiSections.find((x) => x.id === sid)?.items[Number(idx)] ?? null;
  };
  const keyOf = (t: EventTarget) => (t as HTMLElement).closest?.('button[data-k]')?.getAttribute('data-k') ?? undefined;
  const textOf = (it: EmojiItem) => (it.kind === 'unicode' ? toned(it.char, tone) : it.insertText);
  const pickItem = (it: EmojiItem) => (it.kind === 'unicode' ? p.onPickEmoji(toned(it.char, tone)) : p.onPickEmoji(it.insertText, { id: it.id, name: it.name, url: it.url }));
  const lastHover = useRef<string | undefined>();
  // Ouverture rapide : les premieres sections s'affichent tout de suite, les ~1900 emojis suivants juste apres.
  const [fullRender, setFullRender] = useState(false);
  useEffect(() => {
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const id = idle ? idle(() => setFullRender(true), { timeout: 250 }) : window.setTimeout(() => setFullRender(true), 120);
    return () => ((window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback?.(id), window.clearTimeout(id));
  }, []);
  const [ctxItem, setCtxItem] = useState<EmojiItem | null>(null);

  // Rail : une entree par section, section active suivie au defilement.
  const rail = useMemo(() => {
    const list: { id: string; label: string; node: React.ReactNode }[] = [];
    for (const s of sections) {
      const node = s.id === 'fav' ? <Star className="w-5 h-5" /> : s.id === 'recent' ? <Clock className="w-5 h-5" /> : 'server' in s && s.server ? <ServerBadge server={s.server} /> : (() => { const I = CAT_ICON[s.id] ?? Smile; return <I className="w-5 h-5" />; })();
      list.push({ id: s.id, label: s.label, node });
    }
    return list;
  }, [sections]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const on = () => {
      const top = el.getBoundingClientRect().top;
      let cur = sections[0]?.id ?? '';
      for (const s of sections) {
        const n = refs.current[s.id];
        if (n && n.getBoundingClientRect().top - top <= 24) cur = s.id; else if (n) break;
      }
      setActive(cur);
    };
    on();
    el.addEventListener('scroll', on, { passive: true });
    return () => el.removeEventListener('scroll', on);
  }, [sections, p.tab]);

  const jump = (id: string) => {
    setCollapsed((s) => { if (!s.has(id)) return s; const n = new Set(s); n.delete(id); return n; });
    requestAnimationFrame(() => { const n = refs.current[id]; if (n && scrollRef.current) scrollRef.current.scrollTo({ top: n.offsetTop - 4, behavior: 'smooth' }); });
  };

  const copy = (text: string, label: string) => { void copyToClipboard(text).then((ok) => ok && toast.success(label)); };

  const setHoverEmoji = (it: EmojiItem) =>
    setHover(
      it.kind === 'unicode'
        ? { title: aliases(it.char), node: <span className="text-[32px] leading-none">{it.char}</span> }
        : { title: `:${it.name}:`, sub: it.server ? `de ${it.server.name}` : undefined, server: it.server, node: <img src={it.url} alt="" className="w-9 h-9 object-contain" /> },
    );

  const firstEmoji = emojiSections[0]?.items[0];
  const footer = (() => {
    if (p.tab === 'gif') return null;
    if (hover) return hover;
    if (p.tab === 'emoji' && firstEmoji) {
      return firstEmoji.kind === 'unicode'
        ? { title: aliases(firstEmoji.char), node: <span className="text-[32px] leading-none">{toned(firstEmoji.char, tone)}</span>, sub: undefined, server: undefined }
        : { title: `:${firstEmoji.name}:`, sub: firstEmoji.server ? `de ${firstEmoji.server.name}` : undefined, server: firstEmoji.server, node: <img src={firstEmoji.url} alt="" className="w-9 h-9 object-contain" /> };
    }
    const st = stickerSections.find((x) => x.items.length)?.items[0];
    if (p.tab === 'sticker' && st) {
      const sv = serverOf.get(st.server_id);
      return { title: st.name, sub: sv ? `de ${sv.name}` : undefined, server: sv, node: <img src={st.url} alt="" className="w-9 h-9 object-contain" /> };
    }
    return null;
  })();

  const empty = sections.length === 0 || sections.every((s) => s.items.length === 0 && !('empty' in s && s.empty));

  const header = (s: { id: string; label: string; icon?: React.ReactNode; server?: PickerServer }) => (
    <button type="button" onClick={() => toggle(s.id)} className="sticky top-0 z-[1] w-full flex items-center gap-2 px-1 py-2 bg-popover text-left text-sm font-semibold text-foreground">
      {s.id === 'fav' ? <Star className="w-4 h-4" /> : s.id === 'recent' ? <Clock className="w-4 h-4" /> : s.server ? <ServerBadge server={s.server} size="w-4 h-4" /> : null}
      <span className="truncate" translate={s.server ? 'no' : undefined}>{s.label}</span>
      {collapsed.has(s.id) ? <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
    </button>
  );

  return (
    <div className="flex flex-col h-[485px]">
      {/* Onglets */}
      {(p.showGif || p.showSticker) && (
        <div role="tablist" className="flex items-center gap-1 px-3 pt-3 shrink-0">
          {([['gif', 'GIF', p.showGif], ['sticker', 'Autocollants', p.showSticker], ['emoji', 'Émoji', true]] as const).filter((t) => t[2]).map(([t, label]) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={p.tab === t}
              onClick={() => { p.onTabChange(t); p.onSearch(''); }}
              className={cn('h-8 px-3.5 rounded-md text-sm font-medium transition-colors', p.tab === t ? 'bg-white/[0.1] text-white' : 'text-[hsl(var(--muted-foreground))] hover:bg-white/[0.06] hover:text-white')}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Recherche (l'onglet GIF a la sienne) */}
      {p.tab !== 'gif' && (
      <div className="flex items-center gap-3 p-3 shrink-0">
        <label className="flex-1 min-w-0 flex items-center gap-2 h-10 px-3 rounded-lg bg-[hsl(var(--background))]/70 border-2 border-transparent focus-within:border-primary transition-colors">
          <SearchIcon className="w-5 h-5 text-[hsl(var(--header-icon))] shrink-0" />
          <input
            autoFocus
            value={p.search}
            onChange={(e) => p.onSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              const first = emojiSections.find((x) => x.items.length)?.items[0];
              if (p.tab === 'emoji' && first) { if (first.kind === 'unicode') p.onPickEmoji(toned(first.char, tone)); else p.onPickEmoji(first.insertText, { id: first.id, name: first.name, url: first.url }); }
              else if (p.tab === 'sticker') { const st = stickerSections.find((x) => x.items.length)?.items[0]; if (st) p.onPickSticker(st.url, st.name); }
            }}
            placeholder={p.tab === 'emoji' ? (p.searchPlaceholder ?? "Trouve l'émoji parfait") : "Trouver l'autocollant parfait"}
            aria-label="Rechercher"
            className="flex-1 min-w-0 bg-transparent outline-none text-base text-foreground placeholder:text-[hsl(var(--text-placeholder))]"
          />
          {p.search && (
            <button type="button" aria-label="Effacer la recherche" onClick={() => p.onSearch('')} className="w-5 h-5 rounded-full bg-white/[0.15] hover:bg-white/25 flex items-center justify-center text-white shrink-0">
              <XIcon className="w-3 h-3" />
            </button>
          )}
        </label>
        {p.tab === 'emoji' && (
          <>
            <div className="relative shrink-0">
              <button
                type="button"
                aria-label="Teinte de peau"
                onClick={() => setToneOpen((o) => !o)}
                onMouseEnter={() => setToneHover(Math.floor(Math.random() * 6))}
                onMouseLeave={() => setToneHover(null)}
                className="w-10 h-10 rounded-lg hover:bg-white/[0.07] text-[28px] leading-none flex items-center justify-center"
              >
                {toned('\u{1F44F}', toneHover ?? tone)}
              </button>
              {toneOpen && (
                <div className="absolute right-0 top-11 z-20 flex flex-col gap-0.5 p-1 rounded-lg bg-popover border border-white/[0.08] shadow-[0_8px_16px_rgba(0,0,0,0.24)]">
                  {TONES.map((_, i) => (
                    <button key={i} type="button" onClick={() => chooseTone(i)} aria-label={`Teinte ${i}`} className={cn('w-9 h-9 rounded-md text-[24px] leading-none flex items-center justify-center hover:bg-white/[0.09]', tone === i && 'bg-white/[0.12]')}>
                      {toned('\u{1F44F}', i)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" aria-disabled className="h-10 px-4 rounded-lg bg-white/[0.07] text-sm font-medium text-white shrink-0 cursor-default">Ajouter l'émoji</button>
              </TooltipTrigger>
              <TooltipContent side="top">Ajouter l'émoji — Bientôt disponible</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
      )}
      {p.tab !== 'gif' && <div className="h-px bg-white/[0.07] shrink-0" />}

      {p.tab === 'gif' ? (
        <GifPanel favorites={p.favorites} isFavorite={p.isFavorite} onToggleFavorite={p.onToggleFavorite} onPick={p.onPickGif} />
      ) : (
        <div className="flex flex-1 min-h-0">
          <nav aria-label="Catégories" className="w-[54px] shrink-0 overflow-y-auto scrollbar-none flex flex-col items-center gap-1 py-2">
            {rail.map((r) => {
              const on = active === r.id;
              return (
                <Tooltip key={r.id}>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label={r.label} onClick={() => jump(r.id)} className={cn('relative w-10 h-10 shrink-0 rounded-lg flex items-center justify-center transition-colors', on ? 'bg-white/[0.1] text-white' : 'text-[hsl(var(--header-icon))] hover:bg-white/[0.07] hover:text-white')}>
                      {on && <span className="absolute -left-2 w-1 h-5 rounded-r-full bg-white" />}
                      {r.node}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{r.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </nav>
          <ContextMenu onOpenChange={(o) => !o && setCtxItem(null)}>
          <ContextMenuTrigger asChild disabled={p.tab !== 'emoji'}>
          <div
            ref={scrollRef}
            className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar"
            onWheel={(e) => e.stopPropagation()}
            onClick={p.tab === 'emoji' ? (e) => { const it = itemAt(keyOf(e.target)); if (!it) return; if (e.altKey) p.onToggleFavorite(it.kind === 'unicode' ? { kind: 'emoji-unicode', id: `emoji-${it.char}`, char: it.char } : { kind: 'emoji-custom', id: `emoji-custom-${it.id}`, name: it.name, url: it.url, insertText: it.insertText }); else pickItem(it); } : undefined}
            onMouseOver={p.tab === 'emoji' ? (e) => { const k = keyOf(e.target); if (!k || k === lastHover.current) return; lastHover.current = k; const it = itemAt(k); if (it) setHoverEmoji(it.kind === 'unicode' ? { kind: 'unicode', char: toned(it.char, tone) } : it); } : undefined}
            onContextMenu={p.tab === 'emoji' ? (e) => { const it = itemAt(keyOf(e.target)); if (!it) { e.preventDefault(); e.stopPropagation(); return; } setCtxItem(it); } : undefined}
          >
            {empty ? (
              <div className="h-full flex items-center justify-center text-center px-6 text-sm text-[hsl(var(--muted-foreground))]">
                {p.tab === 'emoji' ? 'Aucun émoji ne correspond à ta recherche' : 'Aucun autocollant ne correspond à ta recherche'}
              </div>
            ) : p.tab === 'emoji' ? (
              emojiSections.map((s, si) => {
                const rows = Math.ceil(s.items.length / COLS);
                const deferred = !fullRender && si >= 3;
                return (
                  <div key={s.id} ref={(n) => { refs.current[s.id] = n; }} style={{ contentVisibility: 'auto', containIntrinsicSize: `auto ${rows * 48 + 36}px` }}>
                    {header(s)}
                    {!collapsed.has(s.id) && (deferred ? <div style={{ height: rows * 48 + 4 }} /> : <EmojiSectionGrid sectionId={s.id} items={s.items} tone={tone} />)}
                  </div>
                );
              })
            ) : (
              stickerSections.map((s) => (
                <div key={s.id} ref={(n) => { refs.current[s.id] = n; }}>
                  {header(s)}
                  {!collapsed.has(s.id) && (s.empty ? (
                    <div className="mb-2 flex items-center gap-3 rounded-lg bg-white/[0.04] px-3 py-3 text-sm text-[hsl(var(--muted-foreground))]">
                      <StickerIcon className="w-6 h-6 shrink-0" />
                      <span>Ton serveur attend que tu viennes uploader des autocollants !</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-1 pb-1">
                      {s.items.map((st) => (
                        <ContextMenu key={st.id}>
                          <ContextMenuTrigger asChild>
                            <button
                              type="button"
                              onMouseEnter={() => setHover({ title: st.name, sub: serverOf.get(st.server_id) ? `de ${serverOf.get(st.server_id)!.name}` : undefined, server: serverOf.get(st.server_id), node: <img src={st.url} alt="" className="w-9 h-9 object-contain" /> })}
                              onClick={() => p.onPickSticker(st.url, st.name)}
                              className="aspect-square rounded-lg flex items-center justify-center hover:bg-white/[0.09] transition-colors p-1.5"
                            >
                              <img src={st.url} alt={st.name} loading="lazy" className="w-full h-full object-contain" />
                            </button>
                          </ContextMenuTrigger>
                          <ContextMenuContent className="w-[260px] p-2 rounded-lg bg-popover">
                            <ContextMenuItem className="h-8 px-2 text-sm rounded-[4px]" onSelect={() => p.onToggleFavorite({ kind: 'sticker', id: `sticker-${st.id}`, name: st.name, url: st.url })}>
                              {p.isFavorite(`sticker-${st.id}`) ? "Retirer l'autocollant des favoris" : "Ajouter l'autocollant aux favoris"}
                            </ContextMenuItem>
                            <ContextMenuItem className="h-8 px-2 text-sm rounded-[4px]" onSelect={() => copy(st.id, 'Identifiant copié.')}>Copier l'identifiant de l'autocollant</ContextMenuItem>
                            <ContextMenuItem className="h-8 px-2 text-sm rounded-[4px]" onSelect={() => copy(st.url, "Lien copié.")}>Copier le lien de l'image de l'autocollant</ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      ))}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
          </ContextMenuTrigger>
          {ctxItem && (
            <ContextMenuContent className="w-[230px] p-2 rounded-lg bg-popover">
              {(() => {
                const it = ctxItem;
                const fid = it.kind === 'unicode' ? `emoji-${it.char}` : `emoji-custom-${it.id}`;
                return (
                  <>
                    <ContextMenuItem className="h-8 px-2 text-sm rounded-[4px]" onSelect={() => p.onToggleFavorite(it.kind === 'unicode' ? { kind: 'emoji-unicode', id: fid, char: it.char } : { kind: 'emoji-custom', id: fid, name: it.name, url: it.url, insertText: it.insertText })}>
                      {p.isFavorite(fid) ? "Retirer l'émoji des favoris" : "Ajouter l'émoji aux favoris"}
                    </ContextMenuItem>
                    <ContextMenuItem className="h-8 px-2 text-sm rounded-[4px]" onSelect={() => copy(textOf(it), "Émoji copié.")}>Copier l'émoji</ContextMenuItem>
                  </>
                );
              })()}
            </ContextMenuContent>
          )}
          </ContextMenu>
        </div>
      )}

      {/* Pied : element survole */}
      {p.tab !== 'gif' && (
        <div className="h-14 shrink-0 flex items-center bg-black/[0.12] border-t border-white/[0.07]">
          <div className="w-[54px] shrink-0 flex items-center justify-center text-[hsl(var(--header-icon))]">
            {p.tab === 'emoji' ? <Smile className="w-6 h-6" /> : <StickerIcon className="w-6 h-6" />}
          </div>
          {footer && (
            <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
              <span className="w-10 h-10 shrink-0 flex items-center justify-center">{footer.node}</span>
              <div className="min-w-0 flex-1">
                <p translate="no" className="text-base font-semibold text-foreground truncate leading-5" title={footer.title}>{footer.title}</p>
                {footer.sub && <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">de <span className="font-semibold">{footer.sub.replace(/^de /, '')}</span></p>}
              </div>
              {footer.server && <ServerBadge server={footer.server} size="w-8 h-8" />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
