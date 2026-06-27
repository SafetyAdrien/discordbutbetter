import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';

export interface TwitchStreamStatus {
  isLive: boolean;
  title: string | null;
  game: string | null;
  viewers: number | null;
  thumbnail: string | null;
  startedAt: string | null;
  profileImage: string | null;
  displayName: string | null;
  login: string;
}

interface Cached {
  status: TwitchStreamStatus | null;
  fetchedAt: number;
}

const TTL_MS = 60 * 1000; // 60s
const memCache = new Map<string, TwitchStreamStatus | null>();
const pending = new Map<string, Promise<TwitchStreamStatus | null>>();

function ckey(login: string) { return `twitch-status:${login.toLowerCase()}`; }

function readPersisted(login: string): TwitchStreamStatus | null | undefined {
  const entry = cacheGetSync<Cached>(ckey(login));
  if (!entry || typeof entry.fetchedAt !== 'number') return undefined;
  if (Date.now() - entry.fetchedAt > TTL_MS) return undefined;
  return entry.status;
}

async function fetchStatus(login: string): Promise<TwitchStreamStatus | null> {
  const key = login.toLowerCase();
  if (memCache.has(key)) {
    const cached = memCache.get(key)!;
    return cached;
  }
  if (pending.has(key)) return pending.get(key)!;

  const p = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke('twitch-channel-status', {
        body: { login: key },
      });
      if (error || !data) {
        memCache.set(key, null);
        cacheSetAsync(ckey(key), { status: null, fetchedAt: Date.now() });
        return null;
      }
      const status = data as TwitchStreamStatus;
      memCache.set(key, status);
      cacheSetAsync(ckey(key), { status, fetchedAt: Date.now() });
      return status;
    } catch {
      memCache.set(key, null);
      cacheSetAsync(ckey(key), { status: null, fetchedAt: Date.now() });
      return null;
    } finally {
      pending.delete(key);
    }
  })();

  pending.set(key, p);
  return p;
}

export function useTwitchStatus(login: string | null) {
  const initial = login ? (readPersisted(login) ?? memCache.get(login.toLowerCase())) : undefined;
  const [data, setData] = useState<TwitchStreamStatus | null>(initial ?? null);
  const [isLoading, setIsLoading] = useState(login ? initial === undefined : false);

  useEffect(() => {
    if (!login) { setData(null); setIsLoading(false); return; }
    const persisted = readPersisted(login);
    if (persisted !== undefined) {
      setData(persisted);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    let cancelled = false;
    fetchStatus(login).then((s) => {
      if (cancelled) return;
      setData(s);
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [login]);

  return { data, isLoading };
}
