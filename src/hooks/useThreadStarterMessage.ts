import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { StoredAttachment } from '@/hooks/useMessages';

export interface ThreadStarterMessage {
  id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  channel_id: string;
  attachments: StoredAttachment[];
  author: { id: string; username: string; display_name: string; avatar_url: string | null } | null;
}

/** Message du salon a l'origine d'un fil : affiche en tete du fil, avec "Y aller". */
export function useThreadStarterMessage(messageId: string | null | undefined) {
  return useQuery({
    queryKey: ['thread-starter-message', messageId],
    enabled: !!messageId,
    staleTime: 60_000,
    queryFn: async (): Promise<ThreadStarterMessage | null> => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, content, created_at, edited_at, channel_id, attachments, author:profiles!messages_author_id_fkey(id, username, display_name, avatar_url)')
        .eq('id', messageId!)
        .maybeSingle();
      if (error || !data) return null;
      const row = data as unknown as ThreadStarterMessage;
      return { ...row, attachments: Array.isArray(row.attachments) ? row.attachments : [] };
    },
  });
}
