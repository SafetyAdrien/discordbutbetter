import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/*
 * Tags de serveur : lecture (configuration d'un serveur, tag actif d'un utilisateur, tags des serveurs du membre)
 * et ecriture via les fonctions SQL upsert_server_tag / set_my_server_tag / clear_my_server_tag, qui verifient
 * permissions, appartenance, concurrence et frequence de changement. Rien n'est considere comme enregistre avant
 * la reponse du serveur. Un abonnement temps reel invalide les caches quand une autre session modifie un tag.
 */

// Les nouvelles tables / fonctions ne sont pas encore dans types.ts genere.
const sb = supabase as unknown as { from: (t: string) => any; rpc: (fn: string, args?: object) => any; channel: (n: string) => any; removeChannel: (c: unknown) => void };

export interface ServerTagConfig {
  id: string;
  server_id: string;
  name: string;
  badge_id: string;
  color: string | null;
  enabled: boolean;
  version: number;
  updated_at: string;
}

export interface UserTag {
  userId: string;
  serverId: string;
  name: string;
  badgeId: string;
  color: string | null;
}

const TAG_COLUMNS = 'id,server_id,name,badge_id,color,enabled,version,updated_at';

export function useServerTagConfig(serverId: string | null) {
  return useQuery({
    queryKey: ['server-tag', serverId],
    enabled: !!serverId,
    staleTime: 30_000,
    queryFn: async (): Promise<ServerTagConfig | null> => {
      const { data, error } = await sb.from('server_tags').select(TAG_COLUMNS).eq('server_id', serverId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertServerTag(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { name: string; badgeId: string; color: string | null; enabled: boolean; expectedVersion?: number | null }) => {
      const { data, error } = await sb.rpc('upsert_server_tag', {
        p_server_id: serverId,
        p_name: v.name,
        p_badge_id: v.badgeId,
        p_color: v.color,
        p_enabled: v.enabled,
        p_expected_version: v.expectedVersion ?? null,
      });
      if (error) throw error;
      return data as ServerTagConfig;
    },
    onSuccess: (data) => {
      qc.setQueryData(['server-tag', serverId], data);
      void qc.invalidateQueries({ queryKey: ['user-server-tag'] });
      void qc.invalidateQueries({ queryKey: ['my-server-tags'] });
    },
  });
}

/* --- Tag actif d'un utilisateur (charge par lots : un seul appel pour tous les auteurs visibles) --- */

type Pending = { resolve: (t: UserTag | null) => void }[];
const queue = new Map<string, Pending>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  flushTimer = null;
  const batch = new Map(queue);
  queue.clear();
  const ids = [...batch.keys()];
  const out = new Map<string, UserTag>();
  try {
    // Deux requetes simples (pas de jointure PostgREST) : selections, puis configuration des tags concernes.
    const { data: rows, error: e1 } = await sb.from('user_server_tags').select('user_id,server_id,enabled,applied_version').in('user_id', ids);
    if (e1) throw e1;
    const serverIds = [...new Set(((rows ?? []) as any[]).map((r) => r.server_id))];
    if (serverIds.length) {
      const { data: tags, error: e2 } = await sb.from('server_tags').select('server_id,name,badge_id,color,enabled,version').in('server_id', serverIds);
      if (e2) throw e2;
      const byServer = new Map(((tags ?? []) as any[]).map((t) => [t.server_id, t]));
      for (const r of (rows ?? []) as any[]) {
        const t = byServer.get(r.server_id);
        // Affiche seulement si le tag est actif et que la selection correspond a la version courante.
        if (!r.enabled || !t?.enabled || t.version !== r.applied_version) continue;
        out.set(r.user_id, { userId: r.user_id, serverId: r.server_id, name: t.name, badgeId: t.badge_id, color: t.color });
      }
    }
  } catch (err) {
    console.warn('[server-tags] lecture impossible', err);
  }
  for (const [id, waiters] of batch) waiters.forEach((w) => w.resolve(out.get(id) ?? null));
}

function loadUserTag(userId: string): Promise<UserTag | null> {
  return new Promise((resolve) => {
    const list = queue.get(userId) ?? [];
    list.push({ resolve });
    queue.set(userId, list);
    if (!flushTimer) flushTimer = setTimeout(flush, 15);
  });
}

export function useUserServerTag(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['user-server-tag', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: () => loadUserTag(userId!),
  });
}

export interface MemberServerTag extends ServerTagConfig {
  server_name: string;
  server_icon: string | null;
  server_description: string | null;
  server_is_public: boolean;
}

/** Tags actifs des serveurs dont l'utilisateur est membre (pour le selecteur). */
export function useMyServerTags() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-server-tags', user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<MemberServerTag[]> => {
      const { data: m, error: e1 } = await sb.from('server_members').select('server_id').eq('user_id', user!.id);
      if (e1) throw e1;
      const ids = ((m ?? []) as { server_id: string }[]).map((r) => r.server_id);
      if (!ids.length) return [];
      const { data, error } = await sb
        .from('server_tags')
        .select(`${TAG_COLUMNS},servers!inner(name,icon_url,description,is_public)`)
        .in('server_id', ids)
        .eq('enabled', true);
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        id: r.id, server_id: r.server_id, name: r.name, badge_id: r.badge_id, color: r.color, enabled: r.enabled,
        version: r.version, updated_at: r.updated_at,
        server_name: r.servers.name, server_icon: r.servers.icon_url, server_description: r.servers.description, server_is_public: !!r.servers.is_public,
      }));
    },
  });
}

/** Informations pour la fiche ouverte au clic sur un tag. */
export function useServerForTag(serverId: string | null) {
  return useQuery({
    queryKey: ['server-tag-card', serverId],
    enabled: !!serverId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: s, error } = await sb.from('servers').select('id,name,icon_url,banner_url,description,is_public,created_at').eq('id', serverId).maybeSingle();
      if (error) throw error;
      const { count } = await sb.from('server_members').select('id', { count: 'exact', head: true }).eq('server_id', serverId);
      return s ? { ...s, memberCount: count ?? null } : null;
    },
  });
}

export function useSetMyServerTag() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (serverId: string) => {
      const { error } = await sb.rpc('set_my_server_tag', { p_server_id: serverId });
      if (error) throw error;
    },
    onSuccess: () => {
      if (user) void qc.invalidateQueries({ queryKey: ['user-server-tag', user.id] });
      void qc.invalidateQueries({ queryKey: ['user-server-tag'] });
    },
  });
}

export function useClearMyServerTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await sb.rpc('clear_my_server_tag');
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['user-server-tag'] }),
  });
}

/** Abonnement temps reel : une autre session (ou un admin) modifie un tag -> les affichages se mettent a jour. */
export function useServerTagsRealtime() {
  const { user } = useAuth();
  const qc = useQueryClient();
  useEffect(() => {
    if (!user) return;
    const channel = sb
      .channel(`server-tags-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_server_tags' }, () => {
        void qc.invalidateQueries({ queryKey: ['user-server-tag'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'server_tags' }, () => {
        void qc.invalidateQueries({ queryKey: ['user-server-tag'] });
        void qc.invalidateQueries({ queryKey: ['server-tag'] });
        void qc.invalidateQueries({ queryKey: ['my-server-tags'] });
      })
      .subscribe();
    return () => sb.removeChannel(channel);
  }, [user, qc]);
}

/** Selection brute de l'utilisateur courant (pour signaler un tag modifie a re-selectionner). */
export function useMyTagSelection() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user-server-tag', 'raw', user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await sb.from('user_server_tags').select('server_id,applied_version,selected_at').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data as { server_id: string; applied_version: number; selected_at: string } | null;
    },
  });
}
