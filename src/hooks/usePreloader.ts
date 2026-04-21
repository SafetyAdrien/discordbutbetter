import { useState, useEffect, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';
import { useNavigationState } from '@/hooks/useNavigationState';

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
  const navState = useNavigationState();
  const lastServerId = navState.activeServerId;
  const lastChannelId = navState.activeChannelId;

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

    const serverIds = servers.map(s => s.id);
    const targetServerId = (lastServerId && serverIds.includes(lastServerId))
      ? lastServerId
      : serverIds[0];
    const targetChannelId = lastChannelId || null;

    // === ESSENTIAL: profile (cached -> network if missing) ===
    (async () => {
      const cached = readCache<any>(`profile:${user.id}`);
      if (cached) {
        queryClient.setQueryData(['profile', user.id], cached);
        queryClient.setQueryData(['server-order', user.id], cached.server_order || []);
        setProfileLoaded(true);
        // Background refresh
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              queryClient.setQueryData(['profile', user.id], profile);
              queryClient.setQueryData(['server-order', user.id], profile.server_order || []);
              writeCache(`profile:${user.id}`, profile);
            }
          });
      } else {
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
        setProfileLoaded(true);
      }
    })();

    // === ESSENTIAL: channels for active server only ===
    (async () => {
      if (!targetServerId) {
        setActiveChannelsLoaded(true);
        return;
      }
      const cached = readCache<any>(`channels:${targetServerId}`);
      if (cached) {
        queryClient.setQueryData(['channels', targetServerId], cached);
        setActiveChannelsLoaded(true);
        // Background refresh
        fetchChannelsForServer(targetServerId, queryClient);
        return;
      }
      await fetchChannelsForServer(targetServerId, queryClient);
      setActiveChannelsLoaded(true);
    })();

    // === ESSENTIAL: messages for active channel (cache only, no fetch — useMessages handles fetch) ===
    (async () => {
      if (!targetChannelId) {
        setActiveMessagesLoaded(true);
        return;
      }
      const cached = readCache<any>(`messages:${targetChannelId}`);
      if (cached) {
        queryClient.setQueryData(['messages', targetChannelId], cached);
      }
      setActiveMessagesLoaded(true);
    })();

    // === DEFERRED (background, non-blocking) ===
    // Hydrate other servers' channels from cache only
    setTimeout(() => {
      for (const sid of serverIds) {
        if (sid === targetServerId) continue;
        const cached = readCache<any>(`channels:${sid}`);
        if (cached) {
          queryClient.setQueryData(['channels', sid], cached);
        }
      }

      // Hydrate members from cache for all servers
      for (const sid of serverIds) {
        const cached = readCache<any>(`members:${sid}`);
        if (cached) {
          queryClient.setQueryData(['members', sid], cached);
        }
      }

      // Hydrate roles from cache
      for (const sid of serverIds) {
        const cached = readCache<any>(`roles:${sid}`);
        if (cached) {
          queryClient.setQueryData(['roles', sid], cached);
        }
      }

      // Hydrate channel-perms from cache
      for (const sid of serverIds) {
        const cached = readCache<any>(`channel-perms:${sid}:${user.id}`);
        if (cached) {
          queryClient.setQueryData(['server-channel-permissions', sid, user.id], {
            viewable: new Set<string>(cached.viewable),
            connectable: new Set<string>(cached.connectable),
          });
        }
      }

      // Hydrate DM conversations
      const dmCached = readCache<any>(`dm-conversations:${user.id}`);
      if (dmCached && Array.isArray(dmCached) && dmCached.length > 0) {
        queryClient.setQueryData(['dm-conversations', user.id], dmCached);
      }

      // Hydrate unread counts
      const unreadCached = readCache<any>(`unread-counts:${user.id}`);
      if (unreadCached) queryClient.setQueryData(['unread-counts', user.id], unreadCached);
      const serverUnreadCached = readCache<any>(`server-unread:${user.id}`);
      if (serverUnreadCached) queryClient.setQueryData(['server-unread-counts', user.id], serverUnreadCached);
      for (const sid of serverIds) {
        const chUnread = readCache<any>(`channel-unread:${sid}:${user.id}`);
        if (chUnread) queryClient.setQueryData(['channel-unread-counts', sid, user.id], chUnread);
      }

      // Hydrate server emojis/stickers
      for (const sid of serverIds) {
        const emojisCached = readCache<any>(`server-emojis:${sid}`);
        if (emojisCached) queryClient.setQueryData(['server-emojis', sid], emojisCached);
        const stickersCached = readCache<any>(`server-stickers:${sid}`);
        if (stickersCached) queryClient.setQueryData(['server-stickers', sid], stickersCached);
      }

      // Hydrate friends + notifications from cache
      const friendsCached = readCache<any>(`friends:${user.id}`);
      if (friendsCached) queryClient.setQueryData(['friends', user.id], friendsCached);
      const notifCached = readCache<any>(`notifications:${user.id}`);
      if (notifCached) queryClient.setQueryData(['notifications'], notifCached);

      writeCache('preloader-done', '1');
    }, 100);
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
