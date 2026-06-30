import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, User as UserIcon, Hash, Loader2, AtSign, Paperclip, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useGlobalSearch, SearchFilters as SearchFiltersType } from '@/hooks/useGlobalSearch';
import { MarkdownText, MarkdownProvider } from '@/lib/markdown';
import { UserAvatarImage } from '@/components/ui/user-avatar-image';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  SearchFiltersModal,
  emptySearchFilters,
  type SearchFiltersValue,
  type SearchFiltersFocus,
} from './SearchFiltersModal';

interface MessageSearchPanelProps {
  serverId: string | null;
  channels: { id: string; name: string; type: string }[];
  members: { id: string; username: string; displayName: string; avatar?: string }[];
  onClose: () => void;
  onNavigateToMessage?: (channelId: string, messageId: string) => void;
  /** When 'popover', the panel only shows the Filters/History dropdown content
   *  (no search input, no results) — the host renders it as a floating overlay
   *  anchored under the MemberList search bar. When 'panel' (default), it
   *  renders the full search experience (input + results) replacing the column. */
  variant?: 'popover' | 'panel';
  /** Notifies the host when a search is submitted (or cleared). Hosts use this
   *  to swap from popover overlay to full-column panel. */
  onSubmittedChange?: (submitted: string | null) => void;
  /** External query control (used by popover variant so typing in the dropdown
   *  can promote to the full panel via the host). */
  initialQuery?: string;
}

const HISTORY_MAX = 8;
const historyKey = (serverId: string | null) =>
  `msg-search-history:${serverId ?? 'global'}`;

function loadHistory(serverId: string | null): string[] {
  try {
    const raw = localStorage.getItem(historyKey(serverId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((s) => typeof s === 'string').slice(0, HISTORY_MAX) : [];
  } catch {
    return [];
  }
}

function saveHistory(serverId: string | null, items: string[]) {
  try {
    localStorage.setItem(historyKey(serverId), JSON.stringify(items.slice(0, HISTORY_MAX)));
  } catch {
    // ignore
  }
}

export function MessageSearchPanel({
  serverId,
  channels,
  members,
  onClose,
  onNavigateToMessage,
  variant = 'panel',
  onSubmittedChange,
  initialQuery = '',
}: MessageSearchPanelProps) {
  const [query, setQuery] = useState(initialQuery);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(variant === 'popover');
  const [history, setHistory] = useState<string[]>(() => loadHistory(serverId));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersFocus, setFiltersFocus] = useState<SearchFiltersFocus>(null);
  const [filtersValue, setFiltersValue] = useState<SearchFiltersValue>(emptySearchFilters());
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useGlobalSearch(serverId);

  useEffect(() => {
    setHistory(loadHistory(serverId));
    setQuery('');
    setSubmitted(null);
    onSubmittedChange?.(null);
    search.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  const runSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setSubmitted(trimmed);
    onSubmittedChange?.(trimmed);
    setShowSuggestions(false);

    // Very lightweight prefix parsing to feed existing useGlobalSearch
    const filters: SearchFiltersType = {};
    let rest = trimmed;
    const fromMatch = rest.match(/(?:^|\s)de:(\S+)/i);
    if (fromMatch) {
      filters.from = fromMatch[1];
      rest = rest.replace(fromMatch[0], '').trim();
    }
    const inMatch = rest.match(/(?:^|\s)dans:(\S+)/i);
    if (inMatch) {
      filters.channel = inMatch[1];
      rest = rest.replace(inMatch[0], '').trim();
    }
    if (rest) filters.contains = rest;

    search.mutate({ query: rest, filters });

    setHistory((prev) => {
      const next = [trimmed, ...prev.filter((h) => h !== trimmed)].slice(0, HISTORY_MAX);
      saveHistory(serverId, next);
      return next;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runSearch(query);
    } else if (e.key === 'Escape') {
      if (showSuggestions) setShowSuggestions(false);
      else onClose();
    }
  };

  const insertPrefix = (prefix: string) => {
    setQuery((q) => {
      const base = q.endsWith(' ') || q === '' ? q : q + ' ';
      return base + prefix;
    });
    inputRef.current?.focus();
  };

  const removeHistoryItem = (item: string) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h !== item);
      saveHistory(serverId, next);
      return next;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory(serverId, []);
  };

  const results = search.data ?? [];
  const isLoading = search.isPending;

  const channelMap = useMemo(() => {
    const m = new Map<string, { id: string; name: string; type: string }>();
    channels.forEach((c) => m.set(c.id, c));
    return m;
  }, [channels]);

  const memberByUsername = useMemo(() => {
    const m = new Map<string, { id: string; username: string; displayName: string; avatar?: string }>();
    members.forEach((u) => m.set(u.username.toLowerCase(), u));
    return m;
  }, [members]);

  const openFilters = (focus: SearchFiltersFocus) => {
    setFiltersFocus(focus);
    setFiltersOpen(true);
  };

  const applyFilters = (v: SearchFiltersValue) => {
    setFiltersValue(v);
    // Backend hook (useGlobalSearch) currently accepts one value per filter.
    // Take the first of each multi-select; other selections remain visible
    // in the modal state but are not yet transmitted. Wired in step 4.
    const filters: SearchFiltersType = {};
    const firstFrom = v.from[0] ? members.find((m) => m.id === v.from[0]) : null;
    if (firstFrom) filters.from = firstFrom.username;
    const firstChan = v.in[0] ? channels.find((c) => c.id === v.in[0]) : null;
    if (firstChan) filters.channel = firstChan.name;
    const firstMention = v.mentions[0]
      ? members.find((m) => m.id === v.mentions[0])
      : null;
    if (firstMention) filters.mentions = firstMention.username;
    if (v.authorType) filters.authorType = v.authorType;
    if (v.pinned !== null) filters.pinned = v.pinned;
    const firstDate = v.dates.find((d) => d.date);
    if (firstDate?.date) {
      const iso = format(firstDate.date, 'yyyy-MM-dd');
      if (firstDate.mode === 'before') filters.before = iso;
      else if (firstDate.mode === 'after') filters.after = iso;
      else filters.during = iso;
    }
    if (query.trim()) filters.contains = query.trim();
    const label = query.trim() || '(filters)';
    setSubmitted(label);
    onSubmittedChange?.(label);
    setShowSuggestions(false);
    search.mutate({ query: filters.contains ?? '', filters });
  };

  const filterRows = [
    {
      key: 'from',
      icon: <UserIcon className="w-4 h-4 text-muted-foreground" />,
      label: 'From a specific user',
      prefix: 'from:',
      hint: 'user',
      onSelect: () => openFilters('from'),
    },
    {
      key: 'in',
      icon: <Hash className="w-4 h-4 text-muted-foreground" />,
      label: 'Sent in a specific channel',
      prefix: 'in:',
      hint: 'channel',
      onSelect: () => openFilters('in'),
    },
    {
      key: 'has',
      icon: <Paperclip className="w-4 h-4 text-muted-foreground" />,
      label: 'Includes a specific type of data',
      prefix: 'has:',
      hint: 'link, embed or file',
      onSelect: () => openFilters('has'),
    },
    {
      key: 'mentions',
      icon: <AtSign className="w-4 h-4 text-muted-foreground" />,
      label: 'Mentions a specific user',
      prefix: 'mentions:',
      hint: 'user',
      onSelect: () => openFilters('mentions'),
    },
    {
      key: 'more',
      icon: <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />,
      label: 'More filters',
      prefix: '',
      hint: 'dates, author type, and more',
      onSelect: () => openFilters(null),
    },
  ];

  // Parse a history string into structured chunks (plain text + token pills).
  const parseHistoryItem = (raw: string) => {
    const tokenRe = /(\b(?:has|in|from|mentions|de|dans):\S+)/gi;
    const parts: Array<
      | { kind: 'text'; value: string }
      | { kind: 'token'; prefix: string; value: string }
    > = [];
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = tokenRe.exec(raw)) !== null) {
      if (m.index > last) parts.push({ kind: 'text', value: raw.slice(last, m.index) });
      const [prefix, value] = m[0].split(/:(.+)/);
      parts.push({ kind: 'token', prefix: `${prefix}:`, value: value ?? '' });
      last = m.index + m[0].length;
    }
    if (last < raw.length) parts.push({ kind: 'text', value: raw.slice(last) });
    return parts;
  };

  const renderHistoryContent = (raw: string) => {
    const parts = parseHistoryItem(raw);
    if (parts.length === 0 || (parts.length === 1 && parts[0].kind === 'text')) {
      return <span className="truncate">{raw}</span>;
    }
    return (
      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
        {parts.map((p, i) => {
          if (p.kind === 'text') {
            const t = p.value.trim();
            if (!t) return null;
            return <span key={i} className="text-sm">{t}</span>;
          }
          const lower = p.prefix.toLowerCase();
          const isChannel = lower === 'in:' || lower === 'dans:';
          const isUser = lower === 'from:' || lower === 'de:' || lower === 'mentions:';
          const ch = isChannel ? channels.find((c) => c.name.toLowerCase() === p.value.toLowerCase().replace(/^#/, '')) : null;
          const member = isUser ? memberByUsername.get(p.value.toLowerCase()) : null;
          return (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded bg-surface-2 px-1.5 py-0.5 text-xs"
            >
              <span className="text-muted-foreground">{p.prefix}</span>
              {isChannel && <Hash className="w-3 h-3 text-muted-foreground" />}
              {isUser && member?.avatar && (
                <UserAvatarImage
                  src={member.avatar}
                  alt={member.displayName}
                  ownerId={member.id}
                  className="w-4 h-4 rounded-full"
                />
              )}
              {isUser && !member?.avatar && (
                <Avatar className="w-4 h-4">
                  <AvatarFallback className="text-[8px]">
                    {p.value.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <span className="truncate">{ch ? ch.name : p.value}</span>
            </span>
          );
        })}
      </div>
    );
  };

  const filtersAndHistory = (
    <>
      <div className="text-[11px] font-semibold text-muted-foreground px-2 pt-1 pb-1.5">
        Filters
      </div>
      <div className="flex flex-col">
        {filterRows.map((row) => (
          <button
            key={row.key}
            onClick={row.onSelect}
            className="w-full flex items-center gap-3 px-2 py-1.5 rounded text-sm hover:bg-surface-hover text-left"
          >
            <span className="shrink-0">{row.icon}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm text-foreground truncate">{row.label}</span>
              <span className="block text-xs text-muted-foreground truncate">
                {row.prefix && <span className="text-primary">{row.prefix} </span>}
                {row.hint}
              </span>
            </span>
          </button>
        ))}
      </div>

      {history.length > 0 && (
        <>
          <Separator className="my-2" />
          <div className="flex items-center justify-between px-2 pb-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground">
              History
            </span>
            <button
              onClick={clearHistory}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Clear history"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-col">
            {history.map((item) => (
              <div
                key={item}
                className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-hover"
              >
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <button
                  onClick={() => {
                    setQuery(item);
                    runSearch(item);
                  }}
                  className="flex-1 min-w-0 text-left"
                >
                  {renderHistoryContent(item)}
                </button>
                <button
                  onClick={() => removeHistoryItem(item)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                  aria-label="Remove from history"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );

  const filtersModalEl = (
    <SearchFiltersModal
      open={filtersOpen}
      onOpenChange={setFiltersOpen}
      focus={filtersFocus}
      initial={filtersValue}
      members={members}
      channels={channels}
      onApply={applyFilters}
    />
  );

  // Popover variant: just the Filters/History card, no input, no results.
  if (variant === 'popover') {
    return (
      <>
        <div
          className="w-full bg-popover text-popover-foreground border border-border/40 rounded-md shadow-lg p-2 max-h-[70vh] overflow-y-auto"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              onClose();
            }
          }}
        >
          {filtersAndHistory}
        </div>
        {filtersModalEl}
      </>
    );
  }


  return (
    <div className="w-full sm:w-60 bg-surface-1 flex flex-col sm:border-l sm:border-border/30 h-full">
      {/* Search bar — matches MemberList visual */}
      <div className="px-3 pt-3 bg-surface-1">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
            <Input
              ref={inputRef}
              autoFocus
              placeholder="Rechercher des messages"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              className="h-8 pl-8 pr-7 text-sm bg-input"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Effacer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onClose}
            aria-label="Fermer la recherche"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Separator className="mt-3" />

      {/* Quick filter / history dropdown */}
      {showSuggestions && !submitted && (
        <div className="px-2 pt-2">{filtersAndHistory}</div>
      )}

      {/* Results */}
      {submitted && (
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {isLoading && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-xs">Recherche...</span>
              </div>
            )}
            {!isLoading && results.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-8">
                Aucun résultat
              </div>
            )}
            {!isLoading &&
              results.map((r) => {
                const ch = r.channel_id ? channelMap.get(r.channel_id) : null;
                return (
                  <button
                    key={r.id}
                    onClick={() =>
                      r.channel_id &&
                      onNavigateToMessage?.(r.channel_id, r.id)
                    }
                    className={cn(
                      'w-full text-left rounded-md p-2 hover:bg-surface-hover transition-colors',
                      'flex gap-2'
                    )}
                  >
                    <Avatar className="w-8 h-8 shrink-0">
                      {r.author?.avatar_url ? (
                        <UserAvatarImage
                          src={r.author.avatar_url}
                          alt={r.author.display_name || r.author.username}
                          ownerId={r.author.id}
                          className="w-8 h-8"
                        />
                      ) : (
                        <AvatarFallback className="text-[10px]">
                          {(r.author?.display_name || r.author?.username || '?')
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-medium truncate">
                          {r.author?.display_name || r.author?.username || 'Inconnu'}
                        </span>
                        {ch && (
                          <span className="flex items-center gap-0.5 text-muted-foreground truncate">
                            <Hash className="w-3 h-3 shrink-0" />
                            <span className="truncate">{ch.name}</span>
                          </span>
                        )}
                        {r.created_at && (
                          <span className="text-muted-foreground shrink-0">
                            · {format(new Date(r.created_at), 'd MMM', { locale: fr })}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-foreground/80 line-clamp-2 mt-0.5">
                        <MarkdownProvider value={{}}>
                          <MarkdownText content={r.content || ''} />
                        </MarkdownProvider>
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        </ScrollArea>
      )}

      {!submitted && !showSuggestions && <div className="flex-1" />}
      {filtersModalEl}
    </div>
  );
}

