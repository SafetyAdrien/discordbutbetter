/* @refresh reset */
import { useState, useEffect, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';
import { recordPerf, markPerf, measurePerf } from '@/lib/perf';

interface PreloadStep {
  label: string;
  key: string;
  loaded: boolean;
}

interface PreloaderResult {
  ready: boolean;
  progress: number;
  currentStep: string;
  steps: PreloadStep[];
}

function readCache<T>(key: string): T | null {
  return cacheGetSync<T>(key) ?? null;
}

function writeCache(key: string, data: unknown): void {
  cacheSetAsync(key, data);
}

function readPersistedNavigationState(): { activeServerId: string | null; activeChannelId: string | null } {
  if (typeof window === 'undefined') {
    return { activeServerId: null, activeChannelId: null };
  }

  try {
    const saved = window.localStorage.getItem('discord_navigation_state');
    if (!saved) {
      return { activeServerId: null, activeChannelId: null };
    }

    const parsed = JSON.parse(saved);
    return {
      activeServerId: parsed?.activeServerId ?? null,
      activeChannelId: parsed?.activeChannelId ?? null,
    };
  } catch {
    return { activeServerId: null, activeChannelId: null };
  }
}

/**
 * Lean preloader: hydrates only what's needed for instant first render.
 * - Profile + server order (cached first)
 * - Channels for the LAST visited server (cache, then network)
 * - Members for the last visited server (cache only, hook will refetch if needed)
 * - Messages for the LAST visited channel (cache only)
 * - Everything else (other servers' channels, perms, polls, threads, DMs, friends, notifications)
 *   is deferred to background tasks that do NOT block the UI ready state.
 */
export function usePreloader(
  authLoading: boolean,
  serversPending: boolean,
  servers: { id: string }[],
): PreloaderResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const persistedNavigation = useMemo(() => readPersistedNavigationState(), []);
  const lastServerId = persistedNavigation.activeServerId;
  const lastChannelId = persistedNavigation.activeChannelId;

  const [serversLoaded, setServersLoaded] = useState<boolean>(false);
  const [profileLoaded, setProfileLoaded] = useState<boolean>(false);
  const [activeChannelsLoaded, setActiveChannelsLoaded] = useState<boolean>(false);
  const [activeMessagesLoaded, setActiveMessagesLoaded] = useState<boolean>(false);
  const [minTimePassed, setMinTimePassed] = useState<boolean>(false);

  const hasStarted = useRef<boolean>(false);

  // Adaptive min loading: instant if cache exists
  useEffect(() => {
    const hasPreviousLoad = cacheGetSync('preloader-done');
    if (hasPreviousLoad) {
      setMinTimePassed(true);
      return;
    }
    const timer = setTimeout(() => setMinTimePassed(true), 400);
    return () => clearTimeout(timer);
  }, []);

  // Mark servers loaded when query resolves
  useEffect(() => {
    if (!serversPending && !authLoading && user) {
      setServersLoaded(true);
    }
  }, [serversPending, authLoading, user]);

  useEffect(() => {
    if (!serversLoaded || !user || hasStarted.current) return;
    hasStarted.current = true;
    markPerf('preloader:start');

    const serverIds = servers.map(s => s.id);
    const targetServerId = (lastServerId && serverIds.includes(lastServerId))
      ? lastServerId
      : serverIds[0];
    const targetChannelId = lastChannelId || null;

    // === PROFILE: cache-first, mark loaded immediately, refresh in background ===
    const cachedProfile = readCache<any>(`profile:${user.id}`);
    if (cachedProfile) {
      queryClient.setQueryData(['profile', user.id], cachedProfile);
      queryClient.setQueryData(['server-order', user.id], cachedProfile.server_order || []);
    }
    setProfileLoaded(true);
    // Background profile refresh — does NOT block UI ready.
    void (async () => {
      const t0 = performance.now();
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (profile) {
          queryClient.setQueryData(['profile', user.id], profile);
          queryClient.setQueryData(['server-order', user.id], profile.server_order || []);
          writeCache(`profile:${user.id}`, profile);
        }
      } catch {}
      recordPerf('preloader:profile-refresh', performance.now() - t0);
    })();

    // === ACTIVE-SERVER CHANNELS: cache hydrate, mark loaded immediately ===
    if (targetServerId) {
      const cachedChannels = readCache<any>(`channels:${targetServerId}`);
      if (cachedChannels) {
        queryClient.setQueryData(['channels', targetServerId], cachedChannels);
      }
      // Background refresh (non-blocking) — keeps cache fresh.
      void (async () => {
        const t0 = performance.now();
        await fetchChannelsForServer(targetServerId, queryClient);
        recordPerf(`preloader:channels-refresh(${targetServerId})`, performance.now() - t0);
      })();
    }
    setActiveChannelsLoaded(true);

    // === ACTIVE-CHANNEL MESSAGES: cache-only, immediate ===
    if (targetChannelId && targetServerId) {
      const channelsCached = readCache<any>(`channels:${targetServerId}`);
      let channelExists = false;
      if (channelsCached) {
        const all = [
          ...((channelsCached.categories || []).flatMap((c: any) => c.channels || [])),
          ...(channelsCached.orphanChannels || []),
        ];
        channelExists = all.some((ch: any) => ch.id === targetChannelId);
      } else {
        channelExists = true;
      }
      if (channelExists) {
        const cachedMsgs = readCache<any>(`messages:${targetChannelId}`);
        if (cachedMsgs) {
          queryClient.setQueryData(['messages', targetChannelId], cachedMsgs);
        }
      }
    }
    setActiveMessagesLoaded(true);

    markPerf('preloader:ready');
    measurePerf('preloader:total', 'preloader:start', 'preloader:ready');

    // === DEFERRED hydration of secondary data — staggered via requestIdleCallback ===
    const idle = (cb: () => void, fallbackMs: number) => {
      if (typeof (window as any).requestIdleCallback === 'function') {
        (window as any).requestIdleCallback(cb, { timeout: fallbackMs + 200 });
      } else {
        setTimeout(cb, fallbackMs);
      }
    };

    // Slice 1: other servers' channels (low cost, sync cache reads)
    idle(() => {
      const t0 = performance.now();
      for (const sid of serverIds) {
        if (sid === targetServerId) continue;
        const cached = readCache<any>(`channels:${sid}`);
        if (cached) queryClient.setQueryData(['channels', sid], cached);
      }
      recordPerf('preloader:hydrate:other-channels', performance.now() - t0);
    }, 50);

    // Slice 2: members + roles + channel-perms
    idle(() => {
      const t0 = performance.now();
      for (const sid of serverIds) {
        const m = readCache<any>(`members:${sid}`);
        if (m) queryClient.setQueryData(['members', sid], m);
        const r = readCache<any>(`roles:${sid}`);
        if (r) queryClient.setQueryData(['roles', sid], r);
        const p = readCache<any>(`channel-perms:${sid}:${user.id}`);
        if (p) {
          queryClient.setQueryData(['server-channel-permissions', sid, user.id], {
            viewable: new Set<string>(p.viewable),
            connectable: new Set<string>(p.connectable),
          });
        }
      }
      recordPerf('preloader:hydrate:members-roles-perms', performance.now() - t0);
    }, 150);

    // Slice 3: DM/unread/friends/notifications
    idle(() => {
      const t0 = performance.now();
      const dmCached = readCache<any>(`dm-conversations:${user.id}`);
      if (dmCached && Array.isArray(dmCached) && dmCached.length > 0) {
        queryClient.setQueryData(['dm-conversations', user.id], dmCached);
      }
      const unreadCached = readCache<any>(`unread-counts:${user.id}`);
      if (unreadCached) queryClient.setQueryData(['unread-counts', user.id], unreadCached);
      const serverUnreadCached = readCache<any>(`server-unread:${user.id}`);
      if (serverUnreadCached) queryClient.setQueryData(['server-unread-counts', user.id], serverUnreadCached);
      for (const sid of serverIds) {
        const chUnread = readCache<any>(`channel-unread:${sid}:${user.id}`);
        if (chUnread) queryClient.setQueryData(['channel-unread-counts', sid, user.id], chUnread);
      }
      const friendsCached = readCache<any>(`friends:${user.id}`);
      if (friendsCached) queryClient.setQueryData(['friends', user.id], friendsCached);
      const notifCached = readCache<any>(`notifications:${user.id}`);
      if (notifCached) queryClient.setQueryData(['notifications'], notifCached);
      recordPerf('preloader:hydrate:dm-unread-friends', performance.now() - t0);
    }, 300);

    // Slice 4: emojis/stickers
    idle(() => {
      const t0 = performance.now();
      for (const sid of serverIds) {
        const emojisCached = readCache<any>(`server-emojis:${sid}`);
        if (emojisCached) queryClient.setQueryData(['server-emojis', sid], emojisCached);
        const stickersCached = readCache<any>(`server-stickers:${sid}`);
        if (stickersCached) queryClient.setQueryData(['server-stickers', sid], stickersCached);
      }
      writeCache('preloader-done', '1');
      recordPerf('preloader:hydrate:emojis-stickers', performance.now() - t0);
    }, 500);
  }, [serversLoaded, user, servers, queryClient, lastServerId, lastChannelId]);

  const steps: PreloadStep[] = useMemo(() => [
    { label: 'Authentification', key: 'auth', loaded: !authLoading },
    { label: 'Serveurs', key: 'servers', loaded: serversLoaded },
    { label: 'Profil', key: 'profile', loaded: profileLoaded },
    { label: 'Salons', key: 'activeChannels', loaded: activeChannelsLoaded },
    { label: 'Messages', key: 'activeMessages', loaded: activeMessagesLoaded },
  ], [authLoading, serversLoaded, profileLoaded, activeChannelsLoaded, activeMessagesLoaded]);

  const loadedCount = steps.filter(s => s.loaded).length;
  const progress = Math.round((loadedCount / steps.length) * 100);
  const currentStep = steps.find(s => !s.loaded)?.label || 'Finalisation';
  const allLoaded = steps.every(s => s.loaded);
  const ready = allLoaded && minTimePassed;

  return { ready, progress, currentStep, steps };
}

async function fetchChannelsForServer(sid: string, queryClient: ReturnType<typeof useQueryClient>) {
  try {
    const [{ data: categories }, { data: channels }] = await Promise.all([
      supabase.from('categories').select('*').eq('server_id', sid).order('position'),
      supabase.from('channels').select('*').eq('server_id', sid).order('position'),
    ]);
    if (categories && channels) {
      const result = {
        categories: categories.map(cat => ({
          id: cat.id, name: cat.name, position: cat.position,
          channels: channels.filter(ch => ch.category_id === cat.id).map(ch => ({
            id: ch.id, name: ch.name, type: ch.type, description: ch.description,
            position: ch.position, category_id: ch.category_id, server_id: ch.server_id,
            icon_url: (ch as any).icon_url ?? null,
          })),
        })),
        orphanChannels: channels.filter(ch => !ch.category_id).map(ch => ({
          id: ch.id, name: ch.name, type: ch.type, description: ch.description,
          position: ch.position, category_id: null, server_id: ch.server_id,
          icon_url: (ch as any).icon_url ?? null,
        })),
      };
      queryClient.setQueryData(['channels', sid], result);
      writeCache(`channels:${sid}`, result);
    }
  } catch {}
}
