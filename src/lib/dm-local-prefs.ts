/**
 * Lightweight per-user client-side prefs for DM mute/archive state.
 * Stored in localStorage as a JSON string-set keyed by current userId.
 * Reactive across tabs via the `storage` event and a custom in-tab event.
 *
 * No DB changes required for now; can be migrated to a `dm_user_settings`
 * table later without touching the consuming components.
 */
import { useCallback, useEffect, useState } from 'react';

type Bucket = 'muted' | 'archived';

function key(userId: string, bucket: Bucket): string {
  return `dm-${bucket}:${userId}`;
}

function read(userId: string | null | undefined, bucket: Bucket): Set<string> {
  if (!userId || typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(key(userId, bucket));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed);
    return new Set();
  } catch {
    return new Set();
  }
}

function write(userId: string, bucket: Bucket, set: Set<string>) {
  try {
    window.localStorage.setItem(key(userId, bucket), JSON.stringify(Array.from(set)));
    window.dispatchEvent(new CustomEvent('dm-prefs-changed', { detail: { userId, bucket } }));
  } catch {
    /* swallow — local prefs are best effort */
  }
}

export function useDMLocalSet(userId: string | null | undefined, bucket: Bucket) {
  const [set, setSet] = useState<Set<string>>(() => read(userId, bucket));

  useEffect(() => {
    setSet(read(userId, bucket));
  }, [userId, bucket]);

  useEffect(() => {
    if (!userId) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === key(userId, bucket)) setSet(read(userId, bucket));
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail as { userId: string; bucket: Bucket } | undefined;
      if (detail?.userId === userId && detail.bucket === bucket) setSet(read(userId, bucket));
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('dm-prefs-changed', onCustom as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('dm-prefs-changed', onCustom as EventListener);
    };
  }, [userId, bucket]);

  const toggle = useCallback(
    (id: string) => {
      if (!userId) return;
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      write(userId, bucket, next);
      setSet(next);
    },
    [userId, bucket, set],
  );

  const add = useCallback(
    (id: string) => {
      if (!userId) return;
      const next = new Set(set);
      next.add(id);
      write(userId, bucket, next);
      setSet(next);
    },
    [userId, bucket, set],
  );

  const remove = useCallback(
    (id: string) => {
      if (!userId) return;
      const next = new Set(set);
      next.delete(id);
      write(userId, bucket, next);
      setSet(next);
    },
    [userId, bucket, set],
  );

  return { set, toggle, add, remove };
}
