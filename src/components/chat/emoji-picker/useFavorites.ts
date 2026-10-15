import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'picker-favorites';
const MAX_FAVORITES = 48;

export type FavoriteItem =
  | { kind: 'emoji-unicode'; id: string; char: string }
  | { kind: 'emoji-custom'; id: string; name: string; url: string; insertText: string }
  | { kind: 'sticker'; id: string; name: string; url: string }
  | { kind: 'gif'; id: string; name: string; url: string; previewUrl: string };

/**
 * Tracks favorited emojis/stickers/GIFs in localStorage, unified across all
 * three picker tabs. Most-recently-added first, deduplicated by `id`.
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(0, MAX_FAVORITES) : [];
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
        setFavorites(Array.isArray(parsed) ? parsed : []);
      } catch {
        /* noop */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const persist = useCallback((next: FavoriteItem[]) => {
    setFavorites(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* quota exceeded — silent */
    }
  }, []);

  const isFavorite = useCallback(
    (id: string) => favorites.some((f) => f.id === id),
    [favorites],
  );

  const toggle = useCallback((item: FavoriteItem) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === item.id);
      const next = exists
        ? prev.filter((f) => f.id !== item.id)
        : [item, ...prev].slice(0, MAX_FAVORITES);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* quota exceeded — silent */
      }
      return next;
    });
  }, []);

  const byKind = useCallback(
    (kind: FavoriteItem['kind']) => favorites.filter((f) => f.kind === kind),
    [favorites],
  );

  return { favorites, isFavorite, toggle, byKind };
}
