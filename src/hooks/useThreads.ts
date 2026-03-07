import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Thread } from '@/types/thread';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export const useThreads = (channelId: string | undefined) => {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Realtime subscription for threads
  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`threads-rt-${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'threads', filter: `channel_id=eq.${channelId}` },
        () => {
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['threads', channelId] });
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
    queryKey: ['threads', channelId],
    queryFn: async () => {
      if (!channelId) return [];
      
      const { data, error } = await supabase
        .from('threads')
        .select(`
          *,
          creator:profiles!threads_created_by_fkey(id, username, display_name, avatar_url)
        `)
        .eq('channel_id', channelId)
        .eq('archived', false)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      
      // Get message counts, last message, and participants for each thread
      const threadsWithData = await Promise.all(
        (data || []).map(async (thread) => {
          // Get message count
          const { count } = await supabase
            .from('thread_messages')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', thread.id);
          
          // Get last message with author
          const { data: lastMessageData } = await supabase
            .from('thread_messages')
            .select(`
              content,
              created_at,
              author:profiles!thread_messages_author_id_fkey(id, display_name, avatar_url)
            `)
            .eq('thread_id', thread.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          // Get unique participants (up to 4 for display)
          const { data: participantsData } = await supabase
            .from('thread_messages')
            .select(`
              author_id,
              author:profiles!thread_messages_author_id_fkey(id, display_name, avatar_url)
            `)
            .eq('thread_id', thread.id)
            .order('created_at', { ascending: false });
          
          // Dedupe participants
          const uniqueParticipants = new Map<string, { id: string; display_name: string; avatar_url: string | null }>();
          participantsData?.forEach((msg) => {
            if (msg.author_id && msg.author && !uniqueParticipants.has(msg.author_id)) {
              uniqueParticipants.set(msg.author_id, {
                id: msg.author.id,
                display_name: msg.author.display_name,
                avatar_url: msg.author.avatar_url,
              });
            }
          });
          
          const participants = Array.from(uniqueParticipants.values()).slice(0, 4);
          const participantCount = uniqueParticipants.size;
          
          return {
            ...thread,
            message_count: count || 0,
            last_message: lastMessageData ? {
              content: lastMessageData.content,
              created_at: lastMessageData.created_at,
              author: lastMessageData.author,
            } : undefined,
            participants,
            participant_count: participantCount,
          } as Thread;
        })
      );
      
      return threadsWithData;
    },
    enabled: !!channelId,
    placeholderData: () => {
      try {
        const cached = sessionStorage.getItem(`cache:threads:${channelId}`);
        return cached ? JSON.parse(cached) : undefined;
      } catch { return undefined; }
    },
  });

  // Persist to sessionStorage
  useEffect(() => {
    if (query.data && channelId && !query.isPlaceholderData) {
      try { sessionStorage.setItem(`cache:threads:${channelId}`, JSON.stringify(query.data)); } catch {}
    }
  }, [query.data, channelId, query.isPlaceholderData]);

  return query;
};

export const useThread = (threadId: string | undefined) => {
  return useQuery({
    queryKey: ['thread', threadId],
    queryFn: async () => {
      if (!threadId) return null;
      
      const { data, error } = await supabase
        .from('threads')
        .select(`
          *,
          creator:profiles!threads_created_by_fkey(id, username, display_name, avatar_url)
        `)
        .eq('id', threadId)
        .single();

      if (error) throw error;
      return data as Thread;
    },
    enabled: !!threadId,
  });
};

export const useCreateThread = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  
  return useMutation({
    mutationFn: async ({ channelId, name, messageId, isPrivate = false }: { channelId: string; name: string; messageId?: string; isPrivate?: boolean }) => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('threads')
        .insert({
          channel_id: channelId,
          name,
          created_by: authUser.id,
          message_id: messageId || null,
          is_private: isPrivate,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Auto-follow the thread after creation
      await supabase
        .from('thread_followers')
        .insert({
          thread_id: data.id,
          user_id: authUser.id,
        });
      
      // Insert system message in channel if NOT private AND not attached to a specific message
      if (!isPrivate && !messageId) {
        await supabase
          .from('messages')
          .insert({
            channel_id: channelId,
            author_id: authUser.id,
            content: `[SYSTEM:THREAD_CREATED:${data.id}:${name}]`,
            is_system: true,
          });
      }
      
      return data;
    },
    onMutate: async ({ channelId, name, isPrivate = false }) => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['threads', channelId] });
      const previousThreads = queryClient.getQueryData(['threads', channelId]);
      
      const tempThread: Thread = {
        id: `temp-${Date.now()}`,
        channel_id: channelId,
        name,
        created_by: user.id,
        created_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
        archived: false,
        archived_at: null,
        message_id: null,
        message_count: 0,
        is_private: isPrivate,
        creator: profile ? {
          id: user.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        } : undefined,
      };
      
      queryClient.setQueryData(['threads', channelId], (old: Thread[] | undefined) =>
        old ? [tempThread, ...old] : [tempThread]
      );
      
      return { previousThreads, channelId };
    },
    onError: (_, { channelId }, context) => {
      if (context?.previousThreads) {
        queryClient.setQueryData(['threads', channelId], context.previousThreads);
      }
      toast.error('Erreur lors de la création du thread');
    },
    onSuccess: () => {
      toast.success('Thread créé');
    },
    onSettled: (data) => {
      if (data?.channel_id) {
        queryClient.invalidateQueries({ queryKey: ['threads', data.channel_id] });
        queryClient.invalidateQueries({ queryKey: ['messages', data.channel_id] });
      }
    },
  });
};

export const useArchiveThread = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ threadId, channelId }: { threadId: string; channelId: string }) => {
      const { error } = await supabase
        .from('threads')
        .update({ archived: true, archived_at: new Date().toISOString() })
        .eq('id', threadId);

      if (error) throw error;
      return { threadId, channelId };
    },
    onMutate: async ({ threadId, channelId }) => {
      await queryClient.cancelQueries({ queryKey: ['threads', channelId] });
      const previousThreads = queryClient.getQueryData(['threads', channelId]);
      
      queryClient.setQueryData(['threads', channelId], (old: Thread[] | undefined) =>
        old?.filter(t => t.id !== threadId)
      );
      
      return { previousThreads, channelId };
    },
    onError: (_, { channelId }, context) => {
      if (context?.previousThreads) {
        queryClient.setQueryData(['threads', channelId], context.previousThreads);
      }
      toast.error('Erreur lors de l\'archivage');
    },
    onSuccess: () => {
      toast.success('Thread archivé');
    },
    onSettled: (_, __, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['threads', channelId] });
    },
  });
};

export const useDeleteThread = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ threadId, channelId }: { threadId: string; channelId: string }) => {
      const { error } = await supabase
        .from('threads')
        .delete()
        .eq('id', threadId);

      if (error) throw error;
      return { threadId, channelId };
    },
    onMutate: async ({ threadId, channelId }) => {
      await queryClient.cancelQueries({ queryKey: ['threads', channelId] });
      await queryClient.cancelQueries({ queryKey: ['followed-threads'] });
      const previousThreads = queryClient.getQueryData(['threads', channelId]);
      
      queryClient.setQueryData(['threads', channelId], (old: Thread[] | undefined) =>
        old?.filter(t => t.id !== threadId)
      );
      
      return { previousThreads, channelId };
    },
    onError: (_, { channelId }, context) => {
      if (context?.previousThreads) {
        queryClient.setQueryData(['threads', channelId], context.previousThreads);
      }
      toast.error('Erreur lors de la suppression');
    },
    onSuccess: () => {
      toast.success('Thread supprimé');
    },
    onSettled: (_, __, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['threads', channelId] });
      queryClient.invalidateQueries({ queryKey: ['followed-threads'] });
    },
  });
};

export const useUpdateThread = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ threadId, name }: { threadId: string; name: string }) => {
      const { data, error } = await supabase
        .from('threads')
        .update({ name })
        .eq('id', threadId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ threadId, name }) => {
      await queryClient.cancelQueries({ queryKey: ['thread', threadId] });
      const previousThread = queryClient.getQueryData(['thread', threadId]);
      
      queryClient.setQueryData(['thread', threadId], (old: Thread | undefined) =>
        old ? { ...old, name } : old
      );
      
      return { previousThread, threadId };
    },
    onError: (_, { threadId }, context) => {
      if (context?.previousThread) {
        queryClient.setQueryData(['thread', threadId], context.previousThread);
      }
      toast.error('Erreur lors du renommage');
    },
    onSuccess: () => {
      toast.success('Thread renommé');
    },
    onSettled: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['thread', data.id] });
        queryClient.invalidateQueries({ queryKey: ['threads', data.channel_id] });
        queryClient.invalidateQueries({ queryKey: ['followed-threads'] });
      }
    },
  });
};
