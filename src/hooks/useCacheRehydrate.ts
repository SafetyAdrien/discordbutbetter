import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeCacheHydrate } from '@/lib/cache';

/**
 * Bridges IndexedDB hydration to React Query: when warmCache loads a cached
 * `messages:*` / `dm-messages:*` / `thread-messages:*` entry into memory,
 * we push it into the matching React Query cache so the UI flips from empty
 * to cached data without waiting for the network round-trip.
 *
 * Only writes when the query has no data yet — never clobbers fresher data
 * already returned by a live query.
 */
export function useCacheRehydrate(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = subscribeCacheHydrate((key, value) => {
      let queryKey: unknown[] | null = null;

      if (key.startsWith('messages:')) {
        queryKey = ['messages', key.slice('messages:'.length)];
      } else if (key.startsWith('dm-messages:')) {
        queryKey = ['dm-messages', key.slice('dm-messages:'.length)];
      } else if (key.startsWith('thread-messages:')) {
        queryKey = ['thread-messages', key.slice('thread-messages:'.length)];
      } else if (key.startsWith('threads:')) {
        queryKey = ['threads', key.slice('threads:'.length)];
      } else if (key.startsWith('thread:')) {
        queryKey = ['thread', key.slice('thread:'.length)];
      } else if (key.startsWith('url-meta:')) {
        // Url metadata is consumed directly via cacheGetSync in useUrlMetadata,
        // but we still seed React Query consumers if any subscribe later.
        queryKey = ['url-meta', key.slice('url-meta:'.length)];
      }

      if (!queryKey) return;

      const existing = queryClient.getQueryState(queryKey);
      // Only seed when nothing real has arrived yet.
      if (!existing || existing.data === undefined) {
        queryClient.setQueryData(queryKey, value);
      }
    });
    return () => { unsub(); };
  }, [queryClient]);
}
