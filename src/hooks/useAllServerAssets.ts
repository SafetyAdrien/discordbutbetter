import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ServerEmoji, ServerSticker } from '@/hooks/useServerAssets';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';
import { registerEmojis } from '@/lib/customEmoji';

/*
 * Emojis et autocollants de TOUS les serveurs de l'utilisateur (selecteur universel : comme
 * Discord, on peut utiliser les emojis de ses autres serveurs). Une requete par type.
 */
export interface PickerServer {
  id: string;
  name: string;
  icon_url: string | null;
  is_public?: boolean | null;
}

/** Serveurs de l'utilisateur (partage entre le selecteur et les fiches d'emoji). */
export function usePickerServers(enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['picker-servers', user?.id],
    enabled: enabled && !!user,
    staleTime: 5 * 60_000,
    placeholderData: () => cacheGetSync<PickerServer[]>(`picker-servers:${user?.id}`),
    queryFn: async (): Promise<PickerServer[]> => {
      const { data: m } = await supabase.from('server_members').select('server_id').eq('user_id', user!.id);
      const ids = (m ?? []).map((r) => r.server_id);
      if (!ids.length) return [];
      const { data } = await supabase.from('servers').select('id, name, icon_url, is_public').in('id', ids);
      const list = (data ?? []) as PickerServer[];
      cacheSetAsync(`picker-servers:${user!.id}`, list);
      return list;
    },
  });
}

/*
 * Chargement du selecteur : les listes sont gardees 5 min en memoire, recopiees en cache local (le selecteur s'ouvre
 * avec les emojis deja la), et `usePrefetchPickerAssets` les charge des l'ouverture de la conversation.
 */
export function useAllServerAssets(enabled: boolean) {
  const { user } = useAuth();
  const servers = usePickerServers(enabled);
  const ids = (servers.data ?? []).map((s) => s.id);
  const emojis = useQuery({
    queryKey: ['picker-emojis', ids.join(',')],
    enabled: enabled && ids.length > 0,
    staleTime: 5 * 60_000,
    placeholderData: () => cacheGetSync<ServerEmoji[]>(`picker-emojis:${user?.id}`),
    queryFn: async () => {
      const { data } = await supabase.from('server_emojis' as never).select('*').in('server_id', ids).order('created_at', { ascending: false });
      const list = (data ?? []) as unknown as ServerEmoji[];
      cacheSetAsync(`picker-emojis:${user?.id}`, list);
      registerEmojis(list);
      return list;
    },
  });
  useEffect(() => {
    if (emojis.data) registerEmojis(emojis.data);
  }, [emojis.data]);
  const stickers = useQuery({
    queryKey: ['picker-stickers', ids.join(',')],
    enabled: enabled && ids.length > 0,
    staleTime: 5 * 60_000,
    placeholderData: () => cacheGetSync<ServerSticker[]>(`picker-stickers:${user?.id}`),
    queryFn: async () => {
      const { data } = await supabase.from('server_stickers' as never).select('*').in('server_id', ids).order('created_at', { ascending: false });
      const list = (data ?? []) as unknown as ServerSticker[];
      cacheSetAsync(`picker-stickers:${user?.id}`, list);
      return list;
    },
  });
  return { servers: servers.data ?? [], emojis: emojis.data ?? [], stickers: stickers.data ?? [] };
}

/** Prechauffe la liste des emojis (et leurs images) pendant que le navigateur est au repos. */
export function usePrefetchPickerAssets() {
  const { emojis } = useAllServerAssets(true);
  useEffect(() => {
    if (!emojis.length) return;
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 600));
    const handle = idle(() => {
      // Les 120 premiers (les plus recents) : de quoi remplir la premiere page du selecteur.
      for (const e of emojis.slice(0, 120)) {
        const img = new Image();
        img.decoding = 'async';
        img.src = e.url;
      }
    });
    return () => (window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback?.(handle);
  }, [emojis]);
}
