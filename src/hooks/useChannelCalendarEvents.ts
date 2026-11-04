import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { refreshSignedUrls } from '@/lib/storageUrls';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ChannelCalendarEvent {
  id: string;
  channel_id: string;
  created_by: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  location_channel_id: string | null;
  thumbnail_url: string | null;
  reminder_minutes: number | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface ChannelCalendarEventInput {
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  location_channel_id?: string | null;
  thumbnail_url?: string | null;
  reminder_minutes?: number | null;
  color?: string;
}

const queryKey = (channelId: string) => ['channel-calendar-events', channelId] as const;

export function useChannelCalendarEvents(channelId: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));

  const query = useQuery({
    queryKey: queryKey(channelId ?? ''),
    enabled: !!channelId,
    queryFn: async () => refreshSignedUrls(await (async () => {
      const { data, error } = await supabase
        .from('channel_calendar_events')
        .select('*')
        .eq('channel_id', channelId!)
        .order('starts_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChannelCalendarEvent[];
    })()),
  });

  useEffect(() => {
    if (!channelId) return;
    const ch = supabase
      .channel(`channel-calendar-events-rt-${channelId}-${instanceIdRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channel_calendar_events', filter: `channel_id=eq.${channelId}` },
        () => qc.invalidateQueries({ queryKey: queryKey(channelId) })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [channelId, qc]);

  const create = useMutation({
    mutationFn: async (input: ChannelCalendarEventInput) => {
      if (!user || !channelId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('channel_calendar_events')
        .insert({ ...input, channel_id: channelId, created_by: user.id })
        .select('*')
        .single();
      if (error) throw error;
      return data as ChannelCalendarEvent;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKey(channelId ?? '') });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erreur lors de la création'),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ChannelCalendarEventInput> }) => {
      const { data, error } = await supabase
        .from('channel_calendar_events')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as ChannelCalendarEvent;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKey(channelId ?? '') });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erreur lors de la modification'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('channel_calendar_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKey(channelId ?? '') });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erreur lors de la suppression'),
  });

  return {
    events: query.data ?? [],
    isLoading: query.isLoading,
    create,
    update,
    remove,
  };
}

/**
 * Upload a thumbnail to the `channel-event-thumbnails` bucket under the channel folder.
 * Returns a signed URL (1 year) suitable for storage as `thumbnail_url`.
 */
export async function uploadEventThumbnail(channelId: string, file: Blob, filename?: string): Promise<string> {
  const guessedExt = filename?.split('.').pop()?.toLowerCase()
    || (file.type.split('/')[1] || 'jpg').toLowerCase();
  const ext = guessedExt === 'jpeg' ? 'jpg' : guessedExt;
  const path = `${channelId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from('channel-event-thumbnails')
    .upload(path, file, { upsert: false, contentType: file.type || 'image/jpeg' });
  if (upErr) throw upErr;
  const { data, error } = await supabase.storage
    .from('channel-event-thumbnails')
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (error) throw error;
  return data.signedUrl;
}
