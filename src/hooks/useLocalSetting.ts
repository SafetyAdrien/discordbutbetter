import { useCallback, useEffect, useState } from 'react';
import { userKey } from '@/lib/userScope';

/**
 * Preference persisted in localStorage under `nexuschat:settings:<key>`.
 * Reactive across tabs via the `storage` event.
 */
export function useLocalSetting<T>(key: string, defaultValue: T): [T, (v: T | ((prev: T) => T)) => void] {
  const storageKey = `nexuschat:settings:${key}`;

  const read = useCallback((): T => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const raw = window.localStorage.getItem(userKey(storageKey));
      if (raw == null) return defaultValue;
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  }, [storageKey, defaultValue]);

  const [value, setValue] = useState<T>(read);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === userKey(storageKey)) setValue(read());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [storageKey, read]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(userKey(storageKey), JSON.stringify(resolved));
        } catch {
          // ignore
        }
        return resolved;
      });
    },
    [storageKey],
  );

  return [value, update];
}
