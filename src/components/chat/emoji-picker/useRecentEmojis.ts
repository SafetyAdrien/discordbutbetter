import { useCallback, useEffect, useState } from 'react';
import { userKey } from '@/lib/userScope';

const STORAGE_KEY = 'recent-emojis';
const MAX_RECENT = 24;

/**
 * Tracks recently used emojis in localStorage. Most recent first, deduplicated.
 * Writes are synchronous but lightweight (small string array).
 */
export function useRecentEmojis() {
  const [recent, setRecent] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(userKey(STORAGE_KEY));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((e) => typeof e === 'string').slice(0, MAX_RECENT) : [];
    } catch {
      return [];
    }
  });

  // Keep multiple tabs in sync.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      try {
        const parsed = e.newValue ? JSON.parse(e.newValue) : [];
        setRecent(Array.isArray(parsed) ? parsed : []);
      } catch {
        /* noop */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const push = useCallback((emoji: string) => {
    setRecent((prev) => {
      const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, MAX_RECENT);
      try {
        window.localStorage.setItem(userKey(STORAGE_KEY), JSON.stringify(next));
      } catch {
        /* quota exceeded — silent */
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setRecent([]);
    try {
      window.localStorage.removeItem(userKey(STORAGE_KEY));
    } catch {
      /* noop */
    }
  }, []);

  return { recent, push, clear };
}
