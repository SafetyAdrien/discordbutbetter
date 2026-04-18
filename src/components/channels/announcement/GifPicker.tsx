import { useState, useEffect, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface TenorGif {
  id: string;
  title: string;
  url: string;
  preview: string;
  width: number | null;
  height: number | null;
}

interface GifPickerProps {
  trigger: React.ReactNode;
  onSelect: (gifUrl: string) => void;
}

export function GifPicker({ trigger, onSelect }: GifPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set('q', query.trim());
        params.set('limit', '24');

        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const url = `https://${projectId}.supabase.co/functions/v1/tenor-search?${params.toString()}`;
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(url, {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        });
        const json = await res.json();
        setResults(json.results ?? []);
      } catch (err) {
        console.error('Tenor fetch failed', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, query ? 350 : 0);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        className="w-[380px] p-3 bg-popover border border-border"
      >
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un GIF Tenor…"
            className="pl-9 h-9"
            autoFocus
          />
        </div>

        <div className="h-[320px] overflow-y-auto -mx-1 px-1">
          {loading && results.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Aucun résultat
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {results.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  onClick={() => {
                    onSelect(gif.url);
                    setOpen(false);
                  }}
                  className={cn(
                    'group relative overflow-hidden rounded-lg bg-muted aspect-square',
                    'hover:ring-2 hover:ring-primary transition-all'
                  )}
                  title={gif.title}
                >
                  <img
                    src={gif.preview}
                    alt={gif.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-2 text-[10px] text-muted-foreground text-center">
          Propulsé par Tenor
        </div>
      </PopoverContent>
    </Popover>
  );
}
