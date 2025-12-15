import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { z } from 'zod';

// Message validation schema
const messageSchema = z.object({
  content: z.string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message too long (max 2000 characters)'),
});
export interface DMMessage {
  id: string;
  content: string;
  created_at: string | null;
  edited_at: string | null;
  attachments: any;
  conversation_id: string;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
  isPending?: boolean;
}

export function useDMMessages(conversationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['dm-messages', conversationId],
    queryFn: async (): Promise<DMMessage[]> => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('dm_messages')
        .select(`
          id,
          content,
          created_at,
          edited_at,
          attachments,
          conversation_id,
          author:profiles!dm_messages_author_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      return data as DMMessage[];
    },
    enabled: !!conversationId && !!user,
  });

  // Real-time subscription
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase
      .channel(`dm-messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dm_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.author_id === user.id) return;

          // Fetch complete message with author
          const { data } = await supabase
            .from('dm_messages')
            .select(`
              id,
              content,
              created_at,
              edited_at,
              attachments,
              conversation_id,
              author:profiles!dm_messages_author_id_fkey (
                id,
                username,
                display_name,
                avatar_url
              )
            `)
            .eq('id', newMsg.id)
            .single();

          if (data) {
            queryClient.setQueryData<DMMessage[]>(
              ['dm-messages', conversationId],
              (old) => {
                if (!old) return [data as DMMessage];
                if (old.some(m => m.id === data.id)) return old;
                return [...old, data as DMMessage];
              }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, queryClient]);

  return query;
}

export function useSendDMMessage() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
    }: {
      conversationId: string;
      content: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Validate message content
      const validated = messageSchema.parse({ content });

      const { data, error } = await supabase
        .from('dm_messages')
        .insert({
          conversation_id: conversationId,
          content: validated.content,
          author_id: user.id,
        })
        .select(`
          id,
          content,
          created_at,
          edited_at,
          attachments,
          conversation_id,
          author:profiles!dm_messages_author_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ conversationId, content }) => {
      await queryClient.cancelQueries({ queryKey: ['dm-messages', conversationId] });

      const previousMessages = queryClient.getQueryData<DMMessage[]>([
        'dm-messages',
        conversationId,
      ]);

      const optimisticMessage: DMMessage = {
        id: `temp-${Date.now()}`,
        content,
        created_at: new Date().toISOString(),
        edited_at: null,
        attachments: [],
        conversation_id: conversationId,
        author: profile ? {
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        } : null,
        isPending: true,
      };

      queryClient.setQueryData<DMMessage[]>(
        ['dm-messages', conversationId],
        (old) => [...(old || []), optimisticMessage]
      );

      return { previousMessages, optimisticMessage };
    },
    onSuccess: (data, { conversationId }, context) => {
      queryClient.setQueryData<DMMessage[]>(
        ['dm-messages', conversationId],
        (old) => {
          if (!old) return [data as DMMessage];
          return old.map((m) =>
            m.id === context?.optimisticMessage.id ? (data as DMMessage) : m
          );
        }
      );
      queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
    },
    onError: (error, { conversationId }, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ['dm-messages', conversationId],
          context.previousMessages
        );
      }
      toast.error("Erreur lors de l'envoi du message");
    },
  });
}

export function useEditDMMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      conversationId,
      content,
    }: {
      messageId: string;
      conversationId: string;
      content: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const validated = messageSchema.parse({ content });

      const { data, error } = await supabase
        .from('dm_messages')
        .update({ content: validated.content, edited_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('author_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ messageId, conversationId, content }) => {
      await queryClient.cancelQueries({ queryKey: ['dm-messages', conversationId] });

      const previousMessages = queryClient.getQueryData<DMMessage[]>([
        'dm-messages',
        conversationId,
      ]);

      queryClient.setQueryData<DMMessage[]>(
        ['dm-messages', conversationId],
        (old) => old?.map((m) => (m.id === messageId ? { ...m, content, edited_at: new Date().toISOString() } : m)) || []
      );

      return { previousMessages };
    },
    onSuccess: () => {
      toast.success('Message modifié');
    },
    onError: (error, { conversationId }, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['dm-messages', conversationId], context.previousMessages);
      }
      toast.error('Erreur lors de la modification');
    },
  });
}

export function useDeleteDMMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      conversationId,
    }: {
      messageId: string;
      conversationId: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('dm_messages')
        .delete()
        .eq('id', messageId)
        .eq('author_id', user.id);

      if (error) throw error;
    },
    onMutate: async ({ messageId, conversationId }) => {
      await queryClient.cancelQueries({ queryKey: ['dm-messages', conversationId] });

      const previousMessages = queryClient.getQueryData<DMMessage[]>([
        'dm-messages',
        conversationId,
      ]);

      queryClient.setQueryData<DMMessage[]>(
        ['dm-messages', conversationId],
        (old) => old?.filter((m) => m.id !== messageId) || []
      );

      return { previousMessages };
    },
    onSuccess: () => {
      toast.success('Message supprimé');
    },
    onError: (error, { conversationId }, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['dm-messages', conversationId], context.previousMessages);
      }
      toast.error('Erreur lors de la suppression');
    },
  });
}
