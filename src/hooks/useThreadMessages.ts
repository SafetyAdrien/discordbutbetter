import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';
import { ThreadMessage } from '@/types/thread';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useThreadMessages = (threadId: string | undefined) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  
  // Real-time subscription — skip own INSERTs (handled by optimistic update)
  useEffect(() => {
    if (!threadId) return;
    
    const channel = supabase
      .channel(`thread-messages-${threadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'thread_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          // Skip own INSERT events — already handled by optimistic update
          if (payload.eventType === 'INSERT' && user && (payload.new as any)?.author_id === user.id) {
            return;
          }
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['thread-messages', threadId] });
          }, 300);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [threadId, user?.id, queryClient]);

  const query = useQuery({
    queryKey: ['thread-messages', threadId],
    queryFn: async () => {
      if (!threadId) return [];
      
      const { data, error } = await supabase
        .from('thread_messages')
        .select(`
          *,
          author:profiles!thread_messages_author_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const baseMessages = (data || []) as ThreadMessage[];

      // Resolve replied snapshots in a single batched query
      const replyIds = Array.from(
        new Set(baseMessages.map((m) => m.reply_to_id).filter(Boolean) as string[])
      );

      if (replyIds.length === 0) return baseMessages;

      const { data: replyData } = await supabase
        .from('thread_messages')
        .select(`
          id, content, attachments,
          author:profiles!thread_messages_author_id_fkey(id, username, display_name, avatar_url)
        `)
        .in('id', replyIds);

      const replyMap = new Map<string, any>();
      if (replyData) {
        for (const r of replyData as any[]) {
          replyMap.set(r.id, {
            id: r.id,
            content: r.content || '',
            attachments: Array.isArray(r.attachments) ? r.attachments : [],
            author: r.author
              ? {
                  id: r.author.id,
                  username: r.author.username,
                  display_name: r.author.display_name,
                  avatar_url: r.author.avatar_url,
                }
              : null,
          });
        }
      }

      return baseMessages.map((m) => {
        if (!m.reply_to_id) return m;
        const snap = replyMap.get(m.reply_to_id);
        return {
          ...m,
          repliedMessage: snap ?? {
            id: m.reply_to_id,
            content: '',
            attachments: [],
            deleted: true,
            author: null,
          },
        };
      });
    },
    enabled: !!threadId,
    placeholderData: () => cacheGetSync(`thread-messages:${threadId}`),
  });

  // Persist to IndexedDB
  useEffect(() => {
    if (query.data && threadId && !query.isPlaceholderData) {
      cacheSetAsync(`thread-messages:${threadId}`, query.data);
    }
  }, [query.data, threadId, query.isPlaceholderData]);

  return query;
};

export const useSendThreadMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ threadId, content }: { threadId: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      if (content.trim().length === 0 || content.length > 2000) {
        throw new Error('Message must be between 1 and 2000 characters');
      }
      
      const { data, error } = await supabase
        .from('thread_messages')
        .insert({
          thread_id: threadId,
          author_id: user.id,
          content: content.trim(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ threadId, content }) => {
      await queryClient.cancelQueries({ queryKey: ['thread-messages', threadId] });
      const previous = queryClient.getQueryData(['thread-messages', threadId]);
      
      queryClient.setQueryData(['thread-messages', threadId], (old: ThreadMessage[] = []) => [
        ...old,
        {
          id: `temp-${Date.now()}`,
          thread_id: threadId,
          content,
          created_at: new Date().toISOString(),
          author: null,
        },
      ]);
      
      return { previous };
    },
    onError: (_, { threadId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['thread-messages', threadId], context.previous);
      }
      toast.error('Erreur lors de l\'envoi du message');
    },
    onSettled: (_, __, { threadId }) => {
      // Single invalidation — Realtime skips own INSERTs so this is necessary
      queryClient.invalidateQueries({ queryKey: ['thread-messages', threadId] });
      queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
  });
};

export const useEditThreadMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ messageId, content, threadId }: { messageId: string; content: string; threadId: string }) => {
      const { error } = await supabase
        .from('thread_messages')
        .update({ content, edited_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) throw error;
      return { messageId, content, threadId };
    },
    onMutate: async ({ messageId, content, threadId }) => {
      await queryClient.cancelQueries({ queryKey: ['thread-messages', threadId] });
      const previous = queryClient.getQueryData(['thread-messages', threadId]);
      
      queryClient.setQueryData(['thread-messages', threadId], (old: ThreadMessage[] | undefined) =>
        old?.map(m => 
          m.id === messageId 
            ? { ...m, content, edited_at: new Date().toISOString() } 
            : m
        )
      );
      
      return { previous, threadId };
    },
    onError: (_, { threadId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['thread-messages', threadId], context.previous);
      }
      toast.error('Erreur lors de la modification');
    },
    onSuccess: () => {
      toast.success('Message modifié');
    },
    onSettled: (_, __, { threadId }) => {
      queryClient.invalidateQueries({ queryKey: ['thread-messages', threadId] });
    },
  });
};

export const useDeleteThreadMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ messageId, threadId }: { messageId: string; threadId: string }) => {
      const { error } = await supabase
        .from('thread_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      return { messageId, threadId };
    },
    onMutate: async ({ messageId, threadId }) => {
      await queryClient.cancelQueries({ queryKey: ['thread-messages', threadId] });
      const previous = queryClient.getQueryData(['thread-messages', threadId]);
      
      queryClient.setQueryData(['thread-messages', threadId], (old: ThreadMessage[] | undefined) =>
        old?.filter(m => m.id !== messageId)
      );
      
      return { previous, threadId };
    },
    onError: (_, { threadId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['thread-messages', threadId], context.previous);
      }
      toast.error('Erreur lors de la suppression');
    },
    onSuccess: () => {
      toast.success('Message supprimé');
    },
    onSettled: (_, __, { threadId }) => {
      queryClient.invalidateQueries({ queryKey: ['thread-messages', threadId] });
    },
  });
};
