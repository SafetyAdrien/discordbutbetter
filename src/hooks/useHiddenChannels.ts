import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { userKey } from '@/lib/userScope';

/*
 * "Chercher des salons" : les salons que le membre ne suit pas sont retires
 * de sa liste (table user_hidden_channels). "Montrer tous les salons" du menu
 * du serveur les fait reapparaitre sans rien supprimer.
 */

const key = (userId: string | undefined, serverId: string) => ['hidden-channels', userId, serverId] as const;

export function useHiddenChannels(serverId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: key(user?.id, serverId ?? ''),
    enabled: !!user && !!serverId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_hidden_channels')
        .select('channel_id')
        .eq('server_id', serverId!)
        .eq('user_id', user!.id);
      // Table absente (migration non appliquee) : rien n'est masque.
      if (error) return new Set<string>();
      return new Set((data ?? []).map((r) => r.channel_id));
    },
  });
}

export function useSetChannelsFollowed(serverId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ channelIds, followed }: { channelIds: string[]; followed: boolean }) => {
      if (!user || channelIds.length === 0) return;
      const { error } = followed
        ? await supabase.from('user_hidden_channels').delete().eq('user_id', user.id).in('channel_id', channelIds)
        : await supabase
            .from('user_hidden_channels')
            .upsert(channelIds.map((channel_id) => ({ user_id: user.id, server_id: serverId, channel_id })));
      if (error) throw error;
    },
    onMutate: async ({ channelIds, followed }) => {
      const k = key(user?.id, serverId);
      await qc.cancelQueries({ queryKey: k });
      const prev = qc.getQueryData<Set<string>>(k);
      const next = new Set(prev ?? []);
      channelIds.forEach((id) => (followed ? next.delete(id) : next.add(id)));
      qc.setQueryData(k, next);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key(user?.id, serverId), ctx.prev);
      toast.error('Impossible de mettre à jour tes salons');
    },
  });
}

export function useChannelsLastActivity(serverId: string | null) {
  return useQuery({
    queryKey: ['channels-last-activity', serverId],
    enabled: !!serverId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_channels_last_activity', { _server_id: serverId! });
      if (error) return new Map<string, string>();
      return new Map((data ?? []).filter((r) => r.last_message_at).map((r) => [r.channel_id, r.last_message_at]));
    },
  });
}

const SHOW_ALL_KEY = (serverId: string) => `channels:show-all:${serverId}`;

export function readShowAllChannels(serverId: string): boolean {
  try {
    return localStorage.getItem(userKey(SHOW_ALL_KEY(serverId))) === '1';
  } catch {
    return false;
  }
}

export function writeShowAllChannels(serverId: string, value: boolean) {
  try {
    localStorage.setItem(userKey(SHOW_ALL_KEY(serverId)), value ? '1' : '0');
  } catch {
    /* stockage indisponible */
  }
  window.dispatchEvent(new CustomEvent('channels:show-all-changed', { detail: { serverId, value } }));
}
