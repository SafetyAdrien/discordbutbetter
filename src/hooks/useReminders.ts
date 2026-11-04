import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/*
 * Rappels de messages (table message_reminders, une ligne par rappel, visibles uniquement par leur auteur).
 * La ligne garde une copie du message pour rester lisible apres suppression. "En retard" = echeance passee.
 */

const sb = supabase as unknown as { from: (t: string) => any };

export interface ReminderSnapshot {
  authorId?: string | null;
  authorName: string;
  authorAvatar?: string | null;
  content: string;
  createdAt: string;
  imageUrl?: string | null;
  channelName?: string | null;
  serverName?: string | null;
  serverIcon?: string | null;
  categoryName?: string | null;
}

export interface ReminderTarget {
  source: 'channel' | 'dm';
  messageId: string;
  channelId?: string | null;
  conversationId?: string | null;
  serverId?: string | null;
  threadId?: string | null;
  snapshot: ReminderSnapshot;
}

export interface Reminder {
  id: string;
  source: 'channel' | 'dm';
  message_id: string;
  channel_id: string | null;
  conversation_id: string | null;
  server_id: string | null;
  thread_id: string | null;
  remind_at: string;
  snapshot: ReminderSnapshot;
  created_at: string;
}

const KEY = 'message-reminders';

export function useReminders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [KEY, user?.id],
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async (): Promise<Reminder[]> => {
      const { data, error } = await sb.from('message_reminders').select('*').eq('user_id', user!.id).order('remind_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Reminder[];
    },
  });
}

/** Horloge qui se met a jour a l'echeance du prochain rappel (et au plus toutes les 30 s pour les libelles relatifs). */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function useOverdueReminders() {
  const { data = [] } = useReminders();
  const now = useNow(15_000);
  return useMemo(() => data.filter((r) => new Date(r.remind_at) <= now), [data, now]);
}

export function useReminderFor(messageId: string | null | undefined) {
  const { data = [] } = useReminders();
  return messageId ? data.find((r) => r.message_id === messageId) ?? null : null;
}

export function useSaveReminder() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ target, remindAt }: { target: ReminderTarget; remindAt: Date }) => {
      if (!user) throw new Error('Not authenticated');
      const row = {
        user_id: user.id,
        source: target.source,
        message_id: target.messageId,
        channel_id: target.channelId ?? null,
        conversation_id: target.conversationId ?? null,
        server_id: target.serverId ?? null,
        thread_id: target.threadId ?? null,
        remind_at: remindAt.toISOString(),
        snapshot: target.snapshot,
      };
      const { error } = await sb.from('message_reminders').upsert(row, { onConflict: 'user_id,message_id' });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateReminderTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, remindAt }: { id: string; remindAt: Date }) => {
      const { error } = await sb.from('message_reminders').update({ remind_at: remindAt.toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteReminder() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('message_reminders').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: (id) => {
      qc.setQueryData<Reminder[]>([KEY, user?.id], (old) => (old ?? []).filter((r) => r.id !== id));
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
