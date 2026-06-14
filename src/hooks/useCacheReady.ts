import { useEffect, useState } from 'react';
import { isCacheReady, subscribeCacheReady } from '@/lib/cache';

/**
 * Returns `true` only after the cache layer has finished its schema-version
 * purge check on cold boot. Every component that renders messages MUST gate
 * its query on this so we never paint rows from a stale local cache.
 */
export function useCacheReady(): boolean {
  const [ready, setReady] = useState<boolean>(() => isCacheReady());

  useEffect(() => {
    if (isCacheReady()) {
      setReady(true);
      return;
    }
    const unsub = subscribeCacheReady(() => setReady(true));
    return () => { unsub(); };
  }, []);

  return ready;
}
