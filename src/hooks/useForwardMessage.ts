import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useServers } from '@/hooks/useServers';
import { useDMConversations } from '@/hooks/useDMs';
import type { ForwardPayload } from '@/lib/forwardMessage';

/*
 * Destinations du transfert ("Transferer a") : salons textuels / vocaux (leur discussion), fils suivis et messages prives.
 * Les salons d'annonces, forums et multimedia ne recoivent pas de messages libres : ils ne sont pas proposes.
 */

export type ForwardTargetKind = 'channel' | 'thread' | 'dm';
export interface ForwardTarget {
  key: string;
  kind: ForwardTargetKind;
  id: string;
  name: string;
  subtitle: string;
  iconUrl: string | null;
  iconFallback: string;
  badge: 'text' | 'voice' | 'thread' | null;
  /** Message prive : avatar rond d'un utilisateur. */
  round?: boolean;
  channelId?: string;
}

export interface TargetPerms { canSend: boolean; canAttach: boolean }

const sb = supabase as unknown as { from: (t: string) => any; rpc: (f: string, a: unknown) => any };

const hhmm = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '');

export function useForwardTargets(enabled: boolean) {
  const { user } = useAuth();
  const { data: servers = [] } = useServers();
  const { data: conversations = [] } = useDMConversations();

  const channelTargets: ForwardTarget[] = [];
  const channelNames = new Map<string, { name: string; serverName: string; iconUrl: string | null }>();
  for (const server of servers) {
    const all = [...server.categories.flatMap((c) => c.channels), ...(server.orphanChannels ?? [])];
    for (const ch of all) {
      channelNames.set(ch.id, { name: ch.name, serverName: server.name, iconUrl: server.icon_url });
      if (ch.type !== 'text' && ch.type !== 'voice' && ch.type !== null) continue;
      channelTargets.push({
        key: `channel:${ch.id}`, kind: 'channel', id: ch.id, channelId: ch.id, name: ch.name, subtitle: server.name,
        iconUrl: server.icon_url, iconFallback: server.name.slice(0, 2), badge: ch.type === 'voice' ? 'voice' : 'text',
      });
    }
  }

  const threads = useQuery({
    queryKey: ['forward-threads', user?.id],
    enabled: enabled && !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await sb
        .from('thread_followers')
        .select('thread:threads(id, name, channel_id, last_message_at, archived, locked)')
        .eq('user_id', user!.id);
      if (error) throw error;
      return ((data ?? []) as { thread: { id: string; name: string; channel_id: string; last_message_at: string | null; archived: boolean; locked?: boolean } | null }[])
        .map((r) => r.thread)
        .filter((t): t is NonNullable<typeof t> => !!t && !t.archived && !t.locked)
        .sort((a, b) => Date.parse(b.last_message_at ?? '0') - Date.parse(a.last_message_at ?? '0'));
    },
  });

  const threadTargets: ForwardTarget[] = (threads.data ?? []).flatMap((t) => {
    const ch = channelNames.get(t.channel_id);
    if (!ch) return [];
    return [{
      key: `thread:${t.id}`, kind: 'thread' as const, id: t.id, channelId: t.channel_id, name: t.name,
      subtitle: `# ${ch.name} • ${hhmm(t.last_message_at)}`, iconUrl: ch.iconUrl, iconFallback: ch.serverName.slice(0, 2), badge: 'thread' as const,
    }];
  });

  const dmTargets: ForwardTarget[] = conversations.map((c) => {
    const other = c.participants.find((p) => p.id !== user?.id) ?? c.participants[0];
    const name = c.is_group ? c.name || c.participants.map((p) => p.display_name).join(', ') : other?.display_name ?? 'Message privé';
    return {
      key: `dm:${c.id}`, kind: 'dm' as const, id: c.id, name,
      subtitle: c.is_group ? `${c.participants.length} membres` : other?.username ?? '',
      iconUrl: c.is_group ? c.icon_url : other?.avatar_url ?? null, iconFallback: name.slice(0, 1), badge: null, round: true,
    };
  });

  const channelIds = channelTargets.map((c) => c.id);
  const perms = useQuery({
    queryKey: ['forward-channel-perms', user?.id, channelIds.length],
    enabled: enabled && !!user && channelIds.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<Map<string, TargetPerms> | null> => {
      const { data, error } = await sb.rpc('get_channels_send_permissions', { _channel_ids: channelIds });
      // Fonction pas encore deployee / erreur : on laisse le serveur trancher a l'envoi.
      if (error || !Array.isArray(data)) return null;
      return new Map((data as { channel_id: string; can_send: boolean; can_attach: boolean }[]).map((r) => [r.channel_id, { canSend: r.can_send, canAttach: r.can_attach }]));
    },
  });

  const permOf = (target: ForwardTarget): TargetPerms => {
    if (target.kind !== 'channel') return { canSend: true, canAttach: true };
    const map = perms.data;
    if (!map) return { canSend: true, canAttach: true };
    return map.get(target.id) ?? { canSend: false, canAttach: false };
  };

  // Fils recents et messages prives d'abord, puis les salons.
  const targets = [...threadTargets, ...dmTargets, ...channelTargets];
  return { targets, permOf, loading: threads.isLoading };
}

export function useForwardMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ payload, targets, note }: { payload: ForwardPayload; targets: ForwardTarget[]; note: string }) => {
      if (!user) throw new Error('Not authenticated');
      const results = await Promise.allSettled(
        targets.map(async (t) => {
          const table = t.kind === 'channel' ? 'messages' : t.kind === 'thread' ? 'thread_messages' : 'dm_messages';
          const ref = t.kind === 'channel' ? { channel_id: t.id } : t.kind === 'thread' ? { thread_id: t.id } : { conversation_id: t.id };
          const { error } = await sb.from(table).insert({
            ...ref,
            author_id: user.id,
            content: payload.content,
            attachments: payload.attachments,
            forwarded_from: payload.from,
          });
          if (error) throw error;
          if (note.trim()) {
            const { error: noteError } = await sb.from(table).insert({ ...ref, author_id: user.id, content: note.trim(), attachments: [] });
            if (noteError) throw noteError;
          }
          return t;
        }),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed === results.length) throw new Error('forward-failed');
      return { sent: results.length - failed, failed };
    },
    onSuccess: (_r, { targets }) => {
      for (const t of targets) {
        if (t.kind === 'channel') queryClient.invalidateQueries({ queryKey: ['messages', t.id] });
        else if (t.kind === 'thread') queryClient.invalidateQueries({ queryKey: ['thread-messages', t.id] });
        else queryClient.invalidateQueries({ predicate: (q) => q.queryKey.includes(t.id) && String(q.queryKey[0]).toLowerCase().includes('dm') });
      }
    },
  });
}
