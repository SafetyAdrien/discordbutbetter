import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface DMPinnedMessage {
  id: string;
  message_id: string;
  conversation_id: string;
  pinned_by: string | null;
  pinned_at: string;
  message: {
    id: string;
    content: string;
    created_at: string;
    author: {
      id: string;
      display_name: string;
      username: string;
      avatar_url: string | null;
    } | null;
  };
}

export function useDMPinnedMessages(conversationId: string | null) {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`dm-pinned-rt-${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dm_pinned_messages', filter: `conversation_id=eq.${conversationId}` },
        () => {
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['dm-pinned-messages', conversationId] });
          }, 300);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return useQuery({
    queryKey: ['dm-pinned-messages', conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('dm_pinned_messages')
        .select(`
          id,
          message_id,
          conversation_id,
          pinned_by,
          pinned_at,
          message:dm_messages!message_id (
            id,
            content,
            created_at,
            author:profiles!dm_messages_author_id_fkey (
              id,
              display_name,
              username,
              avatar_url
            )
          )
        `)
        .eq('conversation_id', conversationId)
        .order('pinned_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((item: any) => ({
        ...item,
        message: item.message,
      })) as DMPinnedMessage[];
    },
  });
}

export function usePinDMMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('dm_pinned_messages')
        .insert({
          message_id: messageId,
          conversation_id: conversationId,
          pinned_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ messageId, conversationId }) => {
      if (!user) return;

      await queryClient.cancelQueries({ queryKey: ['dm-pinned-messages', conversationId] });
      const previous = queryClient.getQueryData<DMPinnedMessage[]>(['dm-pinned-messages', conversationId]);

      const tempPin: DMPinnedMessage = {
        id: `temp-${Date.now()}`,
        message_id: messageId,
        conversation_id: conversationId,
        pinned_by: user.id,
        pinned_at: new Date().toISOString(),
        message: { id: messageId, content: '', created_at: new Date().toISOString(), author: null },
      };

      queryClient.setQueryData(['dm-pinned-messages', conversationId], (old: DMPinnedMessage[] | undefined) =>
        old ? [tempPin, ...old] : [tempPin]
      );

      return { previous, conversationId };
    },
    onError: (error: any, { conversationId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['dm-pinned-messages', conversationId], context.previous);
      }
      if (error.code === '23505') {
        toast.error('Ce message est déjà épinglé');
      } else {
        toast.error("Impossible d'épingler le message");
      }
    },
    onSuccess: () => {
      toast.success('Message épinglé');
    },
    onSettled: (_, __, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['dm-pinned-messages', conversationId] });
    },
  });
}

export function useUnpinDMMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      const { error } = await supabase
        .from('dm_pinned_messages')
        .delete()
        .eq('message_id', messageId);

      if (error) throw error;
    },
    onMutate: async ({ messageId, conversationId }) => {
      await queryClient.cancelQueries({ queryKey: ['dm-pinned-messages', conversationId] });
      const previous = queryClient.getQueryData<DMPinnedMessage[]>(['dm-pinned-messages', conversationId]);

      queryClient.setQueryData(['dm-pinned-messages', conversationId], (old: DMPinnedMessage[] | undefined) =>
        old?.filter(p => p.message_id !== messageId)
      );

      return { previous, conversationId };
    },
    onError: (_, { conversationId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['dm-pinned-messages', conversationId], context.previous);
      }
      toast.error('Impossible de désépingler le message');
    },
    onSuccess: () => {
      toast.success('Message désépinglé');
    },
    onSettled: (_, __, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['dm-pinned-messages', conversationId] });
    },
  });
}
