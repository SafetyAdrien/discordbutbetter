import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpDown, Loader2, Paperclip } from 'lucide-react';
import { Check, Hash, Search, SlidersHorizontal, Trash2, X, AtSign, User as UserIcon, CalendarDays, Pin } from '@/components/icons/discord/lucide';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserAvatarImage } from '@/components/ui/user-avatar-image';
import { cn } from '@/lib/utils';
import { useGlobalSearch, type SearchFilters as SearchFiltersType, type SearchResult } from '@/hooks/useGlobalSearch';
import { MarkdownText, MarkdownProvider } from '@/lib/markdown';
import {
  AUTHOR_OPTIONS,
  HAS_OPTIONS,
  activeToken,
  completeToken,
  countFilters,
  parseSearch,
  serializeSearch,
  type ParsedSearch,
  type SearchPrefix,
} from '@/lib/searchQuery';
import { SearchFiltersModal } from './SearchFiltersModal';
import { AUTHOR_ICONS, HAS_ICONS, channelTypeIcon } from './searchIcons';
import { StreamlineHash } from '@/components/icons/StreamlineHash';

import { appLocale } from '@/i18n/locale';
import { userKey } from '@/lib/userScope';
/*
 * Recherche de messages du serveur, retro-ingenieree depuis la video de
 * reference (Discord 2025) :
 *  - barre "Rechercher <serveur>" dont les jetons (de:, dans:, contient:...)
 *    s'affichent en pastilles ; une croix remplace la loupe des qu'il y a
 *    du texte ;
 *  - menu sous la barre (fondu + legere mise a l'echelle) : "Filtres",
 *    "Historique", puis les sous-menus contextuels quand on tape un prefixe
 *    ("De l'utilisateur", "Dans le salon", "Message contenant"...) ; navigation
 *    aux fleches et a Entree ;
 *  - panneau de resultats a la place de la liste des membres : statut,
 *    "Filtres (N)", "Trier", resultats groupes par salon ;
 *  - fenetre "Filtres" (SearchFiltersModal) qui relit et reecrit la barre.
 *
 * Le texte de la barre est la seule source de verite (voir lib/searchQuery).
 */

interface MemberLite {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
}

interface ChannelLite {
  id: string;
  name: string;
  type: string;
}

interface MessageSearchPanelProps {
  serverId: string | null;
  serverName?: string;
  channels: ChannelLite[];
  members: MemberLite[];
  onClose: () => void;
  onNavigateToMessage?: (channelId: string, messageId: string) => void;
  variant?: 'popover' | 'panel';
  onSubmittedChange?: (label: string | null) => void;
  initialQuery?: string;
  /** Recherche lancee depuis le menu : le parent remonte le panneau avec. */
  onPopoverSubmit?: (s: { label: string; filters: SearchFiltersType }) => void;
  initialSubmit?: { label: string; filters: SearchFiltersType } | null;
}

const HISTORY_MAX = 8;
const historyKey = (serverId: string | null) => `msg-search-history:${serverId ?? 'global'}`;

function loadHistory(serverId: string | null): string[] {
  try {
    const arr = JSON.parse(localStorage.getItem(userKey(historyKey(serverId))) ?? '[]');
    return Array.isArray(arr) ? arr.filter((s) => typeof s === 'string').slice(0, HISTORY_MAX) : [];
  } catch {
    return [];
  }
}

function saveHistory(serverId: string | null, items: string[]) {
  try {
    localStorage.setItem(userKey(historyKey(serverId)), JSON.stringify(items));
  } catch {
    /* stockage indisponible */
  }
}

const FILTER_ROWS: { prefix: SearchPrefix; icon: React.ElementType; label: string; hint: string }[] = [
  { prefix: 'de', icon: UserIcon, label: "D'un utilisateur spécifique", hint: 'utilisateur' },
  { prefix: 'dans', icon: Hash, label: 'Envoyé dans un salon spécifique', hint: 'salon' },
  { prefix: 'contient', icon: Paperclip, label: 'Comprend un type de données spécifique', hint: 'lien, intégration ou fichier' },
  { prefix: 'mentions', icon: AtSign, label: 'Mentionne un utilisateur spécifique', hint: 'utilisateur' },
];

const SUBMENU_TITLE: Partial<Record<SearchPrefix, string>> = {
  de: "De l'utilisateur",
  mentions: "Mentionne l'utilisateur",
  dans: 'Dans le salon',
  contient: 'Message contenant',
  auteur: "Type d'auteur",
  'épinglé': 'Épinglé',
  avant: 'Date',
  'après': 'Date',
  pendant: 'Date',
};

const TOKEN_SPLIT_RE = /((?:^|\s)[a-zéè]+:\s?(?:"[^"]*"|[^\s"]+)?)/gi;
const KNOWN_PREFIX_RE = /^\s?(de|dans|contient|mentions|avant|pendant|après|apres|auteur|épinglé|epingle|from|in|has|before|after|during|author|pinned):/i;

interface MenuItem {
  key: string;
  onSelect: () => void;
  node: React.ReactNode;
}

function MemberAvatar({ m, size = 5 }: { m: MemberLite; size?: 4 | 5 | 6 }) {
  const cls = size === 4 ? 'w-4 h-4' : size === 6 ? 'w-6 h-6' : 'w-5 h-5';
  return m.avatar ? (
    <UserAvatarImage src={m.avatar} alt={m.displayName} ownerId={m.id} className={cn(cls, 'rounded-full')} />
  ) : (
    <Avatar className={cls}>
      <AvatarFallback className="text-[8px]">{m.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

export function MessageSearchPanel({
  serverId,
  serverName,
  channels,
  members,
  onClose,
  onNavigateToMessage,
  variant = 'panel',
  onSubmittedChange,
  initialQuery = '',
  onPopoverSubmit,
  initialSubmit = null,
}: MessageSearchPanelProps) {
  const [query, setQuery] = useState(initialSubmit?.label ?? initialQuery);
  const [submitted, setSubmitted] = useState<string | null>(initialSubmit?.label ?? null);
  const [menuOpen, setMenuOpen] = useState(variant === 'popover');
  const [activeIdx, setActiveIdx] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [history, setHistory] = useState<string[]>(() => loadHistory(serverId));
  const inputRef = useRef<HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const search = useGlobalSearch(serverId);

  const memberByName = useMemo(() => {
    const m = new Map<string, MemberLite>();
    members.forEach((u) => m.set(u.username.toLowerCase(), u));
    return m;
  }, [members]);
  const channelByName = useMemo(() => {
    const m = new Map<string, ChannelLite>();
    channels.forEach((c) => m.set(c.name.toLowerCase(), c));
    return m;
  }, [channels]);
  const channelMap = useMemo(() => new Map(channels.map((c) => [c.id, c])), [channels]);

  /** Traduit la barre en filtres du moteur (noms -> identifiants). */
  const toEngine = (q: string, order: 'newest' | 'oldest'): { query: string; filters: SearchFiltersType } => {
    const p = parseSearch(q);
    const resolve = <T,>(names: string[], map: Map<string, T>) => names.map((n) => map.get(n.toLowerCase())).filter(Boolean) as T[];
    const fromM = resolve(p.from, memberByName);
    const inC = resolve(p.in, channelByName);
    const menM = resolve(p.mentions, memberByName);
    const filters: SearchFiltersType = {
      contains: p.text || undefined,
      fromIds: fromM.length ? fromM.map((m) => m.id) : undefined,
      // Nom inconnu : on garde le filtre texte du moteur plutot que de l'ignorer.
      from: !fromM.length && p.from[0] ? p.from[0] : undefined,
      channelIds: inC.length ? inC.map((c) => c.id) : undefined,
      channel: !inC.length && p.in[0] ? p.in[0] : undefined,
      mentionIds: menM.length ? menM.map((m) => m.id) : undefined,
      has: p.has.length ? p.has : undefined,
      authorTypes: p.authors.length ? p.authors : undefined,
      pinned: p.pinned ?? undefined,
      sort: order,
    };
    for (const d of p.dates) {
      if (d.mode === 'before') filters.before = d.date;
      else if (d.mode === 'after') filters.after = d.date;
      else filters.during = d.date;
    }
    return { query: p.text, filters };
  };

  const submit = (raw: string, order = sort) => {
    const q = raw.trim();
    if (!q) return;
    const engine = toEngine(q, order);
    setQuery(`${q} `);
    setSubmitted(q);
    setMenuOpen(false);
    onSubmittedChange?.(q);
    search.mutate(engine);
    setHistory((prev) => {
      const next = [q, ...prev.filter((h) => h !== q)].slice(0, HISTORY_MAX);
      saveHistory(serverId, next);
      return next;
    });
    if (variant === 'popover') onPopoverSubmit?.({ label: q, filters: engine.filters });
  };

  // Panneau remonte avec une recherche lancee depuis le menu.
  const didRehydrate = useRef(false);
  useEffect(() => {
    if (didRehydrate.current || !initialSubmit) return;
    didRehydrate.current = true;
    search.mutate(toEngine(initialSubmit.label, sort));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focusEnd = () =>
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });

  const insertPrefix = (prefix: SearchPrefix) => {
    setQuery((q) => `${q && !q.endsWith(' ') ? `${q} ` : q}${prefix}: `);
    setMenuOpen(true);
    focusEnd();
  };

  const token = activeToken(query);
  const parsed = parseSearch(query);

  // ---- Elements du menu (navigation clavier sur une liste a plat) ----
  const items: MenuItem[] = [];
  let menuTitle: string | null = null;
  if (token && SUBMENU_TITLE[token.prefix]) {
    menuTitle = SUBMENU_TITLE[token.prefix]!;
    const f = token.partial.toLowerCase();
    const pick = (value: string) => {
      const next = completeToken(query, token.prefix, value);
      // Comme Discord, choisir une suggestion lance la recherche.
      submit(next);
    };
    if (token.prefix === 'de' || token.prefix === 'mentions') {
      members
        .filter((m) => !f || m.username.toLowerCase().includes(f) || m.displayName.toLowerCase().includes(f))
        .slice(0, 25)
        .forEach((m) =>
          items.push({
            key: m.id,
            onSelect: () => pick(m.username),
            node: (
              <>
                <MemberAvatar m={m} />
                <span translate="no" className="text-sm font-semibold text-white truncate">{m.displayName}</span>
                <span translate="no" className="text-sm text-muted-foreground truncate">{m.username}</span>
              </>
            ),
          }),
        );
    } else if (token.prefix === 'dans') {
      channels
        .filter((c) => !f || c.name.toLowerCase().includes(f))
        .forEach((c) => {
          const Icon = channelTypeIcon[c.type] ?? StreamlineHash;
          items.push({
            key: c.id,
            onSelect: () => pick(c.name),
            node: (
              <>
                <Icon className="w-4 h-4 shrink-0 text-[hsl(var(--icon-default))]" />
                <span translate="no" className="text-sm font-medium text-white truncate">{c.name}</span>
              </>
            ),
          });
        });
    } else if (token.prefix === 'contient') {
      HAS_OPTIONS.filter((o) => !f || o.label.includes(f)).forEach((o) => {
        const Icon = HAS_ICONS[o.value];
        items.push({
          key: o.value,
          onSelect: () => pick(o.label),
          node: (
            <>
              <Icon className="w-4 h-4 shrink-0 text-[hsl(var(--icon-default))]" />
              <span className="text-sm font-medium text-white">{o.label}</span>
            </>
          ),
        });
      });
    } else if (token.prefix === 'auteur') {
      AUTHOR_OPTIONS.filter((o) => !f || o.label.includes(f)).forEach((o) => {
        const Icon = AUTHOR_ICONS[o.value];
        items.push({
          key: o.value,
          onSelect: () => pick(o.label),
          node: (
            <>
              <Icon className="w-4 h-4 shrink-0 text-[hsl(var(--icon-default))]" />
              <span className="text-sm font-medium text-white">{o.label}</span>
            </>
          ),
        });
      });
    } else if (token.prefix === 'épinglé') {
      ['true', 'false'].forEach((v) =>
        items.push({
          key: v,
          onSelect: () => pick(v),
          node: (
            <>
              <Pin className="w-4 h-4 shrink-0 text-[hsl(var(--icon-default))]" />
              <span className="text-sm font-medium text-white">{v}</span>
            </>
          ),
        }),
      );
    } else {
      const day = (offset: number) => new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);
      [
        { label: "Aujourd'hui", value: day(0) },
        { label: 'Hier', value: day(1) },
        { label: 'Il y a une semaine', value: day(7) },
      ].forEach((d) =>
        items.push({
          key: d.value,
          onSelect: () => pick(d.value),
          node: (
            <>
              <CalendarDays className="w-4 h-4 shrink-0 text-[hsl(var(--icon-default))]" />
              <span className="text-sm font-medium text-white">{d.label}</span>
              <span className="text-sm text-muted-foreground">{d.value}</span>
            </>
          ),
        }),
      );
    }
  } else {
    if (query.trim()) {
      items.push({
        key: '__search',
        onSelect: () => submit(query),
        node: (
          <>
            <Search className="w-5 h-5 shrink-0 text-[hsl(var(--icon-default))]" />
            <span className="text-sm text-muted-foreground shrink-0">Rechercher :</span>
            <span className="min-w-0 truncate"><QueryPills text={query.trim()} members={memberByName} /></span>
          </>
        ),
      });
    }
    FILTER_ROWS.forEach((r) =>
      items.push({
        key: r.prefix,
        onSelect: () => insertPrefix(r.prefix),
        node: <FilterRow icon={r.icon} label={r.label} prefix={`${r.prefix}:`} hint={r.hint} />,
      }),
    );
    items.push({
      key: '__more',
      onSelect: () => setFiltersOpen(true),
      node: <FilterRow icon={SlidersHorizontal} label="Plus de filtres" hint="dates, type d'auteur et plus" />,
    });
    if (!query.trim()) {
      history.forEach((h) =>
        items.push({
          key: `h:${h}`,
          onSelect: () => submit(h),
          node: (
            <>
              <Search className="w-4 h-4 shrink-0 text-[hsl(var(--icon-default))]" />
              <span className="flex-1 min-w-0 truncate"><QueryPills text={h} members={memberByName} /></span>
              <button
                type="button"
                aria-label="Retirer de l'historique"
                onClick={(e) => {
                  e.stopPropagation();
                  const next = history.filter((x) => x !== h);
                  setHistory(next);
                  saveHistory(serverId, next);
                }}
                className="opacity-0 group-hover:opacity-100 text-[hsl(var(--icon-default))] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ),
        }),
      );
    }
  }

  useEffect(() => setActiveIdx(0), [menuTitle, query]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setMenuOpen(true);
      if (!items.length) return;
      setActiveIdx((i) => (e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = menuOpen ? items[activeIdx] : undefined;
      if (item && item.key !== '__search') item.onSelect();
      else submit(query);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      if (menuOpen && variant === 'panel') setMenuOpen(false);
      else onClose();
    }
  };

  const syncScroll = () => {
    if (mirrorRef.current && inputRef.current) mirrorRef.current.scrollLeft = inputRef.current.scrollLeft;
  };

  const clear = () => {
    setQuery('');
    if (variant === 'popover' || submitted) onClose();
    else focusEnd();
  };

  // ---- Barre de recherche ----
  const bar = (
    <div className="relative flex-1 min-w-0 h-8 rounded-lg bg-[hsl(var(--search-background))] border border-white/[0.06] focus-within:border-white/[0.12]">
      <div
        ref={mirrorRef}
        aria-hidden
        className="absolute inset-y-0 left-0 right-8 pl-2.5 flex items-center overflow-hidden whitespace-pre text-sm text-foreground pointer-events-none"
      >
        <QueryPills text={query} raw />
      </div>
      <input
        ref={inputRef}
        autoFocus={variant === 'popover'}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setMenuOpen(true);
          requestAnimationFrame(syncScroll);
        }}
        onFocus={() => setMenuOpen(true)}
        // Panneau : un clic hors de la barre et du menu ferme le menu (le menu
        // empeche la perte de focus sur mousedown). En superposition, c'est
        // le parent qui ferme tout au clic exterieur.
        onBlur={() => variant === 'panel' && setMenuOpen(false)}
        onKeyDown={onKeyDown}
        onScroll={syncScroll}
        onKeyUp={syncScroll}
        placeholder={serverName ? `Rechercher ${serverName}` : 'Rechercher'}
        aria-label="Rechercher des messages"
        className="absolute inset-0 w-full pl-2.5 pr-8 bg-transparent text-sm text-transparent caret-white placeholder:text-[hsl(var(--header-icon))] outline-none selection:bg-primary/60 selection:text-white"
      />
      {query ? (
        <button type="button" aria-label="Effacer la recherche" onClick={clear} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-[hsl(var(--icon-default))] hover:text-white">
          <X className="w-5 h-5" />
        </button>
      ) : (
        <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[hsl(var(--icon-default))] pointer-events-none" />
      )}
    </div>
  );

  // ---- Menu ----
  const historyStart = items.findIndex((i) => i.key.startsWith('h:'));
  const filtersStart = items.findIndex((i) => FILTER_ROWS.some((r) => r.prefix === i.key));
  const menu = menuOpen && (items.length > 0 || menuTitle) && (
    <div
      role="listbox"
      onMouseDown={(e) => e.preventDefault()}
      className="absolute right-0 top-[calc(100%+12px)] z-50 w-[400px] max-w-[calc(100vw-24px)] max-h-[70vh] overflow-y-auto scrollbar-thin p-2 rounded-lg bg-[hsl(var(--input))] border border-white/[0.06] shadow-[0_8px_24px_rgba(0,0,0,0.4)] origin-top-right animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-100"
    >
      {menuTitle && <p className="px-2 pt-1 pb-1.5 text-xs font-semibold text-muted-foreground">{menuTitle}</p>}
      {menuTitle && items.length === 0 && <p className="px-2 py-3 text-sm text-muted-foreground">Aucun résultat</p>}
      {items.map((item, i) => (
        <div key={item.key}>
          {i === filtersStart && <p className="px-2 pt-1 pb-1.5 text-xs font-semibold text-muted-foreground">Filtres</p>}
          {i === historyStart && (
            <div className="mt-2 pt-2 border-t border-border flex items-center justify-between px-2 pb-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Historique</span>
              <button
                type="button"
                aria-label="Effacer l'historique"
                onClick={() => {
                  setHistory([]);
                  saveHistory(serverId, []);
                }}
                className="text-[hsl(var(--icon-default))] hover:text-white"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
          <div
            role="option"
            aria-selected={i === activeIdx}
            onMouseEnter={() => setActiveIdx(i)}
            onClick={item.onSelect}
            className={cn(
              'group flex items-center gap-2.5 px-2 rounded cursor-pointer min-h-8',
              item.key === '__more' || FILTER_ROWS.some((r) => r.prefix === item.key) ? 'py-1.5' : 'py-1',
              i === activeIdx ? 'bg-[hsl(var(--interactive-background-selected))]' : '',
            )}
          >
            {item.node}
          </div>
        </div>
      ))}
    </div>
  );

  const filtersModal = (
    <SearchFiltersModal
      open={filtersOpen}
      onOpenChange={setFiltersOpen}
      initial={parseSearch(submitted ?? query)}
      members={members}
      channels={channels}
      onApply={(v: ParsedSearch) => submit(serializeSearch(v))}
    />
  );

  if (variant === 'popover') {
    return (
      <>
        <div className="relative w-full h-8 flex">
          {bar}
          {menu}
        </div>
        {filtersModal}
      </>
    );
  }

  // ---- Panneau de resultats ----
  const results = (search.data ?? []) as (SearchResult & { channel: { id: string; name: string; type: string | null } | null })[];
  const loading = search.isPending;
  const activeFilters = countFilters(parseSearch(submitted ?? ''));
  const term = parseSearch(submitted ?? '').text;

  return (
    <div className="w-full sm:w-[420px] bg-background flex flex-col h-full animate-in fade-in-0 duration-150">
      <div className="h-12 px-3 flex items-center gap-3 shrink-0 border-b border-border">
        <div className="relative flex-1 min-w-0 h-8 flex">
          {bar}
          {menu}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col sm:border-l sm:border-border">
        <div className="h-14 px-4 flex items-center gap-2 shrink-0">
          <p className="flex items-center gap-2 text-base font-medium text-white truncate">
            {loading ? (
              <>
                Recherche en cours…
                <Loader2 className="w-4 h-4 animate-spin text-[hsl(var(--icon-default))]" />
              </>
            ) : results.length > 0 ? (
              `${results.length} résultat${results.length > 1 ? 's' : ''}`
            ) : (
              'Aucun résultat'
            )}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg bg-[hsl(var(--button-secondary))] text-sm font-medium text-white hover:bg-[hsl(var(--interactive-background-selected))] transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtres{activeFilters > 0 ? ` (${activeFilters})` : ''}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg bg-[hsl(var(--button-secondary))] text-sm font-medium text-white hover:bg-[hsl(var(--interactive-background-selected))] transition-colors"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  Trier
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(
                  [
                    { v: 'newest', l: 'Plus récents' },
                    { v: 'oldest', l: 'Plus anciens' },
                  ] as const
                ).map((o) => (
                  <DropdownMenuItem
                    key={o.v}
                    onClick={() => {
                      setSort(o.v);
                      if (submitted) submit(submitted, o.v);
                    }}
                  >
                    <span className="flex-1">{o.l}</span>
                    {sort === o.v && <Check className="w-4 h-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-4 pb-4">
          {!loading && results.length === 0 && submitted && (
            <div className="flex flex-col items-center text-center pt-16 px-6">
              <span className="w-24 h-24 rounded-full bg-[hsl(var(--card))] flex items-center justify-center">
                <Search className="w-11 h-11 text-[hsl(var(--header-icon))]" />
              </span>
              <p className="mt-5 text-sm text-muted-foreground">
                Nous avons cherché partout. Malheureusement, aucun résultat n'a été trouvé.
              </p>
            </div>
          )}
          {!loading &&
            results.map((r, i) => {
              const prev = results[i - 1];
              const ch = r.channel ?? (r.channel_id ? channelMap.get(r.channel_id) : null);
              const showChannel = !prev || prev.channel_id !== r.channel_id;
              const Icon = channelTypeIcon[ch?.type ?? 'text'] ?? StreamlineHash;
              return (
                <div key={`${r.kind ?? 'message'}:${r.id}`}>
                  {showChannel && (
                    <p className={cn('flex items-center gap-1 pb-2 text-sm font-semibold text-muted-foreground', i > 0 && 'pt-4')}>
                      <Icon className="w-4 h-4" />
                      {ch?.name ?? 'salon'}
                    </p>
                  )}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => r.channel_id && onNavigateToMessage?.(r.channel_id, r.id)}
                    onKeyDown={(e) => e.key === 'Enter' && r.channel_id && onNavigateToMessage?.(r.channel_id, r.id)}
                    className="group relative mb-2 flex gap-3 p-3 pr-16 rounded-lg bg-[hsl(var(--card))] border border-white/[0.04] hover:bg-[hsl(var(--interactive-background-hover))] cursor-pointer transition-colors"
                  >
                    <Avatar className="w-10 h-10 shrink-0">
                      {r.author?.avatar_url ? (
                        <UserAvatarImage src={r.author.avatar_url} alt={r.author.display_name} ownerId={r.author.id} className="w-10 h-10" />
                      ) : (
                        <AvatarFallback>{(r.author?.display_name ?? '?').slice(0, 2).toUpperCase()}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline gap-2">
                        <span className="text-base font-semibold text-white truncate">{r.author?.display_name ?? 'Webhook'}</span>
                        {r.created_at && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {new Date(r.created_at).toLocaleString(appLocale(), { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </p>
                      <div className="mt-0.5 text-base text-foreground break-words line-clamp-5 [&_.markdown-content]:inline">
                        {r.kind === 'poll' || !term ? (
                          <MarkdownProvider value={{}}>
                            <MarkdownText content={r.content || ''} />
                          </MarkdownProvider>
                        ) : (
                          <Highlighted text={r.content || ''} term={term} />
                        )}
                      </div>
                    </div>
                    <span className="absolute top-2 right-2 h-6 px-2 rounded bg-[hsl(var(--button-secondary))] text-xs font-semibold text-white flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      Aller
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
      {filtersModal}
    </div>
  );
}

function FilterRow({ icon: Icon, label, prefix, hint }: { icon: React.ElementType; label: string; prefix?: string; hint: string }) {
  return (
    <>
      <Icon className="w-5 h-5 shrink-0 text-[hsl(var(--icon-default))]" />
      <span className="min-w-0 leading-tight">
        <span className="block text-sm font-medium text-white truncate">{label}</span>
        <span className="block text-xs text-muted-foreground truncate">
          {prefix && <strong className="font-semibold text-white">{prefix} </strong>}
          {hint}
        </span>
      </span>
    </>
  );
}

/**
 * Affiche une requete avec ses jetons en pastilles. `raw` : rendu miroir de
 * la barre, qui doit garder exactement la largeur du texte saisi (pas de
 * padding, pas de graisse differente : la pastille est dessinee par une
 * ombre de meme couleur).
 */
function QueryPills({
  text,
  raw = false,
  members,
}: {
  text: string;
  raw?: boolean;
  /** Hors barre : avatar dans les pastilles de: / mentions: (comme l'historique Discord). */
  members?: Map<string, MemberLite>;
}) {
  const parts = text.split(TOKEN_SPLIT_RE).filter((p) => p !== '');
  return (
    <>
      {parts.map((part, i) => {
        if (!KNOWN_PREFIX_RE.test(part)) return <span key={i}>{part}</span>;
        const lead = part.startsWith(' ') ? ' ' : '';
        const body = part.trimStart();
        const [prefix, ...rest] = body.split(':');
        const value = rest.join(':');
        const isUser = /^(de|from|mentions)$/i.test(prefix);
        const member = !raw && isUser ? members?.get(value.trim().replace(/^"|"$/g, '').toLowerCase()) : undefined;
        return (
          <span key={i}>
            {lead}
            <span
              className={cn(
                'rounded-sm bg-[#4a4b53] shadow-[0_0_0_2px_#4a4b53]',
                !raw && 'inline-flex items-center gap-1 mx-0.5 px-1 shadow-none',
              )}
            >
              <span className={cn('text-white', !raw && 'font-semibold')}>{prefix}:</span>
              {member && <MemberAvatar m={member} size={4} />}
              <span className="text-foreground">{member ? value.trim() : value}</span>
            </span>
          </span>
        );
      })}
    </>
  );
}

function Highlighted({ text, term }: { text: string; term: string }) {
  const lower = text.toLowerCase();
  const t = term.toLowerCase();
  const out: React.ReactNode[] = [];
  let i = 0;
  while (t && i < text.length) {
    const at = lower.indexOf(t, i);
    if (at < 0) break;
    if (at > i) out.push(text.slice(i, at));
    out.push(<mark key={at} className="rounded-sm bg-[#f0b232]/30 text-white">{text.slice(at, at + t.length)}</mark>);
    i = at + t.length;
  }
  out.push(text.slice(i));
  return <>{out}</>;
}
