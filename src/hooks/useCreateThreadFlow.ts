import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cacheSetAsync } from '@/lib/cache';
import { useCreateThread } from '@/hooks/useThreads';
import { useSendThreadMessage } from '@/hooks/useThreadMessages';
import { useCreatePoll } from '@/hooks/usePolls';
import type { PendingAttachment } from '@/hooks/usePendingAttachments';
import type { PollDraft } from '@/components/chat/CreatePollModal';

/*
 * Creation d'un fil, de bout en bout : fil, premier message, sondages. Partage par le panneau
 * "Nouveau fil" et par la commande /thread, pour qu'ils fassent exactement la meme chose.
 */

export interface CreateThreadFlowInput {
  channelId: string;
  name: string;
  messageId?: string | null;
  isPrivate?: boolean;
  accessRoleIds?: string[];
  accessUserIds?: string[];
  text?: string;
  files?: PendingAttachment[];
  external?: { url: string; name: string; type: 'sticker' | 'gif' };
  polls?: PollDraft[];
}

export function useCreateThreadFlow() {
  const queryClient = useQueryClient();
  const createThread = useCreateThread();
  const send = useSendThreadMessage();
  const createPoll = useCreatePoll();

  return useCallback(
    async ({ channelId, name, messageId, isPrivate = false, accessRoleIds = [], accessUserIds = [], text = '', files = [], external, polls = [] }: CreateThreadFlowInput) => {
      const thread = await createThread.mutateAsync({
        channelId,
        name: name.trim() || 'Nouveau fil',
        messageId: messageId ?? undefined,
        isPrivate,
        accessRoleIds: isPrivate ? accessRoleIds : [],
        accessUserIds: isPrivate ? accessUserIds : [],
      });
      if (text.trim() || files.length > 0 || external) {
        await send.mutateAsync({ threadId: thread.id, content: text, files, externalAttachment: external });
      }
      for (const poll of polls) {
        await createPoll.mutateAsync({ channelId, threadId: thread.id, question: poll.question, options: poll.options, allowMultiple: poll.allowMultiple, expiresAt: poll.expiresAt });
      }

      // Le fil s'ouvre aussitot : on remplace ce que les mutations ont laisse en cache (fil sans createur, message
      // provisoire sans auteur) par les donnees completes avec les profils (nom d'affichage, avatar).
      const [threadRes, messagesRes] = await Promise.all([
        supabase
          .from('threads')
          .select('*, creator:profiles!threads_created_by_fkey(id, username, display_name, avatar_url)')
          .eq('id', thread.id)
          .single(),
        supabase
          .from('thread_messages')
          .select('*, author:profiles!thread_messages_author_id_fkey(id, username, display_name, avatar_url)')
          .eq('thread_id', thread.id)
          .order('created_at', { ascending: true }),
      ]);
      if (threadRes.data) {
        queryClient.setQueryData(['thread', thread.id], threadRes.data);
        cacheSetAsync(`thread:${thread.id}`, threadRes.data);
      }
      if (messagesRes.data) {
        queryClient.setQueryData(['thread-messages', thread.id], messagesRes.data);
        cacheSetAsync(`thread-messages:${thread.id}`, messagesRes.data);
      }
      // Le fil, son message d'annonce dans le salon et l'apercu du dernier message (auteur compris) sont relus une fois
      // le premier message envoye : les relectures lancees plus tot pouvaient arriver avant lui.
      void queryClient.invalidateQueries({ queryKey: ['threads', channelId] });
      void queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
      return thread;
    },
    [queryClient, createThread, send, createPoll],
  );
}
