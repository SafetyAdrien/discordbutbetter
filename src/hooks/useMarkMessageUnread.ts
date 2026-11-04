import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/*
 * "Marquer comme non lu" : repose le repere de lecture juste avant le message choisi, comme Discord ;
 * le message et tous ceux qui suivent redeviennent non lus.
 */
export function useMarkMessageUnread() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useCallback(
    async (target: { kind: 'channel'; channelId: string; createdAt: string | null } | { kind: 'dm'; conversationId: string; createdAt: string | null }) => {
      if (!user || !target.createdAt) return;
      const before = new Date(Date.parse(target.createdAt) - 1).toISOString();
      const { error } =
        target.kind === 'channel'
          ? await supabase.from('channel_read_states').upsert({ user_id: user.id, channel_id: target.channelId, last_read_at: before }, { onConflict: 'user_id,channel_id' })
          : await supabase.from('dm_read_states').upsert({ user_id: user.id, conversation_id: target.conversationId, last_read_at: before }, { onConflict: 'user_id,conversation_id' });
      if (error) {
        toast.error('Impossible de marquer le message comme non lu');
        return;
      }
      for (const key of ['channel-unread-counts', 'server-unread-counts', 'unread-counts']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    [user, queryClient],
  );
}
