import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  Search,
  User,
  AtSign,
  Hash,
  Calendar as CalendarIcon,
  Pin,
  Image as ImageIcon,
  Film,
  Paperclip,
  Link as LinkIcon,
  X,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGlobalSearch, SearchFilters as SearchFiltersType, SearchMember } from '@/hooks/useGlobalSearch';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MarkdownText } from '@/lib/markdown';

interface GlobalSearchModalProps {
  open: boolean;
  onClose: () => void;
  serverId: string | null;
  channels?: { id: string; name: string; type: string }[];
  members?: SearchMember[];
  onNavigateToMessage?: (channelId: string, messageId: string) => void;
}

// English Discord-style prefixes
const searchPrefixes = [
  { prefix: 'from:', label: 'from user', icon: User, type: 'user' as const, key: 'from' as const },
  { prefix: 'mentions:', label: 'mentioning user', icon: AtSign, type: 'user' as const, key: 'mentions' as const },
  { prefix: 'has:', label: 'has attachment', icon: Paperclip, type: 'has' as const, key: 'has' as const },
  { prefix: 'in:', label: 'in channel', icon: Hash, type: 'channel' as const, key: 'channel' as const },
  { prefix: 'before:', label: 'before date', icon: CalendarIcon, type: 'date' as const, key: 'before' as const },
  { prefix: 'during:', label: 'during date', icon: CalendarIcon, type: 'date' as const, key: 'during' as const },
  { prefix: 'after:', label: 'after date', icon: CalendarIcon, type: 'date' as const, key: 'after' as const },
  { prefix: 'pinned:', label: 'pinned', icon: Pin, type: 'boolean' as const, key: 'pinned' as const },
];

const prefixToKey: Record<string, keyof SearchFiltersType> = {
  'from:': 'from',
  'mentions:': 'mentions',
  'has:': 'has',
  'in:': 'channel',
  'before:': 'before',
  'during:': 'during',
  'after:': 'after',
  'pinned:': 'pinned',
};

const keyToPrefix: Record<keyof SearchFiltersType, string> = {
  from: 'from:',
  mentions: 'mentions:',
  contains: '',
  channel: 'in:',
  before: 'before:',
  during: 'during:',
  after: 'after:',
  pinned: 'pinned:',
  authorType: 'author:',
  has: 'has:',
};

// Quick-access shortcut pills (left of input)
const quickShortcuts = [
  { icon: User, prefix: 'from:', tooltip: 'From user' },
  { icon: AtSign, prefix: 'mentions:', tooltip: 'Mentions' },
  { icon: Hash, prefix: 'in:', tooltip: 'In channel' },
  { icon: ImageIcon, prefix: 'has:image', tooltip: 'Has image', auto: true },
  { icon: Film, prefix: 'has:video', tooltip: 'Has video', auto: true },
  { icon: LinkIcon, prefix: 'has:link', tooltip: 'Has link', auto: true },
  { icon: Pin, prefix: 'pinned:true', tooltip: 'Pinned', auto: true },
];

function ChannelIcon({ type }: { type?: string | null }) {
  return <Hash className="w-4 h-4 text-muted-foreground" />;
}

function AutocompleteSuggestions({
  type,
  query,
  channels,
  members,
  onSelect,
}: {
  type: 'user' | 'channel' | 'date' | 'boolean' | 'has';
  query: string;
  channels?: { id: string; name: string; type: string }[];
  members?: SearchMember[];
  onSelect: (value: string) => void;
}) {
  if (type === 'user') {
    const filtered = (members || [])
      .filter(
        (m) =>
          m.displayName.toLowerCase().includes(query.toLowerCase()) ||
          m.username.toLowerCase().includes(query.toLowerCase()),
      )
      .slice(0, 8);

    if (filtered.length === 0) return null;
    return (
      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
        <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          From User
        </p>
        {filtered.map((m) => (
          <button
            key={m.id}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(m.username)}
            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted transition-colors text-left"
          >
            <Avatar className="w-7 h-7">
              <AvatarImage src={m.avatar} />
              <AvatarFallback className="text-xs bg-primary/20 text-primary">
                {m.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-semibold">{m.displayName}</span>
            <span className="text-xs text-muted-foreground">{m.username}</span>
          </button>
        ))}
      </div>
    );
  }

  if (type === 'channel') {
    const filtered = (channels || [])
      .filter((c) => c.name.toLowerCase().includes(query.toLowerCase().replace(/^#/, '')))
      .slice(0, 8);
    if (filtered.length === 0) return null;
    return (
      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
        <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          In Channel
        </p>
        {filtered.map((c) => (
          <button
            key={c.id}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(c.name)}
            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted transition-colors text-left"
          >
            <ChannelIcon type={c.type} />
            <span className="text-sm">{c.name}</span>
          </button>
        ))}
      </div>
    );
  }

  if (type === 'has') {
    const opts = [
      { value: 'image', label: 'Image', Icon: ImageIcon },
      { value: 'video', label: 'Video', Icon: Film },
      { value: 'file', label: 'File', Icon: Paperclip },
      { value: 'link', label: 'Link', Icon: LinkIcon },
    ];
    const filtered = opts.filter((o) => o.value.includes(query.toLowerCase()));
    if (filtered.length === 0) return null;
    return (
      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
        <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Has
        </p>
        {filtered.map(({ value, label, Icon }) => (
          <button
            key={value}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(value)}
            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted transition-colors text-left"
          >
            <Icon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{label}</span>
          </button>
        ))}
      </div>
    );
  }

  if (type === 'date') {
    return (
      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden p-2">
        <Calendar
          mode="single"
          selected={query ? new Date(query) : undefined}
          onSelect={(date) => date && onSelect(format(date, 'yyyy-MM-dd'))}
          locale={fr}
          className="pointer-events-auto"
        />
      </div>
    );
  }

  if (type === 'boolean') {
    return (
      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelect('true')}
          className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted transition-colors text-left"
        >
          <Pin className="w-4 h-4 text-primary" />
          <span className="text-sm">True (pinned)</span>
        </button>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelect('false')}
          className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted transition-colors text-left"
        >
          <Pin className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">False (not pinned)</span>
        </button>
      </div>
    );
  }

  return null;
}

function FilterChips({
  filters,
  onRemove,
}: {
  filters: SearchFiltersType;
  onRemove: (key: keyof SearchFiltersType) => void;
}) {
  const chips: { key: keyof SearchFiltersType; label: string; value: string }[] = [];
  if (filters.from) chips.push({ key: 'from', label: 'from:', value: filters.from });
  if (filters.mentions) chips.push({ key: 'mentions', label: 'mentions:', value: filters.mentions });
  if (filters.channel) chips.push({ key: 'channel', label: 'in:', value: filters.channel });
  if (filters.has) chips.push({ key: 'has', label: 'has:', value: filters.has });
  if (filters.during) chips.push({ key: 'during', label: 'during:', value: filters.during });
  if (filters.before) chips.push({ key: 'before', label: 'before:', value: filters.before });
  if (filters.after) chips.push({ key: 'after', label: 'after:', value: filters.after });
  if (filters.pinned !== undefined)
    chips.push({ key: 'pinned', label: 'pinned:', value: filters.pinned ? 'true' : 'false' });
  if (filters.authorType) chips.push({ key: 'authorType', label: 'author:', value: filters.authorType });

  if (chips.length === 0) return null;
  return (
    <>
      {chips.map((c) => (
        <span
          key={c.key}
          className="inline-flex items-center gap-1 h-7 pl-2 pr-1 bg-primary/15 text-primary rounded-md text-xs flex-shrink-0"
        >
          <span className="font-bold">{c.label}</span>
          <span>{c.value}</span>
          <button
            onClick={() => onRemove(c.key)}
            className="hover:bg-primary/25 rounded p-0.5 ml-0.5"
            type="button"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
    </>
  );
}

function highlight(text: string, term: string) {
  if (!term.trim()) return text;
  try {
    const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.split(re).map((part, i) =>
      re.test(part) ? (
        <mark key={i} className="bg-primary/30 text-foreground rounded px-0.5">
          {part}
        </mark>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
  } catch {
    return text;
  }
}

export function GlobalSearchModal({
  open,
  onClose,
  serverId,
  channels = [],
  members = [],
  onNavigateToMessage,
}: GlobalSearchModalProps) {
  const [rawInput, setRawInput] = useState('');
  const [filters, setFilters] = useState<SearchFiltersType>({});
  const [activeAutocomplete, setActiveAutocomplete] = useState<{
    type: 'user' | 'channel' | 'date' | 'boolean' | 'has';
    prefix: string;
    query: string;
  } | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isMobile } = useBreakpoint();

  // Reset on close
  useEffect(() => {
    if (!open) {
      setRawInput('');
      setFilters({});
      setActiveAutocomplete(null);
      setIsInputFocused(false);
    }
  }, [open]);

  // Detect active prefix in input
  const detectActivePrefix = useCallback((value: string) => {
    for (const p of searchPrefixes) {
      const regex = new RegExp(`${p.prefix.replace(':', '\\:')}(\\S*)$`, 'i');
      const match = value.match(regex);
      if (match) {
        return { type: p.type, prefix: p.prefix, query: match[1] || '' };
      }
    }
    return null;
  }, []);

  const handleInputChange = (value: string) => {
    setRawInput(value);
    const active = detectActivePrefix(value);
    setActiveAutocomplete(active);
  };

  const handleAutocompleteSelect = (value: string) => {
    if (!activeAutocomplete) return;
    const key = prefixToKey[activeAutocomplete.prefix];
    if (key) {
      const newFilters: SearchFiltersType = { ...filters };
      if (key === 'pinned') {
        newFilters.pinned = value === 'true';
      } else {
        (newFilters as any)[key] = value;
      }
      setFilters(newFilters);
    }
    // Strip the prefix+partial from raw input
    const cleaned = rawInput.replace(
      new RegExp(`${activeAutocomplete.prefix.replace(':', '\\:')}\\S*$`, 'i'),
      '',
    );
    setRawInput(cleaned.trimStart());
    setActiveAutocomplete(null);
    inputRef.current?.focus();
  };

  const handleShortcutClick = (prefix: string, auto?: boolean) => {
    if (auto) {
      // e.g. 'has:image' → set filter directly
      const [p, v] = prefix.split(':');
      const key = prefixToKey[`${p}:`];
      if (key) {
        const newFilters: SearchFiltersType = { ...filters };
        if (key === 'pinned') newFilters.pinned = v === 'true';
        else (newFilters as any)[key] = v;
        setFilters(newFilters);
      }
    } else {
      setRawInput((prev) => (prev ? `${prev} ${prefix}` : prefix));
      const cfg = searchPrefixes.find((p) => p.prefix === prefix);
      if (cfg) setActiveAutocomplete({ type: cfg.type, prefix, query: '' });
    }
    inputRef.current?.focus();
    setIsInputFocused(true);
  };

  const handleRemoveFilter = (key: keyof SearchFiltersType) => {
    const next = { ...filters };
    delete next[key];
    setFilters(next);
    inputRef.current?.focus();
    setIsInputFocused(true);
  };

  // Compute final query: contains = remaining text without prefix tokens
  const { searchQuery, mergedFilters } = useMemo(() => {
    let remaining = rawInput;
    const merged: SearchFiltersType = { ...filters };

    // Parse complete prefix tokens (prefix:value followed by space/end)
    for (const [prefix, key] of Object.entries(prefixToKey)) {
      const regex = new RegExp(`${prefix.replace(':', '\\:')}(\\S+)`, 'gi');
      const match = regex.exec(remaining);
      if (match) {
        if (key === 'pinned') merged.pinned = match[1].toLowerCase() === 'true';
        else (merged as any)[key] = match[1];
        remaining = remaining.replace(match[0], '').trim();
      }
    }

    return { searchQuery: remaining.trim(), mergedFilters: merged };
  }, [rawInput, filters]);

  const { data: results, isFetching, isPending } = useGlobalSearch(
    serverId,
    searchQuery,
    mergedFilters,
    members,
    open,
  );

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy, HH:mm', { locale: fr });
    } catch {
      return dateStr;
    }
  };

  const hasActiveFilters = Object.keys(mergedFilters).some(
    (k) => (mergedFilters as any)[k] !== undefined,
  );
  const hasInput = searchQuery.length > 0 || hasActiveFilters;
  const showLoading = isFetching && !results;

  // Prefixes still available (not already used as a filter)
  const remainingPrefixes = useMemo(() => {
    return searchPrefixes.filter((p) => {
      const v = (mergedFilters as any)[p.key];
      return v === undefined || v === null || v === '';
    });
  }, [mergedFilters]);

  const showSearchOptions =
    isInputFocused && !activeAutocomplete && remainingPrefixes.length > 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className={cn(
          'flex flex-col p-0 gap-0',
          isMobile ? 'h-full max-h-full w-full max-w-full rounded-none' : 'sm:max-w-2xl max-h-[80vh]',
        )}
      >
        <DialogHeader className="px-4 py-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Recherche
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 py-3 border-b border-border">
          <div className="relative">
            <div className="flex items-center gap-1.5 min-h-10 rounded-xl border border-border bg-input px-2 py-1.5 flex-wrap">
              {/* Quick shortcuts */}
              <div className="flex items-center gap-0.5 flex-shrink-0 pr-1.5 mr-0.5 border-r border-border/60">
                {quickShortcuts.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.tooltip}
                      type="button"
                      title={s.tooltip}
                      onClick={() => handleShortcutClick(s.prefix, s.auto)}
                      className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </div>

              {/* Active filter chips */}
              <FilterChips filters={filters} onRemove={handleRemoveFilter} />

              {/* Free text input */}
              <input
                ref={inputRef}
                value={rawInput}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={(e) => {
                  // Keep open if focus moves to a button inside the popover (handled via onMouseDown preventDefault)
                  const next = e.relatedTarget as HTMLElement | null;
                  if (next && next.closest('[data-search-popover]')) return;
                  setIsInputFocused(false);
                }}
                placeholder={hasActiveFilters ? 'Search…' : 'Search messages, type "from:" or "in:"…'}
                className="flex-1 min-w-[120px] h-7 bg-transparent text-sm placeholder:text-muted-foreground outline-none border-0"
              />

              {(rawInput || hasActiveFilters) && (
                <button
                  type="button"
                  onClick={() => {
                    setRawInput('');
                    setFilters({});
                    inputRef.current?.focus();
                  }}
                  className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Prefix shortcuts dropdown (when input empty + focused) */}
            {showShortcuts && !activeAutocomplete && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Search options
                </p>
                {searchPrefixes.map((p) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.prefix}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleShortcutClick(p.prefix)}
                      className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted transition-colors text-left"
                    >
                      <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="font-bold text-primary text-sm">{p.prefix}</span>
                      <span className="text-muted-foreground text-sm">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {activeAutocomplete && (
              <AutocompleteSuggestions
                type={activeAutocomplete.type}
                query={activeAutocomplete.query}
                channels={channels}
                members={members}
                onSelect={handleAutocompleteSelect}
              />
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4">
            {showLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : results && results.length > 0 ? (
              <div className="space-y-2">
                {results.map((message) => (
                  <button
                    key={message.id}
                    onClick={() => {
                      onNavigateToMessage?.(message.channel_id, message.id);
                      onClose();
                    }}
                    className="w-full text-left p-3 bg-muted/40 hover:bg-muted rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={message.author?.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                          {message.author?.display_name?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-semibold">
                        {message.author?.display_name || 'Inconnu'}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {message.channel?.name || 'Salon'}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDate(message.created_at || '')}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 line-clamp-2 font-ginto">
                      {searchQuery ? highlight(message.content, searchQuery) : <MarkdownText content={message.content} />}
                    </p>
                  </button>
                ))}
              </div>
            ) : hasInput && !isFetching ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucun message trouvé</p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Search this server</p>
                <p className="text-xs mt-1">
                  Try <span className="font-bold text-primary">from:</span>username,{' '}
                  <span className="font-bold text-primary">in:</span>channel,{' '}
                  <span className="font-bold text-primary">has:</span>image
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
