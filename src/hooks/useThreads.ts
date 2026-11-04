import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';
import { Thread } from '@/types/thread';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

// Shared between useThreads' queryFn and the sidebar hover-prefetch.
export async function fetchChannelThreads(channelId: string): Promise<Thread[]> {
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
}

export const useThreads = (channelId: string | undefined) => {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));

  // Realtime subscription for threads
  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`threads-rt-${channelId}-${instanceIdRef.current}`)
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
    queryFn: () => (channelId ? fetchChannelThreads(channelId) : Promise.resolve([])),
    enabled: !!channelId,
    placeholderData: () => cacheGetSync(`threads:${channelId}`),
    staleTime: 30_000,
    refetchOnMount: (q) => (q.state.data ? false : 'always'),
    refetchOnWindowFocus: false,
  });

  // Persist to sessionStorage
  useEffect(() => {
    if (query.data && channelId && !query.isPlaceholderData) {
      cacheSetAsync(`threads:${channelId}`, query.data);
    }
  }, [query.data, channelId, query.isPlaceholderData]);

  return query;
};

export const useThread = (threadId: string | undefined) => {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));

  // Realtime: any server change to this specific thread (rename, archive, lock,
  // close, last_message_at) is reflected instantly across every client.
  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`thread-rt-${threadId}-${instanceIdRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'threads', filter: `id=eq.${threadId}` },
        () => {
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['thread', threadId] });
          }, 150);
        }
      )
      .subscribe();
    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [threadId, queryClient]);

  const query = useQuery({
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
    placeholderData: () => (threadId ? cacheGetSync(`thread:${threadId}`) : undefined),
    staleTime: 30_000,
    refetchOnMount: (q) => (q.state.data ? false : 'always'),
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.data && threadId && !query.isPlaceholderData) {
      cacheSetAsync(`thread:${threadId}`, query.data);
    }
  }, [query.data, threadId, query.isPlaceholderData]);

  return query;
};

// Background prefetch: warms `['threads', channelId]` + IDB so the thread
// popover and embeds render synchronously the first time they mount.
export const usePrefetchThreadsForChannels = (channelIds: string[]) => {
  const queryClient = useQueryClient();
  const key = channelIds.join(',');

  useEffect(() => {
    if (!channelIds.length) return;
    let cancelled = false;

    (async () => {
      // Only fetch channels that don't already have data in the query cache.
      const missing = channelIds.filter(
        (cid) => !queryClient.getQueryState(['threads', cid])?.data
      );
      if (!missing.length || cancelled) return;

      const { data, error } = await supabase
        .from('threads')
        .select(`
          *,
          creator:profiles!threads_created_by_fkey(id, username, display_name, avatar_url)
        `)
        .in('channel_id', missing)
        .eq('archived', false)
        .order('last_message_at', { ascending: false });

      if (cancelled || error || !data) return;

      // Group threads by channel_id client-side.
      const grouped = new Map<string, Thread[]>();
      for (const cid of missing) grouped.set(cid, []);
      for (const t of data) {
        const arr = grouped.get(t.channel_id);
        if (arr) arr.push(t as Thread);
      }

      // Seed list cache (lightweight) + per-thread detail cache.
      for (const [cid, threads] of grouped) {
        const lightweight = threads.map((t) => ({
          ...t,
          message_count: 0,
          participants: [],
          participant_count: 0,
        } as Thread));
        queryClient.setQueryData(['threads', cid], lightweight);
        cacheSetAsync(`threads:${cid}`, lightweight);
      }

      for (const t of data) {
        const existingDetail = queryClient.getQueryState(['thread', t.id]);
        if (!existingDetail?.data) {
          queryClient.setQueryData(['thread', t.id], t);
          cacheSetAsync(`thread:${t.id}`, t);
        }
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
};

export const useCreateThread = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  
  return useMutation({
    mutationFn: async ({ channelId, name, messageId, isPrivate = false, accessRoleIds = [], accessUserIds = [] }: {
      channelId: string;
      name: string;
      messageId?: string;
      isPrivate?: boolean;
      /** Fil prive : roles et membres autorises (en plus du createur et des moderateurs). */
      accessRoleIds?: string[];
      accessUserIds?: string[];
    }) => {
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

      // Fil prive : liste d'acces (roles / membres choisis). Sans elle, seuls le createur et les moderateurs le voient.
      if (isPrivate) {
        const rows = [
          ...accessRoleIds.map((role_id) => ({ thread_id: data.id, role_id })),
          ...accessUserIds.filter((id) => id !== authUser.id).map((user_id) => ({ thread_id: data.id, user_id })),
        ];
        if (rows.length > 0) {
          const { error: accessError } = await (supabase as unknown as { from: (t: string) => any }).from('thread_access').insert(rows);
          if (accessError) {
            await supabase.from('threads').delete().eq('id', data.id);
            throw accessError;
          }
        }
      }

      // Auto-follow the thread after creation
      await supabase
        .from('thread_followers')
        .insert({
          thread_id: data.id,
          user_id: authUser.id,
        });
      
      // Insert system message in channel ONLY for standalone thread creation
      // (i.e. NOT attached to a parent message). When messageId is provided,
      // the thread embed appears naturally under the parent message.
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
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
    onSuccess: (data) => {
      // Cache-first: prime the detail cache + IDB so opening the newly created
      // thread renders instantly without a server round-trip.
      if (data?.id) {
        queryClient.setQueryData(['thread', data.id], data);
        cacheSetAsync(`thread:${data.id}`, data);
      }
    },
    onSettled: (data) => {
      if (data?.channel_id) {
        queryClient.invalidateQueries({ queryKey: ['threads', data.channel_id] });
        queryClient.invalidateQueries({ queryKey: ['messages', data.channel_id] });
        queryClient.invalidateQueries({ queryKey: ['followed-threads'] });
        queryClient.invalidateQueries({ queryKey: ['all-followed-threads'] });
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
    },
    onSettled: (_, __, { threadId, channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['threads', channelId] });
      queryClient.invalidateQueries({ queryKey: ['thread', threadId] });
      queryClient.invalidateQueries({ queryKey: ['followed-threads'] });
      queryClient.invalidateQueries({ queryKey: ['all-followed-threads'] });
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
    },
    onSettled: (_, __, { threadId, channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['threads', channelId] });
      queryClient.invalidateQueries({ queryKey: ['thread', threadId] });
      queryClient.invalidateQueries({ queryKey: ['followed-threads'] });
      queryClient.invalidateQueries({ queryKey: ['all-followed-threads'] });
    },
  });
};

export const useLockThread = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ threadId, locked }: { threadId: string; locked: boolean }) => {
      const { data, error } = await supabase
        .from('threads')
        .update({ locked })
        .eq('id', threadId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['thread', data.id] });
      queryClient.invalidateQueries({ queryKey: ['threads', data.channel_id] });
      queryClient.invalidateQueries({ queryKey: ['followed-threads'] });
      queryClient.invalidateQueries({ queryKey: ['all-followed-threads'] });
    },
    onError: () => toast.error('Erreur lors du verrouillage'),
  });
};

export const useCloseThread = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ threadId, closed }: { threadId: string; closed: boolean }) => {
      const { data, error } = await supabase
        .from('threads')
        .update({ closed })
        .eq('id', threadId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['thread', data.id] });
      queryClient.invalidateQueries({ queryKey: ['threads', data.channel_id] });
      queryClient.invalidateQueries({ queryKey: ['followed-threads'] });
      queryClient.invalidateQueries({ queryKey: ['all-followed-threads'] });
    },
    onError: () => toast.error('Erreur lors de la fermeture'),
  });
};

export const useUpdateThread = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ threadId, ...patch }: { threadId: string; name?: string; slowmode_seconds?: number; auto_archive_minutes?: number; spoiler?: boolean }) => {
      const { data, error } = await supabase
        .from('threads')
        .update(patch)
        .eq('id', threadId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ threadId, ...patch }) => {
      await queryClient.cancelQueries({ queryKey: ['thread', threadId] });
      const previousThread = queryClient.getQueryData(['thread', threadId]);
      
      queryClient.setQueryData(['thread', threadId], (old: Thread | undefined) =>
        old ? { ...old, ...patch } : old
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
    },
    onSettled: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['thread', data.id] });
        queryClient.invalidateQueries({ queryKey: ['threads', data.channel_id] });
        queryClient.invalidateQueries({ queryKey: ['followed-threads'] });
        queryClient.invalidateQueries({ queryKey: ['all-followed-threads'] });
      }
    },
  });
};
