import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeCacheHydrate } from '@/lib/cache';

/**
 * Bridges IndexedDB hydration to React Query: when warmCache loads a cached
 * entry into memory, we push it into the matching React Query cache so the
 * UI flips from empty to cached data without waiting for the network round-trip.
 *
 * For most keys we only write when the query has no data — never clobber a
 * fresher value from a live query. For server/channel lists we also seed when
 * the current cache is structurally empty, because `useServers`/`useChannels`
 * may have mounted with a `[]` fallback before IDB finished hydrating.
 */
export function useCacheRehydrate(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = subscribeCacheHydrate((key, value) => {
      let queryKey: unknown[] | null = null;
      let allowOverwriteEmpty = false;

      if (key.startsWith('messages:')) {
        queryKey = ['messages', key.slice('messages:'.length)];
        allowOverwriteEmpty = true;
      } else if (key.startsWith('dm-messages:')) {
        queryKey = ['dm-messages', key.slice('dm-messages:'.length)];
        allowOverwriteEmpty = true;
      } else if (key.startsWith('thread-messages:')) {
        queryKey = ['thread-messages', key.slice('thread-messages:'.length)];
        allowOverwriteEmpty = true;
      } else if (key.startsWith('threads:')) {
        queryKey = ['threads', key.slice('threads:'.length)];
        allowOverwriteEmpty = true;
      } else if (key.startsWith('thread:')) {
        queryKey = ['thread', key.slice('thread:'.length)];
        allowOverwriteEmpty = true;
      } else if (key.startsWith('url-meta:')) {
        queryKey = ['url-meta', key.slice('url-meta:'.length)];
      } else if (key.startsWith('servers:')) {
        queryKey = ['servers'];
        allowOverwriteEmpty = true;
      } else if (key.startsWith('channels:')) {
        queryKey = ['channels', key.slice('channels:'.length)];
        allowOverwriteEmpty = true;
      }

      if (!queryKey) return;

      const existing = queryClient.getQueryState(queryKey);
      const current: any = existing?.data;
      const isEmpty =
        current === undefined ||
        (Array.isArray(current) && current.length === 0) ||
        (current &&
          typeof current === 'object' &&
          Array.isArray(current.categories) &&
          Array.isArray(current.orphanChannels) &&
          current.categories.length === 0 &&
          current.orphanChannels.length === 0);

      if (allowOverwriteEmpty ? isEmpty : current === undefined) {
        queryClient.setQueryData(queryKey, value);
      }
    });
    return () => { unsub(); };
  }, [queryClient]);
}
