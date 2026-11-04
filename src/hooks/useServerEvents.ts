import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { upcomingOccurrences, type EventLocationType, type EventRecurrence, type ServerEvent } from '@/lib/serverEvents';

export interface ServerEventInterest {
  event_id: string;
  user_id: string;
  skipped_occurrences: string[];
}

export interface ServerEventInput {
  title: string;
  description: string | null;
  location_type: EventLocationType;
  channel_id: string | null;
  location: string | null;
  starts_at: string;
  ends_at?: string | null;
  recurrence: EventRecurrence;
  cover_url: string | null;
}

const eventsKey = (serverId: string) => ['server-events', serverId] as const;
const interestsKey = (serverId: string) => ['server-event-interests', serverId] as const;

/** Evenements du serveur (hors annules/termines) et interets, en temps reel. */
export function useServerEvents(serverId: string | null) {
  const qc = useQueryClient();
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));

  const events = useQuery({
    queryKey: eventsKey(serverId ?? ''),
    enabled: !!serverId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('server_events')
        .select('*')
        .eq('server_id', serverId!)
        .in('status', ['scheduled', 'active'])
        .order('starts_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ServerEvent[];
    },
  });

  const eventIds = useMemo(() => (events.data ?? []).map((e) => e.id), [events.data]);
  const interests = useQuery({
    queryKey: [...interestsKey(serverId ?? ''), eventIds.join(',')],
    enabled: !!serverId && eventIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('server_event_interests')
        .select('event_id, user_id, skipped_occurrences')
        .in('event_id', eventIds);
      if (error) throw error;
      return (data ?? []) as ServerEventInterest[];
    },
  });

  useEffect(() => {
    if (!serverId) return;
    const ch = supabase
      .channel(`server-events-rt-${serverId}-${instanceIdRef.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'server_events', filter: `server_id=eq.${serverId}` }, () =>
        qc.invalidateQueries({ queryKey: eventsKey(serverId) }),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'server_event_interests' }, () =>
        qc.invalidateQueries({ queryKey: interestsKey(serverId) }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [serverId, qc]);

  /** Evenements ayant encore une occurrence a venir, tries par prochaine date. */
  const upcoming = useMemo(() => {
    const now = new Date();
    return (events.data ?? [])
      .map((e) => ({ event: e, occurrences: upcomingOccurrences(e, now, 4) }))
      .filter((x) => x.occurrences.length > 0)
      .sort((a, b) => a.occurrences[0].getTime() - b.occurrences[0].getTime());
  }, [events.data]);

  return { events, interests: interests.data ?? [], upcoming, isLoading: events.isLoading };
}

export function useServerEventMutations(serverId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: eventsKey(serverId) });
    qc.invalidateQueries({ queryKey: interestsKey(serverId) });
  };
  const fail = (msg: string) => (e: Error) => {
    console.error(e);
    toast.error(msg);
  };

  const uploadCover = async (blob: Blob): Promise<string> => {
    const path = `${serverId}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from('event-covers').upload(path, blob, { contentType: 'image/jpeg' });
    if (error) throw error;
    return supabase.storage.from('event-covers').getPublicUrl(path).data.publicUrl;
  };

  const create = useMutation({
    mutationFn: async (input: ServerEventInput) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('server_events')
        .insert({ ...input, server_id: serverId, creator_id: user.id })
        .select('*')
        .single();
      if (error) throw error;
      return data as unknown as ServerEvent;
    },
    onSuccess: refresh,
    onError: fail("Impossible de créer l'événement"),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ServerEventInput> & { status?: string; canceled_occurrences?: string[] } }) => {
      const { error } = await supabase.from('server_events').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: fail("Impossible de modifier l'événement"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('server_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: fail("Impossible d'annuler l'événement"),
  });

  /** "Annuler cet evenement" : l'occurrence est ajoutee aux annulations. */
  const cancelOccurrence = (event: ServerEvent, occurrence: Date) =>
    update.mutate({ id: event.id, patch: { canceled_occurrences: [...event.canceled_occurrences, occurrence.toISOString()] } });

  const setInterested = useMutation({
    mutationFn: async ({ eventId, interested }: { eventId: string; interested: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      const q = interested
        ? supabase.from('server_event_interests').upsert({ event_id: eventId, user_id: user.id, skipped_occurrences: [] })
        : supabase.from('server_event_interests').delete().eq('event_id', eventId).eq('user_id', user.id);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: fail("Impossible d'enregistrer ta réponse"),
  });

  /** "Uniquement cet evenement" : l'occurrence est ignoree, l'interet reste. */
  const skipOccurrence = useMutation({
    mutationFn: async ({ interest, occurrence }: { interest: ServerEventInterest; occurrence: Date }) => {
      const { error } = await supabase
        .from('server_event_interests')
        .update({ skipped_occurrences: [...interest.skipped_occurrences, occurrence.toISOString()] })
        .eq('event_id', interest.event_id)
        .eq('user_id', interest.user_id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: fail("Impossible d'enregistrer ta réponse"),
  });

  return { uploadCover, create, update, remove, cancelOccurrence, setInterested, skipOccurrence };
}

/** L'utilisateur est-il interesse par cette occurrence ? */
export function isInterested(interests: ServerEventInterest[], eventId: string, userId: string | undefined, occurrence?: Date) {
  const it = interests.find((i) => i.event_id === eventId && i.user_id === userId);
  if (!it) return false;
  if (!occurrence) return true;
  return !it.skipped_occurrences.some((s) => new Date(s).getTime() === occurrence.getTime());
}
