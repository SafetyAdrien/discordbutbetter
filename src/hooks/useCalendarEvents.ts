import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  event_date: string; // YYYY-MM-DD
  event_time: string; // HH:MM:SS
  color: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarEventInput {
  title: string;
  description?: string | null;
  event_date: string;
  event_time: string;
  color: string;
  is_public: boolean;
}

const key = (userId: string | null | undefined, publicOnly: boolean) =>
  ['calendar-events', userId, publicOnly ? 'public' : 'all'] as const;

export function useCalendarEvents(targetUserId?: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = targetUserId ?? user?.id ?? null;
  const publicOnly = !!targetUserId && targetUserId !== user?.id;
  const k = key(userId, publicOnly);

  const query = useQuery({
    queryKey: k,
    enabled: !!userId,
    queryFn: async (): Promise<CalendarEvent[]> => {
      let q = supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId!);
      if (publicOnly) q = q.eq('is_public', true);
      const { data, error } = await q
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true });
      if (error) throw error;
      return (data || []) as CalendarEvent[];
    },
  });

  // Realtime
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`calendar-events:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendar_events', filter: `user_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: k }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  const create = useMutation({
    mutationFn: async (input: CalendarEventInput): Promise<CalendarEvent> => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({ ...input, user_id: user.id })
        .select('*')
        .single();
      if (error) throw error;
      return data as CalendarEvent;
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: k });
      const previous = qc.getQueryData<CalendarEvent[]>(k) || [];
      const optimistic: CalendarEvent = {
        id: `tmp-${Date.now()}`,
        user_id: user?.id || '',
        title: input.title,
        description: input.description ?? null,
        event_date: input.event_date,
        event_time: input.event_time,
        color: input.color,
        is_public: input.is_public,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      qc.setQueryData<CalendarEvent[]>(k, [...previous, optimistic]);
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(k, ctx.previous);
      toast.error('Impossible de créer l\'évènement');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: k });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CalendarEventInput> }) => {
      const { data, error } = await supabase
        .from('calendar_events')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as CalendarEvent;
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: k });
      const previous = qc.getQueryData<CalendarEvent[]>(k) || [];
      qc.setQueryData<CalendarEvent[]>(
        k,
        previous.map((e) => (e.id === id ? { ...e, ...patch, updated_at: new Date().toISOString() } as CalendarEvent : e)),
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(k, ctx.previous);
      toast.error('Impossible de modifier l\'évènement');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: k }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('calendar_events').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: k });
      const previous = qc.getQueryData<CalendarEvent[]>(k) || [];
      qc.setQueryData<CalendarEvent[]>(k, previous.filter((e) => e.id !== id));
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(k, ctx.previous);
      toast.error('Impossible de supprimer l\'évènement');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: k }),
  });

  return {
    events: query.data || [],
    isLoading: query.isLoading,
    create,
    update,
    remove,
  };
}
