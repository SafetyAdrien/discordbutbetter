import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PinnedMessage {
  id: string;
  message_id: string;
  channel_id: string;
  pinned_by: string | null;
  pinned_at: string | null;
  message?: {
    id: string;
    content: string;
    created_at: string | null;
    author?: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
    } | null;
  };
}

export function usePinnedMessages(channelId: string) {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Realtime subscription for pinned_messages
  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`pinned-messages-rt-${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pinned_messages' },
        (payload) => {
          const record = (payload.new || payload.old) as { channel_id?: string } | undefined;
          if (record?.channel_id && record.channel_id !== channelId) return;
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['pinned-messages', channelId] });
          }, 300);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [channelId, queryClient]);

  const query = useQuery({
    queryKey: ['pinned-messages', channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pinned_messages')
        .select(`
          *,
          message:messages(
            id, content, created_at,
            author:profiles!messages_author_id_fkey(id, username, display_name, avatar_url)
          )
        `)
        .eq('channel_id', channelId)
        .order('pinned_at', { ascending: false });

      if (error) throw error;
      return data as unknown as PinnedMessage[];
    },
    enabled: !!channelId,
    placeholderData: () => cacheGetSync(`pinned-messages:${channelId}`),
  });

  // Persist to sessionStorage
  useEffect(() => {
    if (query.data && channelId && !query.isPlaceholderData) {
      try { sessionStorage.setItem(`cache:pinned-messages:${channelId}`, JSON.stringify(query.data)); } catch {}
    }
  }, [query.data, channelId, query.isPlaceholderData]);

  return query;
}

export function usePinMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ messageId, channelId }: { messageId: string; channelId: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('pinned_messages')
        .insert({ 
          message_id: messageId, 
          channel_id: channelId, 
          pinned_by: user.id 
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onMutate: async ({ messageId, channelId }) => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['pinned-messages', channelId] });
      const previousPinned = queryClient.getQueryData(['pinned-messages', channelId]);
      
      const tempPinned: PinnedMessage = {
        id: `temp-${Date.now()}`,
        message_id: messageId,
        channel_id: channelId,
        pinned_by: user.id,
        pinned_at: new Date().toISOString(),
      };
      
      queryClient.setQueryData(['pinned-messages', channelId], (old: PinnedMessage[] | undefined) =>
        old ? [tempPinned, ...old] : [tempPinned]
      );
      
      return { previousPinned };
    },
    onError: (_, variables, context) => {
      if (context?.previousPinned) {
        queryClient.setQueryData(['pinned-messages', variables.channelId], context.previousPinned);
      }
      toast.error('Erreur lors de l\'épinglage du message');
    },
    onSuccess: () => {
      toast.success('Message épinglé');
    },
    onSettled: (_, __, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['pinned-messages', channelId] });
    },
  });
}

export function useUnpinMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ messageId, channelId }: { messageId: string; channelId: string }) => {
      const { error } = await supabase
        .from('pinned_messages')
        .delete()
        .eq('message_id', messageId);
      
      if (error) throw error;
    },
    onMutate: async ({ messageId, channelId }) => {
      await queryClient.cancelQueries({ queryKey: ['pinned-messages', channelId] });
      const previousPinned = queryClient.getQueryData(['pinned-messages', channelId]);
      
      queryClient.setQueryData(['pinned-messages', channelId], (old: PinnedMessage[] | undefined) =>
        old?.filter(p => p.message_id !== messageId)
      );
      
      return { previousPinned };
    },
    onError: (_, variables, context) => {
      if (context?.previousPinned) {
        queryClient.setQueryData(['pinned-messages', variables.channelId], context.previousPinned);
      }
      toast.error('Erreur lors du désépinglage du message');
    },
    onSuccess: () => {
      toast.success('Message désépinglé');
    },
    onSettled: (_, __, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['pinned-messages', channelId] });
    },
  });
}
