import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

export interface GifEntry {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
}

/**
 * Debounced Giphy search via the giphy-search edge function (keeps the API
 * key server-side). Empty query returns trending GIFs. `placeholderData`
 * keeps the previous grid on screen while a new query resolves, so typing
 * never flashes an empty state.
 */
export function useGifSearch(query: string) {
  const debounced = useDebounce(query.trim(), 300);

  return useQuery({
    queryKey: ['gif-search', debounced],
    queryFn: async (): Promise<GifEntry[]> => {
      const { data, error } = await supabase.functions.invoke('giphy-search', {
        body: { query: debounced, limit: 30 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return (data?.results ?? []) as GifEntry[];
    },
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}
