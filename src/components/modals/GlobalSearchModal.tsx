import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  User, 
  AtSign, 
  FileText, 
  Hash, 
  Calendar as CalendarIcon, 
  Pin, 
  UserCircle,
  MessageSquare,
  X,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGlobalSearch, SearchFilters as SearchFiltersType } from '@/hooks/useGlobalSearch';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MarkdownText } from '@/lib/markdown';

interface GlobalSearchModalProps {
  open: boolean;
  onClose: () => void;
  serverId: string | null;
  channels?: { id: string; name: string; type: string }[];
  members?: { id: string; username: string; displayName: string; avatar?: string }[];
  onNavigateToMessage?: (channelId: string, messageId: string) => void;
}

// Search filter prefixes configuration
const searchPrefixes = [
  { prefix: 'de:', label: 'de la personne', icon: User, type: 'user' as const },
  { prefix: 'mentions:', label: 'mentionner quelqu\'un', icon: AtSign, type: 'user' as const },
  { prefix: 'contient:', label: 'contient', icon: FileText, type: 'text' as const },
  { prefix: 'dans:', label: 'dans un salon', icon: Hash, type: 'channel' as const },
  { prefix: 'pendant:', label: 'envoyé le', icon: CalendarIcon, type: 'date' as const },
  { prefix: 'avant:', label: 'avant le', icon: CalendarIcon, type: 'date' as const },
  { prefix: 'après:', label: 'après le', icon: CalendarIcon, type: 'date' as const },
  { prefix: 'épinglé:', label: 'épinglé', icon: Pin, type: 'boolean' as const },
  { prefix: 'auteur:', label: 'type d\'auteur', icon: UserCircle, type: 'authorType' as const },
];

// Autocomplete suggestion component
function AutocompleteSuggestions({
  type,
  query,
  channels,
  members,
  onSelect,
}: {
  type: 'user' | 'channel' | 'date' | 'boolean' | 'authorType' | 'text';
  query: string;
  channels?: { id: string; name: string; type: string }[];
  members?: { id: string; username: string; displayName: string; avatar?: string }[];
  onSelect: (value: string) => void;
}) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  if (type === 'user') {
    const filteredMembers = members?.filter(m => 
      m.displayName.toLowerCase().includes(query.toLowerCase()) ||
      m.username.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5) || [];

    if (filteredMembers.length === 0) return null;

    return (
      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
        {filteredMembers.map(member => (
          <button
            key={member.id}
            onClick={() => onSelect(member.username)}
            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted transition-colors text-left"
          >
            <Avatar className="w-6 h-6">
              <AvatarImage src={member.avatar} />
              <AvatarFallback className="text-xs bg-primary/20 text-primary">
                {member.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{member.displayName}</span>
            <span className="text-xs text-muted-foreground">@{member.username}</span>
          </button>
        ))}
      </div>
    );
  }

  if (type === 'channel') {
    const filteredChannels = channels?.filter(c => 
      c.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5) || [];

    if (filteredChannels.length === 0) return null;

    return (
      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
        {filteredChannels.map(channel => (
          <button
            key={channel.id}
            onClick={() => onSelect(channel.name)}
            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted transition-colors text-left"
          >
            <Hash className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{channel.name}</span>
          </button>
        ))}
      </div>
    );
  }

  if (type === 'date') {
    return (
      <div className="absolute z-50 top-full left-0 right-0 mt-1">
        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-start text-left font-normal"
              onClick={() => setDatePickerOpen(true)}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {query || 'Sélectionner une date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={query ? new Date(query) : undefined}
              onSelect={(date) => {
                if (date) {
                  onSelect(format(date, 'yyyy-MM-dd'));
                  setDatePickerOpen(false);
                }
              }}
              locale={fr}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  if (type === 'boolean') {
    return (
      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
        <button
          onClick={() => onSelect('true')}
          className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted transition-colors text-left"
        >
          <Pin className="w-4 h-4 text-primary" />
          <span className="text-sm">Oui</span>
        </button>
        <button
          onClick={() => onSelect('false')}
          className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted transition-colors text-left"
        >
          <Pin className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">Non</span>
        </button>
      </div>
    );
  }

  if (type === 'authorType') {
    return (
      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
        <button
          onClick={() => onSelect('user')}
          className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted transition-colors text-left"
        >
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">Utilisateur</span>
        </button>
        <button
          onClick={() => onSelect('bot')}
          className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted transition-colors text-left"
        >
          <UserCircle className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">Bot</span>
        </button>
        <button
          onClick={() => onSelect('webhook')}
          className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted transition-colors text-left"
        >
          <AtSign className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">Webhook</span>
        </button>
      </div>
    );
  }

  return null;
}

// Filter tags display
function FilterTags({
  filters,
  onRemove,
}: {
  filters: SearchFiltersType;
  onRemove: (key: keyof SearchFiltersType) => void;
}) {
  const tags: { key: keyof SearchFiltersType; label: string; value: string }[] = [];

  if (filters.from) tags.push({ key: 'from', label: 'de:', value: filters.from });
  if (filters.mentions) tags.push({ key: 'mentions', label: 'mentions:', value: filters.mentions });
  if (filters.contains) tags.push({ key: 'contains', label: 'contient:', value: filters.contains });
  if (filters.channel) tags.push({ key: 'channel', label: 'dans:', value: filters.channel });
  if (filters.during) tags.push({ key: 'during', label: 'pendant:', value: filters.during });
  if (filters.before) tags.push({ key: 'before', label: 'avant:', value: filters.before });
  if (filters.after) tags.push({ key: 'after', label: 'après:', value: filters.after });
  if (filters.pinned !== undefined) tags.push({ key: 'pinned', label: 'épinglé:', value: filters.pinned ? 'oui' : 'non' });
  if (filters.authorType) tags.push({ key: 'authorType', label: 'auteur:', value: filters.authorType });

  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {tags.map(tag => (
        <span
          key={tag.key}
          className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs"
        >
          <span className="font-medium">{tag.label}</span>
          <span>{tag.value}</span>
          <button
            onClick={() => onRemove(tag.key)}
            className="hover:bg-primary/20 rounded p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
    </div>
  );
}

export function GlobalSearchModal({
  open,
  onClose,
  serverId,
  channels = [],
  members = [],
  onNavigateToMessage,
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFiltersType>({});
  const [showPrefixSuggestions, setShowPrefixSuggestions] = useState(false);
  const [activeAutocomplete, setActiveAutocomplete] = useState<{
    type: 'user' | 'channel' | 'date' | 'boolean' | 'authorType' | 'text';
    prefix: string;
    query: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { mutate: search, data: results, isPending } = useGlobalSearch(serverId);

  // Parse query for active prefix
  const detectActivePrefix = useCallback((value: string) => {
    for (const prefixConfig of searchPrefixes) {
      const regex = new RegExp(`${prefixConfig.prefix}(\\S*)$`);
      const match = value.match(regex);
      if (match) {
        return {
          type: prefixConfig.type,
          prefix: prefixConfig.prefix,
          query: match[1] || '',
        };
      }
    }
    return null;
  }, []);

  // Handle input change
  const handleInputChange = (value: string) => {
    setQuery(value);
    const active = detectActivePrefix(value);
    setActiveAutocomplete(active);
    setShowPrefixSuggestions(!active && !value.trim());
  };

  // Handle autocomplete selection
  const handleAutocompleteSelect = (value: string) => {
    if (activeAutocomplete) {
      const newQuery = query.replace(
        new RegExp(`${activeAutocomplete.prefix}\\S*$`),
        `${activeAutocomplete.prefix}${value} `
      );
      setQuery(newQuery);
      setActiveAutocomplete(null);
      inputRef.current?.focus();
    }
  };

  // Handle prefix selection
  const handlePrefixSelect = (prefix: string) => {
    setQuery(prev => prev + prefix);
    setShowPrefixSuggestions(false);
    inputRef.current?.focus();
    
    const prefixConfig = searchPrefixes.find(p => p.prefix === prefix);
    if (prefixConfig) {
      setActiveAutocomplete({
        type: prefixConfig.type,
        prefix: prefixConfig.prefix,
        query: '',
      });
    }
  };

  // Parse query and build filters
  const parseAndSearch = useCallback(() => {
    const parsedFilters: SearchFiltersType = {};
    let remaining = query;

    // Parse each prefix
    const prefixMap: Record<string, keyof SearchFiltersType> = {
      'de:': 'from',
      'mentions:': 'mentions',
      'contient:': 'contains',
      'dans:': 'channel',
      'pendant:': 'during',
      'avant:': 'before',
      'après:': 'after',
      'épinglé:': 'pinned',
      'auteur:': 'authorType',
    };

    for (const [prefix, filterKey] of Object.entries(prefixMap)) {
      const regex = new RegExp(`${prefix}(\\S+)`, 'gi');
      const match = regex.exec(remaining);
      if (match) {
        if (filterKey === 'pinned') {
          parsedFilters[filterKey] = match[1].toLowerCase() === 'true' || match[1].toLowerCase() === 'oui';
        } else {
          (parsedFilters as any)[filterKey] = match[1];
        }
        remaining = remaining.replace(match[0], '').trim();
      }
    }

    // Remaining text is free search
    if (remaining.trim()) {
      parsedFilters.contains = parsedFilters.contains 
        ? `${parsedFilters.contains} ${remaining.trim()}`
        : remaining.trim();
    }

    setFilters(parsedFilters);
    
    if (Object.keys(parsedFilters).length > 0) {
      search({ query: remaining.trim(), filters: parsedFilters });
    }
  }, [query, search]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        parseAndSearch();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, parseAndSearch]);

  // Handle filter removal
  const handleRemoveFilter = (key: keyof SearchFiltersType) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    setFilters(newFilters);
    
    // Also remove from query text
    const prefixMap: Record<keyof SearchFiltersType, string> = {
      from: 'de:',
      mentions: 'mentions:',
      contains: 'contient:',
      channel: 'dans:',
      during: 'pendant:',
      before: 'avant:',
      after: 'après:',
      pinned: 'épinglé:',
      authorType: 'auteur:',
    };
    
    const prefix = prefixMap[key];
    if (prefix) {
      setQuery(prev => prev.replace(new RegExp(`${prefix}\\S+\\s?`, 'gi'), '').trim());
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy, HH:mm', { locale: fr });
    } catch {
      return dateStr;
    }
  };

  const { isMobile } = useBreakpoint();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className={cn(
        "flex flex-col p-0 gap-0",
        isMobile ? "h-full max-h-full w-full max-w-full rounded-none" : "sm:max-w-2xl max-h-[80vh]"
      )}>
        <DialogHeader className="px-4 py-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Recherche globale
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 py-3 border-b border-border">
          {/* Filter tags */}
          <FilterTags filters={filters} onRemove={handleRemoveFilter} />

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => !query.trim() && setShowPrefixSuggestions(true)}
              onBlur={() => setTimeout(() => setShowPrefixSuggestions(false), 150)}
              placeholder="Rechercher des messages..."
              className="pl-9 pr-4 h-10 bg-input"
              
            />

            {/* Prefix suggestions - inline on mobile, absolute dropdown on desktop */}
            {showPrefixSuggestions && (
              <div className={cn(
                "bg-popover border border-border rounded-lg shadow-lg overflow-hidden",
                isMobile
                  ? "mt-2"
                  : "absolute z-50 top-full left-0 right-0 mt-1"
              )}>
                <p className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                  Options de recherche
                </p>
                <div className={cn(
                  isMobile && "grid grid-cols-2 gap-0"
                )}>
                  {searchPrefixes.map(prefixConfig => {
                    const Icon = prefixConfig.icon;
                    return (
                      <button
                        key={prefixConfig.prefix}
                        onClick={() => handlePrefixSelect(prefixConfig.prefix)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors text-left",
                          isMobile ? "text-xs" : "w-full text-sm"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-primary truncate">{prefixConfig.prefix}</span>
                        {!isMobile && <span className="text-muted-foreground">{prefixConfig.label}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Autocomplete suggestions */}
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

        {/* Results */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4">
            {isPending ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : results && results.length > 0 ? (
              <div className="space-y-3">
                {results.map(message => (
                  <button
                    key={message.id}
                    onClick={() => onNavigateToMessage?.(message.channel_id, message.id)}
                    className="w-full text-left p-3 bg-muted/50 hover:bg-muted rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={message.author?.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                          {message.author?.display_name?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{message.author?.display_name || 'Inconnu'}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {message.channel?.name || 'Salon'}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDate(message.created_at || '')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 font-ginto">
                      <MarkdownText content={message.content} />
                    </p>
                  </button>
                ))}
              </div>
            ) : query.trim() && !isPending ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucun message trouvé</p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Utilisez les préfixes pour affiner votre recherche</p>
                <p className="text-xs mt-1">Ex: de:username dans:général contient:hello</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
